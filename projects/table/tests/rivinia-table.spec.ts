import { describe, expect, it } from 'vitest';
import { signal } from '@angular/core';
import type { TableColumn } from '../src/lib/models/table.models';
import type { TableOptions } from '../src/lib/services/rivinia-table';
import { createTable } from '../src/lib/services/rivinia-table';
import { tableColumn } from '../src/lib/utils/table-column';
import { readCellValue } from '../src/lib/utils/table-pipeline';

/*
 * The controller is a chain of `computed`s over plain signals, constructed
 * without an injector. These tests therefore read signals directly: no TestBed,
 * no timers, no DOM. What they pin is the wiring — which stage resets which,
 * what selection survives a filter, why a page past the end is empty — because
 * that wiring is the product; the pipeline's own math is covered in
 * `table-pipeline.spec.ts`.
 */

interface Employee {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly dept: string;
  readonly salary: number;
  readonly active: boolean;
}

const EMPLOYEES: readonly Employee[] = [
  { id: 1, name: 'Ahmed Ali', city: 'Cairo', dept: 'A', salary: 900, active: true },
  { id: 2, name: 'Mona Hassan', city: 'Giza', dept: 'A', salary: 700, active: false },
  { id: 3, name: 'Omar Said', city: 'Cairo', dept: 'A', salary: 1200, active: true },
  { id: 4, name: 'Sara Nabil', city: 'Alexandria', dept: 'A', salary: 800, active: true },
  { id: 5, name: 'Khaled Mostafa', city: 'Giza', dept: 'B', salary: 950, active: false },
  { id: 6, name: 'Nour Adel', city: 'Cairo', dept: 'B', salary: 1100, active: true },
];

const COLUMNS: readonly TableColumn<Employee>[] = [
  { id: 'name', header: 'Name', accessor: (row) => row.name, pinned: 'start' },
  { id: 'city', header: 'City', accessor: (row) => row.city },
  { id: 'dept', header: 'Dept', accessor: (row) => row.dept },
  { id: 'salary', header: 'Salary', accessor: (row) => row.salary, pinned: 'end' },
  { id: 'actions', header: 'Actions' },
];

const HIDDEN_COLUMNS: readonly TableColumn<Employee>[] = COLUMNS.map((column) =>
  column.id === 'city' ? { ...column, hidden: true } : column,
);

const SPAN_COLUMNS: readonly TableColumn<Employee>[] = COLUMNS.map((column) =>
  column.id === 'dept' ? { ...column, merge: 'equal' as const } : column,
);

const HIDDEN_SPAN_COLUMNS: readonly TableColumn<Employee>[] = SPAN_COLUMNS.map((column) =>
  column.id === 'city' ? { ...column, hidden: true } : column,
);

function makeTable(
  overrides: Partial<TableOptions<Employee>> = {},
  initial: readonly Employee[] = EMPLOYEES,
): {
  table: ReturnType<typeof createTable<Employee>>;
  data: ReturnType<typeof signal<readonly Employee[]>>;
} {
  const data = signal<readonly Employee[]>(initial);
  const table = createTable<Employee>(() => ({
    columns: () => COLUMNS,
    data,
    ...overrides,
  }));
  return { table, data };
}

const ids = (table: ReturnType<typeof createTable<Employee>>): ReadonlyArray<string | number> =>
  table.rows().map((row) => row.id);

const pageIds = (table: ReturnType<typeof createTable<Employee>>): ReadonlyArray<string | number> =>
  table.pageRows().map((row) => row.id);

describe('columns', () => {
  it('exposes the declared columns and the visible subset', () => {
    const { table } = makeTable();
    expect(table.columns().map((column) => column.id)).toEqual([
      'name',
      'city',
      'dept',
      'salary',
      'actions',
    ]);
    expect(table.visibleColumns()).toHaveLength(5);
  });

  it('removes hidden columns from the visible list only', () => {
    const { table } = makeTable({ columns: () => HIDDEN_COLUMNS });
    expect(table.columns()).toHaveLength(5);
    expect(table.visibleColumns().map((column) => column.id)).toEqual([
      'name',
      'dept',
      'salary',
      'actions',
    ]);
  });

  it('ignores a filter on a hidden column, because the user cannot see it', () => {
    const { table } = makeTable({ columns: () => HIDDEN_COLUMNS });
    table.filters.set([{ column: 'city', value: 'Cairo' }]);
    expect(table.rows()).toHaveLength(6);
  });

  it('does not search a hidden column either', () => {
    const { table } = makeTable({ columns: () => HIDDEN_COLUMNS });
    table.globalSearch.set('Cairo');
    expect(table.rows()).toHaveLength(0);
  });
});

