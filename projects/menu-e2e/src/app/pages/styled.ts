import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/**
 * Consumer styling: CSS variables always win (primary API); state hooks
 * (`data-active`, `data-flipped`) are documented for the rest.
 */
@Component({
  selector: 'e2e-styled',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  styles: [
    `
      .peach {
        --rv-menu-bg: #ffedd5;
        --rv-menu-fg: #7c2d12;
        --rv-menu-radius: 4px;
      }
      .peach [rvmenuitem][data-active='true'] {
        outline: 2px dashed currentColor;
      }
    `,
  ],
  template: `
    <h1>Consumer styling</h1>
    <div class="peach">
      <rv-menu [menu]="menu" (picked)="picked.set($event.id)" label="Styled menu">
        <button rv-menu-trigger>Styled</button>
        <div rv-menu-panel>
          <button rvMenuItem id="s1">Styled one</button>
          <button rvMenuItem id="s2">Styled two</button>
        </div>
      </rv-menu>
    </div>
    <p data-testid="result">picked={{ picked() }}</p>
  `,
})
export class StyledPage {
  protected readonly menu = new RiviniaMenu();
  protected readonly picked = signal('(none)');
}
