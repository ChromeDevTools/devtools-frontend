export declare function iterableFlatten<T>(...iterables: Iterable<T>[]): Iterable<T>;
export declare function iterableMap<T, U>(iterable: Iterable<T>, map: (item: T) => U): Iterable<U>;
export declare function iterableFilter<T>(iterable: Iterable<T>, filter: (item: T) => boolean): Iterable<T>;
export declare function iterableFind<T>(iterable: Iterable<T>, match: (item: T) => boolean): T | undefined;
export declare function iterableUnique<T, U>(iterable: Iterable<T>, on: (item: T) => U): Iterable<T>;
export declare function iterableDefined<T>(iterable: (T | undefined | null)[]): T[];
export declare function iterableFirst<T>(iterable: Iterator<T> | Set<T> | Map<unknown, T> | undefined): T | undefined;
//# sourceMappingURL=iterable-util.d.ts.map