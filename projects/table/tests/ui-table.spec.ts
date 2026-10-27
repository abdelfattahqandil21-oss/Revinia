import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';

import type {
  SortState,
  SpanModel,
  TableColumn,
  TableRow,
  TableRowId,
} from '../src/lib/models/table.models';
import { buildSpanModel } from '../src/lib/utils/spans';
import { RiviniaTableComponent } from '../ui/src/lib/components/rv-table/rv-table';
import { RvTableCell } from '../ui/src/lib/components/rv-table/rv-table-cell';
import type {
  TableUiColumn,
  TableUiDensity,
  TableUiLabels,
  TableUiSelectionChange,
} from '../ui/src/lib/models/ui.types';

/*
 * The grid is tested through a real host component and real DOM events: the
 * inputs/outputs, the sort cycle, the roving tabindex, the spans and the ARIA
 * are all observable from the outside, so nothing reaches into the component.
 *
 * Two things are NOT mocked:
 *   - `buildSpanModel` — the shipped core resolver. The grid must render the
 *     real matrix (anchors only, covered positions absent), not a hand-made
 *     approximation of it.
 *   - keyboard events — dispatched on the focused element, so the component's
 *     own `event.target` and RTL detection are what the test exercises.
 *
 * jsdom has no layout: PageUp/PageDown therefore use the component's documented
 * fallback (10 rows) and nothing here asserts a pixel.
 */

interface Person {
  readonly id: number;
  readonly name: string;
  readonly city: string;
  readonly note: string;
}

const PEOPLE: readonly Person[] = [
  { id: 1, name: 'Alice', city: 'Cairo', note: 'First note' },
  { id: 2, name: 'Bob', city: 'Cairo', note: 'Second note' },
  { id: 3, name: 'Carol', city: 'Giza', note: 'Third note' },
  { id: 4, name: 'Dan', city: 'Giza', note: 'Fourth note' },
];

function tableRows(data: readonly Person[] = PEOPLE): readonly TableRow<Person>[] {
  return data.map((item, index) => ({ id: item.id, data: item, index }));
}

/**
 * Four visible columns, one hidden, one action column with no accessor.
 * All three text modes are present: name (default nowrap), city (wrap) and
 * note (clamp, 3 lines).
 */
function baseColumns(): TableColumn<Person>[] {
  return [
    { id: 'name', header: 'Name', accessor: 'name', width: '10rem' },
    {
      id: 'city',
      header: 'City',
      accessor: 'city',
      width: '8rem',
      textOverflow: 'wrap',
    },
    {
      id: 'note',
      header: 'Note',
      accessor: 'note',
      width: '12rem',
      textOverflow: 'clamp',
      lines: 3,
    },
    { id: 'secret', header: 'Secret', accessor: 'city', width: '4rem', hidden: true },
    { id: 'actions', header: 'Actions', width: '6rem' },
  ];
}

/** A merge column: Cairo covers rows 0-1, Giza covers rows 2-3. */
function mergeColumns(): TableColumn<Person>[] {
  return [
    { id: 'name', header: 'Name', accessor: 'name', width: '10rem' },
    { id: 'city', header: 'City', accessor: 'city', width: '8rem', merge: 'equal' },
    { id: 'note', header: 'Note', accessor: 'note', width: '12rem' },
    { id: 'actions', header: 'Actions', width: '6rem' },
  ];
}

/** A colSpan column: name always covers the city column beside it. */
function spanColumns(): TableColumn<Person>[] {
  return [
    { id: 'name', header: 'Name', accessor: 'name', width: '10rem', colSpan: 2 },
    { id: 'city', header: 'City', accessor: 'city', width: '8rem' },
    { id: 'note', header: 'Note', accessor: 'note', width: '12rem' },
    { id: 'actions', header: 'Actions', width: '6rem' },
  ];
}

@Component({
  selector: 'rv-table-test-host',
  imports: [RiviniaTableComponent, RvTableCell],
  template: `
    <rv-table
      [columns]="columns()"
      [rows]="rows()"
      [spans]="spans()"
      [loading]="loading()"
      [skeletonRows]="skeletonRows()"
      [error]="error()"
      [emptyMessage]="emptyMessage()"
      [rowKey]="rowKey()"
      [selectable]="selectable()"
      [(selected)]="selected"
      [(sort)]="sort"
      [density]="density()"
      [stickyHeader]="stickyHeader()"
      [totalRows]="totalRows()"
      [ariaLabel]="ariaLabel()"
      [labels]="labels()"
      (rowActivate)="activated.push($event)"
      (selectionChange)="selectionEvents.push($event)"
    >
      <ng-template rvTableCell="actions" let-row let-data="data" let-value="value">
        <button type="button" class="edit" (click)="edits.push(row.id)">
          Edit {{ data.name }}
        </button>
        <span class="edit-value">{{ value === undefined ? 'none' : value }}</span>
      </ng-template>
    </rv-table>
  `,
})
class TableHost {
  readonly columns = signal<TableUiColumn[]>(baseColumns());
  readonly rows = signal<readonly TableRow<Person>[]>(tableRows());
  readonly spans = signal<SpanModel | null>(null);
  readonly loading = signal(false);
  readonly skeletonRows = signal<number | 'auto'>('auto');
  readonly error = signal<unknown>(null);
  readonly emptyMessage = signal<string | undefined>(undefined);
  readonly rowKey = signal<((row: Person) => TableRowId) | undefined>(undefined);
  readonly selectable = signal(false);
  readonly selected = signal<ReadonlySet<TableRowId>>(new Set<TableRowId>());
  readonly sort = signal<readonly SortState[]>([]);
  readonly density = signal<TableUiDensity>('default');
  readonly stickyHeader = signal(true);
  readonly totalRows = signal<number | undefined>(undefined);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly labels = signal<Partial<TableUiLabels>>({});

