/**
 * pnpm check:popup-ssr — S3, item 8: a server render of both popups does not use
 * `window` or `document`.
 *
 * This cannot be proved in a browser, and the shared Playwright suite
 * (`e2e/popup/conformance.spec.ts`) says so in its header: a browser always has
 * both globals, so the `typeof window === 'undefined'` server branch is never
 * taken there. Here the process is plain Node with no DOM installed, which is
 * what a server really is: the names are not defined at all, so any USE of them
 * — `document.addEventListener`, `window.innerWidth`, `'showPopover' in
 * HTMLElement.prototype` — raises a ReferenceError and fails the render.
 *
 * A `typeof` guard is not a use: it neither throws nor reads a value. That is the
 * distinction this check draws, and it is the one that matters, because a guard
 * that reads a name and returns early is exactly what correct SSR looks like.
 *
 * What is in scope: the state a server actually renders, i.e. the panel CLOSED.
 * Opening is a user interaction, so no server render opens it and the listener
 * registration path runs only its early return. The open-state half of the same
 * spec item — the three globals are added and then removed — is the browser
 * suite's destroy case, which counts them for real.
 *
 * `@angular/platform-server/init` is NOT imported: it deliberately installs
 * DOM-ish globals for third-party libraries, which would mask the very thing
 * under test.
 *
 * The code under test is the built library bundle (`dist/select`, `dist/menu`),
 * so this checks what ships, not source. Build first; the check never builds:
 *
 *   pnpm build:select && pnpm build:menu
 */
import { register } from 'node:module';

register('./popup-ssr-resolver.mjs', import.meta.url);

const failures = [];

function check(name, condition, measured) {
  const suffix = measured === undefined ? '' : ` — ${measured}`;
  if (condition) console.log(`  ok   ${name}${suffix}`);
  else {
    console.log(`  FAIL ${name}${suffix}`);
    failures.push(name);
  }
}

// Order matters: `@angular/common` and `@angular/platform-browser` are only
// partially compiled and ask core for the JIT facade the moment they are
// imported, so the compiler has to be in the registry before any of them loads.
await import('@angular/compiler');
const [
  { Component, provideZonelessChangeDetection },
  { bootstrapApplication },
  { provideServerRendering, renderApplication },
] = await Promise.all([
  import('@angular/core'),
  import('@angular/platform-browser'),
  import('@angular/platform-server'),
]);
const { RiviniaSelectComponent } = await import('@rivinia/select/ui');
const { RiviniaMenuComponent, RiviniaMenuItem } = await import('@rivinia/menu/ui');

/**
 * Render `template` as the root component's template on the server and return
 * the body markup, or the error. `unsafe` gives the host a constructor that
 * reads `document` — the negative control, without which "the render did not
 * throw" would be a claim about nothing.
 */
async function render(template, { unsafe = false } = {}) {
  class Host {
    constructor() {
      if (unsafe) this.probe = document.createElement('div');
    }
  }
  Component({
    selector: 'ssr-host',
    standalone: true,
    imports: [RiviniaSelectComponent, RiviniaMenuComponent, RiviniaMenuItem],
    template,
  })(Host);
  try {
    const html = await renderApplication(
      (context) =>
        bootstrapApplication(
          Host,
          { providers: [provideServerRendering(), provideZonelessChangeDetection()] },
          context,
        ),
      { url: '/', document: '<html><head></head><body><ssr-host></ssr-host></body></html>' },
    );
    // Only the body counts: Angular inlines the component stylesheets into the
    // document, and their class selectors would answer any "is this element
    // present" search with a lie.
    const body = html.slice(html.indexOf('<body>'));
    return { body, threw: null, error: '' };
  } catch (error) {
    return {
      body: '',
      threw: error,
      error: String(error && error.message ? error.message : error),
    };
  }
}

const SELECT = `<rv-select id="ssr-select" label="Invoice status" popupLabel="Invoice status options" [options]="[{value:'paid',label:'Paid'},{value:'due',label:'Due'}]" [searchable]="true" />`;
const MENU = `<rv-menu id="ssr-menu" menuLabel="Actions"><button rv-menu-trigger>Menu</button><div rv-menu-panel><button rvMenuItem id="s1">One</button></div></rv-menu>`;
const count = (text, needle) => (text.split(needle).length - 1).toString();

console.log('check:popup-ssr — server render of both popups, plain Node, no DOM');
console.log(
  `globals as a server sees them: typeof window = ${typeof window}, typeof document = ${typeof document}`,
);

// 1. The check can fail.
{
  const { threw, error, body } = await render('<p>unsafe</p>', { unsafe: true });
  check(
    'negative control: a host that uses document fails the render',
    threw !== null && body === '',
    `threw: ${threw ? error.slice(0, 80) : 'no (the check would be vacuous)'}`,
  );
}

// 2. The harness itself renders, so a later empty body means the component vanished.
{
  const result = await render('<p>hello</p>');
  check(
    'baseline: an empty host renders',
    result.threw === null && /hello/.test(result.body),
    `threw: ${result.threw ? result.error.slice(0, 200) : 'no'}, body ${result.body.length} chars`,
  );
}

// 3. The select popup.
{
  const result = await render(SELECT);
  check(
    'rv-select: renders server-side',
    result.threw === null,
    `threw: ${result.threw ? result.error.slice(0, 220) : 'no'}`,
  );
  check(
    'rv-select: the trigger is in the markup',
    /rv-select-trigger/.test(result.body),
    `present: ${/rv-select-trigger/.test(result.body)}`,
  );
  check(
    'rv-select: no panel element is mounted',
    !/class="[^"]*rv-select-popup-panel/.test(result.body),
    `panel elements: ${count(result.body, 'rv-select-popup-panel')}`,
  );
  // The searchable filter lives inside the panel, so a closed panel means no
  // filter either: this asserts the server render is the closed state, not a
  // half-mounted one.
  check(
    'rv-select: the filter is not mounted either',
    !/rv-select-search/.test(result.body),
    `filter elements: ${count(result.body, 'rv-select-search')}`,
  );
}

// 4. The menu panel.
{
  const result = await render(MENU);
  check(
    'rv-menu: renders server-side',
    result.threw === null,
    `threw: ${result.threw ? result.error.slice(0, 220) : 'no'}`,
  );
  check(
    'rv-menu: the trigger is in the markup',
    /rv-menu-trigger/.test(result.body),
    `present: ${/rv-menu-trigger/.test(result.body)}`,
  );
  check(
    'rv-menu: no positioned panel',
    !/data-positioned="true"/.test(result.body),
    `positioned: ${count(result.body, 'data-positioned="true"')}`,
  );
}

// 5. Both at once — the pairing D86 claims runs one rule.
{
  const result = await render(`${SELECT}\n${MENU}`);
  check(
    'both popups: render together',
    result.threw === null,
    `threw: ${result.threw ? result.error.slice(0, 220) : 'no'}`,
  );
  check(
    'both popups: both triggers present',
    /rv-select-trigger/.test(result.body) && /rv-menu-trigger/.test(result.body),
    `select ${/rv-select-trigger/.test(result.body)}, menu ${/rv-menu-trigger/.test(result.body)}`,
  );
}

if (failures.length) {
  console.log(`\ncheck:popup-ssr FAILED (${failures.length}): ${failures.join(' | ')}`);
  process.exit(1);
}
console.log('\ncheck:popup-ssr passed.');
