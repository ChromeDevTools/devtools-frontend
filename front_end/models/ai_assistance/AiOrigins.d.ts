/**
 * Returns true if the origin is considered opaque and should be blocked from
 * AI assistance to prevent potential data leakage.
 *
 * @see https://crbug.com/513732588
 */
export declare function isOpaqueOrigin(origin: string): boolean;
/**
 * Extracts the origin from a context URL or identifier.
 * Handles special cases like "detached" nodes and trace identifiers.
 */
export declare function extractContextOrigin(contextURL: string): string;
/**
 * Determines if two origins are equivalent and safe to be used together.
 * Opaque origins are never equivalent to anything, not even themselves.
 */
export declare function areOriginsEquivalent(origin1: string, origin2: string): boolean;
