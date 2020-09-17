/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 * - the default locale ('en-US') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 * @param {string} locale
 * @return {string}
 */
export function lookupLocale(locale){return ""};

/**
 * export function to retrieve all 'argumentElement's from an ICU message. An argumentElement
 * is an ICU element with an argument in it, like '{varName}' or '{varName, number, bytes}'. This
 * differs from 'messageElement's which are just arbitrary text in a message.
 *
 * Notes:
 *  This export function will recursively inspect plural elements for nested argumentElements.
 *
 *  We need to find all the elements from the plural format sections, but
 *  they need to be deduplicated. I.e. "=1{hello {icu}} =other{hello {icu}}"
 *  the variable "icu" would appear twice if it wasn't de duplicated. And they cannot
 *  be stored in a set because they are not equal since their locations are different,
 *  thus they are stored via a Map keyed on the "id" which is the ICU varName.
 *
 * @param {Array<Object>} icuElements
 * @param {Map<string, Object>} [seenElementsById]
 * @return {Map<string, Object>}
 */
 export function collectAllCustomElementsFromICU(icuElements, seenElementsById){
   let result = new Map();
   result.set("", {})
   return result;
 };

/** @param {ArrayLike<string>} pathInLHR */
 export function _formatPathAsString(pathInLHR){};

/**
 * @param {string} locale
 * @return {string}
 */
 export function getRendererFormattedStrings(locale){return ""};

/**
 * Register a file's UIStrings with i18n, return function to
 * generate the string ids.
 *
 * @param {string} filename
 * @param {*} fileStrings
 * @return {function(string, *):string}
 */
 export function createMessageInstanceIdFn(filename, fileStrings) {
   let result = new Map();
   result.set("", {})
   return (a, result) => {
     return ""
   }
 };

/**
 * Returns true if string is an ICUMessage reference.
 * @param {string} icuMessageIdOrRawString
 */
 export function isIcuMessage(icuMessageIdOrRawString){};

/**
 * @param {string} icuMessageIdOrRawString
 * @param {string} locale
 * @return {string}
 */
 export function getFormatted(icuMessageIdOrRawString, locale){return ""};

/**
 * @param {string} icuMessageIdOrRawString
 * @param {string} locale
 * @return {Object}
 */
 export function getFormatter(icuMessageIdOrRawString, locale){return {getAst: ()=>{}}};

/**
 * @param {string} locale
 * @param {string} icuMessageId
 * @param {Object} [values]

 */
 export function getFormattedFromIdAndValues(locale , icuMessageId , values){};

/**
 * Recursively walk the input object, looking for property values that are
 * string references and replace them with their localized values. Primarily
 * used with the full LHR as input.
 * @param {*} inputObject
 * @param {string} locale
 */
 export function replaceIcuMessageInstanceIds(inputObject, locale){};

/**
 * Populate the i18n string lookup dict with locale data
 * Used when the host environment selects the locale and serves lighthouse the intended locale file
 * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
 * @param {string} locale
 * @param {*} lhlMessages
 */
 export function registerLocaleData(locale, lhlMessages){};

/**
 * @param {string} icuMessage
 * @param {Object} [values]
 */
 export function getMessageInstanceIdFn(icuMessage , values){};

 var i18n =  {
  _formatPathAsString,
  lookupLocale,
  getRendererFormattedStrings,
  createMessageInstanceIdFn,
  getFormatted,
  getFormatter,
  getFormattedFromIdAndValues,
  replaceIcuMessageInstanceIds,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData
};

export default i18n;
