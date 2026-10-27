import { describe, expect, it } from 'vitest';
import type { TableColumn, TableRow } from '../src/lib/models/table.models';
import {
  applyFilters,
  applySearch,
  applySort,
  paginate,
  readCellValue,
} from '../src/lib/utils/table-pipeline';
import type { TablePage } from '../src/lib/utils/table-pipeline';

/*
 * The pipeline is pure data in, pure data out: filter -> search -> sort -> page.
 * These tests are the contract the controller's `computed` chain relies on,
 * including the identities it uses to skip downstream work (an empty search
 * must return the SAME array) and the rules a consumer sees in the UI (nulls
 * sort last in both directions, Arabic search ignores diacritics).
 */

interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly age: number;
  readonly joined: Date;
  readonly active: boolean;
  readonly manager: string | null;
}

const PEOPLE: readonly Person[] = [
  {
    id: 1,
    name: 'Ahmed Ali',
    city: 'Cairo',
    age: 34,
    joined: new Date('2020-01-15T00:00:00Z'),
    active: true,
    manager: null,
  },
  {
    id: 2,
    name: 'Mona Hassan',
    city: 'Giza',
    age: 28,
    joined: new Date('2022-06-01T00:00:00Z'),
    active: false,
    manager: 'Ahmed Ali',
  },
  {
    id: 3,
    name: 'Omar Said',
    city: 'Cairo',
    age: 45,
    joined: new Date('2015-03-10T00:00:00Z'),
    active: true,
    manager: 'Ahmed Ali',
  },
  {
    id: 4,
    name: 'Sara Nabil',
    city: 'Alexandria',
    age: 31,
    joined: new Date('2019-11-20T00:00:00Z'),
    active: true,
    manager: null,
  },
  {
    id: 5,
    name: 'Khaled Mostafa',
    city: 'Giza',
    age: 39,
    joined: new Date('2021-07-05T00:00:00Z'),
    active: false,
    manager: 'Omar Said',
  },
  {
    id: 6,
    name: 'أحمد محمّد',
    city: 'Cairo',
    age: 26,
    joined: new Date('2023-02-01T00:00:00Z'),
    active: true,
    manager: null,
  },
];

const ROWS: readonly TableRow<Person>[] = PEOPLE.map((person) => ({
  id: person.id,
  data: person,
  index: person.id - 1,
}));

const COLUMNS: readonly TableColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (row) => row.name },
  { id: 'city', header: 'City', accessor: (row) => row.city },
  { id: 'age', header: 'Age', accessor: (row) => row.age },
  { id: 'joined', header: 'Joined', accessor: (row) => row.joined },
  { id: 'active', header: 'Active', accessor: (row) => row.active },
  { id: 'manager', header: 'Manager', accessor: (row) => row.manager },
  { id: 'actions', header: 'Actions' },
];

const ids = (result: readonly TableRow<Person>[]): number[] =>
  result.map((row) => row.id as number);

function pickRows(idsToKeep: readonly number[]): readonly TableRow<Person>[] {
  return ROWS.filter((row) => idsToKeep.includes(row.id as number));
}

describe('readCellValue', () => {
  it('reads a key accessor from the row data', () => {
    const column: TableColumn<Person, string> = { id: 'name', accessor: 'name' };
    expect(readCellValue(column, ROWS[0])).toBe('Ahmed Ali');
  });

  it('reads a function accessor', () => {
    const column: TableColumn<Person, number> = { id: 'age', accessor: (row) => row.age };
    expect(readCellValue(column, ROWS[2])).toBe(45);
  });

  it('returns undefined for a display column, which holds no value', () => {
    const display: TableColumn<Person> = { id: 'actions', header: 'Actions' };
    expect(readCellValue(display, ROWS[0])).toBeUndefined();
  });

  it('reads a computed value, not only a field', () => {
    const column: TableColumn<Person, string> = {
      id: 'label',
      accessor: (row) => `${row.name} (${row.city})`,
    };
    expect(readCellValue(column, ROWS[1])).toBe('Mona Hassan (Giza)');
  });
});