  readonly activated: TableRow<Person>[] = [];
  readonly selectionEvents: TableUiSelectionChange[] = [];
  readonly edits: TableRowId[] = [];
}

/** A second host where a projected template overrides a column WITH an accessor. */
@Component({
  selector: 'rv-template-host',
  imports: [RiviniaTableComponent, RvTableCell],
  template: `
    <rv-table [columns]="columns" [rows]="rows" ariaLabel="People">
      <ng-template
        rvTableCell="city"
        let-row
        let-data="data"
        let-value="value"
        let-column="column"
      >
        <span class="city-template"
          >{{ column.id }}:{{ value }}:{{ data.name }}:{{ row.index }}</span
        >
      </ng-template>
      <ng-template rvTableCell="actions" let-row>
        <button type="button" class="open" (click)="opened.push(row.id)">Open</button>
      </ng-template>
    </rv-table>
  `,
})
class TemplateHost {
  /**
   * Typed exactly as a consumer would type it (`TableColumn<Person>[]`, the
   * core's own type). The template binds it straight into `[columns]`, which
   * is the real proof that a concrete column array is assignable to the grid's
   * renderer-facing `TableUiColumn` — the reason that type is not
   * `TableColumn<any>`.
   */
  readonly columns: readonly TableColumn<Person>[] = [
    { id: 'name', header: 'Name', accessor: 'name', width: '10rem' },
    { id: 'city', header: 'City', accessor: 'city', width: '8rem' },
    { id: 'actions', header: 'Actions', width: '6rem' },
  ];
  readonly rows = tableRows();
  readonly opened: TableRowId[] = [];
}

interface Mounted {
  readonly fixture: ComponentFixture<TableHost>;
  readonly host: TableHost;
  readonly el: HTMLElement;
  readonly table: HTMLElement;
  /** Re-queries, because a signal change replaces the child DOM. */
  readonly grid: () => HTMLElement;
  readonly headers: () => HTMLElement[];
  readonly rows: () => HTMLElement[];
  readonly cells: () => HTMLElement[];
  readonly cell: (row: number, column: number) => HTMLElement | null;
  /** The cell that currently owns the grid's single `tabindex="0"`. */
  readonly tabStops: () => HTMLElement[];
  readonly settle: () => void;
}

function mount(configure?: (host: TableHost) => void): Mounted {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TableHost] });
  const fixture = TestBed.createComponent(TableHost);
  const host = fixture.componentInstance;
  configure?.(host);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  const table = el.querySelector('rv-table') as HTMLElement;

  const grid = (): HTMLElement => {
    const element = el.querySelector('.rv-table-grid');
    if (!element) throw new Error('the grid is not rendered');
    return element as HTMLElement;
  };
  const headers = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('.rv-table-head-cell'));
  // Skeleton rows are `aria-hidden` placeholders, not rows the user can reach.
  const rows = (): HTMLElement[] =>
    Array.from(
      el.querySelectorAll<HTMLElement>(
        '.rv-table-body .rv-table-row:not(.rv-table-row--skeleton)',
      ),
    );
  const cells = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('.rv-table-body .rv-table-cell'));
  const cell = (row: number, column: number): HTMLElement | null =>
    el.querySelector<HTMLElement>(`.rv-table-body [data-rv-cell="${row}:${column}"]`);
  const tabStops = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>('[data-rv-cell][tabindex="0"]'));
  const settle = (): void => fixture.detectChanges();

  return { fixture, host, el, table, grid, headers, rows, cells, cell, tabStops, settle };
}

function mountTemplates(): {
  fixture: ComponentFixture<TemplateHost>;
  host: TemplateHost;
  el: HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [TemplateHost] });
  const fixture = TestBed.createComponent(TemplateHost);
  fixture.detectChanges();
  return {
    fixture,
    host: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
  };
}

function press(
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function click(target: Element, init: MouseEventInit = {}): void {
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, ...init }),
  );
}

function focusOn(target: HTMLElement): void {
  target.focus();
}

/** `data-rv-cell` of the focused element — `null` when focus is elsewhere. */
function activeCell(): string | null {
  const active = document.activeElement;
  return active instanceof HTMLElement ? active.getAttribute('data-rv-cell') : null;
}

function sortOf(column: string, direction: SortState['direction']): SortState {
  return { column, direction };
}

/**
 * jsdom's CSS parser folds `calc((10rem) + (8rem))` into `calc(18rem)`, so a
 * string comparison would assert the test environment rather than the library.
 * The per-column addends are already pinned by the `--rv-table-columns`
 * assertion; this resolves the total in either serialisation.
 */
function remTotal(value: string): number {
  return [...value.matchAll(/([\d.]+)rem/g)].reduce(
    (sum, match) => sum + Number(match[1]),
    0,
  );
}

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
});

// ── The grid itself ───────────────────────────────────────────────────────

