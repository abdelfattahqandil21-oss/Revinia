import { describe, expect, it } from 'vitest';
import type { TableColumn, TableRow } from '../src/lib/models/table.models';
import { assertSpanColumns, buildSpanModel } from '../src/lib/utils/spans';

/*
 * The span engine is the part of the table a renderer trusts blindly: it decides
 * which cells exist in the DOM and which positions keyboard focus may visit. A
 * wrong rectangle deletes content silently, so every rule is pinned here.
 *
 * The first 35 checks are the contract the prototype was validated against
 * (`check-spans.mjs`, 35/35); the rest cover what that contract left implicit:
 * out-of-bounds queries, edge clamping, stale focus starts and the cost of a
 * 10k-row grid.
 */

interface SpanRow {
  readonly id: number;
  readonly dept: string;
  readonly name: string;
}

function makeRows<T>(data: readonly T[]): readonly TableRow<T>[] {
  return data.map((item, index) => ({ id: String(index), data: item, index }));
}

const rows = (count: number): readonly TableRow<SpanRow>[] =>
  makeRows(
    Array.from({ length: count }, (_, index) => ({
      id: index,
      dept: index < 7 ? 'A' : 'B',
      name: `N${index}`,
    })),
  );

/** The reference grid: a 7-row merge, a 3-row merge and one 2-column span. */
const COLUMNS: readonly TableColumn<SpanRow>[] = [
  { id: 'dept', header: 'Dept', accessor: (row) => row.dept, merge: 'equal' },
  { id: 'name', header: 'Name', accessor: (row) => row.name },
  { id: 'x', header: 'X', colSpan: (context) => (context.rowIndex === 1 ? 2 : 1) },
  { id: 'y', header: 'Y' },
];

describe('buildSpanModel — row merge', () => {
  const model = buildSpanModel(rows(10), COLUMNS);

  it('anchors the first run and reports its full height', () => {
    expect(model.at(0, 0)).toEqual({ row: 0, column: 0, rowSpan: 7, colSpan: 1 });
  });

  it('does not report a covered cell as a span start', () => {
    expect(model.at(3, 0)).toBeNull();
  });

  it('reports the anchor as the owner of every covered cell', () => {
    expect(model.owner(6, 0)).toEqual({ row: 0, column: 0, rowSpan: 7, colSpan: 1 });
  });

  it('starts a new run when the value changes', () => {
    expect(model.at(7, 0)).toEqual({ row: 7, column: 0, rowSpan: 3, colSpan: 1 });
  });

  it('moves down from the anchor past the whole run', () => {
    expect(model.move(0, 0, 1, 0)).toEqual({ row: 7, column: 0 });
  });

  it('moves down from inside the run to the same place as from the anchor', () => {
    // Focus may sit anywhere inside a merge after a scroll or a re-render; the
    // step must be identical, not "one covered cell at a time".
    expect(model.move(6, 0, 1, 0)).toEqual({ row: 7, column: 0 });
  });

  it('stays put when moving up from the first row', () => {
    expect(model.move(0, 0, -1, 0)).toEqual({ row: 0, column: 0 });
  });

  it('moves up from below a run onto its anchor', () => {
    expect(model.move(7, 0, -1, 0)).toEqual({ row: 0, column: 0 });
  });

  it('stays put when moving down from the last run', () => {
    expect(model.move(7, 0, 1, 0)).toEqual({ row: 7, column: 0 });
  });

  it('moves right between plain cells', () => {
    expect(model.move(0, 0, 0, 1)).toEqual({ row: 0, column: 1 });
  });
});

describe('buildSpanModel — consecutive merged runs', () => {
  // Four runs of two rows each. This is the case that separates "land on the
  // next rendered cell" from "walk through every run": with the latter, one
  // ArrowDown from the first run reaches the LAST run (measured: row 6).
  const runs = makeRows(
    Array.from({ length: 8 }, (_, index) => ({
      id: index,
      dept: `D${Math.floor(index / 2)}`,
      name: `N${index}`,
    })),
  );
  const columns: readonly TableColumn<SpanRow>[] = [
    { id: 'dept', header: 'Dept', accessor: (row) => row.dept, merge: 'equal' },
    { id: 'name', header: 'Name', accessor: (row) => row.name },
  ];
  const model = buildSpanModel(runs, columns);

  it('moves down exactly one run at a time', () => {
    expect(model.move(0, 0, 1, 0)).toEqual({ row: 2, column: 0 });
    expect(model.move(2, 0, 1, 0)).toEqual({ row: 4, column: 0 });
    expect(model.move(4, 0, 1, 0)).toEqual({ row: 6, column: 0 });
  });

  it('moves up exactly one run at a time', () => {
    expect(model.move(6, 0, -1, 0)).toEqual({ row: 4, column: 0 });
    expect(model.move(2, 0, -1, 0)).toEqual({ row: 0, column: 0 });
  });

  it('still stops at the last run instead of leaving the grid', () => {
    expect(model.move(6, 0, 1, 0)).toEqual({ row: 6, column: 0 });
  });
});