describe('rows and pagination', () => {
  it('shows the whole data set on one page by default', () => {
    const { table } = makeTable();
    expect(table.page()).toBe(0);
    expect(table.pageSize()).toBe(25);
    expect(pageIds(table)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(table.total()).toBe(6);
    expect(table.pageCount()).toBe(1);
  });

  it('takes the page size from the options, not only from initialState', () => {
    // A top-level `pageSize` that is silently ignored is worse than no option:
    // the table renders 25 rows and the declaration says 10.
    const { table } = makeTable({ pageSize: 2 });
    expect(table.pageSize()).toBe(2);
    expect(table.pageCount()).toBe(3);
    expect(pageIds(table)).toEqual([1, 2]);
  });

  it('prefers a restored page size over the options default', () => {
    const { table } = makeTable({ pageSize: 5, initialState: { pageSize: 2 } });
    expect(table.pageSize()).toBe(2);
  });

  it('resets to the configured page size when no state was restored', () => {
    const { table } = makeTable({ pageSize: 2 });
    table.pageSize.set(5);
    table.resetState();
    expect(table.pageSize()).toBe(2);
  });

  it('pages the rows and numbers them from zero', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    expect(table.pageCount()).toBe(3);
    expect(pageIds(table)).toEqual([1, 2]);

    table.page.set(2);
    expect(pageIds(table)).toEqual([5, 6]);
    expect(table.pageRows().map((row) => row.index)).toEqual([4, 5]);
  });

  it('returns an empty page past the end rather than clamping the page', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    table.page.set(10);
    expect(table.pageRows()).toEqual([]);
    expect(table.page()).toBe(10);
    expect(table.total()).toBe(6);
    expect(table.pageCount()).toBe(3);
  });

  it('treats pageSize 0 as a single page instead of crashing', () => {
    const { table } = makeTable();
    table.pageSize.set(0);
    expect(pageIds(table)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(table.pageCount()).toBe(1);
  });

  it('reacts to a new data signal without a reload call', () => {
    const { table, data } = makeTable();
    data.set(EMPLOYEES.slice(0, 2));
    expect(table.total()).toBe(2);
    expect(pageIds(table)).toEqual([1, 2]);
  });

  it('reports an empty client table honestly', () => {
    const { table } = makeTable({}, []);
    expect(table.rows()).toEqual([]);
    expect(table.pageRows()).toEqual([]);
    expect(table.total()).toBe(0);
    expect(table.pageCount()).toBe(0);
    expect(table.spans().cells).toEqual([]);
    expect(table.spans().owner(0, 0)).toBeNull();
  });
});

