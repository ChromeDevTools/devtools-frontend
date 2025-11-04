import type * as Platform from '../../../core/platform/platform.js';
import type * as Protocol from '../../../generated/protocol.js';
type NotRestoredReason = Record<Protocol.Page.BackForwardCacheNotRestoredReason, {
    name: () => Platform.UIString.LocalizedString;
}>;
export declare const NotRestoredReasonDescription: NotRestoredReason;
export {};
