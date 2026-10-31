import { Component, computed, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

interface Language {
  id: string;
  label: string;
  dir: 'ltr' | 'rtl';
}

/**
 * Projected content: a language picker written entirely by the consumer.
 * The menu owns the panel, its trigger association and row behavior; the
 * filter field, the radio group and the shortcuts row are page markup.
 */
@Component({
  selector: 'e2e-content',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <h1>Language picker</h1>
    <p>Projected content: the panel hosts consumer markup next to menu rows.</p>
    <div class="toolbar">
      <button type="button" class="before" (click)="noop()">Before menu</button>
      <rv-menu [menu]="menu" menuLabel="Language" (picked)="choose($event.id)">
        <button type="button" rv-menu-trigger>Language: {{ currentLabel() }}</button>
        <div rv-menu-panel>
          <input
            class="filter"
            type="text"
            placeholder="Filter languages…"
            aria-label="Filter languages"
            [value]="query()"
            (input)="query.set($any($event.target).value)"
          />
          <div role="group" aria-label="Language">
            @for (lang of visible(); track lang.id) {
              <button rvMenuItem radio [id]="lang.id" [checked]="lang.id === current()">
                {{ lang.label }}
              </button>
            }
          </div>
          <button type="button" class="shortcuts" (keydown)="onShortcutsKey($event)">
            Keyboard shortcuts
          </button>
        </div>
      </rv-menu>
      <button type="button" class="after" (click)="noop()">After menu</button>
    </div>
    <p data-testid="result">picked={{ picked() }}</p>
  `,
})
export class ContentPage {
  protected readonly menu = new RiviniaMenu();
  protected readonly languages: readonly Language[] = [
    { id: 'en', label: 'English', dir: 'ltr' },
    { id: 'de', label: 'Deutsch', dir: 'ltr' },
    { id: 'ar', label: 'العربية', dir: 'rtl' },
  ];
  protected readonly current = signal('en');
  protected readonly query = signal('');
  protected readonly picked = signal('(none)');
  protected readonly currentLabel = computed(
    () => this.languages.find((lang) => lang.id === this.current())?.label ?? '',
  );
  protected readonly visible = computed(() => {
    const q = this.query().trim().toLocaleLowerCase();
    if (q === '') return this.languages;
    return this.languages.filter((lang) => lang.label.toLocaleLowerCase().startsWith(q));
  });

  protected choose(id: string): void {
    this.picked.set(id);
    this.query.set('');
    const lang = this.languages.find((item) => item.id === id);
    if (!lang) return;
    this.current.set(id);
    // Language switching belongs to the page, not to the menu.
    document.documentElement.lang = id;
    document.documentElement.dir = lang.dir;
  }

  /** A nested widget that keeps Escape for itself (`preventDefault()`). */
  protected onShortcutsKey(event: KeyboardEvent): void {
    if (event.key === 'Escape') event.preventDefault();
  }

  protected noop(): void {}
}
