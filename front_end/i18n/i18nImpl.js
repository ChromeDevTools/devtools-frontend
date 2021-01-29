// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';

// eslint-disable-next-line
import i18nBundle from '../third_party/i18n/i18n.js';

/**
 * The locale that DevTools displays
 * @param {string} locale
 * @param {*} lhlMessages
 */
export const registerLocaleData = i18nBundle.registerLocaleData;

/**
 * The locale that DevTools displays
 * @type {string|undefined}
 */
export let registeredLocale;

/**
 * The strings from the module.json file
 * @type {!Object|undefined}
 */
let moduleJSONStrings;

/**
 * Returns an instance of an object of formatted strings based on locale. If the instance is not
 * set at the time of calling, it is created.
 * @return {!Object}
 */
function getOrSetModuleJSONStrings() {
  if (!registeredLocale) {
    throw new Error(`Unsupported locale '${registeredLocale}'`);
  }

  moduleJSONStrings = moduleJSONStrings || i18nBundle.getRendererFormattedStrings(registeredLocale);
  return moduleJSONStrings;
}

/**
 * Take the locale passed in from the browser(host), run through the fallback logic (example: es-419 -> es)
 * to find the DevTools supported locale and register it.
 * @param {string} locale
 */
export function registerLocale(locale) {
  registeredLocale = i18nBundle.lookupLocale(locale);
}

/**
 * Returns an anonymous function that wraps a call to retrieve a localized string.
 * This is introduced so that localized strings can be declared in environments where
 * the i18n system has not been configured and so, cannot be directly invoked. Instead,
 * strings are lazily localized when they are used. This is used for instance in the
 * meta files used to register module extensions.
 * @param {function(string, ?Object):string} str_
 * @param {string} id
 * @param {!Object<string, ?Object|undefined>} values
 * @return {function(): !Platform.UIString.LocalizedString} the localized version of the
 */
export function getLazilyComputedLocalizedString(str_, id, values = {}) {
  return () => getLocalizedString(str_, id, values);
}

/**
 * Retrieve the localized string.
 * @param {function(string, ?Object):string} str_
 * @param {string} id
 * @param {!Object<string, ?Object|undefined>} values
 * @return {!Platform.UIString.LocalizedString} the localized version of the
 */
export function getLocalizedString(str_, id, values = {}) {
  if (!registeredLocale) {
    throw new Error(`Unsupported locale '${registeredLocale}'`);
  }

  const icuMessage = str_(id, values);
  return /** @type {!Platform.UIString.LocalizedString} */ (i18nBundle.getFormatted(icuMessage, registeredLocale));
}

/**
 * Register a file's UIStrings with i18n, return function to generate the string ids.
 * @param {string} path
 * @param {!Object} stringStructure
 * @return {function(string, ?Object):string} return function to generate the string ids.
 */
export function registerUIStrings(path, stringStructure) {
  /**
   * Convert a message string & replacement values into an
   * indexed id value in the form '{messageid} | # {index}'.
   *
   * @param {string} id
   * @param {?Object} value
   * */
  const str = (id, value) => {
    try {
      const i18nInstance = i18nBundle.createMessageInstanceIdFn(path, stringStructure);
      return i18nInstance(id, value);
    } catch (e) {
      // ID was not in the main file search for module.json strings
      if (e instanceof i18nBundle.idNotInMainDictionaryException) {
        const stringMappingArray = Object.getOwnPropertyNames(getOrSetModuleJSONStrings());
        const index = stringMappingArray.indexOf(id);
        if (index >= 0) {
          return stringMappingArray[index];
        }
      }

      return id;
    }
  };

  return str;
}

/**
 * Returns a span element that may contains other DOM element as placeholders
 * @param {function(string, ?Object):string} str_
 * @param {string} stringId
 * @param {!Object<string, *>} placeholders
 * @return {!Element} the localized result
 */
export function getFormatLocalizedString(str_, stringId, placeholders) {
  if (!registeredLocale) {
    throw new Error(`Unsupported locale '${registeredLocale}'`);
  }

  const icuMessage = str_(stringId, placeholders);
  const formatter = i18nBundle.getFormatter(icuMessage, registeredLocale);

  const icuElements = formatter.getAst().elements;
  const args = [];
  let formattedString = '';
  for (const element of icuElements) {
    if (element.type === 'argumentElement') {
      const placeholderValue = placeholders[element.id];
      if (placeholderValue) {
        args.push(placeholderValue);
        element.value = '%s';  // convert the {PH} back to %s to use StringUtilities
      }
    }
    formattedString += element.value;
  }
  return formatLocalized(formattedString, args);
}

/**
 * @param {string} formattedString
 * @param {?ArrayLike<?>} args
 * @return {!Element} the formatted result.
 */
export function formatLocalized(formattedString, args) {
  /** @type {function(string):string} */
  const substitution = substitution => {
    return substitution;
  };

  /**
   * @param {!Element} a
   * @param {?} b
   * @return {!Element}
   */
  function append(a, b) {
    a.appendChild(typeof b === 'string' ? document.createTextNode(b) : b);
    return a;
  }

  const formatters = {s: substitution};
  return Platform.StringUtilities.format(formattedString, args, formatters, document.createElement('span'), append)
      .formattedResult;
}

/**
 * @param {string} string
 * @param {!Object<string, ?Object|undefined>} values
 * @return {string} the serialized string.
 */
export function serializeUIString(string, values = {}) {
  const serializedMessage = {string, values};
  return JSON.stringify(serializedMessage);
}

/**
 * @param {?string} serializedMessage
 * @return {!{string: string, values: !Object<string, ?Object|undefined>}}
 */
export function deserializeUIString(serializedMessage) {
  if (!serializedMessage) {
    return {string: '', values: {}};
  }

  return JSON.parse(serializedMessage);
}
