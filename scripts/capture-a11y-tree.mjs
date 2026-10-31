#!/usr/bin/env node
/**
 * S2 evidence: capture the Chromium accessibility tree of the select in each
 * shipped state and write one JSON snapshot per state.
 *
 * The snapshots are what the D85 addendum argues from: `role="menu"` may only
 * own `menuitem*`/`group`/`separator`, so whether the filter box sits INSIDE
 * the menu is a fact of the tree, not of the DOM nesting alone.
 *
 *   node e2e/serve.mjs dist/menu-e2e/browser 4299 &
 *   node scripts/capture-a11y-tree.mjs [baseUrl] [outDir]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

/** AX properties worth keeping; everything else is Chromium noise here. */
const KEPT_PROPERTIES = new Set([
  'checked',
  'disabled',
  'expanded',
  'hasPopup',
  'focused',
  'controls',
  'selected',
  'readonly',
  'invalid',
  'required',
  'live',
  'level',
]);

/** Ids of the roles the ARIA spec allows a `menu` to own. */
export const MENU_CHILD_ROLES = new Set([
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'group',
  'separator',
]);

/** The states the spec names: single, multi, searchable, disabled, RTL. */
const STATES = [
  {
    id: 'single-closed',
    selector: '#single-select',
    prepare: async () => {},
  },
  {
    id: 'single-open',
    selector: '#single-select',
    prepare: async (page) => {
      await page.locator('#single-select .rv-select-trigger').click();
      await page.locator('#single-select .rv-select-popup-menu').waitFor({ state: 'visible' });
    },
  },
  {
    id: 'single-filtered',
    selector: '#single-select',
    prepare: async (page) => {
      await page.locator('#single-select .rv-select-trigger').click();
      await page.locator('#single-select .rv-select-search').fill('paid');
      await page
        .locator('#single-select .rv-select-popup-menu [role="menuitemradio"]')
        .first()
        .waitFor();
    },
  },
  {
    id: 'disabled-row',
    selector: '#single-select .rv-select-popup-menu [aria-disabled="true"]',
    prepare: async (page) => {
      await page.locator('#single-select .rv-select-trigger').click();
      await page.locator('#single-select .rv-select-popup-menu [aria-disabled="true"]').waitFor();
    },
  },
  {
    id: 'multi-open',
    selector: '#multi-select',
    prepare: async (page) => {
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await page.locator('#multi-select .rv-select-trigger').click();
      await page.locator('#multi-select .rv-select-popup-menu').waitFor({ state: 'visible' });
    },
  },
  {
    id: 'rtl-open',
    selector: '#rtl-select',
    prepare: async (page) => {
      await page.locator('#rtl-select .rv-select-trigger').click();
      await page.locator('#rtl-select .rv-select-popup-menu').waitFor({ state: 'visible' });
    },
  },
];

/**
 * Reduce one CDP AX node to the fields a reviewer needs. `childIds` is kept so
 * the ownership question ("is the searchbox a child of the menu?") stays
 * answerable from the file.
 */
export function trimNode(node) {
  const properties = {};
  for (const property of node.properties ?? []) {
    if (KEPT_PROPERTIES.has(property.name)) {
      properties[property.name] = property.value?.value ?? null;
    }
  }
  return {
    role: node.role?.value ?? null,
    name: node.name?.value ?? '',
    ...(node.description?.value ? { description: node.description.value } : {}),
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(node.ignored ? { ignored: true } : {}),
  };
}

/** Renumber CDP node ids onto stable `n<i>` ids, in tree order. */
export function toRecord(rawNodes) {
  const ids = new Map(rawNodes.map((node, index) => [String(node.nodeId), `n${index}`]));
  return rawNodes.map((node, index) => ({
    id: `n${index}`,
    ...trimNode(node),
    childIds: (node.childIds ?? []).map((childId) => ids.get(String(childId)) ?? `?${childId}`),
  }));
}

/** Per-state summary: which roles exist, and what each menu actually owns. */
export function report(states) {
  return states.map(({ id, nodes }) => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    return {
      id,
      roles: [...new Set(nodes.map((node) => node.role).filter(Boolean))].sort(),
      menus: nodes
        .filter((node) => node.role === 'menu')
        .map((menu) => {
          const items = descendants(menu, byId);
          return {
            name: menu.name,
            items: items.map((node) => node.role).filter((role) => role?.startsWith('menuitem')),
            // Anything semantic inside the menu that ARIA does not allow there.
            stray: items
              .map((node) => node.role)
              .filter((role) => role && !MENU_CHILD_ROLES.has(role) && !TRANSPARENT.has(role)),
          };
        }),
      searchboxes: nodes
        .filter((node) => node.role === 'searchbox')
        .map((node) => ({ name: node.name })),
    };
  });
}

/** Roles that carry no semantics by themselves (`none`/`presentation`/text). */
const TRANSPARENT = new Set(['none', 'generic', 'StaticText', 'InlineTextBox']);

function descendants(node, byId) {
  const found = [];
  const walk = (current) => {
    for (const childId of current.childIds) {
      const child = byId.get(childId);
      if (!child) continue;
      found.push(child);
      walk(child);
    }
  };
  walk(node);
  return found;
}

/** Snapshot the AX subtree rooted at `selector`; returns the raw CDP nodes. */
async function capture(page, client, selector) {
  const { root } = await client.send('DOM.getDocument', { depth: 0 });
  const { nodeId } = await client.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) throw new Error(`selector matched nothing: ${selector}`);
  // `getPartialAXTree` maps the DOM node onto its AX node; the subtree itself
  // comes from the full tree, walked from that AX node. (With
  // `fetchRelatives: false` Chromium returns only the node, not its children.)
  const partial = await client.send('Accessibility.getPartialAXTree', {
    nodeId,
    fetchRelatives: false,
  });
  const { nodes: all } = await client.send('Accessibility.getFullAXTree');
  const byId = new Map(all.map((node) => [String(node.nodeId), node]));
  const subtree = [];
  const walk = (axNode) => {
    if (!axNode || subtree.includes(axNode)) return;
    subtree.push(axNode);
    for (const childId of axNode.childIds ?? []) walk(byId.get(String(childId)));
  };
  walk(byId.get(String(partial.nodes[0].nodeId)));
  return subtree;
}

async function main() {
  const baseUrl = process.argv[2] ?? 'http://127.0.0.1:4299';
  const outDir = process.argv[3] ?? 'docs/a11y-snapshots';
  mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const captured = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    for (const state of STATES) {
      const page = await context.newPage();
      await page.goto(`${baseUrl}/select`);
      await state.prepare(page);
      const client = await context.newCDPSession(page);
      await client.send('Accessibility.enable');
      const nodes = toRecord(await capture(page, client, state.selector));
      const record = {
        state: state.id,
        capturedAt: new Date().toISOString(),
        url: `${baseUrl}/select`,
        browser: `Chromium ${browser.version()}`,
        viewport: page.viewportSize(),
        selector: state.selector,
        nodes,
      };
      writeFileSync(join(outDir, `${state.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
      captured.push({ id: state.id, nodes });
      await page.close();
    }
  } finally {
    await browser.close();
  }

  for (const state of report(captured)) {
    console.log(`\n${state.id}`);
    console.log(`  roles: ${state.roles.join(', ')}`);
    for (const menu of state.menus) {
      const stray = menu.stray.length > 0 ? ` (stray: ${menu.stray.join(', ')})` : '';
      console.log(`  menu "${menu.name}" owns: ${menu.items.join(', ') || '(no items)'}${stray}`);
    }
    for (const box of state.searchboxes) {
      console.log(`  searchbox "${box.name}"`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
