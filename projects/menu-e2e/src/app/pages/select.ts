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
        menuLabel="Invoice status options"
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
  readonly unusedController = new RiviniaSelect('single');
}
