/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('../../lodash-isequal/package/index');
const MessageFormat = require('../../intl-messageformat/package/dist/umd/intl-messageformat').default;
const LOCALES = require('./locales.js');

const DEFAULT_LOCALE = 'en-US';

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const MESSAGE_I18N_ID_REGEX = / | [^\s]+$/;

const formats = {
  number: {
    bytes: {
      maximumFractionDigits: 0,
    },
    milliseconds: {
      maximumFractionDigits: 0,
    },
    seconds: {
      // Force the seconds to the tenths place for limited output and ease of scanning
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
    extendedPercent: {
      // Force allow up to two digits after decimal place in percentages. (Intl.NumberFormat options)
      maximumFractionDigits: 2,
      style: 'percent',
    },
  },
};

/**
 * Look up the best available locale for the requested language through these fall backs:
 * - exact match
 * - progressively shorter prefixes (`de-CH-1996` -> `de-CH` -> `de`)
 *
 * If `locale` isn't provided or one could not be found, DEFAULT_LOCALE is returned.
 * @param {string|string[]=} locales
 * @return {LH.Locale}
 */
function lookupLocale(locales) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocales = Intl.getCanonicalLocales(locales);

  const closestLocale = lookupClosestLocale(canonicalLocales[0], LOCALES);
  return closestLocale || DEFAULT_LOCALE;
}

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
 * @param {Array<MessageElement>} icuElements
 * @param {Map<string, ArgumentElement>} [seenElementsById]
 * @return {Map<string, ArgumentElement>}
 */
function collectAllCustomElementsFromICU(icuElements, seenElementsById = new Map()) {
  for (const el of icuElements) {
    // We are only interested in elements that need ICU formatting (argumentElements)
    if (el.type !== 'argumentElement') continue;

    seenElementsById.set(el.id, el);

    // Plurals need to be inspected recursively
    if (!el.format || el.format.type !== 'pluralFormat') continue;
    // Look at all options of the plural (=1{} =other{}...)
    for (const option of el.format.options) {
      // Run collections on each option's elements
      collectAllCustomElementsFromICU(option.value.elements, seenElementsById);
    }
  }

  return seenElementsById;
}

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
function _preformatValues(icuMessageId, messageFormatter, values, lhlMessage) {
  const elementMap = collectAllCustomElementsFromICU(messageFormatter.getAst().elements);
  const argumentElements = [...elementMap.values()];

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const {id, format} of argumentElements) {
    // Throw an error if a message's value isn't provided
    if (id && (id in values) === false) {
      throw new Error(`ICU Message with ID "${icuMessageId}" contains a value reference ("${id}") ` +
        `that wasn't provided. Full message text: "${lhlMessage}"` + '\n' +
        new Error().stack);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (!format || format.type !== 'numberFormat') {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${lhlMessage}" contains a numeric reference ("${id}") ` +
        'but provided value was not a number');
    }

    // Format values for known styles.
    if (format.style === 'milliseconds') {
      // Round all milliseconds to the nearest 10.
      formattedValues[id] = Math.round(value / 10) * 10;
    } else if (format.style === 'seconds' && id === 'timeInMs') {
      // Convert all seconds to the correct unit (currently only for `timeInMs`).
      formattedValues[id] = Math.round(value / 100) / 10;
    } else if (format.style === 'bytes') {
      // Replace all the bytes with KB.
      formattedValues[id] = value / 1024;
    } else {
      // For all other number styles, the value isn't changed.
      formattedValues[id] = value;
    }
  }

  // Throw an error if a value is provided but has no placeholder in the message.
  for (const valueId of Object.keys(values)) {
    if (valueId in formattedValues) continue;

    // errorCode is a special case always allowed to help LHError ease-of-use.
    if (valueId === 'errorCode') {
      formattedValues.errorCode = values.errorCode;
      continue;
    }

    throw new Error(`Provided value "${valueId}" does not match any placeholder in ` +
      `ICU message "${lhlMessage}"`);
  }

  return formattedValues;
}

/**
 * Format string `message` by localizing `values` and inserting them.
 * @param {string} icuMessageId
 * @param {string} message
 * @param {Record<string, string | number>} values
 * @param {LH.Locale} locale
 * @return {string}
 */
 function _formatMessage(icuMessageId, message, values = {}, locale) {
  // When using accented english, force the use of a different locale for number formatting.
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  const formatter = new MessageFormat(message, localeForMessageFormat, formats);

  // Preformat values for the message format like KB and milliseconds.
  const valuesForMessageFormat = _preformatValues(icuMessageId, formatter, values, message);

  return formatter.format(valuesForMessageFormat);
}

