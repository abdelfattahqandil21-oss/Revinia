export interface ContrastRow {
  readonly scheme: 'light' | 'dark';
  readonly pair: {
    readonly fg: string;
    readonly bg: string;
    readonly kind: 'text' | 'indicator' | 'decorative';
  };
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number;
  readonly minimum: number;
  readonly passes: boolean;
  readonly enforced: boolean;
}

export interface ContrastReport {
  readonly ok: boolean;
  readonly problems: readonly string[];
  readonly rows: readonly ContrastRow[];
}

export declare const DEFAULT_CSS: string;

export declare const PALETTE: Readonly<Record<'light' | 'dark', Readonly<Record<string, string>>>>;

export declare const PAIRS: readonly {
  readonly fg: string;
  readonly bg: string;
  readonly kind: 'text' | 'indicator' | 'decorative';
}[];

export declare const MINIMUM: Readonly<Record<'text' | 'indicator' | 'decorative', number>>;

export declare function parseHex(value: string): [number, number, number];

export declare function luminance(hex: string): number;

export declare function contrastRatio(a: string, b: string): number;

export declare function parseBlocks(source: string): readonly {
  selector: string;
  media: string | null;
  context: string;
  declarations: Map<string, string>;
}[];

export declare function auditThemeCss(source: string): ContrastReport;

export declare function auditPalette(
  palette?: Readonly<Record<string, Readonly<Record<string, string>>>>,
): Pick<ContrastReport, 'rows' | 'problems'>;

export declare function formatRows(rows: readonly ContrastRow[]): string;
