import { describe, expect, it } from 'vitest';
import {
  ENTRY_POINTS,
  committedSnapshot,
  currentSurface,
  diffSurface,
  publishedNames,
} from '../api-surface.mjs';

/**
 * S8 freezes the public API of the four 1.0 packages. The freeze is a committed
 * list (`scripts/api-surface.snapshot.json`), and this spec is what makes it a
 * freeze rather than a document: a rename, an addition or a deletion in any of
 * the eight `public-api.ts` files fails here until someone updates the snapshot
 * on purpose.
 */

describe('the frozen surface', () => {
  it('still publishes exactly the names the freeze recorded', () => {
    expect(diffSurface(committedSnapshot(), currentSurface())).toEqual([]);
  });

  it('covers all eight entry points, at the counts docs/releases/1.0/API-SURFACE.md states', () => {
    const snapshot = committedSnapshot();
    expect(Object.keys(snapshot).sort()).toEqual(ENTRY_POINTS.map(([spec]) => spec).sort());
    expect(Object.fromEntries(Object.entries(snapshot).map(([k, v]) => [k, v.length]))).toEqual({
      '@rivinia/i18n': 35,
      '@rivinia/i18n/select': 5,
      '@rivinia/i18n/ui': 5,
      '@rivinia/menu': 6,
      '@rivinia/menu/ui': 11,
      '@rivinia/select': 7,
      '@rivinia/select/ui': 10,
      '@rivinia/theme': 0,
    });
  });
});

describe('publishedNames', () => {
  it('reports the alias, which is the name a consumer imports', () => {
    const src = `export {
  computeSelectPopupPosition as computeSelectPosition,
  SELECT_POPUP_GAP as SELECT_GAP,
} from './lib/utils/select-popup-position';`;
    expect(publishedNames(src)).toEqual(['SELECT_GAP', 'computeSelectPosition']);
  });

  it('reads a type-only list and a mixed `type` member', () => {
    expect(publishedNames('export type { A, B } from "./x";')).toEqual(['A', 'B']);
    expect(
      publishedNames(
        'export { RiviniaLanguageTrigger, type RiviniaLanguageTriggerContext } from "./x";',
      ),
    ).toEqual(['RiviniaLanguageTrigger', 'RiviniaLanguageTriggerContext']);
  });

  it('counts a re-export, which is still a published name', () => {
    expect(publishedNames("export type { RiviniaMenuItemData } from '@rivinia/menu';")).toEqual([
      'RiviniaMenuItemData',
    ]);
  });

  it('returns nothing for the entry point that exports nothing on purpose', () => {
    expect(publishedNames('/** ng-packagr needs a TypeScript root. */\nexport {};\n')).toEqual([]);
  });

  // A comment that names an export is not a second export: select's public-api
  // has a block comment saying "computeSelectPosition / SELECT_GAP".
  it('ignores names that only appear in a comment', () => {
    const src = `/* a consumer that imported \`computeFoo\` keeps working */
// export const bar = 1;
export { baz } from './x';`;
    expect(publishedNames(src)).toEqual(['baz']);
  });

  it('picks up a declaration made in the entry point itself', () => {
    expect(publishedNames('export const THING = 1;\nexport type Shape = string;')).toEqual([
      'Shape',
      'THING',
    ]);
  });
});

describe('diffSurface', () => {
  const committed = { '@rivinia/menu': ['RiviniaMenu', 'RiviniaMenuController'] };

  it('names a removed published name', () => {
    expect(diffSurface(committed, { '@rivinia/menu': ['RiviniaMenu'] })).toEqual([
      '@rivinia/menu: removed published name RiviniaMenuController',
    ]);
  });

  it('names a new published name', () => {
    expect(
      diffSurface(committed, {
        '@rivinia/menu': [...committed['@rivinia/menu'], 'injectRiviniaMenu'],
      }),
    ).toEqual(['@rivinia/menu: new published name injectRiviniaMenu']);
  });

  it('notices an entry point that stopped being listed', () => {
    expect(diffSurface(committed, {})).toEqual([
      '@rivinia/menu: the entry point is no longer listed',
    ]);
  });

  it('says nothing when only the order moved', () => {
    expect(
      diffSurface(committed, { '@rivinia/menu': committed['@rivinia/menu'].slice().reverse() }),
    ).toEqual([]);
  });
});
