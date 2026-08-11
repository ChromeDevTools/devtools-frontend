import type { BrowserSupport } from "./utils.ts";
declare const featuresList: string[];
declare function setBrowserScope(browserList?: string | readonly string[]): void;
declare function getBrowserScope(): string[];
declare function getSupport(query: string): BrowserSupport;
declare function isSupported(feature: string, browsers?: string | readonly string[]): boolean;
declare function find(query: string): string | string[];
declare function getLatestStableBrowsers(): string[];
export { featuresList as features, getSupport, isSupported, find, getLatestStableBrowsers, setBrowserScope, getBrowserScope, };