describe('rv-table — structure and ARIA', () => {
  it('is a role="grid" of divs, never a table element', () => {
    const m = mount();
    expect(m.el.querySelector('table')).toBeNull();
    expect(m.grid().getAttribute('role')).toBe('grid');
    expect(m.cells().every((cell) => cell.tagName === 'DIV')).toBe(true);
    expect(
      m.cells().every((cell) => cell.getAttribute('role') === 'gridcell'),
    ).toBe(true);
    expect(
      m.headers().every((header) => header.getAttribute('role') === 'columnheader'),
    ).toBe(true);
  });

  it('declares the row and column counts, and names the grid', () => {
    const m = mount();
    const grid = m.grid();
    expect(grid.getAttribute('aria-colcount')).toBe('4');
    // Four data rows plus the header row, which WAI-ARIA counts as row 1.
    expect(grid.getAttribute('aria-rowcount')).toBe('5');
    expect(grid.getAttribute('aria-label')).toBe('Data grid');
    expect(grid.hasAttribute('aria-busy')).toBe(false);
    expect(grid.hasAttribute('aria-multiselectable')).toBe(false);
    expect(m.el.querySelectorAll('[role="rowgroup"]').length).toBe(2);
  });

  it('describes the keyboard contract with a hidden element', () => {
    const m = mount();
    const id = m.grid().getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const help = document.getElementById(id as string);
    expect(help).not.toBeNull();
    expect(help?.textContent).toContain('arrow keys');
    expect(help?.classList.contains('rv-table-sr-only')).toBe(true);
  });

  it('uses a consumer aria-label instead of the default one', () => {
    const m = mount((host) => host.ariaLabel.set('Invoices'));
    expect(m.grid().getAttribute('aria-label')).toBe('Invoices');
  });

  it('takes the accessible name from an aria-label on the host element', () => {
    // The attribute a consumer writes first: `<rv-table aria-label="…">` lands
    // on the host, not on the inner role="grid" element.
    @Component({
      selector: 'rv-table-attr-host',
      imports: [RiviniaTableComponent],
      template: `<rv-table aria-label="Invoices for March" [columns]="columns" [rows]="rows" />`,
    })
    class AttributeLabelHost {
      readonly columns = baseColumns();
      readonly rows = tableRows();
    }

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [AttributeLabelHost] });
    const fixture = TestBed.createComponent(AttributeLabelHost);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const grid = el.querySelector('.rv-table-grid');
    expect(grid?.getAttribute('aria-label')).toBe('Invoices for March');
    fixture.destroy();
  });

  it('numbers the header as row 1 and the data rows from 2', () => {
    const m = mount();
    const headerRow = m.el.querySelector('.rv-table-head [role="row"]');
    expect(headerRow?.getAttribute('aria-rowindex')).toBe('1');
    expect(m.rows().map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '2',
      '3',
      '4',
      '5',
    ]);
  });

  it('numbers every rendered cell with aria-colindex', () => {
    const m = mount();
    expect(
      m.rows().map((row) =>
        Array.from(row.querySelectorAll('[role="gridcell"]')).map((cell) =>
          cell.getAttribute('aria-colindex'),
        ),
      ),
    ).toEqual([
      ['1', '2', '3', '4'],
      ['1', '2', '3', '4'],
      ['1', '2', '3', '4'],
      ['1', '2', '3', '4'],
    ]);
  });

  it('hides hidden columns completely: no header, no cell, no column count', () => {
    const m = mount();
    expect(
      m.headers().map((header) => header.querySelector('.rv-table-head-label')?.textContent),
    ).toEqual(['Name', 'City', 'Note', 'Actions']);
    expect(m.el.textContent).not.toContain('Secret');
    expect(m.el.querySelector('[data-col="4"]')).toBeNull();
    expect(m.grid().getAttribute('aria-colcount')).toBe('4');
  });

  it('counts the full data set with totalRows when the consumer pages', () => {
    const m = mount((host) => host.totalRows.set(99));
    expect(m.grid().getAttribute('aria-rowcount')).toBe('100');
  });

  it('derives the row count from the rows’ absolute index', () => {
    const m = mount((host) =>
      host.rows.set(
        PEOPLE.map((item, index) => ({ id: item.id, data: item, index: 20 + index })),
      ),
    );
    expect(m.rows().map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      '22',
      '23',
      '24',
      '25',
    ]);
    expect(m.grid().getAttribute('aria-rowcount')).toBe('25');
  });
});

// ── Column geometry ───────────────────────────────────────────────────────

describe('rv-table — column geometry', () => {
  it('writes ONE column template that both the head and the body read', () => {
    const m = mount();
    const grid = m.grid();
    expect(grid.style.getPropertyValue('--rv-table-columns')).toBe(
      '10rem 8rem 12rem 6rem',
    );
    expect(grid.style.getPropertyValue('--rv-table-columns')).not.toContain('4rem');
    expect(remTotal(grid.style.getPropertyValue('min-inline-size'))).toBe(36);
  });

  it('keeps a flex column’s declared width as its floor', () => {
    const m = mount((host) =>
      host.columns.set([
        { id: 'name', header: 'Name', accessor: 'name', width: '10rem', flex: 1 },
        { id: 'city', header: 'City', accessor: 'city', width: '8rem' },
      ]),
    );
    expect(m.grid().style.getPropertyValue('--rv-table-columns')).toBe(
      'minmax(10rem, 1fr) 8rem',
    );
    expect(remTotal(m.grid().style.getPropertyValue('min-inline-size'))).toBe(18);
  });

  /**
   * A compile-time contract with a runtime witness: a consumer's own
   * `TableColumn<Person>[]` must be assignable to `[columns]`. This is the
   * line that fails if `TableUiColumn` ever becomes `TableColumn<any>` again —
   * `any` makes the accessor `string`, which a concrete `keyof Person` union
   * is not assignable to, so typed columns would be rejected at the boundary.
   */
  it('accepts a concretely typed column array', () => {
    const typed: readonly TableColumn<Person>[] = mergeColumns();
    const columns: readonly TableUiColumn[] = typed;
    const m = mount((host) => host.columns.set([...columns]));
    expect(m.headers().map((header) => header.textContent?.trim())).toEqual([
      'Name',
      'City',
      'Note',
      'Actions',
    ]);
  });
});

