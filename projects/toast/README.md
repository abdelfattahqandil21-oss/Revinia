# @rivinia/toast

[![npm version](https://img.shields.io/npm/v/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)
[![license](https://img.shields.io/npm/l/@rivinia/toast.svg)](https://www.npmjs.com/package/@rivinia/toast)

A signal-based Angular toast queue with an optional ready-made UI.

```ts
import { Component } from '@angular/core';
import { injectRiviniaToast } from '@rivinia/toast';
import { RiviniaToastList } from '@rivinia/toast/ui';
@Component({ imports: [RiviniaToastList], template: '<rv-toast-list />' })
export class NotificationsComponent {
  readonly toast = injectRiviniaToast();
  save() { this.toast.show({ message: 'Changes saved', kind: 'success' }); }
}
```

## Why @rivinia/toast

- A signal-based queue handles timers, actions, deduplication, and overflow.
- The service can be used without rendering the optional list component.
- Package-specific tokens and shared theme tokens can both style the UI.

## Install

```bash
npm install @rivinia/toast
ng add @rivinia/toast
```

## Quick start

1. Install the package and configure its provider or schematic when required.
2. Use the entry point shown in the example above.
3. Render the list and show a notification from the screen.

## Two ways to use it

| Ready-made UI | Headless service |
| --- | --- |
| `@rivinia/toast/ui` | `@rivinia/toast` |

The UI and controller are independent; use either or combine them.

## Compatibility

| Angular | Node | Browser verification |
| --- | --- | --- |
| `^22.0.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` | Chromium and Firefox; native Safari not verified |

## Go further

| Topic | Read |
| --- | --- |
| Ready-made UI | [Ready-made UI](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/ready-made-ui.md) |
| Headless usage | [Headless usage](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/headless.md) |
| Theming | [Theming](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/theming.md) |
| Top layer and managed list | [Top layer and managed list](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/top-layer-and-managed-list.md) |
| API reference | [API reference](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/api.md) |
| Testing | [Testing](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/docs/toast/testing.md) |