describe('sorting, filtering and search', () => {
  it('re-sorts the rows and renumbers their index', () => {
    const { table } = makeTable();
    table.sorting.set([{ column: 'salary', direction: 'desc' }]);
    expect(ids(table)).toEqual([3, 6, 5, 1, 4, 2]);
    expect(table.rows().map((row) => row.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('filters and updates total and pageCount with the result', () => {
    const { table } = makeTable();
    table.filters.set([{ column: 'city', value: 'Cairo' }]);
    expect(ids(table)).toEqual([1, 3, 6]);
    expect(table.total()).toBe(3);
    expect(table.pageCount()).toBe(1);

    table.pageSize.set(2);
    expect(table.pageCount()).toBe(2);
  });

  it('searches across every data column', () => {
    const { table } = makeTable();
    table.globalSearch.set('mona');
    expect(ids(table)).toEqual([2]);
  });

  it('returns to page 0 when filtering changes the result set', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    table.page.set(2);
    expect(table.page()).toBe(2);

    table.filters.set([{ column: 'city', value: 'Cairo' }]);
    expect(table.page()).toBe(0);
  });

  it('returns to page 0 when the sort or the search changes', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    table.page.set(1);

    table.sorting.set([{ column: 'salary', direction: 'asc' }]);
    expect(table.page()).toBe(0);

    table.page.set(1);
    table.globalSearch.set('a');
    expect(table.page()).toBe(0);
  });

  it('keeps an explicitly set page until the result set changes again', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    table.filters.set([{ column: 'city', value: 'Cairo' }]);
    table.page.set(1);
    expect(table.page()).toBe(1);
    expect(pageIds(table)).toEqual([6]);
  });

  it('skips the client sort and filter stages when the caller owns them', () => {
    const { table } = makeTable({ manualFiltering: true, manualSorting: true });
    table.filters.set([{ column: 'city', value: 'Giza' }]);
    table.sorting.set([{ column: 'salary', direction: 'asc' }]);
    expect(ids(table)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('trusts rowCount and skips slicing when pagination is manual', () => {
    const { table } = makeTable(
      { rowCount: () => 100, manualPagination: true },
      EMPLOYEES.slice(0, 3),
    );
    expect(pageIds(table)).toEqual([1, 2, 3]);
    expect(table.total()).toBe(100);
    expect(table.pageCount()).toBe(4);

    table.page.set(2);
    expect(pageIds(table)).toEqual([1, 2, 3]);
  });
});

describe('request and state', () => {
  it('describes exactly what a server-mode fetch would need', () => {
    const { table } = makeTable();
    table.pageSize.set(2);
    table.sorting.set([{ column: 'salary', direction: 'desc' }]);
    table.filters.set([{ column: 'city', value: 'Cairo' }]);
    table.globalSearch.set('o');
    // Set the page last: every earlier write invalidates the linked page.
    table.page.set(1);

    expect(table.request()).toEqual({
      page: 1,
      pageSize: 2,
      sort: [{ column: 'salary', direction: 'desc' }],
      filters: [{ column: 'city', value: 'Cairo' }],
      search: 'o',
    });
  });

  it('serialises order, visibility and pinning from the column list', () => {
    const { table } = makeTable({ columns: () => HIDDEN_COLUMNS });
    const state = table.state();
    expect(state.order).toEqual(['name', 'city', 'dept', 'salary', 'actions']);
    expect(state.hidden).toEqual(['city']);
    expect(state.pinnedStart).toEqual(['name']);
    expect(state.pinnedEnd).toEqual(['salary']);
    expect(state.page).toBe(0);
    expect(state.pageSize).toBe(25);
    expect(state.selected).toEqual([]);
    expect(state.excluded).toEqual([]);
  });

  it('applies filters and the page together through setState', () => {
    const { table } = makeTable();
    table.setState({
      filters: [{ column: 'city', value: 'Cairo' }],
      pageSize: 1,
      page: 2,
    });
    expect(table.page()).toBe(2);
    expect(pageIds(table)).toEqual([6]);
  });

  it('round-trips a selection and an exclusion set', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.selection.select(2);
    table.selection.select(4);
    expect(table.state().selected).toEqual([2, 4]);

    table.selection.clear();
    expect(table.selection.count()).toBe(0);

    table.setState({ selected: [4, 2] });
    expect(table.selection.ids()).toEqual([2, 4]);

    table.setState({ excluded: [5] });
    expect(table.selection.mode()).toBe('exclude');
    expect(table.selection.count()).toBe(5);
    expect(table.selection.isSelected(5)).toBe(false);
    expect(table.state()).toMatchObject({ selected: [], excluded: [5] });
  });

  it('returns to the initial view from resetState', () => {
    const { table } = makeTable({
      selection: { mode: 'multi' },
      initialState: {
        pageSize: 2,
        sort: [{ column: 'salary', direction: 'asc' }],
        selected: [2],
      },
    });
    expect(table.pageSize()).toBe(2);
    expect(ids(table)[0]).toBe(2);
    expect(table.selection.ids()).toEqual([2]);

    table.pageSize.set(1);
    table.sorting.set([]);
    table.globalSearch.set('zzz');
    table.page.set(3);
    table.selection.clear();

    table.resetState();
    expect(table.pageSize()).toBe(2);
    expect(table.sorting()).toEqual([{ column: 'salary', direction: 'asc' }]);
    expect(table.globalSearch()).toBe('');
    expect(table.page()).toBe(0);
    expect(table.selection.ids()).toEqual([2]);
  });
});

describe('selection', () => {
  it('is off unless the options enable it', () => {
    const { table } = makeTable();
    expect(table.selection.enabled).toBe(false);
    expect(table.selection.multiple).toBe(false);
    expect(table.selection.isSelected(1)).toBe(false);

    table.selection.select(1);
    table.selection.toggle(2);
    table.selection.selectAll();
    expect(table.selection.ids()).toEqual([]);
    expect(table.selection.count()).toBe(0);
    expect(table.selection.mode()).toBe('include');
  });

  it('keeps selected ids in row order, not in click order', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.selection.select(3);
    table.selection.select(1);

    expect(table.selection.ids()).toEqual([1, 3]);
    expect(table.selection.count()).toBe(2);
    expect(table.selection.isSelected(3)).toBe(true);

    table.selection.deselect(1);
    expect(table.selection.ids()).toEqual([3]);

    table.selection.toggle(3);
    expect(table.selection.ids()).toEqual([]);
  });

  it('keeps a selection across pages', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.pageSize.set(2);

    table.selection.select(1);
    table.page.set(1);
    table.selection.select(3);

    expect(table.selection.ids()).toEqual([1, 3]);
    expect(table.selection.count()).toBe(2);
  });

  it('drops ids that leave the result set, so a hidden row is never acted on', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.selection.select(1);
    table.selection.select(3);

    table.filters.set([{ column: 'city', value: 'Giza' }]);
    expect(table.selection.ids()).toEqual([]);
    expect(table.selection.count()).toBe(0);

    // The pruning is permanent: restoring the rows does not resurrect the ids.
    table.filters.set([]);
    expect(table.selection.ids()).toEqual([]);
  });

  it('selects the filtered set with exclude mode instead of materialising ids', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.selection.selectAll('filtered');

    expect(table.selection.mode()).toBe('exclude');
    expect(table.selection.count()).toBe(6);
    expect(table.selection.ids()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(table.selection.isSelected(4)).toBe(true);

    table.selection.deselect(4);
    expect(table.selection.count()).toBe(5);
    expect(table.selection.isSelected(4)).toBe(false);
    expect(table.state().excluded).toEqual([4]);
  });

  it('re-includes the page when select-all is used again in exclude mode', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.selection.selectAll();
    table.selection.deselect(1);
    table.selection.deselect(2);
    expect(table.state().excluded).toEqual([1, 2]);

    table.selection.selectAllOnPage();
    expect(table.state().excluded).toEqual([]);
    expect(table.selection.count()).toBe(6);
  });

  it('selects only the current page for the page scope', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.pageSize.set(2);
    table.selection.selectAll('page');

    expect(table.selection.mode()).toBe('include');
    expect(table.selection.ids()).toEqual([1, 2]);
  });

  it('does nothing when select-all runs against an empty result', () => {
    const { table } = makeTable({ selection: { mode: 'multi' } });
    table.filters.set([{ column: 'city', value: 'Nowhere' }]);

    table.selection.selectAll();
    expect(table.selection.mode()).toBe('include');
    expect(table.selection.count()).toBe(0);
  });

  it('replaces the previous row in single mode and ignores select-all', () => {
    const { table } = makeTable({ selection: { mode: 'single' } });
    expect(table.selection.multiple).toBe(false);

    table.selection.select(1);
    table.selection.select(2);
    expect(table.selection.ids()).toEqual([2]);

    table.selection.selectAllOnPage();
    table.selection.selectAll();
    expect(table.selection.ids()).toEqual([2]);

    table.selection.toggle(2);
    expect(table.selection.ids()).toEqual([]);
  });
});

