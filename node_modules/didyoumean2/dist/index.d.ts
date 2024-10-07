declare enum ReturnTypeEnums {
    ALL_CLOSEST_MATCHES = "all-closest-matches",
    ALL_MATCHES = "all-matches",
    ALL_SORTED_MATCHES = "all-sorted-matches",
    FIRST_CLOSEST_MATCH = "first-closest-match",
    FIRST_MATCH = "first-match"
}

declare enum ThresholdTypeEnums {
    EDIT_DISTANCE = "edit-distance",
    SIMILARITY = "similarity"
}

declare type Options = Readonly<{
    caseSensitive: boolean;
    deburr: boolean;
    matchPath: ReadonlyArray<number | string>;
    returnType: ReturnTypeEnums;
    threshold: number;
    thresholdType: ThresholdTypeEnums;
    trimSpaces: boolean;
}>;
declare type InputOptions = Partial<Options>;

/**
 * Main function for didyoumean2
 * @param {string} input - string that you are not sure and want to match with `matchList`
 * @param {Object[]|string[]} matchList - List for matching with `input`
 * @param {null|Object|undefined} options - options that allows you to modify the behavior
 * @returns {Array|null|Object|string} - matched result(s), return object if `match` is `{Object[]}`
 */
declare function didYouMean<T extends Record<string, unknown> | string>(input: string, matchList: ReadonlyArray<T>, options?: InputOptions & {
    returnType?: ReturnTypeEnums.FIRST_CLOSEST_MATCH | ReturnTypeEnums.FIRST_MATCH;
}): T | null;
declare function didYouMean<T extends Record<string, unknown> | string>(input: string, matchList: ReadonlyArray<T>, options: InputOptions & {
    returnType: ReturnTypeEnums.ALL_CLOSEST_MATCHES | ReturnTypeEnums.ALL_MATCHES | ReturnTypeEnums.ALL_SORTED_MATCHES;
}): Array<T>;

export default didYouMean;
export { ReturnTypeEnums, ThresholdTypeEnums };
