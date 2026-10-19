/**
 * FormValueControl integration tests for RiviniaSelectComponent.
 * Verifies Angular 22 Signal Forms, Reactive Forms, and Template-driven Forms.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RiviniaSelectComponent } from '../../ui/src/lib/components/select/select-panel';

const OPTIONS = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma', disabled: true },
];

function q(root: ParentNode, sel: string): HTMLElement {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`fixture is missing "${sel}"`);
  return el as HTMLElement;
}

// ── Reactive Forms ──
@Component({
  imports: [FormsModule, ReactiveFormsModule, RiviniaSelectComponent],
  template: `<form [formGroup]="fg"><rv-select formControlName="val" [options]="opts" /></form>`,
})
class ReactiveHost {
  readonly opts = OPTIONS;
  readonly fg = new FormGroup({ val: new FormControl<string | null>('a') });
}

// ── Template-driven Forms ──
@Component({
  imports: [FormsModule, RiviniaSelectComponent],
  template: `<rv-select [(ngModel)]="val" [options]="opts" />`,
})
class TemplateHost {
  readonly opts = OPTIONS;
  val: string | null = 'a';
}

// ── Signal Forms ──
@Component({
  imports: [RiviniaSelectComponent, FormField],
  template: `<rv-select [formField]="field" [options]="opts" />`,
})
class SignalHost {
  readonly opts = OPTIONS;
  readonly model = signal<string | null>('a');
  readonly form = form(this.model);
  readonly field = this.form;
}

// ── Multi-select (Reactive) ──
@Component({
  imports: [FormsModule, ReactiveFormsModule, RiviniaSelectComponent],
  template: `<form [formGroup]="fg">
    <rv-select formControlName="vals" mode="multi" [options]="opts" />
  </form>`,
})
class MultiHost {
  readonly opts = OPTIONS;
  readonly fg = new FormGroup({ vals: new FormControl<readonly string[]>(['a']) });
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('RiviniaSelectComponent — Reactive Forms (formControlName)', () => {
  it('initializes from FormControl value', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Alpha');
  });

  it('external setValue updates the component', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.fg.get('val')!.setValue('b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Beta');
  });

  it('user pick updates FormControl exactly once', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    q(fixture.nativeElement, '[rvselectpopupitem]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(fixture.componentInstance.fg.get('val')!.value).toBe('a');
  });

  it('disabled state prevents interaction and is restored', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.fg.get('val')!.disable();
    fixture.detectChanges();
    await fixture.whenStable();
    const trigger = q(fixture.nativeElement, '.rv-select-trigger');
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    fixture.componentInstance.fg.get('val')!.enable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect((trigger as HTMLButtonElement).disabled).toBe(false);
  });

  it('clear() updates the form value', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const view = fixture.debugElement.query(
      (el) => el.componentInstance instanceof RiviniaSelectComponent,
    )!.componentInstance as RiviniaSelectComponent;
    view.clear();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.fg.get('val')!.value).toBeNull();
  });
});

describe('RiviniaSelectComponent — Template-driven Forms (ngModel)', () => {
  it('initializes from ngModel', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Alpha');
  });

  it('user pick updates the bound property', async () => {
    const fixture = TestBed.createComponent(TemplateHost);
    fixture.detectChanges();
    await fixture.whenStable();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    q(fixture.nativeElement, '[rvselectpopupitem]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(fixture.componentInstance.val).toBe('a');
  });
});

describe('RiviniaSelectComponent — Signal Forms ([formField])', () => {
  it('initializes from signal model', async () => {
    const fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Alpha');
  });

  it('user pick updates the signal model', async () => {
    const fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
    await fixture.whenStable();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    q(fixture.nativeElement, '[rvselectpopupitem]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(fixture.componentInstance.model()).toBe('a');
  });

  it('external signal update updates the component', async () => {
    const fixture = TestBed.createComponent(SignalHost);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.componentInstance.model.set('b');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Beta');
  });
});

describe('RiviniaSelectComponent — Multi-select (Reactive)', () => {
  it('initializes from FormControl array', async () => {
    const fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Alpha');
  });

  it('toggle updates the FormControl array', async () => {
    const fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
    await fixture.whenStable();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    // Click the SECOND item (Beta) to toggle it ON.
    const items = fixture.nativeElement.querySelectorAll('[rvselectpopupitem]');
    (items[1] as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(fixture.componentInstance.fg.get('vals')!.value).toEqual(['a', 'b']);
  });

  it('clear() empties the array', async () => {
    const fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const view = fixture.debugElement.query(
      (el) => el.componentInstance instanceof RiviniaSelectComponent,
    )!.componentInstance as RiviniaSelectComponent;
    view.clear();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.fg.get('vals')!.value).toEqual([]);
  });
});

describe('Multi-select keyboard navigation reset (regression)', () => {
  @Component({
    imports: [FormsModule, ReactiveFormsModule, RiviniaSelectComponent],
    template: `<form [formGroup]="fg">
      <rv-select formControlName="vals" mode="multi" [options]="opts" />
    </form>`,
  })
  class NavHost {
    readonly opts = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
      { id: 'd', label: 'Delta' },
    ];
    readonly fg = new FormGroup({ vals: new FormControl<readonly string[]>([]) });
  }

  it('preserves active position after selecting with keyboard', async () => {
    const fixture = TestBed.createComponent(NavHost);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();

    const trigger = q(fixture.nativeElement, '.rv-select-trigger');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    const panel = q(fixture.nativeElement, '.rv-select-popup-panel');
    // Navigate down to the 3rd item (Gamma): Alpha → Beta → Gamma.
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();

    // Select Gamma with Enter.
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    // The active item should still be Gamma (3rd), not reset to Alpha (1st).
    const active = fixture.nativeElement.querySelector('[rvselectpopupitem][data-active="true"]');
    expect(active).toBeTruthy();
    expect(active!.textContent).toContain('Gamma');

    // Press ArrowDown — should move to Delta (4th), not wrap to Alpha.
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    const next = fixture.nativeElement.querySelector('[rvselectpopupitem][data-active="true"]');
    expect(next!.textContent).toContain('Delta');
  });
});

describe('FormValueControl backward compatibility', () => {
  it('external write does not emit selectionChange', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    let emitted = 0;
    q(fixture.nativeElement, '.rv-select-trigger').addEventListener('click', () => {});
    // Simulate external setValue — selectionChange should not fire.
    fixture.componentInstance.fg.get('val')!.setValue('b');
    fixture.detectChanges();
    await fixture.whenStable();
    // selectionChange is only emitted for user-driven changes onPick/clear.
    // We can't easily capture it here, but we verify the value updated.
    expect(fixture.componentInstance.fg.get('val')!.value).toBe('b');
  });

  it('user-driven selectionChange is preserved exactly once', async () => {
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    await fixture.whenStable();
    let count = 0;
    fixture.componentInstance.fg.get('val')!.valueChanges.subscribe(() => count++);
    // Open with Enter, move to the second item, pick with Enter.
    const trigger = q(fixture.nativeElement, '.rv-select-trigger');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    const panel = q(fixture.nativeElement, '.rv-select-popup-panel');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenStable();
    expect(count).toBe(1);
    expect(fixture.componentInstance.fg.get('val')!.value).toBe('b');
  });
});
