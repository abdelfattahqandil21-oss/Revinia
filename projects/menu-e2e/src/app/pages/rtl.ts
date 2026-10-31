import { Component, signal } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

/** RTL page: logical placements mirror; keyboard order is unchanged. */
@Component({
  selector: 'e2e-rtl',
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <div dir="rtl">
      <h1>RTL menu</h1>
      <rv-menu
        [menu]="menu"
        [placement]="'bottom-end'"
        (picked)="picked.set($event.id)"
        menuLabel="قائمة الإجراءات"
      >
        <button rv-menu-trigger>الإجراءات</button>
        <div rv-menu-panel>
          <button rvMenuItem id="r1">الأول</button>
          <button rvMenuItem id="r2">الثاني</button>
          <button rvMenuItem id="r3">الثالث</button>
        </div>
      </rv-menu>
      <rv-menu
        [menu]="startMenu"
        [placement]="'bottom-start'"
        (picked)="picked.set('start=' + $event.id)"
        menuLabel="قائمة البداية"
      >
        <button rv-menu-trigger>البداية</button>
        <div rv-menu-panel>
          <button rvMenuItem id="s1">أول</button>
          <button rvMenuItem id="s2">ثاني</button>
        </div>
      </rv-menu>
      <p data-testid="result">picked={{ picked() }}</p>
    </div>
  `,
})
export class RtlPage {
  protected readonly menu = new RiviniaMenu();
  /** bottom-start in RTL aligns to the trigger's right edge (mirrored). */
  protected readonly startMenu = new RiviniaMenu();
  protected readonly picked = signal('(none)');
}
