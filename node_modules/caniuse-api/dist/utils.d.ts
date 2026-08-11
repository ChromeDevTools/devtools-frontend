export interface FeatureData {
    title: string;
    stats: Readonly<Record<string, Readonly<Record<string, string>>>>;
}
export type BrowserSupport = Record<string, Record<string, number>>;
export declare function contains(str: string, substr: string): boolean;
export declare function parseCaniuseData(feature: FeatureData, browsers: string[]): BrowserSupport;
export declare function cleanBrowsersList(browserList?: string | readonly string[]): string[];
