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
    <!-- Generated rows are <button>s: inside a form an implicit submit type
         would navigate away on every pick, so the submit count must stay 0. -->
    <form class="brand-scope" (submit)="onSubmit($event)">
      <rv-menu
        [items]="accountItems"
        panelClass="brand-panel"
        itemClass="brand-row"
        menuLabel="Data actions"
        (picked)="log('data=' + $event.id)"
      >
        <button type="button" rvMenuTrigger>Data</button>
      </rv-menu>
      <p data-testid="form-submits">submits={{ submits() }}</p>
    </form>

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
        <button rvMenuItem id="profile">
          <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 14c0-2.2 2.2-4 5-4s5 1.8 5 4" />
          </svg>
          Profile
        </button>
        <button rvMenuItem id="logout" disabled>Sign out</button>
      </div>
    </rv-menu>

    <h2>Level C — long labels wrap</h2>
    <rv-menu [items]="longItems" menuLabel="Long labels" (picked)="log('long=' + $event.id)">
      <button rvMenuTrigger>Long labels</button>
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
  protected readonly longItems: readonly RiviniaMenuItemData[] = [
    {
      id: 'archive',
      label: 'Move this conversation to a project folder and archive the original thread',
    },
    { id: 'pin', label: 'Pin' },
  ];
  protected readonly picked = signal('(none)');
  protected readonly submits = signal(0);

  protected log(value: string): void {
    this.picked.set(value);
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submits.update((count) => count + 1);
  }
}