describe('buildSpanModel — column spans', () => {
  const model = buildSpanModel(rows(10), COLUMNS);

  it('covers the neighbour column', () => {
    expect(model.at(1, 2)).toEqual({ row: 1, column: 2, rowSpan: 1, colSpan: 2 });
    expect(model.at(1, 3)).toBeNull();
    expect(model.owner(1, 3)).toEqual({ row: 1, column: 2, rowSpan: 1, colSpan: 2 });
  });

  it('lands on the anchor when moving right into a span', () => {
    expect(model.move(1, 1, 0, 1)).toEqual({ row: 1, column: 2 });
  });

  it('has nowhere to go when moving right from the anchor at the edge', () => {
    expect(model.move(1, 2, 0, 1)).toEqual({ row: 1, column: 2 });
  });

  it('clamps at the last column', () => {
    expect(model.move(1, 3, 0, 1)).toEqual({ row: 1, column: 3 });
  });
});

describe('buildSpanModel — skipping a wide cell', () => {
  const wide = buildSpanModel(rows(10), [...COLUMNS, { id: 'z', header: 'Z' }]);

  it('skips the covered column when moving right out of a span', () => {
    expect(wide.move(1, 2, 0, 1)).toEqual({ row: 1, column: 4 });
  });

  it('lands on the anchor when moving left out of the covered area', () => {
    expect(wide.move(1, 4, 0, -1)).toEqual({ row: 1, column: 2 });
  });

  it('never focuses a covered position', () => {
    const target = wide.move(1, 2, 0, 1);
    expect(wide.owner(target.row, target.column)).not.toBeNull();
    expect(wide.at(target.row, target.column)).toEqual(wide.owner(target.row, target.column));
  });
});

describe('buildSpanModel — overlap', () => {
  const overlapRows = makeRows(
    Array.from({ length: 3 }, (_, index) => ({ id: index, a: 'A', b: 'B' })),
  );
  const overlapColumns: readonly TableColumn<{ id: number; a: string; b: string }>[] = [
    {
      id: 'wide',
      header: 'Wide',
      span: (context) => (context.rowIndex === 1 ? { colSpan: 4 } : null),
    },
    { id: 'b', header: 'B', accessor: (row) => row.b },
    {
      id: 'early',
      header: 'Early',
      span: (context) => (context.rowIndex === 0 ? { rowSpan: 2, colSpan: 2 } : null),
    },
    { id: 'd', header: 'D' },
  ];
  const warnings: string[] = [];
  const model = buildSpanModel(overlapRows, overlapColumns, {
    warn: (message) => warnings.push(message),
  });

  it('shrinks a later span to the columns that are still free', () => {
    // The earlier anchor wins: evaluation order must never decide the layout.
    expect(model.at(1, 0)).toEqual({ row: 1, column: 0, rowSpan: 1, colSpan: 2 });
  });

  it('leaves the earlier span intact', () => {
    expect(model.at(0, 2)).toEqual({ row: 0, column: 2, rowSpan: 2, colSpan: 2 });
  });

  it('reports the overlap exactly once', () => {
    expect(warnings).toHaveLength(1);
  });

  it('names the column that had to shrink', () => {
    expect(warnings[0]).toContain('"wide"');
  });
});

describe('buildSpanModel — merge + colSpan composition', () => {
  const composeRows = makeRows(
    Array.from({ length: 6 }, (_, index) => ({
      id: index,
      dept: index < 3 ? 'A' : 'B',
      name: `N${index}`,
    })),
  );
  const composeColumns: readonly TableColumn<SpanRow>[] = [
    { id: 'dept', header: 'Dept', accessor: (row) => row.dept, merge: 'equal', colSpan: 2 },
    { id: 'name', header: 'Name', accessor: (row) => row.name },
    { id: 'x', header: 'X' },
  ];
  const model = buildSpanModel(composeRows, composeColumns);

  it('composes both axes into one rectangle', () => {
    expect(model.at(0, 0)).toEqual({ row: 0, column: 0, rowSpan: 3, colSpan: 2 });
  });

  it('covers the neighbouring column for every merged row', () => {
    expect(model.owner(2, 1)).toEqual({ row: 0, column: 0, rowSpan: 3, colSpan: 2 });
  });

  it('starts the next run after the rectangle', () => {
    expect(model.at(3, 0)).toEqual({ row: 3, column: 0, rowSpan: 3, colSpan: 2 });
  });

  it('moves down from the anchor past the whole rectangle', () => {
    expect(model.move(0, 0, 1, 0)).toEqual({ row: 3, column: 0 });
  });

  it('moves right from the anchor onto the first free column', () => {
    expect(model.move(0, 0, 0, 1)).toEqual({ row: 0, column: 2 });
  });
});

