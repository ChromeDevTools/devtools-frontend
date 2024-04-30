import * as csp from './csp';
export declare function getSchemeFreeUrl(url: string): string;
export declare function getHostname(url: string): string;
export declare function matchWildcardUrls(cspUrlString: string, listOfUrlStrings: string[]): URL | null;
export declare function applyCheckFunktionToDirectives(parsedCsp: csp.Csp, check: (directive: string, directiveValues: string[]) => void): void;
//# sourceMappingURL=utils.d.ts.map