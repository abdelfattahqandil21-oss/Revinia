import { isDevMode } from '@angular/core';
import type {
  CellSpan,
  SpanCell,
  SpanContext,
  SpanModel,
  TableColumn,
  TableRow,
} from '../models/table.models';
import { readCellValue } from './table-pipeline';

/**
 * Where span diagnostics go. A `warn` sink is injected rather than hard-coded
 * so a consumer can route the messages through its own logger, and a test can
 * assert them without touching the console.
 */
export interface SpanWarnOptions {
  readonly warn?: (message: string) => void;
}

/**
 * `buildSpanModel` options.
 *
 * `strict` exists because the same builder serves two callers with opposite
 * needs: `createTable()` validates its column list ONCE and may throw (a
 * conflicting declaration is a bug in code, not in data), while a render-time
 * rebuild must never throw — an app that swaps its columns at runtime would
 * otherwise blank the grid. Strict mode is the documented default; the
 * controller passes `strict: false` and lets `span` win, as the design says.
 */
export interface SpanBuildOptions extends SpanWarnOptions {
  /**
   * Throw when a column declares `span` together with `merge`/`colSpan`.
   * @default true
   */
  readonly strict?: boolean;
}

const NO_CELLS: readonly SpanCell[] = Object.freeze([]);

/**
 * A headless core may run under SSR, in a worker, or inside a test runner, so
 * the default sink is dev-mode only: it costs nothing in production and never
 * writes to a console the library does not own.
 */
function defaultWarn(message: string): void {
  if (isDevMode()) {
    console.warn(`[rivinia/table] ${message}`);
  }
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return value < min ? min : value > max ? max : value;
}

/**
 * Shared declaration checks.
 *
 * The span rules are mutually exclusive by design: `merge` and `colSpan` are
 * the simple path and compose into one rectangle, `span` is full manual
 * control. Accepting both would make the outcome depend on evaluation order,
 * which is exactly the kind of silent surprise a table cannot afford.
 */
function checkColumns<T>(
  columns: readonly TableColumn<T>[],
  warn: (message: string) => void,
  strict: boolean,
): void {
  for (const column of columns) {
    const conflicting =
      column.merge !== undefined ? 'merge' : column.colSpan !== undefined ? 'colSpan' : null;
    if (column.span !== undefined && conflicting !== null) {
      const message =
        `column "${column.id}" declares both span and ${conflicting}; ` +
        'use span alone for full control, or merge/colSpan for the simple path';
      if (strict) {
        throw new Error(`[rivinia/table] ${message}`);
      }
      warn(`${message}; span wins`);
    }
    if (column.merge !== undefined && column.accessor === undefined) {
      // A display column has no value to compare, so merging it would merge
      // every row "by accident". Warn once and render plain cells instead.
      warn(`column "${column.id}" declares merge but has no accessor; merge is ignored`);
    }
  }
}

/**
 * Validates a column list without touching any data. `createTable()` calls
 * this at construction so a conflicting declaration fails immediately — with
 * an actionable message — instead of at the first paint, and in production
 * too, because it is a defect in the column list rather than in the data.
 */
export function assertSpanColumns<T>(
  columns: readonly TableColumn<T>[],
  options?: SpanWarnOptions,
): void {
  checkColumns(columns, options?.warn ?? defaultWarn, true);
}

/**
 * Resolves `span` / `merge` / `colSpan` into the concrete span grid of the
 * given rows and columns.
 *
 * Semantics (ported from the validated prototype, 35/35 contract checks):
 * - only anchors exist; a covered position has no cell and, in the UI, no DOM;
 * - first claim wins: an overlapping later span is shrunk (width, then height)
 *   and reported, so a configuration hazard is never silent;
 * - row spans stop at the page (a page is a DOM boundary) and column spans at
 *   the visible range and at the pinned-region boundary;
 * - `Infinity` means "the rest of my region", resolved before integer checks;
 * - `0`, negatives, `NaN` and fractions are clamped to 1 with a warning, so a
 *   bad return value can never delete a cell;
 * - rows must already be the rendered order: a merge follows adjacency, so
 *   sorting legitimately starts a new run.
 *
 * The model is a dense matrix of owner indices, so `at()` / `owner()` are O(1)
 * and `move()` walks only the cells it skips.
 */
