import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/** Viewport edges: bottom-pinned trigger flips; clipped ancestors escape. */
@Component({
  selector: 'e2e-edge',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  styles: [
    `
      .pinned {
        position: fixed;
        inset-inline-start: 24px;
        bottom: 12px;
      }
      .clip {
        overflow: hidden;
        max-width: 240px;
        border: 1px dashed #888;
        padding: 12px;
        margin-top: 16px;
      }
    `,
  ],
  template: `
    <h1>Viewport edges</h1>
    <div class="pinned">
      <rv-menu [menu]="edge" (picked)="picked.set('edge=' + $event.id)" menuLabel="Edge menu">
        <button rv-menu-trigger>Edge menu</button>
        <div rv-menu-panel>
          <button rvMenuItem id="e1">Edge one</button>
          <button rvMenuItem id="e2">Edge two</button>
          <button rvMenuItem id="e3">Edge three</button>
        </div>
      </rv-menu>
    </div>
    <div class="clip">
      <rv-menu [menu]="clip" (picked)="picked.set('clip=' + $event.id)" menuLabel="Clipped menu">
        <button rv-menu-trigger>Clipped ancestor</button>
        <div rv-menu-panel>
          <button rvMenuItem id="c1">Clip one</button>
          <button rvMenuItem id="c2">Clip two</button>
          <button rvMenuItem id="c3">Clip three</button>
        </div>
      </rv-menu>
    </div>
    <p data-testid="result">picked={{ picked() }}</p>
  `,
})
export class EdgePage {
  protected readonly edge = new RiviniaMenu();
  protected readonly clip = new RiviniaMenu();
  protected readonly picked = signal('(none)');
}
