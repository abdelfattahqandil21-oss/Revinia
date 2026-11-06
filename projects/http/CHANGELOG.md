# Changelog

## 1.0.1

- Documentation: README restructured into docs/http/ pages; stale pre-1.0 wording removed.

## 1.0.0

- First stable release. URL joining collapses repeated boundary slashes; request URLs otherwise remain consumer-controlled.

## Unreleased

- Fix `joinUrl` so repeated leading and trailing slashes are collapsed to one boundary slash while query strings are preserved.
