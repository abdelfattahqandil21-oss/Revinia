import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

interface Row {
  id: string;
  label: string;
  disabled: boolean;
}

/** Dynamic registry: add/remove/disable/empty/destroy at runtime. */
@Component({
  selector: 'e2e-dynamic',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <h1>Dynamic items</h1>
    <div class="toolbar">
      <button (click)="add()">Add item</button>
      <button (click)="remove()">Remove last</button>
      <button (click)="toggleDisabled()">Toggle all disabled</button>
      <button (click)="toggleEmpty()">Toggle empty</button>
      <button (click)="toggleMenu()">Toggle menu</button>
    </div>
    @if (showMenu()) {
      <rv-menu [menu]="menu" (picked)="picked.set($event.id)" menuLabel="Dynamic menu">
        <button rv-menu-trigger>Dynamic</button>
        <div rv-menu-panel>
          @if (!empty()) {
            @for (row of rows(); track row.id) {
              <button rvMenuItem [id]="row.id" [disabled]="row.disabled || allDisabled()">
                {{ row.label }}
              </button>
            }
          }
        </div>
      </rv-menu>
    }
    <p data-testid="result">picked={{ picked() }} count={{ menu.items().length }}</p>
  `,
})
export class DynamicPage {
  protected readonly menu = new RiviniaMenu();
  protected readonly picked = signal('(none)');
  protected readonly showMenu = signal(true);
  protected readonly empty = signal(false);
  protected readonly allDisabled = signal(false);
  protected readonly rows = signal<Row[]>([
    { id: 'one', label: 'One', disabled: false },
    { id: 'two', label: 'Two', disabled: false },
    { id: 'three', label: 'Three', disabled: true },
  ]);
  private next = 4;

  protected add(): void {
    const n = this.next++;
    this.rows.update((rows) => [...rows, { id: `item-${n}`, label: `Item ${n}`, disabled: false }]);
  }

  protected remove(): void {
    this.rows.update((rows) => rows.slice(0, -1));
  }

  protected toggleDisabled(): void {
    this.allDisabled.update((v) => !v);
  }

  protected toggleEmpty(): void {
    this.empty.update((v) => !v);
  }

  protected toggleMenu(): void {
    this.showMenu.update((v) => !v);
  }
}
