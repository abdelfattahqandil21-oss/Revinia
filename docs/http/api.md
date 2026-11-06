# API reference

Find the public entry points, symbols, and exports.

[Back to @rivinia/http README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/projects/http/README.md)

## Public API

| Export                        | Kind     | Purpose                                                                                                          |
| ----------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `provideRiviniaHttp(config?)` | provider | Sets `envelope` and optional `httpFeatures`; no global unwrap option.                                            |
| `RiviniaHttp`                 | class    | `get`, `post`, `put`, `patch`, `delete`, `getBlob`, `getText`, `getResponse`, `postResponse`, and `getResource`. |
| `injectRiviniaHttp()`         | function | Injection-context shorthand for `inject(RiviniaHttp)`.                                                           |
| `joinUrl(base, endpoint)`     | utility  | Removes one boundary slash when joining; absolute HTTP(S) endpoints pass through.                                |
| `unwrapAs(body, key)`         | utility  | Strict, single-level typed extraction.                                                                           |
| `extractKey(body, key)`       | utility  | Strict extraction without a generic cast.                                                                        |
| `RiviniaHttpUnwrapError`      | class    | Error for invalid or missing unwrap properties.                                                                  |
| `RiviniaHttpEnvelopeError`    | class    | Error for a failed configured response envelope.                                                                 |
| `RiviniaHttpConfig`           | type     | `envelope` and `httpFeatures` provider configuration.                                                            |
| `RiviniaEnvelopePolicy`       | type     | Success key, error key, and failure policy settings.                                                             |
| `RiviniaRequestOptions`       | type     | Options for requests that may unwrap.                                                                            |
| `RiviniaRawOptions`           | type     | Options for methods that never unwrap.                                                                           |
| `RiviniaDeleteOptions`        | type     | Delete options including an optional request body.                                                               |
| `RiviniaDeleteRequestOptions` | type     | Delete options including the unwrap contract.                                                                    |
| `RiviniaRequestBase`          | type     | Shared transport and envelope options.                                                                           |
| `RiviniaResourceOptions`      | type     | Reactive resource options and unwrap contract.                                                                   |
| `RiviniaResourceBase`         | type     | Shared resource-specific options.                                                                                |
| `ReactiveInput`               | type     | Static value, signal, or reactive function input.                                                                |
| `QueryParamsInput`            | type     | `HttpParams` or a primitive-valued query object.                                                                 |
| `RiviniaUnwrapOn`             | type     | Required key form for `{ unwrap: true }`.                                                                        |
| `RiviniaUnwrapOff`            | type     | Form where an unwrap key is disallowed.                                                                          |


## License

MIT.
