import { describe, expect, it } from 'vitest';
import { report, toRecord, trimNode } from '../capture-a11y-tree.mjs';

/**
 * The snapshots are evidence, and evidence that photographs the wrong thing is
 * worse than none. These pin the two things the D85 addendum reads from them:
 * which node OWNS which (ids survive the renumbering), and whether anything
 * a menu may not own sits inside it.
 */

/** Minimal stand-ins for `Accessibility.getFullAXTree` nodes. */
const node = (nodeId: string, role: string, name = '', childIds: string[] = [], extra = {}) => ({
  nodeId,
  role: { value: role },
  name: { value: name },
  childIds,
  ...extra,
});

describe('trimNode', () => {
  it('keeps the state a reviewer reads and drops Chromium bookkeeping', () => {
    expect(
      trimNode({
        role: { value: 'menuitemradio' },
        name: { value: 'Paid' },
        ignored: false,
        backendDOMNodeId: 42,
        properties: [
          { name: 'checked', value: { value: 'true' } },
          { name: 'hasPopup', value: { value: 'menu' } },
          { name: 'invalid', value: { value: 'false' } },
          { name: 'valuetext', value: { value: 'ignored' } },
        ],
      }),
    ).toEqual({
      role: 'menuitemradio',
      name: 'Paid',
      properties: { checked: 'true', hasPopup: 'menu', invalid: 'false' },
    });
  });

  it('marks an ignored node instead of silently dropping it', () => {
    expect(trimNode({ role: { value: 'none' }, name: { value: '' }, ignored: true }).ignored).toBe(
      true,
    );
  });
});

describe('toRecord', () => {
  it('renumbers ids in tree order and rewrites every child reference', () => {
    const record = toRecord([
      node('27', 'menu', 'Options', ['40']),
      node('40', 'menuitemradio', 'Paid'),
    ]);
    expect(record).toEqual([
      { id: 'n0', role: 'menu', name: 'Options', childIds: ['n1'] },
      { id: 'n1', role: 'menuitemradio', name: 'Paid', childIds: [] },
    ]);
  });

  it('flags a dangling child id rather than pointing at the wrong node', () => {
    const record = toRecord([node('1', 'menu', '', ['9'])]);
    expect(record[0].childIds).toEqual(['?9']);
  });
});

describe('report', () => {
  it('lists the item roles a menu actually owns', () => {
    const [state] = report([
      {
        id: 'open',
        nodes: [
          { id: 'n0', role: 'menu', name: 'Options', childIds: ['n1'] },
          { id: 'n1', role: 'none', name: '', childIds: ['n2', 'n4'] },
          { id: 'n2', role: 'menuitemradio', name: 'A', childIds: ['n3'] },
          { id: 'n3', role: 'StaticText', name: 'A', childIds: [] },
          { id: 'n4', role: 'menuitemradio', name: 'B', childIds: [] },
        ],
      },
    ]);
    expect(state.menus).toEqual([
      { name: 'Options', items: ['menuitemradio', 'menuitemradio'], stray: [] },
    ]);
  });

  it('reports a searchbox inside the menu as stray', () => {
    const [state] = report([
      {
        id: 'searchable',
        nodes: [
          { id: 'n0', role: 'menu', name: 'Options', childIds: ['n1'] },
          { id: 'n1', role: 'searchbox', name: 'Search', childIds: [] },
        ],
      },
    ]);
    expect(state.menus[0].stray).toEqual(['searchbox']);
  });

  it('reads the searchbox name so the addendum can quote it', () => {
    const [state] = report([
      {
        id: 'open',
        nodes: [{ id: 'n0', role: 'searchbox', name: 'Search options', childIds: [] }],
      },
    ]);
    expect(state.searchboxes).toEqual([{ name: 'Search options' }]);
  });
});
