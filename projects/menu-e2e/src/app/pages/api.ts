import { Component, signal } from '@angular/core';
import type { RiviniaMenuItemData } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/**
 * Proves the two public usage levels against the shipped package:
 * data-driven `[items]`, and composable projected markup.
 */
@Component({
  selector: 'e2e-api',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  styles: [
    `
      .brand-scope {
        --rv-menu-radius: 2px;
        --rv-menu-border: rgb(220, 38, 38);
      }
      .brand-row {
        text-transform: uppercase;
      }
    `,
  ],
  template: `
    <h1>Public API</h1>

    <h2>Level A — data-driven</h2>
    <div class="brand-scope">
      <rv-menu
        [items]="accountItems"
        panelClass="brand-panel"
        itemClass="brand-row"
        menuLabel="Data actions"
        (picked)="log('data=' + $event.id)"
      >
        <button rvMenuTrigger>Data</button>
      </rv-menu>
    </div>

    <h2>Level B — composable markup (camelCase projection)</h2>
    <rv-menu
      [placement]="'bottom-start'"
      menuLabel="Custom actions"
      (picked)="log('custom=' + $event.id)"
    >
      <button rvMenuTrigger>
        <img
          src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="
          alt=""
        />
        Account
      </button>
      <div rvMenuPanel>
        <div class="account-header">Sophie</div>
        <button rvMenuItem id="profile">Profile</button>
        <button rvMenuItem id="logout" disabled>Sign out</button>
      </div>
    </rv-menu>

    <p data-testid="api-result">picked={{ picked() }}</p>
  `,
})
export class ApiPage {
  protected readonly accountItems: readonly RiviniaMenuItemData[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'archived', label: 'Archived', disabled: true },
  ];
  protected readonly picked = signal('(none)');

  protected log(value: string): void {
    this.picked.set(value);
  }
}