describe('buildSpanModel — Infinity and pinned regions', () => {
  const pinRows = makeRows(Array.from({ length: 3 }, (_, index) => ({ id: index, a: 'A' })));

  it('resolves Infinity to the end of the visible region', () => {
    const open: readonly TableColumn<{ id: number; a: string }>[] = [
      { id: 'a', header: 'A', accessor: (row) => row.a, colSpan: Number.POSITIVE_INFINITY },
      { id: 'b', header: 'B' },
      { id: 'c', header: 'C' },
    ];
    expect(buildSpanModel(pinRows, open).at(0, 0)).toEqual({
      row: 0,
      column: 0,
      rowSpan: 1,
      colSpan: 3,
    });
  });

  it('stops a colSpan at a pinned-region boundary', () => {
    // A sticky cell cannot be covered: its position is fixed by the scroll.
    const pinned: readonly TableColumn<{ id: number; a: string }>[] = [
      { id: 'a', header: 'A', accessor: (row) => row.a, colSpan: 2 },
      { id: 'b', header: 'B', pinned: 'start' },
      { id: 'keep', header: 'K', accessor: (row) => row.a, merge: 'equal' },
    ];
    expect(buildSpanModel(pinRows, pinned).at(0, 0)).toEqual({
      row: 0,
      column: 0,
      rowSpan: 1,
      colSpan: 1,
    });
  });
});

describe('buildSpanModel — merge without an accessor', () => {
  const composeRows = makeRows(Array.from({ length: 6 }, (_, index) => ({ id: index, a: 'A' })));
  const noAccessor: readonly TableColumn<{ id: number; a: string }>[] = [
    { id: 'display', header: 'Display', merge: 'equal' },
  ];
  const warnings: string[] = [];
  const model = buildSpanModel(composeRows, noAccessor, {
    warn: (message) => warnings.push(message),
  });

  it('produces no anchors at all', () => {
    expect(model.cells).toEqual([]);
  });

  it('leaves every position plain', () => {
    expect(model.at(0, 0)).toBeNull();
    expect(model.owner(0, 0)).toBeNull();
  });

  it('warns from buildSpanModel as well', () => {
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"display"');
  });

  it('warns from assertSpanColumns with the same message', () => {
    const contractWarnings: string[] = [];
    assertSpanColumns(noAccessor, { warn: (message) => contractWarnings.push(message) });
    expect(contractWarnings).toHaveLength(1);
    expect(contractWarnings[0]).toContain('"display"');
    expect(contractWarnings[0]).toContain('merge is ignored');
  });
});

describe('assertSpanColumns', () => {
  const composeColumns: readonly TableColumn<SpanRow>[] = [
    { id: 'dept', header: 'Dept', accessor: (row) => row.dept, merge: 'equal', colSpan: 2 },
    { id: 'name', header: 'Name', accessor: (row) => row.name },
  ];

  it('throws when a column declares span together with merge', () => {
    expect(() =>
      assertSpanColumns([
        {
          id: 'a',
          header: 'A',
          accessor: (row: SpanRow) => row.dept,
          merge: 'equal',
          span: () => ({ rowSpan: 2 }),
        },
      ]),
    ).toThrow(/declares both span and merge/);
  });

  it('throws when a column declares span together with colSpan', () => {
    expect(() =>
      assertSpanColumns([
        {
          id: 'a',
          header: 'A',
          colSpan: 2,
          span: () => ({ colSpan: 2 }),
        },
      ]),
    ).toThrow(/declares both span and colSpan/);
  });

  it('accepts merge + colSpan, which compose instead of conflicting', () => {
    expect(() => assertSpanColumns(composeColumns)).not.toThrow();
  });

  it('names the column and both declarations in the error', () => {
    expect(() =>
      assertSpanColumns([
        {
          id: 'salary',
          header: 'Salary',
          accessor: (row: SpanRow) => row.dept,
          merge: 'equal',
          span: () => ({ rowSpan: 2 }),
        },
      ]),
    ).toThrow(/"salary" declares both span and merge/);
  });

  it('does not throw for a plain column list', () => {
    expect(() => assertSpanColumns<SpanRow>([])).not.toThrow();
  });
});