// ── Sorting ───────────────────────────────────────────────────────────────

describe('rv-table — sorting', () => {
  it('exposes aria-sort on sortable headers only', () => {
    const m = mount();
    expect(m.headers().map((header) => header.getAttribute('aria-sort'))).toEqual([
      'none',
      'none',
      'none',
      null,
    ]);
    expect(m.headers()[3].hasAttribute('data-sortable')).toBe(false);
  });

  it('cycles a click through ascending → descending → none', () => {
    const m = mount();
    const name = (): HTMLElement => m.headers()[0];

    click(name());
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('name', 'asc')]);
    expect(name().getAttribute('aria-sort')).toBe('ascending');
    expect(name().getAttribute('data-sort-direction')).toBe('asc');
    expect(
      name().querySelector('.rv-table-sort')?.getAttribute('data-direction'),
    ).toBe('asc');

    click(name());
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('name', 'desc')]);
    expect(name().getAttribute('aria-sort')).toBe('descending');
    expect(
      name().querySelector('.rv-table-sort')?.getAttribute('data-direction'),
    ).toBe('desc');

    click(name());
    m.settle();
    expect(m.host.sort()).toEqual([]);
    expect(name().getAttribute('aria-sort')).toBe('none');
    expect(
      name().querySelector('.rv-table-sort')?.getAttribute('data-direction'),
    ).toBe('none');
  });

  it('sorts from the keyboard with Enter and Space on the header cell', () => {
    const m = mount();
    focusOn(m.headers()[1]);
    m.settle();
    expect(activeCell()).toBe('-1:1');

    const enter = press(document.activeElement as HTMLElement, 'Enter');
    m.settle();
    expect(enter.defaultPrevented).toBe(true);
    expect(m.host.sort()).toEqual([sortOf('city', 'asc')]);

    press(document.activeElement as HTMLElement, ' ');
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('city', 'desc')]);

    press(document.activeElement as HTMLElement, 'Enter', { shiftKey: true });
    m.settle();
    expect(m.host.sort()).toEqual([]);
  });

  it('focuses the header cell (not the inner button) when clicked', () => {
    const m = mount();
    click(m.headers()[0]);
    m.settle();
    expect(activeCell()).toBe('-1:0');
    expect(m.tabStops().map((cell) => cell.getAttribute('data-rv-cell'))).toEqual([
      '-1:0',
    ]);
  });

  it('appends a secondary sort on Shift+click and ranks it', () => {
    const m = mount();
    click(m.headers()[0]);
    m.settle();
    click(m.headers()[1], { shiftKey: true });
    m.settle();

    expect(m.host.sort()).toEqual([
      sortOf('name', 'asc'),
      sortOf('city', 'asc'),
    ]);
    // aria-sort has no "secondary" value: only the primary column carries it.
    expect(m.headers()[0].getAttribute('aria-sort')).toBe('ascending');
    expect(m.headers()[1].getAttribute('aria-sort')).toBe('none');
    expect(m.headers()[0].hasAttribute('data-sort-rank')).toBe(false);
    expect(m.headers()[1].getAttribute('data-sort-rank')).toBe('2');
    expect(m.headers()[1].querySelector('.rv-table-sort-rank')?.textContent).toBe(
      '2',
    );

    click(m.headers()[1], { shiftKey: true });
    m.settle();
    expect(m.host.sort()).toEqual([
      sortOf('name', 'asc'),
      sortOf('city', 'desc'),
    ]);

    click(m.headers()[1], { shiftKey: true });
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('name', 'asc')]);
    expect(m.headers()[1].hasAttribute('data-sort-rank')).toBe(false);
  });

  it('makes a plain click on another column the only sort', () => {
    const m = mount();
    click(m.headers()[0]);
    m.settle();
    click(m.headers()[2]);
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('note', 'asc')]);
    expect(m.headers()[0].getAttribute('aria-sort')).toBe('none');
    expect(m.headers()[2].getAttribute('aria-sort')).toBe('ascending');
  });
});

// ── Spans ─────────────────────────────────────────────────────────────────

