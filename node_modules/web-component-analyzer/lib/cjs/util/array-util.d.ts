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
 * Filters an array returning only unique itesm
 * @param array
 */
export declare function arrayDedupe<T>(array: T[]): T[];
//# sourceMappingURL=array-util.d.ts.map