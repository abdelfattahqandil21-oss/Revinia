import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/** Two menus on one page: state isolation + unique panel ids. */
@Component({
  selector: 'e2e-two',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <h1>Two menus</h1>
    <rv-menu [menu]="first" (picked)="picked.set('first=' + $event.id)" menuLabel="First menu">
      <button rv-menu-trigger>First</button>
      <div rv-menu-panel>
        <button rvMenuItem id="a1">Alpha one</button>
        <button rvMenuItem id="a2">Alpha two</button>
      </div>
    </rv-menu>
    <rv-menu [menu]="second" (picked)="picked.set('second=' + $event.id)" menuLabel="Second menu">
      <button rv-menu-trigger>Second</button>
      <div rv-menu-panel>
        <button rvMenuItem id="b1">Beta one</button>
        <button rvMenuItem id="b2">Beta two</button>
      </div>
    </rv-menu>
    <p data-testid="result">picked={{ picked() }}</p>
  `,
})
export class TwoPage {
  protected readonly first = new RiviniaMenu();
  protected readonly second = new RiviniaMenu();
  protected readonly picked = signal('(none)');
}