describe('rv-table — spans', () => {
  it('renders a row-spanning anchor once and no covered cell', () => {
    const m = mount((host) => {
      host.columns.set(mergeColumns());
      host.spans.set(buildSpanModel(host.rows(), mergeColumns()));
    });

    const anchor = m.cell(0, 1) as HTMLElement;
    expect(anchor.getAttribute('aria-rowspan')).toBe('2');
    expect(anchor.hasAttribute('aria-colspan')).toBe(false);
    expect(anchor.getAttribute('aria-colindex')).toBe('2');
    expect(anchor.getAttribute('data-span')).toBe('true');
    expect(anchor.style.gridRow).toBe('1 / span 2');
    expect(anchor.style.gridColumn).toBe('2 / span 1');

    // Row 1's city is covered: no element at all, and the row keeps the rest.
    expect(m.cell(1, 1)).toBeNull();
    expect(m.rows()[1].querySelectorAll('[role="gridcell"]').length).toBe(3);

    // Giza starts a second run on row 2, covering row 3.
    expect(m.cell(2, 1)?.getAttribute('aria-rowspan')).toBe('2');
    expect(m.cell(3, 1)).toBeNull();

    // 4 rows x 4 columns, minus the two covered positions.
    expect(m.cells().length).toBe(14);
    expect(m.el.querySelectorAll('[data-rv-cell="0:1"]').length).toBe(1);
  });

  it('renders a col-spanning anchor and starts the next cell after it', () => {
    const m = mount((host) => {
      host.columns.set(spanColumns());
      host.spans.set(buildSpanModel(host.rows(), spanColumns()));
    });

    const anchor = m.cell(0, 0) as HTMLElement;
    expect(anchor.getAttribute('aria-colspan')).toBe('2');
    expect(anchor.hasAttribute('aria-rowspan')).toBe(false);
    expect(anchor.style.gridColumn).toBe('1 / span 2');
    expect(anchor.style.gridRow).toBe('1 / span 1');

    // The city column is covered, so the next anchor is the note at column 3.
    expect(m.cell(0, 1)).toBeNull();
    expect(m.cell(0, 2)?.getAttribute('aria-colindex')).toBe('3');
    expect(
      m.rows()[0].querySelectorAll('[role="gridcell"]').length,
    ).toBe(3);
    expect(
      Array.from(m.rows()[0].querySelectorAll<HTMLElement>('[role="gridcell"]')).map(
        (cell) => cell.style.gridColumn,
      ),
    ).toEqual(['1 / span 2', '3 / span 1', '4 / span 1']);
  });

  it('moves the keyboard around a merged cell with spans.move()', () => {
    const m = mount((host) => {
      host.columns.set(mergeColumns());
      host.spans.set(buildSpanModel(host.rows(), mergeColumns()));
    });

    focusOn(m.cell(0, 1) as HTMLElement);
    m.settle();
    expect(activeCell()).toBe('0:1');

    // Moving down INSIDE the Cairo run leaves it entirely.
    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('2:1');

    // The Giza run ends at the last row: there is nowhere to go.
    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('2:1');

    // Moving up INTO a run lands on its anchor, never on a covered position.
    press(document.activeElement as HTMLElement, 'ArrowUp');
    m.settle();
    expect(activeCell()).toBe('0:1');
  });

  it('lands on the anchor when moving horizontally into a merged column', () => {
    const m = mount((host) => {
      host.columns.set(mergeColumns());
      host.spans.set(buildSpanModel(host.rows(), mergeColumns()));
    });

    focusOn(m.cell(0, 0) as HTMLElement);
    m.settle();
    press(document.activeElement as HTMLElement, 'ArrowRight');
    m.settle();
    expect(activeCell()).toBe('0:1');
  });
});

// ── Selection and activation ──────────────────────────────────────────────

describe('rv-table — selection and activation', () => {
  it('toggles a row on click and reports the row that moved', () => {
    const m = mount((host) => host.selectable.set(true));
    expect(m.grid().getAttribute('aria-multiselectable')).toBe('true');

    click(m.cell(0, 0) as HTMLElement);
    m.settle();
    expect(m.host.selected().has(1)).toBe(true);
    expect(m.rows()[0].getAttribute('aria-selected')).toBe('true');
    expect(m.rows()[1].getAttribute('aria-selected')).toBe('false');
    expect(m.host.selectionEvents.length).toBe(1);
    expect(m.host.selectionEvents[0].selected.has(1)).toBe(true);
    expect(m.host.selectionEvents[0].row?.id).toBe(1);

    click(m.cell(0, 0) as HTMLElement);
    m.settle();
    expect(m.host.selected().size).toBe(0);
    expect(m.rows()[0].getAttribute('aria-selected')).toBe('false');
    expect(m.host.selectionEvents.length).toBe(2);
  });

  it('toggles with Space on the focused cell', () => {
    const m = mount((host) => host.selectable.set(true));
    focusOn(m.cell(2, 1) as HTMLElement);
    m.settle();

    const event = press(document.activeElement as HTMLElement, ' ');
    m.settle();
    expect(event.defaultPrevented).toBe(true);
    expect(m.host.selected().has(3)).toBe(true);
    expect(m.rows()[2].getAttribute('aria-selected')).toBe('true');
  });

  it('draws one decorative selection indicator per row, never a nested control', () => {
    const m = mount((host) => host.selectable.set(true));
    const marks = (): Element[] => Array.from(m.el.querySelectorAll('.rv-table-select'));

    expect(marks().length).toBe(m.rows().length);
    expect(marks()[0].getAttribute('aria-hidden')).toBe('true');
    // A real checkbox would announce the same state twice and add a tab stop.
    expect((marks()[0] as HTMLElement).tagName).toBe('SPAN');
    expect(marks()[0].getAttribute('data-checked')).toBeNull();

    click(m.cell(0, 0) as HTMLElement);
    m.settle();
    expect(marks()[0].getAttribute('data-checked')).toBe('true');
    expect(marks()[1].getAttribute('data-checked')).toBeNull();

    // Nothing at all when selection is off.
    expect(mount().el.querySelectorAll('.rv-table-select').length).toBe(0);
  });

  it('adds no selection state at all when selectable is off', () => {
    const m = mount();
    click(m.cell(0, 0) as HTMLElement);
    m.settle();
    expect(m.host.selected().size).toBe(0);
    expect(m.rows()[0].hasAttribute('aria-selected')).toBe(false);
  });

  it('does not select a row when the click is inside a projected action', () => {
    const m = mount((host) => host.selectable.set(true));
    const button = m.cell(0, 3)?.querySelector<HTMLButtonElement>('button.edit');
    expect(button).not.toBeNull();

    click(button as HTMLButtonElement);
    m.settle();
    expect(m.host.edits).toEqual([1]);
    expect(m.host.selected().size).toBe(0);
    expect(m.host.selectionEvents.length).toBe(0);
  });

  it('uses rowKey as the selection identity', () => {
    const m = mount((host) => {
      host.selectable.set(true);
      host.rowKey.set((data) => `p-${data.id}`);
    });
    click(m.cell(1, 0) as HTMLElement);
    m.settle();
    expect([...m.host.selected()]).toEqual(['p-2']);
    expect(m.rows()[1].getAttribute('aria-selected')).toBe('true');
  });

  it('activates the row on Enter and on a double-click', () => {
    const m = mount();
    focusOn(m.cell(2, 1) as HTMLElement);
    m.settle();

    press(document.activeElement as HTMLElement, 'Enter');
    m.settle();
    expect(m.host.activated.map((row) => row.id)).toEqual([3]);

    m.cell(0, 0)?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    m.settle();
    expect(m.host.activated.map((row) => row.id)).toEqual([3, 1]);
  });

  it('never activates a row when the double-click belongs to an action', () => {
    const m = mount();
    const button = m.cell(0, 3)?.querySelector<HTMLButtonElement>('button.edit');
    button?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    m.settle();
    expect(m.host.activated).toEqual([]);
    expect(m.host.edits).toEqual([]);
  });
});