export function buildSpanModel<T>(
  rows: readonly TableRow<T>[],
  columns: readonly TableColumn<T>[],
  options?: SpanBuildOptions,
): SpanModel {
  const warn = options?.warn ?? defaultWarn;
  checkColumns(columns, warn, options?.strict ?? true);

  const rowCount = rows.length;
  const columnCount = columns.length;
  const hasRules = columns.some(
    (column) =>
      column.span !== undefined ||
      column.colSpan !== undefined ||
      (column.merge !== undefined && column.accessor !== undefined),
  );
  if (!hasRules || rowCount === 0 || columnCount === 0) {
    return plainSpanModel(rowCount, columnCount);
  }

  const claimed = new Uint8Array(rowCount * columnCount);
  const owners = new Int32Array(rowCount * columnCount).fill(-1);
  const cells: SpanCell[] = [];

  /** Resolves one cell's request. `span` wins over `merge` / `colSpan`. */
  const resolve = (definition: TableColumn<T>, row: number, column: number): CellSpan => {
    const current = rows[row];
    const value = readCellValue(definition, current);

    const spanResolver = definition.span;
    if (spanResolver !== undefined) {
      const explicit = spanResolver(contextOf(current, definition, value, row, column));
      if (explicit !== null && explicit !== undefined) {
        return { rowSpan: explicit.rowSpan ?? 1, colSpan: explicit.colSpan ?? 1 };
      }
    }

    let rowSpan = 1;
    let colSpan = 1;

    /*
     * Row run. The anchor is the run's FIRST row and every candidate is
     * compared with it, never with its neighbour: that makes runs transitive
     * by construction (A = B and B = C cannot produce a run that excludes A).
     */
    const merge = definition.merge;
    if (merge !== undefined && definition.accessor !== undefined) {
      if (merge === 'equal') {
        // Nullish values never merge: an empty cell must not swallow the rows
        // below it, which is what an `undefined === undefined` run would do.
        if (!isNullish(value)) {
          let end = row;
          while (end + 1 < rowCount) {
            const candidate = readCellValue(definition, rows[end + 1]);
            if (isNullish(candidate) || !Object.is(candidate, value)) break;
            end++;
          }
          rowSpan = end - row + 1;
        }
      } else {
        const anchor = current.data;
        let end = row;
        while (end + 1 < rowCount && merge(rows[end + 1].data, anchor)) end++;
        rowSpan = end - row + 1;
      }
    }

    // The column half composes with the row half, so merge + colSpan is ONE
    // rectangle (a department cell covering its rows and its neighbour).
    const colSpanDefinition = definition.colSpan;
    if (colSpanDefinition !== undefined) {
      colSpan =
        typeof colSpanDefinition === 'function'
          ? colSpanDefinition(contextOf(current, definition, value, row, column))
          : colSpanDefinition;
    }

    return { rowSpan, colSpan };
  };

  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < columnCount; column++) {
      if (claimed[row * columnCount + column] !== 0) continue;
      const definition = columns[column];
      const requested = resolve(definition, row, column);

      let rowSpan = requested.rowSpan ?? 1;
      let colSpan = requested.colSpan ?? 1;
      // `Infinity` is resolved before the integer checks, so "the rest of the
      // region" is not a special case for every later stage.
      if (colSpan === Number.POSITIVE_INFINITY) colSpan = columnCount - column;

      if (!Number.isInteger(rowSpan) || rowSpan < 1) {
        warn(`column "${definition.id}" returned rowSpan ${rowSpan}; clamped to 1`);
        rowSpan = 1;
      }
      if (!Number.isInteger(colSpan) || colSpan < 1) {
        warn(`column "${definition.id}" returned colSpan ${colSpan}; clamped to 1`);
        colSpan = 1;
      }

      // A page is a DOM boundary and a pinned region is a sticky boundary;
      // a span may not cross either, so both are hard clamps (and silent:
      // they are the documented meaning of a request, not a hazard).
      rowSpan = Math.min(rowSpan, rowCount - row);
      colSpan = Math.min(colSpan, columnCount - column);

      const pinning = definition.pinned ?? null;
      for (let step = 1; step < colSpan; step++) {
        if ((columns[column + step].pinned ?? null) !== pinning) {
          colSpan = step;
          break;
        }
      }

      const wantedRowSpan = rowSpan;
      const wantedColSpan = colSpan;
      while (colSpan > 1 && !isFree(claimed, columnCount, row, column, rowSpan, colSpan)) {
        colSpan--;
      }
      while (rowSpan > 1 && !isFree(claimed, columnCount, row, column, rowSpan, colSpan)) {
        rowSpan--;
      }
      if (rowSpan !== wantedRowSpan || colSpan !== wantedColSpan) {
        warn(
          `column "${definition.id}" at row ${row} overlaps an existing span; ` +
            `shrunk from ${wantedRowSpan}x${wantedColSpan} to ${rowSpan}x${colSpan}`,
        );
      }

      const anchor = cells.length;
      cells.push({ row, column, rowSpan, colSpan });
      for (let r = row; r < row + rowSpan; r++) {
        for (let c = column; c < column + colSpan; c++) {
          claimed[r * columnCount + c] = 1;
          owners[r * columnCount + c] = anchor;
        }
      }
    }
  }

  // No column actually spanned: hand back the cheap model, not a matrix of
  // 1x1 anchors that every renderer would then have to walk.
  if (cells.length === rowCount * columnCount) {
    return plainSpanModel(rowCount, columnCount);
  }

  const ownerAt = (row: number, column: number): SpanCell | null => {
    if (row < 0 || row >= rowCount || column < 0 || column >= columnCount) return null;
    const index = owners[row * columnCount + column];
    return index < 0 ? null : cells[index];
  };

  return {
    cells,
    at(row, column) {
      const cell = ownerAt(row, column);
      return cell !== null && cell.row === row && cell.column === column ? cell : null;
    },
    owner: ownerAt,
    move(row, column, dRow, dColumn) {
      // A stale position (the page shrank under the UI) is clamped rather
      // than trusted: focus must never land outside the grid.
      if (dRow === 0 && dColumn === 0) {
        return { row: clamp(row, 0, rowCount - 1), column: clamp(column, 0, columnCount - 1) };
      }
      let currentRow = clamp(row, 0, rowCount - 1);
      let currentColumn = clamp(column, 0, columnCount - 1);
      for (;;) {
        const nextRow = currentRow + dRow;
        const nextColumn = currentColumn + dColumn;
        if (nextRow < 0 || nextRow >= rowCount || nextColumn < 0 || nextColumn >= columnCount) {
          return { row: currentRow, column: currentColumn };
        }
        const span = ownerAt(nextRow, nextColumn);
        if (span === null) return { row: nextRow, column: nextColumn };

        /*
         * Moving INSIDE a merged cell leaves it; moving INTO one lands on its
         * anchor. Without the first half, ArrowDown inside a 7-row merge would
         * walk the covered cells one at a time and focus could sit on a
         * position that has no rendered cell.
         */
        const inside =
          currentRow >= span.row &&
          currentRow < span.row + span.rowSpan &&
          currentColumn >= span.column &&
          currentColumn < span.column + span.colSpan;
        if (!inside) return { row: span.row, column: span.column };

        const jumpRow = dRow === 0 ? nextRow : dRow > 0 ? span.row + span.rowSpan : span.row - 1;
        const jumpColumn =
          dColumn === 0 ? nextColumn : dColumn > 0 ? span.column + span.colSpan : span.column - 1;
        if (jumpRow < 0 || jumpRow >= rowCount || jumpColumn < 0 || jumpColumn >= columnCount) {
          return { row: currentRow, column: currentColumn };
        }
        const jumped = ownerAt(jumpRow, jumpColumn);
        /*
         * Landing on a RENDERED cell ends the step, and an anchor is rendered:
         * one arrow press moves one logical row, so the anchor of the next run
         * is the destination. Re-entering the loop there would treat the anchor
         * as "inside a span" and walk through every following run — a merged
         * column would jump from run 1 to the last run in a single ArrowDown.
         * Only a COVERED cell (possible on a diagonal step into another span)
         * keeps walking, and then it lands on that span's anchor.
         */
        if (jumped === null || (jumped.row === jumpRow && jumped.column === jumpColumn)) {
          return { row: jumpRow, column: jumpColumn };
        }
        currentRow = jumpRow;
        currentColumn = jumpColumn;
      }
    },
  };
}