/**
 * Retrieves the localized version of `icuMessage` and formats with any given
 * value replacements.
 * @param {LH.IcuMessage} icuMessage
 * @param {LH.Locale} locale
 * @return {string}
 */
 function _localizeIcuMessage(icuMessage, locale) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  const localeMessage = localeMessages[icuMessage.i18nId];

  // Fall back to the default (usually the original english message) if we couldn't find a
  // message in the specified locale. This could be because of string drift between
  // Lighthouse versions or because new strings haven't been updated yet. Better to have
  // an english message than no message at all; in some cases it won't even matter.
  if (!localeMessage) {
    return icuMessage.formattedDefault;
  }

  return _formatMessage(localeMessage.i18nId, localeMessage.message, icuMessage.values, locale);
}

/**
 * Straight-up copy of _loclizeIcuMessage, but returns the formatter instead of formatting
 * the IcuMessage directly.
 * @param {LH.IcuMessage} icuMessage
 * @param {LH.Locale} locale
 * @return {MessageFormat | string}
 */
 function _localizeIcuMessageFormatter(icuMessage, locale) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  const localeMessage = localeMessages[icuMessage.i18nId];

  // Fall back to the default (usually the original english message) if we couldn't find a
  // message in the specified locale. This could be because of string drift between
  // Lighthouse versions or because new strings haven't been updated yet. Better to have
  // an english message than no message at all; in some cases it won't even matter.
  if (!localeMessage) {
    return icuMessage.formattedDefault;
  }

  // When using accented english, force the use of a different locale for number formatting.
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;
  return new MessageFormat(localeMessage.message, localeForMessageFormat, formats);
}

/** @param {string[]} pathInLHR */
function _formatPathAsString(pathInLHR) {
  let pathAsString = '';
  for (const property of pathInLHR) {
    if (/^[a-z]+$/i.test(property)) {
      if (pathAsString.length) pathAsString += '.';
      pathAsString += property;
    } else {
      if (/]|"|'|\s/.test(property)) throw new Error(`Cannot handle "${property}" in i18n`);
      pathAsString += `[${property}]`;
    }
  }

  return pathAsString;
}

/**
 * @param {LH.Locale} locale
 * @return {LH.I18NRendererStrings}
 */
function getRendererFormattedStrings(locale) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);

  const icuMessageIds = Object.keys(localeMessages).filter(f => f.includes('ModuleUIStrings'));
  const strings = /** @type {LH.I18NRendererStrings} */ ({});
  for (const icuMessageId of icuMessageIds) {
    const [filename, varName] = icuMessageId.split(' | ');
    const key = /** @type {keyof LH.I18NRendererStrings} */ (varName);
    strings[key] = localeMessages[icuMessageId].message;
  }

  return strings;
}

/**
 * Returns a function that generates `LH.IcuMessage` objects to localize the
 * messages in `fileStrings` and the shared `i18n.UIStrings`.
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
 function createIcuMessageFn(filename, fileStrings) {
  /**
   * Convert a message string and replacement values into an `LH.IcuMessage`.
   * @param {string} message
   * @param {Record<string, string | number>} [values]
   * @return {LH.IcuMessage}
   */
  const getIcuMessageFn = (message, values) => {
    const keyname = Object.keys(fileStrings).find(key => fileStrings[key] === message);
    if (!keyname) throw new Error(`Could not locate: ${message}`);

    const unixStyleFilename = filename.replace(/\\/g, '/');
    const i18nId = `${unixStyleFilename} | ${keyname}`;

    return {
      i18nId,
      values,
      formattedDefault: _formatMessage(i18nId, message, values, DEFAULT_LOCALE),
    };
  };

  return getIcuMessageFn;
}

/**
 * Returns whether `icuMessageOrNot`` is an `LH.IcuMessage` instance.
 * @param {unknown} icuMessageOrNot
 * @return {icuMessageOrNot is LH.IcuMessage}
 */
 function isIcuMessage(icuMessageOrNot) {
  if (!isObjectOfUnknownValues(icuMessageOrNot)) {
    return false;
  }

  const {i18nId, values, formattedDefault} = icuMessageOrNot;
  if (typeof i18nId !== 'string') {
    return false;
  }

  // formattedDefault is required.
  if (typeof formattedDefault !== 'string') {
    return false;
  }

  // Values is optional.
  if (values !== undefined) {
    if (!isObjectOfUnknownValues(values)) {
      return false;
    }
    // Do not check each value in values for DevTools. DevTools passes objects for some placeholders.
  }

  // Finally return true if i18nId seems correct.
  return MESSAGE_I18N_ID_REGEX.test(i18nId);
}

