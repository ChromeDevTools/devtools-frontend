import { Omit } from "./general-util.js";
export interface FindBestMatchOptions<T> {
    threshold?: number;
    caseSensitive?: boolean;
    matchKey: keyof T;
}
/**
 * Finds the best match between a string and elements in a list.
 * @param find
 * @param elements
 * @param options
 */
export declare function findBestMatch<T extends string | object>(find: string, elements: T[], options: FindBestMatchOptions<T>): T | undefined;
export declare function findBestStringMatch(find: string, elements: string[], { caseSensitive, threshold }?: Omit<FindBestMatchOptions<string>, "matchKey">): string | undefined;
//# sourceMappingURL=find-best-match.d.ts.map