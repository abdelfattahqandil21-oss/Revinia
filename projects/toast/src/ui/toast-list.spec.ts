import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Toast } from '../lib/toast-types';
import type { RiviniaToastListManager } from '../../ui/src/lib/toast-list';
import { RiviniaToastList } from '../../ui/src/lib/toast-list';

function toast(id: number, message = `m${id}`): Toast {
  return {
    id,
    kind: 'info',
    message,
    duration: 5000,
    remaining: 5000,
    paused: false,
    action: null,
  };
}

class FakeManager implements RiviniaToastListManager {
  readonly items = signal<readonly Toast[]>([]);
  dismissed: number[] = [];
  actions: number[] = [];
  paused: number[] = [];
  resumed: number[] = [];

  readonly active = (): readonly Toast[] => this.items();
  show(): number | null {
    return null;
  }
  dismiss(id: number): boolean {
    this.dismissed.push(id);
    this.items.update((list) => list.filter((t) => t.id !== id));
    return true;
  }
  pause(id: number): boolean {
    this.paused.push(id);
    return true;
  }
  resume(id: number): boolean {
    this.resumed.push(id);
    return true;
  }
  runAction(id: number): boolean {
    this.actions.push(id);
    return true;
  }
}

@Component({
  standalone: true,
  imports: [RiviniaToastList],
  template: `<rv-toast-list [manager]="manager" [position]="'top-end'" />`,
})
class ListHarness {
  manager = new FakeManager();
}

@Component({
  standalone: true,
  imports: [RiviniaToastList],
  template: `<rv-toast-list [toasts]="items" (dismissed)="onDismiss($event)" />`,
})
class PresentationalHarness {
  items: readonly Toast[] = [toast(1), toast(2)];
  got: number[] = [];
  onDismiss(id: number): void {
    this.got.push(id);
  }
}

beforeEach(() => {
  TestBed.resetTestingModule();
  vi.useFakeTimers();
});

describe('RiviniaToastList (managed)', () => {
  it('renders one row per active toast with position and polite live regions', () => {
    const fixture = TestBed.createComponent(ListHarness);
    fixture.componentInstance.manager.items.set([toast(1), toast(2)]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('.rv-toast');
    expect(rows.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.rv-toasts')?.getAttribute('data-position')).toBe(
      'top-end',
    );
    expect(rows[0].getAttribute('role')).toBe('status');
  });

  it('routes X through manager.dismiss and hover through pause/resume', () => {
    const fixture = TestBed.createComponent(ListHarness);
    const manager = fixture.componentInstance.manager;
    manager.items.set([toast(7, 'hover me')]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const row: HTMLElement = fixture.nativeElement.querySelector('.rv-toast');
    row.dispatchEvent(new Event('mouseenter'));
    row.dispatchEvent(new Event('mouseleave'));
    expect(manager.paused).toEqual([7]);
    expect(manager.resumed).toEqual([7]);
    const close: HTMLButtonElement = fixture.nativeElement.querySelector('.rv-toast-close');
    close.click();
    expect(manager.dismissed).toEqual([7]);
  });

  it('keeps a leaving snapshot for the exit, then drops it (browser timers)', () => {
    const fixture = TestBed.createComponent(ListHarness);
    const manager = fixture.componentInstance.manager;
    manager.items.set([toast(9)]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rv-toast').length).toBe(1);
    manager.items.set([]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const leaving = fixture.nativeElement.querySelector('.rv-toast[data-state="leaving"]');
    expect(leaving).not.toBeNull();
    vi.advanceTimersByTime(200);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rv-toast').length).toBe(0);
  });

  it('runs actions through the manager (throws propagate, not swallowed)', () => {
    const fixture = TestBed.createComponent(ListHarness);
    const manager = fixture.componentInstance.manager;
    manager.items.set([{ ...toast(3), action: { label: 'Retry', onPress: () => {} } }]);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const action: HTMLButtonElement = fixture.nativeElement.querySelector('.rv-toast-action');
    action.click();
    expect(manager.actions).toEqual([3]);
  });
});

describe('RiviniaToastList (presentational)', () => {
  it('renders owned snapshots and emits instead of calling a manager', () => {
    const fixture = TestBed.createComponent(PresentationalHarness);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.rv-toast').length).toBe(2);
    const close: HTMLButtonElement = fixture.nativeElement.querySelector('.rv-toast-close');
    close.click();
    expect(fixture.componentInstance.got).toEqual([1]);
  });
});
