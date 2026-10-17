import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/** Basic action menu: the Level A path (owned controller, zero setup). */
@Component({
  selector: 'e2e-basic',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <h1>Basic action menu</h1>
    <rv-menu (picked)="picked.set($event.id)" label="Actions menu">
      <button rv-menu-trigger>Actions</button>
      <div rv-menu-panel>
        <button rvMenuItem id="new">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" /></svg>
          New file
        </button>
        <button rvMenuItem id="duplicate">Duplicate</button>
        <button rvMenuItem id="archived" [disabled]="true">Archived</button>
        <hr />
        <button rvMenuItem id="delete">Delete</button>
      </div>
    </rv-menu>
    <p data-testid="result">picked={{ picked() }}</p>
  `,
})
export class BasicPage {
  protected readonly picked = signal('(none)');
}