describe('applyFilters', () => {
  it('returns the input array when there is no filter', () => {
    expect(applyFilters(ROWS, COLUMNS, [])).toBe(ROWS);
  });

  it.each([
    { label: 'empty string' as const, value: '' },
    { label: 'null' as const, value: null },
    { label: 'undefined' as const, value: undefined },
    { label: 'empty array' as const, value: [] },
  ])('treats $label as an inactive filter', ({ value }) => {
    expect(applyFilters(ROWS, COLUMNS, [{ column: 'city', value }])).toBe(ROWS);
  });

  it('matches a case-insensitive substring', () => {
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'city', value: 'cairo' }]))).toEqual([
      1, 3, 6,
    ]);
  });

  it('matches Arabic text without diacritics or hamza forms', () => {
    // The user types the name as they hear it; the data carries the written
    // form. Both sides are normalized with the same rules.
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'name', value: 'احمد' }]))).toEqual([6]);
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'name', value: 'محمد' }]))).toEqual([6]);
  });

  it('matches a number by value', () => {
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'age', value: 34 }]))).toEqual([1]);
  });

  it('matches a boolean by truthiness, so false is an active filter', () => {
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'active', value: false }]))).toEqual([2, 5]);
  });

  it('matches an exact Date timestamp', () => {
    const value = new Date('2020-01-15T00:00:00Z');
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'joined', value }]))).toEqual([1]);
  });

  it('matches one of several values', () => {
    expect(
      ids(applyFilters(ROWS, COLUMNS, [{ column: 'city', value: ['Giza', 'Alexandria'] }])),
    ).toEqual([2, 4, 5]);
  });

  it('matches an inclusive numeric range', () => {
    expect(
      ids(applyFilters(ROWS, COLUMNS, [{ column: 'age', value: { min: 30, max: 40 } }])),
    ).toEqual([1, 4, 5]);
  });

  it('matches a range with only one bound', () => {
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'age', value: { max: 30 } }]))).toEqual([
      2, 6,
    ]);
  });

  it('matches a range whose bounds are Dates', () => {
    const value = {
      min: new Date('2020-01-01T00:00:00Z'),
      max: new Date('2022-12-31T00:00:00Z'),
    };
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'joined', value }]))).toEqual([1, 2, 5]);
  });

  it('does not match a null cell against a range', () => {
    expect(ids(applyFilters(ROWS, COLUMNS, [{ column: 'manager', value: { min: 0 } }]))).toEqual(
      [],
    );
  });

  it('ANDs every active filter', () => {
    expect(
      ids(
        applyFilters(ROWS, COLUMNS, [
          { column: 'city', value: 'Cairo' },
          { column: 'age', value: { min: 30, max: 40 } },
        ]),
      ),
    ).toEqual([1]);
  });

  it('ignores a filter on an unknown column instead of emptying the table', () => {
    expect(applyFilters(ROWS, COLUMNS, [{ column: 'nope', value: 'x' }])).toBe(ROWS);
  });

  it('ignores a filter on an accessor-less column', () => {
    expect(applyFilters(ROWS, COLUMNS, [{ column: 'actions', value: 'edit' }])).toBe(ROWS);
  });

  it('ignores a filter on a column the visible list does not contain', () => {
    const visible = COLUMNS.filter((column) => column.id !== 'city');
    expect(applyFilters(ROWS, visible, [{ column: 'city', value: 'Cairo' }])).toBe(ROWS);
  });

  it('treats an unrecognised filter shape as identity, never as match-all', () => {
    expect(applyFilters(ROWS, COLUMNS, [{ column: 'age', value: { exact: 34 } }])).toEqual([]);
  });
});

describe('applySearch', () => {
  it('returns the input array for an empty or blank search', () => {
    expect(applySearch(ROWS, COLUMNS, '')).toBe(ROWS);
    expect(applySearch(ROWS, COLUMNS, '   ')).toBe(ROWS);
  });

  it('matches any column that has a value', () => {
    expect(ids(applySearch(ROWS, COLUMNS, 'cairo'))).toEqual([1, 3, 6]);
    expect(ids(applySearch(ROWS, COLUMNS, 'sara'))).toEqual([4]);
  });

  it('matches a row through its manager column', () => {
    expect(ids(applySearch(ROWS, COLUMNS, 'Ahmed Ali'))).toEqual([1, 2, 3]);
  });

  it('matches numbers as text', () => {
    expect(ids(applySearch(ROWS, COLUMNS, '34'))).toEqual([1]);
  });

  it('applies the Arabic normalization to the needle and the cells', () => {
    expect(ids(applySearch(ROWS, COLUMNS, 'احمد'))).toEqual([6]);
    expect(ids(applySearch(ROWS, COLUMNS, 'أحمد'))).toEqual([6]);
  });

  it('does not search display columns', () => {
    expect(ids(applySearch(ROWS, COLUMNS, 'actions'))).toEqual([]);
  });

  it('returns nothing when no column is searchable', () => {
    expect(applySearch(ROWS, [{ id: 'actions', header: 'Actions' }], 'anything')).toEqual([]);
  });

  it('skips null values without breaking the row', () => {
    expect(ids(applySearch(pickRows([1, 4]), COLUMNS, 'Ahmed'))).toEqual([1]);
  });
});

