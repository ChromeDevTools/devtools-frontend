/**
 * Very basic memoizer. Will only invoke its callback the first time, returning the cached value all subsequent calls.
 */
export declare function lazy<T>(producer: () => T): () => symbol | T;