function contextOf<T>(
  row: TableRow<T>,
  column: TableColumn<T>,
  value: unknown,
  rowIndex: number,
  columnIndex: number,
): SpanContext<T> {
  return { row, column, value, rowIndex, columnIndex };
}

/** Rectangle test that ignores the anchor cell itself (always free by then). */
function isFree(
  claimed: Uint8Array,
  columnCount: number,
  row: number,
  column: number,
  rowSpan: number,
  colSpan: number,
): boolean {
  for (let r = row; r < row + rowSpan; r++) {
    for (let c = column; c < column + colSpan; c++) {
      if (r === row && c === column) continue;
      if (claimed[r * columnCount + c] !== 0) return false;
    }
  }
  return true;
}

/**
 * The model for a grid where nothing (or nothing that matters) spans.
 *
 * It is intentionally NOT a single shared constant: `move()` must clamp at the
 * edges, which needs the grid size. The expensive part — the two typed arrays
 * — is what the fast path skips; these three closures cost nothing per frame.
 */
function plainSpanModel(rowCount: number, columnCount: number): SpanModel {
  return {
    cells: NO_CELLS,
    at: () => null,
    owner: () => null,
    move(row, column, dRow, dColumn) {
      if (rowCount === 0 || columnCount === 0) return { row: 0, column: 0 };
      return {
        row: clamp(row + dRow, 0, rowCount - 1),
        column: clamp(column + dColumn, 0, columnCount - 1),
      };
    },
  };
}