describe('spans', () => {
  it('builds the grid over the page rows, never across a page boundary', () => {
    const { table } = makeTable({ columns: () => SPAN_COLUMNS });
    table.pageSize.set(2);

    // Page 0 holds two "A" rows; the same run is 4 rows long in the full data,
    // so a 2-row rectangle proves the page is the input, not `rows()`.
    expect(table.spans().at(0, 2)).toEqual({ row: 0, column: 2, rowSpan: 2, colSpan: 1 });
    expect(table.spans().owner(1, 2)).toEqual({ row: 0, column: 2, rowSpan: 2, colSpan: 1 });
    expect(table.spans().owner(2, 0)).toBeNull();

    table.page.set(2);
    expect(table.spans().at(0, 2)).toEqual({ row: 0, column: 2, rowSpan: 2, colSpan: 1 });
  });

  it('numbers columns by the visible list, so a hidden column cannot shift a span', () => {
    const { table } = makeTable({ columns: () => HIDDEN_SPAN_COLUMNS });
    table.pageSize.set(2);

    // Visible: name, dept, salary, actions. dept is index 1, not 2.
    expect(table.spans().at(0, 1)).toEqual({ row: 0, column: 1, rowSpan: 2, colSpan: 1 });
    expect(table.spans().owner(0, 4)).toBeNull();
  });

  it('throws at construction when a column declares span together with merge', () => {
    expect(() =>
      createTable<Employee>(() => ({
        data: () => EMPLOYEES,
        columns: () => [
          {
            id: 'dept',
            accessor: (row: Employee) => row.dept,
            merge: 'equal',
            span: () => ({ rowSpan: 2 }),
          },
        ],
      })),
    ).toThrow(/declares both span and merge/);
  });
});

