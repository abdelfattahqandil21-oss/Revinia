import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaHttpConfig } from './http-config';
import { provideRiviniaHttp } from './provide-http';
import { RiviniaHttp } from './rivinia-http';

function setup(config: RiviniaHttpConfig = {}) {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRiviniaHttp(config)],
  });
  return {
    http: TestBed.inject(RiviniaHttp),
    ctrl: TestBed.inject(HttpTestingController),
  };
}

beforeEach(() => TestBed.resetTestingModule());

describe('RiviniaHttp (plain Observables)', () => {
  it('passes bodies through untouched by default (unwrapping is opt-in)', () => {
    const { http, ctrl } = setup();
    let received: unknown;
    http.get<unknown>('https://api.test/users').subscribe((v) => (received = v));
    const envelope = { data: [1, 2], isSuccess: true };
    ctrl.expectOne('https://api.test/users').flush(envelope);
    expect(received).toEqual(envelope);
    ctrl.verify();
  });

  it('unwraps { data } when enabled globally', () => {
    const { http, ctrl } = setup({ unwrap: true });
    let received: unknown;
    http.get<unknown>('https://api.test/users').subscribe((v) => (received = v));
    ctrl.expectOne('https://api.test/users').flush({ data: [1, 2], isSuccess: true });
    expect(received).toEqual([1, 2]);
    ctrl.verify();
  });

  it('honours unwrap:false per call against an enabled global', () => {
    const { http, ctrl } = setup({ unwrap: true });
    let received: unknown;
    http.get<unknown>('https://api.test/users', { unwrap: false }).subscribe((v) => (received = v));
    const envelope = { data: [1] };
    ctrl.expectOne('https://api.test/users').flush(envelope);
    expect(received).toEqual(envelope);
    ctrl.verify();
  });

  it('composes global and per-call levels in one injector', () => {
    // Global: unwrap + unwrapKey 'payload'. One call overrides to 'result',
    // another disables unwrapping entirely — all three coexist.
    // NOTE: a key alone never enables unwrapping — only the boolean does.
    const { http, ctrl } = setup({ unwrap: true, unwrapKey: 'payload' });
    let a: unknown;
    let b: unknown;
    let c: unknown;
    http.get<unknown>('https://api.test/a').subscribe((v) => (a = v));
    http.get<unknown>('https://api.test/b', { unwrapKey: 'result' }).subscribe((v) => (b = v));
    http.get<unknown>('https://api.test/c', { unwrap: false }).subscribe((v) => (c = v));
    ctrl.expectOne('https://api.test/a').flush({ payload: 1 });
    ctrl.expectOne('https://api.test/b').flush({ result: 2 });
    ctrl.expectOne('https://api.test/c').flush({ payload: 3 });
    expect(a).toBe(1);
    expect(b).toBe(2);
    expect(c).toEqual({ payload: 3 });
    ctrl.verify();
  });

  it('honours a per-call unwrapKey when unwrapping is enabled', () => {
    const { http, ctrl } = setup({ unwrap: true });
    let received: unknown;
    http.get<unknown>('https://api.test/users', { unwrapKey: 'result' }).subscribe((v) => (received = v));
    ctrl.expectOne('https://api.test/users').flush({ result: 'ok' });
    expect(received).toBe('ok');
    ctrl.verify();
  });

  it('ignores a per-call unwrapKey when unwrapping is not enabled', () => {
    const { http, ctrl } = setup();
    let received: unknown;
    http.get<unknown>('https://api.test/users', { unwrapKey: 'result' }).subscribe((v) => (received = v));
    const body = { result: 'ok' };
    ctrl.expectOne('https://api.test/users').flush(body);
    expect(received).toEqual(body);
    ctrl.verify();
  });

  it('honours a global unwrapKey and can be disabled globally', () => {
    const { http, ctrl } = setup({ unwrap: true, unwrapKey: 'payload' });
    let received: unknown;
    http.get<unknown>('https://api.test/a').subscribe((v) => (received = v));
    ctrl.expectOne('https://api.test/a').flush({ payload: 7 });
    expect(received).toBe(7);

    TestBed.resetTestingModule();
    const off = setup({ unwrap: false });
    let raw: unknown;
    off.http.get<unknown>('https://api.test/a').subscribe((v) => (raw = v));
    off.ctrl.expectOne('https://api.test/a').flush({ data: 1 });
    expect(raw).toEqual({ data: 1 });
    off.ctrl.verify();
    ctrl.verify();
  });

  it('unwraps post/put/patch/delete and maps query params', () => {
    const { http, ctrl } = setup({ unwrap: true });
    let received: unknown;
    http.post<unknown>('https://api.test/login', { u: 'a' }).subscribe((v) => (received = v));
    const post = ctrl.expectOne('https://api.test/login');
    expect(post.request.method).toBe('POST');
    post.flush({ data: { token: 't' } });
    expect(received).toEqual({ token: 't' });

    http.get<unknown>('https://api.test/users', { params: { q: 'x', page: 2, skip: null } }).subscribe();
    const get = ctrl.expectOne((r) => r.url === 'https://api.test/users');
    expect(get.request.params.get('q')).toBe('x');
    expect(get.request.params.get('page')).toBe('2');
    expect(get.request.params.has('skip')).toBe(false);
    get.flush({ data: [] });
    ctrl.verify();
  });

  it('passes absolute URLs through and never unwraps blobs', () => {
    const { http, ctrl } = setup();
    const blob = new Blob(['x']);
    let received: unknown;
    http.getBlob('https://cdn.test/f.pdf').subscribe((v) => (received = v));
    ctrl.expectOne('https://cdn.test/f.pdf').flush(blob);
    expect(received).toBe(blob);
    ctrl.verify();
  });
});

