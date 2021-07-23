/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 *
 * If `locale` isn't provided or one could not be found, DEFAULT_LOCALE is returned.
 * @param {string|string[]=} locales
 * @return {LH.Locale}
 */
 declare function lookupLocale(locales?: string|string[]): string;
/**
 * @return {!Array<!LH.Locale>} list of all supported locale codes
 */
declare function getAllSupportedLocales(): string[];
 /**
 * Returns a copy of the `values` object, with the values formatted based on how
 * they will be used in their icuMessage, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {string} icuMessageId
 * @param {MessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @param {string} lhlMessage Used for clear error logging.
 * @return {Record<string, string | number>}
 */
declare function _preformatValues(icuMessageId: string, messageFormatter: Object, values: Object, lhlMessage: string): Record<string, string|number|boolean|null|undefined>;
 /**
  * Populate the i18n string lookup dict with locale data
  * Used when the host environment selects the locale and serves lighthouse the intended locale file
  * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
  * @param {string} locale
  * @param {*} lhlMessages
  */
 declare function registerLocaleData(locale: string, lhlMessages: any): void;

import type {IntlMessageFormat} from '../intl-messageformat/package/lib/index.js';

 declare var i18n: {
   _preformatValues: typeof _preformatValues;
   lookupLocale: typeof lookupLocale;
   registerLocaleData: typeof registerLocaleData;
   getAllSupportedLocales: typeof getAllSupportedLocales;
   MessageFormat: typeof IntlMessageFormat,
 };
 export default i18n;
