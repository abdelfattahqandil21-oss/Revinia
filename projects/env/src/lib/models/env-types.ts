/**
 * Minimal contract every Rivinia-style environment file satisfies.
 * Applications extend it with their own fields (apiUrl, keys, …) — the
 * library never dictates field names beyond these two.
 */
export interface BaseEnvironment {
  /** `true` for production-like builds (staging included). */
  readonly production: boolean;
  /**
   * Application version, snapshotted from the app's `package.json` when the
   * files are scaffolded. Re-run the schematic or edit by hand on release.
   */
  readonly version: string;
}
