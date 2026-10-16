import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelect } from './rivinia-select';

const OPTIONS = [
  { id: 'outstanding', label: 'Outstanding invoices' },
  { id: 'overdue', label: 'Overdue', disabled: true },
  { id: 'paid', label: 'Paid' },
];

describe('RiviniaSelect (single)', () => {
  let select: RiviniaSelect;
  beforeEach(() => {
    select = new RiviniaSelect();
    for (const o of OPTIONS) select.registerOption(o);
  });

  it('starts empty and selects one value', () => {
    expect(select.mode).toBe('single');
    expect(select.value()).toBeNull();
    expect(select.select('paid')).toBe(true);
    expect(select.value()).toBe('paid');
    expect(select.selectedLabels()).toEqual(['Paid']);
  });

  it('refuses unknown and disabled ids', () => {
    expect(select.select('missing')).toBe(false);
    expect(select.select('overdue')).toBe(false);
    expect(select.value()).toBeNull();
  });

  it('filters by label, case- and accent-insensitive, keeping disabled visible', () => {
    select.setQuery('OVER');
    expect(select.filtered().map((o) => o.id)).toEqual(['overdue']);
    select.setQuery('invoices');
    expect(select.filtered().map((o) => o.id)).toEqual(['outstanding']);
    select.clearQuery();
    expect(select.filtered().length).toBe(3);
  });

  it('normalizes Arabic spelling (tashkeel, tatweel, alef forms)', () => {
    select.registerOption({ id: 'a', label: 'فواتير مستحقة' });
    select.registerOption({ id: 'b', label: 'أحمد' });
    select.setQuery('فواتير');
    expect(select.filtered().map((o) => o.id)).toContain('a');
    select.setQuery('فَوَاتِير');
    expect(select.filtered().map((o) => o.id)).toContain('a');
    select.setQuery('احمد');
    expect(select.filtered().map((o) => o.id)).toContain('b');
    select.clearQuery();
  });

  it('unregistering drops options and a dangling value', () => {
    select.select('paid');
    select.unregisterOption('paid');
    expect(select.value()).toBeNull();
    expect(select.options().length).toBe(2);
  });

  it('clears back to null', () => {
    select.select('paid');
    select.clear();
    expect(select.value()).toBeNull();
  });
});

describe('RiviniaSelect (multi)', () => {
  let select: RiviniaSelect;
  beforeEach(() => {
    select = new RiviniaSelect('multi');
    for (const o of OPTIONS) select.registerOption(o);
  });

  it('toggles values in pick order and reports selection', () => {
    expect(select.toggle('paid')).toBe(true);
    expect(select.toggle('outstanding')).toBe(true);
    expect(select.values()).toEqual(['paid', 'outstanding']);
    expect(select.isSelected('paid')).toBe(true);
    expect(select.toggle('paid')).toBe(true);
    expect(select.values()).toEqual(['outstanding']);
    expect(select.selectedLabels()).toEqual(['Outstanding invoices']);
  });

  it('refuses disabled ids and clears all', () => {
    expect(select.toggle('overdue')).toBe(false);
    expect(select.values()).toEqual([]);
    select.toggle('paid');
    select.clear();
    expect(select.values()).toEqual([]);
  });
});