/**
 * Get the localized and formatted form of `icuMessageOrRawString` if it's an
 * LH.IcuMessage, or get it back directly if it's already a string.
 * Warning: this function throws if `icuMessageOrRawString` is not the expected
 * type (use function from `createIcuMessageFn` to create a valid LH.IcuMessage)
 * or `locale` isn't supported (use `lookupLocale` to find a valid locale).
 * @param {LH.IcuMessage | string} icuMessageOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
 function getFormatted(icuMessageOrRawString, locale) {
  if (isIcuMessage(icuMessageOrRawString)) {
    return _localizeIcuMessage(icuMessageOrRawString, locale);
  }

  if (typeof icuMessageOrRawString === 'string') {
    return icuMessageOrRawString;
  }

  // Should be impossible from types, but do a strict check in case malformed JSON makes it this far.
  throw new Error(`Attempted to format invalid icuMessage type: ${JSON.stringify(icuMessageOrRawString)}`);
}

/**
 * @param {LH.IcuMessage | string} icuMessageOrRawString
 * @param {LH.Locale} locale
 * @return {MessageFormat | string}
 */
 function getFormatter(icuMessageOrRawString, locale) {
  if (isIcuMessage(icuMessageOrRawString)) {
    return _localizeIcuMessageFormatter(icuMessageOrRawString, locale);
  }

  if (typeof icuMessageOrRawString === 'string') {
    return icuMessageOrRawString;
  }

  // Should be impossible from types, but do a strict check in case malformed JSON makes it this far.
  throw new Error(`Attempted to format invalid icuMessage type: ${JSON.stringify(icuMessageOrRawString)}`);
}

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
 function replaceIcuMessages(inputObject, locale) {
  /**
   * @param {unknown} subObject
   * @param {LH.IcuMessagePaths} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (!isObjectOrArrayOfUnknownValues(subObject)) return;

    for (const [property, possibleIcuMessage] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Replace any IcuMessages with a localized string.
      if (isIcuMessage(possibleIcuMessage)) {
        const formattedString = _localizeIcuMessage(possibleIcuMessage, locale);
        const messageInstancesInLHR = icuMessagePaths[possibleIcuMessage.i18nId] || [];
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        messageInstancesInLHR.push(
          possibleIcuMessage.values ?
            {values: possibleIcuMessage.values, path: currentPathAsString} :
            currentPathAsString
        );

        // @ts-ignore - tsc doesn't like that `property` can be either string key or array index.
        subObject[property] = formattedString;
        icuMessagePaths[possibleIcuMessage.i18nId] = messageInstancesInLHR;
      } else {
        replaceInObject(possibleIcuMessage, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.IcuMessagePaths} */
  const icuMessagePaths = {};
  replaceInObject(inputObject, icuMessagePaths);
  return icuMessagePaths;
}

/** @typedef {import('./locales').LhlMessages} LhlMessages */

/**
 * Populate the i18n string lookup dict with locale data
 * Used when the host environment selects the locale and serves lighthouse the intended locale file
 * @see https://docs.google.com/document/d/1jnt3BqKB-4q3AE94UWFA0Gqspx8Sd_jivlB7gQMlmfk/edit
 * @param {LH.Locale} locale
 * @param {LhlMessages} lhlMessages
 */
function registerLocaleData(locale, lhlMessages) {
  LOCALES[locale] = lhlMessages;
}

/**
 * Get the closest locale from the ones available For example,
 * if es is supported and es-419 is not, then we return es when es-419 is requested
 * @param {LH.Locale} locale
 * @param {any} available
 */
function lookupClosestLocale(locale, available) {
  const localeParts = locale.split('-');
  while (localeParts.length) {
    let candidate = localeParts.join('-');
    if (available[candidate] || (available.default && available.default[candidate])) {
      return candidate;
    }
    localeParts.pop();
  }
};

/**
 * Throws an error with the given icuMessage id.
 * @param {string} icuMessage
 */
function idNotInMainDictionaryException(icuMessage) {
  this.message = `Could not locate: ${icuMessage}`;
}
idNotInMainDictionaryException.prototype = new Error;

/**
 * Type predicate verifying `val` is an object (excluding `Array` and `null`).
 * @param {unknown} val
 * @return {val is Record<string, unknown>}
 */
function isObjectOfUnknownValues(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/**
 * Type predicate verifying `val` is an object or an array.
 * @param {unknown} val
 * @return {val is Record<string, unknown>|Array<unknown>}
 */
function isObjectOrArrayOfUnknownValues(val) {
  return typeof val === 'object' && val !== null;
}

/**
 * Returns true if the given value is a string or an LH.IcuMessage.
 * @param {unknown} value
 * @return {value is string|LH.IcuMessage}
 */
 function isStringOrIcuMessage(value) {
  return typeof value === 'string' || isIcuMessage(value);
}

module.exports = {
  _formatPathAsString,
  lookupLocale,
  getRendererFormattedStrings,
  createIcuMessageFn,
  getFormatted,
  getFormatter,
  replaceIcuMessages,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData,
  isStringOrIcuMessage,
  idNotInMainDictionaryException,
};