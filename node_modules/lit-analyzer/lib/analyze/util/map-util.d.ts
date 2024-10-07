export declare function mapMerge<K, T>(...maps: (Map<K, T> | Map<K, T>[])[]): Map<K, T>;
export declare function mapMap<K, T, U>(map: Map<K, T>, callback: (key: K, val: T) => U): Map<K, U>;
export declare function arrayToMap<K, T>(array: T[], callback: (val: T) => K): Map<K, T>;
//# sourceMappingURL=map-util.d.ts.map