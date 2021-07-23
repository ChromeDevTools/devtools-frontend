/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MessageFormat = require('../../intl-messageformat/package/dist/umd/intl-messageformat').default;
const LOCALES = require('./locales.js');

const DEFAULT_LOCALE = 'en-US';

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const MESSAGE_I18N_ID_REGEX = / | [^\s]+$/;

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
 * @return {!Array<!LH.Locale>} list of all supported locale codes
 */
function getAllSupportedLocales() {
  return Object.keys(LOCALES);
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

module.exports = {
  _preformatValues,
  lookupLocale,
  collectAllCustomElementsFromICU,
  registerLocaleData,
  getAllSupportedLocales,
  MessageFormat,
};
