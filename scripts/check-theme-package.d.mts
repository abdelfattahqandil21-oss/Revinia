export interface ThemePackageReport {
  readonly ok: boolean;
  readonly problems: readonly string[];
  readonly files: readonly string[];
}

export declare const DEFAULT_TARGET: string;

export declare const EXPECTED_FILES: readonly string[];

export declare function checkThemePackage(target?: string): ThemePackageReport;
