# Theming

Package-specific tokens and the shared Rivinia theme entry point.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/toast/v1.0.1/projects/toast/README.md)

### The library's own tokens

| Token               | Default                       | Applies to     |
| ------------------- | ----------------------------- | -------------- |
| `--rv-toast-bg`     | `#ffffff`                     | the toast      |
| `--rv-toast-fg`     | `#111111`                     | the toast      |
| `--rv-toast-muted`  | `#555555`                     | the kind rail  |
| `--rv-toast-border` | `#e0e0e0`                     | the toast      |
| `--rv-toast-radius` | `12px`                        | the toast      |
| `--rv-toast-shadow` | `0 12px 32px rgba(0,0,0,.32)` | the toast      |
| `--rv-toast-gap`    | `8px`                         | between toasts |
| `--rv-toast-width`  | `22rem`                       | the list       |
| `--rv-toast-z`      | `1000`                        | the list       |

The kind colours chain to the semantic layer too:

| Token                | Semantic token |
| -------------------- | -------------- |
| `--rv-toast-success` | `--rv-ok`      |
| `--rv-toast-error`   | `--rv-danger`  |
| `--rv-toast-info`    | `--rv-info`    |
| `--rv-toast-warning` | `--rv-warning` |

For shared semantic tokens and styling-stack setup, see [https://github.com/abdelfattahqandil21-oss/Rivinia theming guide](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/theme/v1.0.1/docs/theme/README.md).
