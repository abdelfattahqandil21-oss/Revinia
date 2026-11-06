# Response envelopes and errors

Handle response envelopes and request errors.

[Back to @rivinia/http README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/http/v1.0.1/projects/http/README.md)

## Response envelopes and errors

By default, all JSON response bodies are returned raw, even when they contain
a field named `data`. To extract a payload, opt in on that call and provide a
key:

```ts
this.http.get<Trip[]>(url); // raw response body
this.http.get<Trip[]>(url, { unwrap: true, unwrapKey: 'data' });
```

The type contract requires `unwrapKey` when `unwrap: true`, and rejects a key
when unwrapping is off. Extraction is strict and single-level: the response
must be a non-null, non-array object with that own property. A missing key,
primitive/array/null body, or empty key throws `RiviniaHttpUnwrapError`;
it does not silently return the original body. Present values such as `null`,
`false`, `0`, and `''` are returned as-is. Nested data and sibling fields are
not modified. `unwrapAs<T>` performs the same one-level extraction outside a
request; its generic type is an unchecked cast, not runtime validation.

An optional envelope policy checks backend-declared failures before
unwrapping. The default keys are `isSuccess` and `error`; only an object whose
`isSuccess` value is exactly `false` is considered failed:

```ts
// Apply to JSON request paths made by this configured client.
provideRiviniaHttp({ envelope: {} });

// Or specify a per-request policy; it replaces the global policy.
this.http.get<Trip[]>(url, {
  envelope: { successKey: 'ok', errorKey: 'message' },
});
```

When a failure is detected, `RiviniaHttpEnvelopeError` is sent through the
Observable error channel or appears as the resource error. It carries the raw
`body` and failure `code`. Set `throwOnFailure: false` for a passive policy.
Policy validation runs before unwrapping, including on `getResponse` and
`postResponse`. Those full-response methods return raw `HttpResponse<T>`
(status, headers, and unwrapped body is not applied). `getBlob` and `getText`
also return raw bodies and do not run envelope validation.

The generic type does not validate the server response. For untrusted or
loosely typed APIs, validate the extracted value with `getResource`'s `parse`
hook, or validate in the Observable pipeline in app code. Do not log
`RiviniaHttpUnwrapError.body` or `RiviniaHttpEnvelopeError.body` without
considering that they may contain sensitive data.
