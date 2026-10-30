import { Component, signal } from '@angular/core';
import { RiviniaSelect } from '@rivinia/select';
import { RiviniaSelectComponent } from '@rivinia/select/ui';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/**
 * Select E2E fixture. Proves the 0.2.0 contract in a real browser:
 * single + multi, search, keyboard, theme isolation, accessible names.
 */
@Component({
  selector: 'e2e-select',
  imports: [RiviniaSelectComponent, RiviniaMenuComponent, RiviniaMenuItem],
  styles: [
    `
      .isolation-scope {
        --rv-menu-bg: rgb(255, 237, 213); /* peach: a menu theme */
      }
      .select-scope {
        --rv-select-bg: rgb(224, 242, 254); /* light-blue: a select theme */
        --rv-select-border: rgb(56, 189, 248);
        --rv-select-radius: 4px;
      }
      /*
       * Sizing fixtures. The design minimum is 10rem (160px): the floor is
       * capped by the container, so below it the container wins. Each cell
       * pins one side of that claim — comfortable, at the minimum, and below
       * it — and none of them may overflow.
       */
      .size-cell {
        margin-bottom: 1rem;
      }
      .size-cell--wide {
        width: 480px;
      }
      .size-cell--160 {
        width: 160px;
      }
      .size-cell--120 {
        width: 120px;
      }
    `,
  ],
  template: `
    <h1>Select</h1>

    <h2>Single</h2>
    <div class="isolation-scope">
      <rv-menu menuLabel="Actions menu">
        <button rv-menu-trigger>Menu</button>
        <div rv-menu-panel>
          <button rvMenuItem id="m1">Menu item one</button>
        </div>
      </rv-menu>
    </div>
    <div class="select-scope">
      <rv-select
        id="single-select"
        label="Invoice status"
        popupLabel="Invoice status options"
        [options]="singleOptions"
        [searchable]="true"
        (selectionChange)="singleValue.set($any($event))"
      />
    </div>
    <p data-testid="single-value">value={{ singleValue() }}</p>

    <h2>Multi</h2>
    <rv-select
      id="multi-select"
      [mode]="'multi'"
      [options]="multiOptions"
      (selectionChange)="multiValue.set($any($event))"
    />
    <p data-testid="multi-value">values={{ (multiValue() || []).join(',') }}</p>

    <!--
      RTL placement fixture. dir="rtl" sits on a WRAPPER, not on <html>, so the
      panel has to resolve direction from its ancestors. The wrapper is pinned
      to the RIGHT viewport edge, which is exactly where the old implementation
      used to fling the panel.
    -->
    <h2>RTL</h2>
    <div style="display: flex; justify-content: flex-end;">
      <div dir="rtl">
        <rv-select
          id="rtl-select"
          label="الدور"
          [options]="rtlOptions"
          (selectionChange)="rtlValue.set($any($event))"
        />
      </div>
    </div>
    <p data-testid="rtl-value">value={{ rtlValue() }}</p>

    <h2>Sizing</h2>
    <div class="size-cell size-cell--wide">
      <rv-select id="size-wide" [options]="shortOptions" />
    </div>
    <div class="size-cell size-cell--160">
      <rv-select id="size-160" [options]="shortOptions" />
    </div>
    <div class="size-cell size-cell--120">
      <rv-select id="size-120" [options]="longOptions" />
    </div>
  `,
})
export class SelectPage {
  readonly singleOptions = [
    { id: 'outstanding', label: 'Outstanding invoices' },
    { id: 'overdue', label: 'Overdue', disabled: true },
    { id: 'paid', label: 'Paid' },
  ];
  readonly multiOptions = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];
  readonly singleValue = signal<string | null>(null);
  readonly multiValue = signal<readonly string[] | null>(null);
  readonly rtlOptions = [
    { id: 'owner', label: 'Owner' },
    { id: 'admin', label: 'Admin' },
    { id: 'member', label: 'Member' },
  ];
  readonly rtlValue = signal<string | null>(null);
  readonly shortOptions = [{ id: 'paid', label: 'Paid' }];
  readonly longOptions = [{ id: 'outstanding', label: 'Outstanding invoices' }];
  readonly unusedController = new RiviniaSelect('single');
}
