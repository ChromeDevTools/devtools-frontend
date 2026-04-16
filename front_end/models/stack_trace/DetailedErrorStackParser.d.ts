import type { RawFrame } from './Trie.js';
/**
 * Takes a V8 Error#stack string and extracts structured information.
 */
export declare function parseRawFramesFromErrorStack(stack: string): RawFrame[];
