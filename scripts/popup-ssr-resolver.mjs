/**
 * Resolve hook for `check-popup-ssr.mjs`: maps the `@rivinia/*` specifiers the
 * built FESM files use onto the local `dist/` output, so Node can import them
 * without an alias installed in `node_modules`. Kept in its own file because a
 * module hook has to be registered before the imports it governs.
 */
import { existsSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolvePath(fileURLToPath(import.meta.url), '../..');

const MAP = {
  '@rivinia/select': 'dist/select/fesm2022/rivinia-select.mjs',
  '@rivinia/select/ui': 'dist/select/fesm2022/rivinia-select-ui.mjs',
  '@rivinia/menu': 'dist/menu/fesm2022/rivinia-menu.mjs',
  '@rivinia/menu/ui': 'dist/menu/fesm2022/rivinia-menu-ui.mjs',
  '@rivinia/popup': 'dist/popup/fesm2022/rivinia-popup.mjs',
};

export function resolve(specifier, context, next) {
  const target = MAP[specifier];
  if (!target) return next(specifier, context);
  const absolute = resolvePath(ROOT, target);
  if (!existsSync(absolute)) {
    throw new Error(
      `${specifier} is not built. Expected ${absolute}\nBuild it first: pnpm build:select && pnpm build:menu`,
    );
  }
  return { url: `file://${absolute}`, format: 'module', shortCircuit: true };
}