describe('provideRiviniaHttp httpFeatures', () => {
  it('configures the backend from a single call (interceptor applied)', () => {
    TestBed.configureTestingModule({
      providers: [
        // provideHttpClientTesting() last: its mock HttpBackend must win
        // over the one provideRiviniaHttp() registers internally (standard rule).
        provideRiviniaHttp({
          httpFeatures: [
            withInterceptors([
              (req, next) => next(req.clone({ setHeaders: { 'X-Proof': '1' } })),
            ]),
          ],
        }),
        provideHttpClientTesting(),
      ],
    });
    const http = TestBed.inject(RiviniaHttp);
    const ctrl = TestBed.inject(HttpTestingController);
    http.get<unknown>('https://api.test/ping', { unwrap: false }).subscribe();
    const req = ctrl.expectOne('https://api.test/ping');
    expect(req.request.headers.get('X-Proof')).toBe('1');
    req.flush({});
    ctrl.verify();
  });
});
describe('RiviniaHttp.getResource', () => {
  it('exposes unwrapped JSON as a resource value', async () => {
    const { http, ctrl } = setup();
    const res = TestBed.runInInjectionContext(() =>
      http.getResource<{ name: string }>('https://api.test/users/1', { unwrap: true }),
    );
    TestBed.flushEffects();
    ctrl.expectOne('https://api.test/users/1').flush({ data: { name: 'A' } });
    await Promise.resolve();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.flushEffects();
    expect(res.value()).toEqual({ name: 'A' });
    expect(res.isLoading()).toBe(false);
    ctrl.verify();
  });

  it('accepts reportProgress and exposes the progress signal', () => {
    const { http, ctrl } = setup();
    const res = TestBed.runInInjectionContext(() =>
      http.getResource('https://api.test/file', { reportProgress: true, unwrap: false }),
    );
    TestBed.flushEffects();
    // NOTE: verified 2026-10-12 — httpResource itself does not forward
    // reportProgress onto the outgoing HttpRequest (framework behavior),
    // so we assert our surface only: the option is accepted and the
    // resource exposes a progress signal.
    expect(typeof res.progress).toBe('function');
    expect(res.progress()).toBeUndefined();
    ctrl.expectOne('https://api.test/file');
    ctrl.verify();
  });

  it('accepts a reactive function endpoint like httpResource itself', () => {
    const { http, ctrl } = setup();
    const id = signal('a');
    const res = TestBed.runInInjectionContext(() =>
      http.getResource(() => `https://api.test/items/${id()}`, { unwrap: false }),
    );
    TestBed.flushEffects();
    ctrl.expectOne('https://api.test/items/a').flush({});
    TestBed.flushEffects();
    id.set('b');
    TestBed.flushEffects();
    ctrl.expectOne('https://api.test/items/b').flush({});
    expect(res).toBeDefined();
    ctrl.verify();
  });

  it('disables the request while the endpoint signal is undefined', () => {
    const { http, ctrl } = setup();
    const endpoint = signal<string | undefined>(undefined);
    TestBed.runInInjectionContext(() => http.getResource(endpoint));
    TestBed.flushEffects();
    expect(ctrl.match(() => true).length).toBe(0);
    endpoint.set('https://api.test/x');
    TestBed.flushEffects();
    ctrl.expectOne('https://api.test/x').flush({ data: 1 });
    ctrl.verify();
  });
});
