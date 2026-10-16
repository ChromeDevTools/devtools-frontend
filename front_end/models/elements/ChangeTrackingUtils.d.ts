import type * as SDK from '../../core/sdk/sdk.js';
import type * as CommentManager from '../comment_manager/comment_manager.js';
/**
 * Maximum number of characters of page or author controlled data (tag names, attribute names
 * and values, text node values, HTML, CSS property names/values, and selectors) that a change
 * description embeds.
 */
export declare const MAX_VALUE_LENGTH = 100;
/** Shortens page or author controlled data so that both its start and end stay recognizable. */
export declare function trimValue(value: string): string;
export declare function buildAnchor(vePath: string, node: SDK.DOMModel.DOMNode | null, textSignature?: string): CommentManager.CommentManager.CommentAnchorSignature;
