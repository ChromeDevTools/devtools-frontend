/**
 * Flattens an array.
 * Use this function to keep support for node 10
 * @param items
 */
export declare function arrayFlat<T>(items: (T[] | T)[]): T[];
/**
 * Filters an array returning only defined items
 * @param array
 */
export declare function arrayDefined<T>(array: (T | undefined)[]): T[];
/**
 * Joins an array with a custom final splitter
 * @param items
 * @param splitter
 * @param finalSplitter
 */
export declare function joinArray(items: string[], splitter?: string, finalSplitter?: string): string;
//# sourceMappingURL=array-util.d.ts.map