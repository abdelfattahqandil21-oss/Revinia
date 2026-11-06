# @rivinia/modal

[![npm version](https://img.shields.io/npm/v/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)
[![license](https://img.shields.io/npm/l/@rivinia/modal.svg)](https://www.npmjs.com/package/@rivinia/modal)

An Angular modal manager with typed results, lifecycle policies, and optional ready-made UI.

```ts
const handle = this.manager.openModal<DeleteData, boolean>(this.deleteTemplate, {
  data: { id: user.id, name: user.name },
  ref: 'confirm-delete',
  metadata: { title: 'Delete user' },
  dismiss: { backdrop: 'static' },
});
const result = await handle.result;
if (result.status === 'confirmed' && result.value) this.removeUser(user.id);
```

## Why @rivinia/modal

- Modal data and results are typed from the call site to the consumer.
- Stack or queue admission and async dismissal guards are configurable.
- Core lifecycle is separate from the optional dialog components.

## Install

```bash
npm install @rivinia/modal
```

## Quick start

1. Install the package and configure its provider or schematic when required.
2. Use the entry point shown in the example above.
3. Mount the host and open a modal from the screen.

## Two ways to use it

| Ready-made UI | Headless manager |
| --- | --- |
| `@rivinia/modal/ui` | `@rivinia/modal` |

The UI and controller are independent; use either or combine them.

## Compatibility

| Angular | Node | Browser verification |
| --- | --- | --- |
| `^22.0.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` | Chromium and Firefox; native Safari not verified |

## Go further

| Topic | Read |
| --- | --- |
| Typed modals | [Typed modals](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/typed-modals.md) |
| Lifecycle and guards | [Lifecycle and guards](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/lifecycle-and-guards.md) |
| Ready-made UI | [Ready-made UI](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/ready-made-ui.md) |
| Theming | [Theming](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/theming.md) |
| Sizing and stacking | [Sizing and stacking](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/sizing-and-stacking.md) |
| API reference | [API reference](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/docs/modal/api.md) |