// ── Keyboard navigation ───────────────────────────────────────────────────

describe('rv-table — keyboard navigation', () => {
  it('keeps exactly one tab stop, on the first header cell', () => {
    const m = mount();
    expect(m.tabStops().map((cell) => cell.getAttribute('data-rv-cell'))).toEqual([
      '-1:0',
    ]);
    expect(
      m.el.querySelectorAll('[data-rv-cell][tabindex="-1"]').length,
    ).toBeGreaterThan(0);
  });

  it('moves through the header with the horizontal arrows', () => {
    const m = mount();
    focusOn(m.headers()[0]);
    m.settle();

    press(document.activeElement as HTMLElement, 'ArrowRight');
    m.settle();
    expect(activeCell()).toBe('-1:1');

    // At the last header there is nowhere to go.
    press(document.activeElement as HTMLElement, 'End');
    m.settle();
    expect(activeCell()).toBe('-1:3');
    press(document.activeElement as HTMLElement, 'ArrowRight');
    m.settle();
    expect(activeCell()).toBe('-1:3');

    press(document.activeElement as HTMLElement, 'Home');
    m.settle();
    expect(activeCell()).toBe('-1:0');
    press(document.activeElement as HTMLElement, 'ArrowLeft');
    m.settle();
    expect(activeCell()).toBe('-1:0');
  });

  it('moves between cells with arrows, Home/End and one tab stop', () => {
    const m = mount();
    focusOn(m.headers()[0]);
    m.settle();

    press(document.activeElement as HTMLElement, 'ArrowRight');
    m.settle();
    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('0:1');

    press(document.activeElement as HTMLElement, 'Home');
    m.settle();
    expect(activeCell()).toBe('0:0');

    press(document.activeElement as HTMLElement, 'End');
    m.settle();
    expect(activeCell()).toBe('0:3');

    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('1:3');
    expect(m.tabStops().map((cell) => cell.getAttribute('data-rv-cell'))).toEqual([
      '1:3',
    ]);

    // Left at the first column stays put (the active row is the second one).
    press(document.activeElement as HTMLElement, 'Home');
    m.settle();
    press(document.activeElement as HTMLElement, 'ArrowLeft');
    m.settle();
    expect(activeCell()).toBe('1:0');
  });

  it('clamps vertical movement at the page edges and returns to the header', () => {
    const m = mount();
    focusOn(m.cell(0, 0) as HTMLElement);
    m.settle();

    press(document.activeElement as HTMLElement, 'ArrowUp');
    m.settle();
    expect(activeCell()).toBe('-1:0');

    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('0:0');

    press(document.activeElement as HTMLElement, 'End');
    m.settle();
    for (let step = 0; step < 10; step++) {
      press(document.activeElement as HTMLElement, 'ArrowDown');
      m.settle();
    }
    expect(activeCell()).toBe('3:3');
  });

  it('pages by a screen (the 10-row fallback in jsdom)', () => {
    const m = mount();
    focusOn(m.cell(0, 0) as HTMLElement);
    m.settle();

    const down = press(document.activeElement as HTMLElement, 'PageDown');
    m.settle();
    expect(down.defaultPrevented).toBe(true);
    expect(activeCell()).toBe('3:0');

    press(document.activeElement as HTMLElement, 'PageUp');
    m.settle();
    expect(activeCell()).toBe('0:0');
  });

  it('jumps to the grid corners with Ctrl+Home and Ctrl+End', () => {
    const m = mount();
    focusOn(m.cell(1, 1) as HTMLElement);
    m.settle();

    press(document.activeElement as HTMLElement, 'End', { ctrlKey: true });
    m.settle();
    expect(activeCell()).toBe('3:3');

    press(document.activeElement as HTMLElement, 'Home', { ctrlKey: true });
    m.settle();
    expect(activeCell()).toBe('0:0');
  });

  it('ignores keys pressed inside a projected template control', () => {
    const m = mount((host) => host.selectable.set(true));
    const button = m.cell(0, 3)?.querySelector<HTMLButtonElement>('button.edit');
    focusOn(button as HTMLButtonElement);
    m.settle();

    const event = press(button as HTMLButtonElement, 'ArrowDown');
    m.settle();
    expect(event.defaultPrevented).toBe(false);
    expect(m.host.selected().size).toBe(0);
  });
});