describe('buildSpanModel — out-of-bounds queries', () => {
  const model = buildSpanModel(rows(10), COLUMNS);

  it('returns null outside the grid instead of throwing', () => {
    expect(model.at(-1, 0)).toBeNull();
    expect(model.at(0, -1)).toBeNull();
    expect(model.at(10, 0)).toBeNull();
    expect(model.at(0, 4)).toBeNull();
    expect(model.owner(-1, 0)).toBeNull();
    expect(model.owner(0, 99)).toBeNull();
  });

  it('never reports an anchor for a covered position', () => {
    expect(model.at(4, 0)).toBeNull();
    expect(model.owner(4, 0)).not.toBeNull();
  });

  it('handles an empty row set', () => {
    const empty = buildSpanModel<SpanRow>([], COLUMNS);
    expect(empty.cells).toEqual([]);
    expect(empty.at(0, 0)).toBeNull();
    expect(empty.move(0, 0, 1, 0)).toEqual({ row: 0, column: 0 });
  });

  it('handles an empty column set', () => {
    const empty = buildSpanModel(rows(3), []);
    expect(empty.cells).toEqual([]);
    expect(empty.owner(0, 0)).toBeNull();
    expect(empty.move(2, 2, 0, 1)).toEqual({ row: 0, column: 0 });
  });
});

describe('buildSpanModel — move clamps at every edge', () => {
  const plainColumns: readonly TableColumn<SpanRow>[] = [
    { id: 'dept', header: 'Dept', accessor: (row) => row.dept },
    { id: 'name', header: 'Name', accessor: (row) => row.name },
  ];
  const plain = buildSpanModel(rows(3), plainColumns);
  const merged = buildSpanModel(rows(10), COLUMNS);

  it('clamps a plain grid at the top and left edges', () => {
    expect(plain.move(0, 0, -1, 0)).toEqual({ row: 0, column: 0 });
    expect(plain.move(0, 0, 0, -1)).toEqual({ row: 0, column: 0 });
  });

  it('clamps a plain grid at the bottom and right edges', () => {
    expect(plain.move(2, 1, 1, 0)).toEqual({ row: 2, column: 1 });
    expect(plain.move(2, 1, 0, 1)).toEqual({ row: 2, column: 1 });
  });

  it('clamps a stale position when no direction is given', () => {
    expect(merged.move(99, 99, 0, 0)).toEqual({ row: 9, column: 3 });
    expect(merged.move(-5, -5, 0, 0)).toEqual({ row: 0, column: 0 });
  });

  it('clamps a stale start before taking the step', () => {
    // A page shrank under the focused row: the first step must start from the
    // nearest valid cell, not walk from an index that no longer exists.
    expect(merged.move(-5, -5, 1, 0)).toEqual({ row: 7, column: 0 });
  });

  it('stays inside the grid when moving diagonally from the last cell', () => {
    expect(merged.move(9, 3, 1, 1)).toEqual({ row: 9, column: 3 });
  });
});

describe('buildSpanModel — 10k-row cost', () => {
  const largeRows = makeRows(
    Array.from({ length: 10_000 }, (_, index) => ({
      id: index,
      dept: `D${Math.floor(index / 50)}`,
      name: `N${index}`,
    })),
  );
  const largeColumns: readonly TableColumn<{ id: number; dept: string; name: string }>[] = [
    { id: 'dept', header: 'Dept', accessor: (row) => row.dept, merge: 'equal' },
    { id: 'name', header: 'Name', accessor: (row) => row.name },
    { id: 'x', header: 'X' },
    { id: 'y', header: 'Y' },
  ];

  it('builds 10k x 4 in under 50 ms', () => {
    // Warm-up: the first build pays for JIT feedback in the engine and would
    // make a 50 ms budget measure the runtime, not the algorithm.
    buildSpanModel(largeRows.slice(0, 100), largeColumns);

    const started = performance.now();
    const model = buildSpanModel(largeRows, largeColumns);
    const elapsed = performance.now() - started;

    // 200 dept anchors (10k / 50) + 3 plain columns per row, in reading order.
    expect(model.cells.length).toBe(200 + 10_000 * 3);
    expect(model.at(0, 0)).toEqual({ row: 0, column: 0, rowSpan: 50, colSpan: 1 });
    expect(model.move(0, 0, 1, 0)).toEqual({ row: 50, column: 0 });
    expect(elapsed).toBeLessThan(50);
  });
});
