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
  * Function to retrieve all 'argumentElement's from an ICU message. An argumentElement
  * is an ICU element with an argument in it, like '{varName}' or '{varName, number, bytes}'. This
  * differs from 'messageElement's which are just arbitrary text in a message.
  *
  * Notes:
  *  This function will recursively inspect plural elements for nested argumentElements.
  *
  *  We need to find all the elements from the plural format sections, but
  *  they need to be deduplicated. I.e. "=1{hello {icu}} =other{hello {icu}}"
  *  the variable "icu" would appear twice if it wasn't de duplicated. And they cannot
  *  be stored in a set because they are not equal since their locations are different,
  *  thus they are stored via a Map keyed on the "id" which is the ICU varName.
  *
  * @param {ArrayLike<Object>} icuElements
  * @param {Map<string, T>} [seenElementsById]
  * @return {Map<string, T>}
  */
 declare function collectAllCustomElementsFromICU<T>(icuElements: ArrayLike<Object>, seenElementsById?: Map<string, T>): T;
 /** @param {ArrayLike<string>} pathInLHR */
 declare function _formatPathAsString(pathInLHR: string[]): string;
 /**
  * @param {string} locale
  */
 declare function getRendererFormattedStrings(locale: string): {};
/**
 * Returns a function that generates `LH.IcuMessage` objects to localize the
 * messages in `fileStrings` and the shared `i18n.UIStrings`.
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
 declare function createIcuMessageFn(filename: string, fileStrings: Object): typeof getMessageInstanceIdFn;
 /**
  * Returns true if string is an ICUMessage reference.
  * @param {string} icuMessageIdOrRawString
  */
 declare function isIcuMessage(icuMessageIdOrRawString: string): boolean;
 /**
  * @param {string} icuMessageIdOrRawString
  * @param {string} locale
  */
 declare function getFormatted(icuMessageIdOrRawString: string, locale: string): string;
/**
 * @param {string} icuMessageIdOrRawString
 * @param {string} locale
 */
 declare function getFormatter(icuMessageIdOrRawString: string, locale: string): any;
/**
 * Recursively walk the input object, looking for property values that are
 * `LH.IcuMessage`s and replace them with their localized values. Primarily
 * used with the full LHR or a Config as input.
 * Returns a map of locations that were replaced to the `IcuMessage` that was at
 * that location.
 * @param {unknown} inputObject
 * @param {LH.Locale} locale
 * @return {LH.IcuMessagePaths}
 */
 declare function replaceIcuMessages(inputObject: any, locale: string): {};
 /**
  * Populate the i18n string lookup dict with locale data
  * Used when the host environment selects the locale and serves lighthouse the intended locale file
  * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
  * @param {string} locale
  * @param {*} lhlMessages
  */
 declare function registerLocaleData(locale: string, lhlMessages: any): void;
 /**
  * @param {string} icuMessage
  * @param {Object} [values]
  */
 declare function getMessageInstanceIdFn(icuMessage: string, values: Object | null): string;

 /**
 * Throws an error with the given icuMessage id.
 * @param {string} icuMessage
 */
declare function idNotInMainDictionaryException(icuMessage: string): void;

 declare var i18n: {
   _formatPathAsString: typeof _formatPathAsString;
   lookupLocale: typeof lookupLocale;
   getRendererFormattedStrings: typeof getRendererFormattedStrings;
   createIcuMessageFn: typeof createIcuMessageFn;
   getFormatted: typeof getFormatted;
   getFormatter: typeof getFormatter;
   replaceIcuMessages: typeof replaceIcuMessages;
   isIcuMessage: typeof isIcuMessage;
   collectAllCustomElementsFromICU: typeof collectAllCustomElementsFromICU;
   registerLocaleData: typeof registerLocaleData;
   idNotInMainDictionaryException: typeof idNotInMainDictionaryException;
 };
 export default i18n;