describe('rv-table — keyboard navigation in RTL', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('dir', 'rtl');
  });

  it('mirrors the horizontal arrows and nothing else', () => {
    const m = mount();
    focusOn(m.headers()[0]);
    m.settle();

    // In a right-to-left grid the next column is drawn to the LEFT.
    press(document.activeElement as HTMLElement, 'ArrowLeft');
    m.settle();
    expect(activeCell()).toBe('-1:1');

    press(document.activeElement as HTMLElement, 'ArrowRight');
    m.settle();
    expect(activeCell()).toBe('-1:0');

    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('0:0');

    press(document.activeElement as HTMLElement, 'ArrowLeft');
    m.settle();
    expect(activeCell()).toBe('0:1');

    // Vertical movement is never mirrored.
    press(document.activeElement as HTMLElement, 'ArrowDown');
    m.settle();
    expect(activeCell()).toBe('1:1');
  });
});

// ── States ────────────────────────────────────────────────────────────────

describe('rv-table — states', () => {
  it('renders skeleton rows while loading and marks the grid busy', () => {
    const m = mount((host) => host.loading.set(true));
    expect(m.grid().getAttribute('aria-busy')).toBe('true');
    expect(m.table.getAttribute('data-loading')).toBe('true');
    expect(m.rows().length).toBe(0);
    // 'auto' mirrors the rendered rows: 4 rows x 4 visible columns.
    expect(m.el.querySelectorAll('.rv-table-skeleton').length).toBe(16);
    expect(m.el.querySelectorAll('.rv-table-row--skeleton').length).toBe(4);
    expect(m.el.querySelector('.rv-table-skeleton')?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(m.el.querySelector('p[role="status"]')?.textContent).toContain('Loading');

    // The header is still there and still sorts.
    expect(m.headers().length).toBe(4);
    click(m.headers()[0]);
    m.settle();
    expect(m.host.sort()).toEqual([sortOf('name', 'asc')]);
  });

  it("draws at least one skeleton row for an empty 'auto' grid", () => {
    const m = mount((host) => {
      host.loading.set(true);
      host.rows.set([]);
    });
    expect(m.el.querySelectorAll('.rv-table-row--skeleton').length).toBe(1);
    expect(m.el.querySelectorAll('.rv-table-skeleton').length).toBe(4);
  });

  it('honours an explicit skeletonRows count', () => {
    const m = mount((host) => {
      host.loading.set(true);
      host.skeletonRows.set(2);
    });
    expect(m.el.querySelectorAll('.rv-table-row--skeleton').length).toBe(2);
    expect(m.el.querySelectorAll('.rv-table-skeleton').length).toBe(8);
  });

  it('renders an error as an alert, keeps the header and hides the rows', () => {
    const m = mount((host) => host.error.set(new Error('Boom')));
    const state = m.el.querySelector('.rv-table-state');
    expect(state).not.toBeNull();
    expect(state?.getAttribute('role')).toBe('alert');
    expect(state?.getAttribute('data-state')).toBe('error');
    expect(state?.textContent).toContain('Boom');
    expect(m.rows().length).toBe(0);
    expect(m.headers().length).toBe(4);
  });

  it('falls back to the localized error text for a non-Error value', () => {
    const m = mount((host) => host.error.set(42));
    expect(m.el.querySelector('.rv-table-state')?.textContent).toContain(
      'could not be loaded',
    );
  });

  it('renders the empty state as a status, with emptyMessage as an override', () => {
    const m = mount((host) => host.rows.set([]));
    const state = m.el.querySelector('.rv-table-state');
    expect(state?.getAttribute('role')).toBe('status');
    expect(state?.getAttribute('data-state')).toBe('empty');
    expect(state?.textContent).toContain('No rows to show.');

    m.host.emptyMessage.set('Nothing matches');
    m.settle();
    expect(m.el.querySelector('.rv-table-state')?.textContent).toContain(
      'Nothing matches',
    );
  });

  it('switches the built-in text to Arabic from the page language', () => {
    document.documentElement.lang = 'ar';
    const m = mount((host) => host.rows.set([]));
    expect(m.grid().getAttribute('aria-label')).toBe('شبكة بيانات');
    expect(m.el.querySelector('.rv-table-state')?.textContent).toContain(
      'لا توجد صفوف',
    );
  });

  it('lets labels override any built-in string', () => {
    const m = mount((host) => {
      host.rows.set([]);
      host.labels.set({ grid: 'Invoices', empty: 'No invoices' });
    });
    expect(m.grid().getAttribute('aria-label')).toBe('Invoices');
    expect(m.el.querySelector('.rv-table-state')?.textContent).toContain(
      'No invoices',
    );
  });

  it('keeps the error and empty blocks outside the grid', () => {
    for (const prepare of [
      (host: TableHost) => host.error.set('nope'),
      (host: TableHost) => host.rows.set([]),
    ]) {
      const m = mount(prepare);
      expect(m.grid().querySelector('.rv-table-state')).toBeNull();
      expect(m.el.querySelector('.rv-table-scroller .rv-table-state')).not.toBeNull();
    }
  });
});

// ── Text overflow ─────────────────────────────────────────────────────────

describe('rv-table — text overflow', () => {
  it('applies the three modes per column', () => {
    const m = mount();
    const name = m.cell(0, 0)?.querySelector('.rv-table-text');
    const city = m.cell(0, 1)?.querySelector('.rv-table-text');
    const note = m.cell(0, 2)?.querySelector('.rv-table-text');

    expect(name?.getAttribute('data-overflow')).toBe('nowrap');
    expect(city?.getAttribute('data-overflow')).toBe('wrap');
    expect(note?.getAttribute('data-overflow')).toBe('clamp');
    expect(note?.getAttribute('style')).toContain('--rv-table-clamp-lines: 3');
  });

  it('lets each value pick its own direction, so an LTR name stays intact in RTL', () => {
    // Measured bug this pins: in an Arabic page, "Nile Trading Co." rendered
    // as ".Nile Trading Co" — bidi applies the RTL paragraph to the Latin run.
    const m = mount();
    const text = m.cell(0, 0)?.querySelector('.rv-table-text');
    expect(text?.getAttribute('dir')).toBe('auto');
    const header = m.headers()[0]?.querySelector('.rv-table-text');
    expect(header?.getAttribute('dir')).toBe('auto');
  });

  it('defaults a clamp column to two lines', () => {
    const m = mount((host) =>
      host.columns.set([
        { id: 'note', header: 'Note', accessor: 'note', textOverflow: 'clamp' },
      ]),
    );
    const text = m.cell(0, 0)?.querySelector('.rv-table-text');
    expect(text?.getAttribute('style')).toContain('--rv-table-clamp-lines: 2');
  });

  it('exposes the full text through aria-describedby and never a title', () => {
    const m = mount();
    const cell = m.cell(0, 0) as HTMLElement;
    expect(cell.hasAttribute('title')).toBe(false);

    const id = cell.getAttribute('aria-describedby');
    expect(id).toBeTruthy();
    const full = document.getElementById(id as string);
    expect(full).not.toBeNull();
    expect(full?.textContent).toBe('Alice');
    expect(full?.getAttribute('aria-hidden')).toBe('true');
    expect(full?.classList.contains('rv-table-sr-only')).toBe(true);
    expect(m.el.querySelector('[title]')).toBeNull();
  });

  it('does not describe a wrap cell or an empty value', () => {
    const m = mount();
    expect(m.cell(0, 1)?.hasAttribute('aria-describedby')).toBe(false);

    m.host.rows.set([{ id: 9, data: { id: 9, name: 'Empty', city: 'Cairo', note: '' }, index: 0 }]);
    m.settle();
    expect(m.cell(0, 2)?.hasAttribute('aria-describedby')).toBe(false);
    expect(m.cell(0, 2)?.querySelector('.rv-table-text')?.textContent).toBe('');
  });

  it('gives every rendered description a unique id', () => {
    const m = mount();
    const ids = Array.from(
      m.el.querySelectorAll('[aria-describedby]'),
      (element) => element.getAttribute('aria-describedby'),
    );
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(document.getElementById(id as string)).not.toBeNull();
    }
  });
});

