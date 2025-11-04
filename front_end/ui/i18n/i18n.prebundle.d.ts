import type * as ThirdPartyI18n from '../../third_party/i18n/i18n.js';
/**
 * Returns a span element that may contains other DOM element as placeholders
 */
export declare function getFormatLocalizedString(registeredStrings: ThirdPartyI18n.LocalizedStringSet.RegisteredFileStrings, stringId: string, placeholders: Record<string, Object>): HTMLSpanElement;