describe('applySort', () => {
  it('returns the input array when there is no sort level', () => {
    expect(applySort(ROWS, COLUMNS, [])).toBe(ROWS);
  });

  it('sorts numbers ascending and descending', () => {
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'age', direction: 'asc' }]))).toEqual([
      6, 2, 4, 1, 5, 3,
    ]);
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'age', direction: 'desc' }]))).toEqual([
      3, 5, 1, 4, 2, 6,
    ]);
  });

  it('sorts strings with numeric awareness', () => {
    const numbered = ['item 10', 'item 9', 'item 2'].map((name, index) => ({
      id: index,
      data: { name },
      index,
    }));
    const columns: readonly TableColumn<{ name: string }>[] = [
      { id: 'name', accessor: (row) => row.name },
    ];
    expect(
      applySort(numbered, columns, [{ column: 'name', direction: 'asc' }]).map(
        (row) => row.data.name,
      ),
    ).toEqual(['item 2', 'item 9', 'item 10']);
  });

  it('sorts Dates chronologically', () => {
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'joined', direction: 'asc' }]))).toEqual([
      3, 4, 1, 5, 2, 6,
    ]);
  });

  it('sorts booleans with false first', () => {
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'active', direction: 'asc' }]))).toEqual([
      2, 5, 1, 3, 4, 6,
    ]);
  });

  it('keeps nulls last in both directions', () => {
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'manager', direction: 'asc' }]))).toEqual([
      2, 3, 5, 1, 4, 6,
    ]);
    // Equal keys keep their source order even when the direction flips, so the
    // two "Ahmed Ali" rows stay 2 then 3 while "Omar Said" leads.
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'manager', direction: 'desc' }]))).toEqual([
      5, 2, 3, 1, 4, 6,
    ]);
  });

  it('is stable for equal keys', () => {
    // Booleans collapse into two groups; within a group the source order is
    // kept, so a re-render does not shuffle rows the user is looking at.
    expect(ids(applySort(ROWS, COLUMNS, [{ column: 'active', direction: 'desc' }]))).toEqual([
      1, 3, 4, 6, 2, 5,
    ]);
  });

  it('applies levels in order', () => {
    expect(
      ids(
        applySort(ROWS, COLUMNS, [
          { column: 'city', direction: 'asc' },
          { column: 'age', direction: 'desc' },
        ]),
      ),
    ).toEqual([4, 3, 1, 6, 5, 2]);
  });

  it('lets a column comparator win over the built-in comparison', () => {
    const columns: readonly TableColumn<Person>[] = [
      { id: 'age', accessor: (row) => row.age, comparator: (a, b) => Number(b) - Number(a) },
    ];
    expect(ids(applySort(ROWS, columns, [{ column: 'age', direction: 'asc' }]))).toEqual([
      3, 5, 1, 4, 2, 6,
    ]);
  });

  it('skips a level that references an unknown or accessor-less column', () => {
    expect(applySort(ROWS, COLUMNS, [{ column: 'nope', direction: 'asc' }])).toBe(ROWS);
    expect(applySort(ROWS, COLUMNS, [{ column: 'actions', direction: 'asc' }])).toBe(ROWS);
  });

  it('degrades to the runtime default for an invalid locale tag', () => {
    expect(() =>
      applySort(ROWS, COLUMNS, [{ column: 'name', direction: 'asc' }], 'not a locale!'),
    ).not.toThrow();
  });
});

describe('paginate', () => {
  it('slices the first page and reports the display range', () => {
    const page = paginate(ROWS, 0, 2);
    expect(ids(page.pageRows)).toEqual([1, 2]);
    expect(page).toMatchObject({ total: 6, pageCount: 3, start: 1, end: 2 });
  });

  it('slices the last, partial page', () => {
    const page = paginate(ROWS, 2, 2);
    expect(ids(page.pageRows)).toEqual([5, 6]);
    expect(page).toMatchObject({ total: 6, pageCount: 3, start: 5, end: 6 });
  });

  it('returns an empty page beyond the end instead of clamping the page', () => {
    const page = paginate(ROWS, 3, 2);
    expect(page.pageRows).toEqual([]);
    expect(page).toMatchObject({ total: 6, pageCount: 3, start: 0, end: 0 });
  });

  it('treats a negative page as the first page', () => {
    expect(ids(paginate(ROWS, -1, 2).pageRows)).toEqual([1, 2]);
  });

  it('floors a fractional page and page size', () => {
    expect(ids(paginate(ROWS, 1.9, 2.7).pageRows)).toEqual([3, 4]);
  });

  it('treats a non-positive page size as one page', () => {
    const zero = paginate(ROWS, 3, 0);
    expect(ids(zero.pageRows)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(zero).toMatchObject({ total: 6, pageCount: 1, start: 1, end: 6 });

    const negative = paginate(ROWS, 3, -5);
    expect(ids(negative.pageRows)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(negative.pageCount).toBe(1);
  });

  it('reports an empty table without inventing a page', () => {
    const page: TablePage<Person> = paginate([], 0, 25);
    expect(page.pageRows).toEqual([]);
    expect(page).toMatchObject({ total: 0, pageCount: 0, start: 0, end: 0 });
  });

  it('keeps a single row on one page', () => {
    const page = paginate(pickRows([4]), 0, 25);
    expect(ids(page.pageRows)).toEqual([4]);
    expect(page).toMatchObject({ total: 1, pageCount: 1, start: 1, end: 1 });
  });

  it('returns the page rows without touching the input array', () => {
    const page = paginate(ROWS, 1, 2);
    expect(page.pageRows).not.toBe(ROWS);
    expect(ROWS.map((row) => row.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