// ── Projected cell templates ──────────────────────────────────────────────

describe('rv-table — projected cell templates', () => {
  it('renders a template by column id with the full context', () => {
    const m = mountTemplates();
    const city = m.el.querySelector('[data-rv-cell="0:1"]');
    expect(city?.querySelector('.city-template')?.textContent).toBe(
      'city:Cairo:Alice:0',
    );
    // A template WINS over the accessor: no plain text node is rendered.
    expect(city?.querySelector('.rv-table-text')).toBeNull();
  });

  it('renders an accessor-less action column from its template only', () => {
    const m = mountTemplates();
    const actions = m.el.querySelector('[data-rv-cell="0:2"]');
    const button = actions?.querySelector<HTMLButtonElement>('button.open');
    expect(button?.textContent).toContain('Open');

    click(button as HTMLButtonElement);
    expect(m.host.opened).toEqual([1]);
  });

  it('does not describe a template cell', () => {
    const m = mountTemplates();
    expect(
      m.el.querySelector('[data-rv-cell="0:1"]')?.hasAttribute('aria-describedby'),
    ).toBe(false);
  });
});

// ── Host hooks ────────────────────────────────────────────────────────────

describe('rv-table — host hooks and inputs', () => {
  it('reflects density, sticky, selectable and loading on the host', () => {
    const m = mount();
    expect(m.table.getAttribute('data-density')).toBe('default');
    expect(m.table.getAttribute('data-sticky')).toBe('true');
    expect(m.table.hasAttribute('data-selectable')).toBe(false);
    expect(m.table.hasAttribute('data-loading')).toBe(false);

    m.host.density.set('compact');
    m.host.stickyHeader.set(false);
    m.host.selectable.set(true);
    m.host.loading.set(true);
    m.settle();

    expect(m.table.getAttribute('data-density')).toBe('compact');
    expect(m.table.getAttribute('data-sticky')).toBe('false');
    expect(m.table.getAttribute('data-selectable')).toBe('true');
    expect(m.table.getAttribute('data-loading')).toBe('true');
  });

  it('re-renders when the columns change', () => {
    const m = mount((host) =>
      host.columns.set([
        { id: 'name', header: 'Full name', accessor: 'name', width: '12rem' },
      ]),
    );
    expect(m.headers().length).toBe(1);
    expect(m.headers()[0].textContent).toContain('Full name');
    expect(m.grid().getAttribute('aria-colcount')).toBe('1');
  });
});