describe('row identity', () => {
  it('uses the row id by default and getRowId when given', () => {
    const { table } = makeTable();
    expect(ids(table)).toEqual([1, 2, 3, 4, 5, 6]);

    const named = makeTable({ getRowId: (row) => row.name });
    expect(named.table.rows()[0].id).toBe('Ahmed Ali');
  });

  it('generates a stable id per object and keeps it across rebuilds', () => {
    const rows = [{ name: 'a' }, { name: 'b' }];
    const table = createTable<{ name: string }>(() => ({
      data: () => rows,
      columns: () => [{ id: 'name', accessor: (row) => row.name }],
    }));

    const before = table.rows().map((row) => row.id);
    expect(before).toHaveLength(2);
    expect(before[0]).not.toBe(before[1]);

    // A re-sort rebuilds the row wrappers; the identity must survive.
    table.sorting.set([{ column: 'name', direction: 'desc' }]);
    expect(table.rows().map((row) => row.id)).toEqual([...before].reverse());
  });

  it('falls back to the primitive itself, which is documented', () => {
    const table = createTable<string>(() => ({
      data: () => ['a', 'b'],
      columns: () => [],
    }));
    expect(table.rows().map((row) => row.id)).toEqual(['a', 'b']);
  });
});

describe('server mode', () => {
  it('warns once that nothing is fetched and reads no rows', () => {
    const messages: string[] = [];
    const table = createTable<Employee>(() => ({
      data: () => [],
      columns: () => COLUMNS,
      server: {
        load: async () => ({ items: [], total: 0 }),
      },
      warn: (message) => messages.push(message),
    }));

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('server mode');
    expect(table.total()).toBe(0);
    expect(table.rows()).toEqual([]);
  });
});

describe('tableColumn', () => {
  const row = (person: Employee) => ({ id: person.id, data: person, index: 0 });

  it('defaults the id and the header to the key', () => {
    const column = tableColumn<Employee>().accessor('salary');
    expect(column.id).toBe('salary');
    expect(column.header).toBe('salary');
    expect(readCellValue(column, row(EMPLOYEES[0]))).toBe(900);
  });

  it('keeps an explicit header and the other definition fields', () => {
    const column = tableColumn<Employee>().accessor('salary', {
      header: 'Monthly salary',
      align: 'end',
      sortable: true,
    });
    expect(column.header).toBe('Monthly salary');
    expect(column.align).toBe('end');
    expect(column.sortable).toBe(true);
    expect(readCellValue(column, row(EMPLOYEES[2]))).toBe(1200);
  });

  it('builds a display column without an accessor', () => {
    const column = tableColumn<Employee>().display('actions', { header: 'Actions' });
    expect(column.id).toBe('actions');
    expect(column.header).toBe('Actions');
    expect(column.accessor).toBeUndefined();
  });

  it('freezes the factory and the columns it returns', () => {
    const factory = tableColumn<Employee>();
    expect(Object.isFrozen(factory)).toBe(true);
    expect(Object.isFrozen(factory.accessor('name'))).toBe(true);
    expect(Object.isFrozen(factory.display('actions'))).toBe(true);
  });
});
