type MergeableObject = Record<string | number | symbol, any>;
declare const initialValue: MergeableObject;
declare function isMap<TKey = unknown, TValue = unknown>(input: any): input is Map<TKey, TValue>;
declare function isMapInstance(input: any): boolean;
declare function isSet<T = unknown>(input: any): input is Set<T>;
declare function isSetInstance(input: any): boolean;
declare function isObjectLiteral(input: any): boolean;
declare function objectKeys<T extends object>(object: T): Array<keyof T>;

declare function merge<TData extends MergeableObject = MergeableObject, TResult extends MergeableObject = TData>(source: TData, target: TData, ...targets: Array<TData>): TResult;

export { type MergeableObject, initialValue, isMap, isMapInstance, isObjectLiteral, isSet, isSetInstance, merge, objectKeys };
