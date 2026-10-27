import type { ColumnDef, TableColumn } from '../models/table.models';

/**
 * The two ways a column is declared. `accessor` is a data column (it has a
 * value to sort, filter and span by); `display` is a rendering-only column
 * such as an action or a status chip.
 */
export interface TableColumnFactory<T> {
  /**
   * A data column bound to a key of the row.
   *
   * The id defaults to the key and the header to the id, so a column is a
   * one-liner until it needs to say something else — and the id stays the key
   * unless the definition overrides it... it cannot: `ColumnDef` omits `id`,
   * which keeps `state`, saved views and template slots referring to the same
   * string the data is bound to.
   */
  accessor<K extends keyof T & string>(
    key: K,
    definition?: ColumnDef<T, T[K]>,
  ): TableColumn<T, T[K]>;

  /**
   * A column with no accessor: a template, an action, a computed badge.
   *
   * It still has an id (that is what `rvTableCell="status"` and the state
   * round-trip refer to), but no value, so sorting and filtering skip it.
   */
  display(id: string, definition?: ColumnDef<T, unknown>): TableColumn<T>;
}

/**
 * Typed column factory: `tableColumn<Employee>()`.
 *
 * The factory exists instead of an object literal so `accessor('salary')` is
 * checked against the row type (`keyof T`) and the value type (`T[K]`) at the
 * call site — a misspelled key is a compile error, not an empty column. The
 * returned columns are frozen: a column list is configuration, and a mutation
 * after `createTable()` would silently disagree with the cached signals.
 */
export function tableColumn<T>(): TableColumnFactory<T> {
  const factory: TableColumnFactory<T> = {
    accessor<K extends keyof T & string>(
      key: K,
      definition?: ColumnDef<T, T[K]>,
    ): TableColumn<T, T[K]> {
      return Object.freeze({
        header: key,
        ...definition,
        id: key,
        accessor: (row: T): T[K] => row[key],
      });
    },

    display(id: string, definition?: ColumnDef<T, unknown>): TableColumn<T> {
      return Object.freeze({
        header: id,
        ...definition,
        id,
      });
    },
  };
  return Object.freeze(factory);
}
