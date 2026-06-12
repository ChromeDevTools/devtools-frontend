import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import type { RawFrame } from './Trie.js';
export type ResolveURLCallback = (url: Platform.DevToolsPath.UrlString) => Platform.DevToolsPath.UrlString | null;
/**
 * Takes a V8 Error#stack string and extracts structured information.
 *
 * @returns Null if the provided string has an unexpected format. A
 *          populated `RawFrame[]` otherwise.
 */
export declare function parseRawFramesFromErrorStack(stack: string, resolveURL?: ResolveURLCallback): RawFrame[] | null;
export declare function parseMessage(stack: string): string;
/**
 * Error#stack output only contains script URLs. In some cases we are able to
 * retrieve additional exception details from V8 that we can use to augment
 * the parsed Error#stack with script IDs.
 */
export declare function augmentRawFramesWithScriptIds(rawFrames: RawFrame[], protocolStackTrace: Protocol.Runtime.StackTrace): void;
