/**
 * @license Copyright 2018 The Lighthouse Authors. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('../lodash-isequal/package/index');
const MessageFormat = require('../intl-messageformat/package/dist/umd/intl-messageformat').default;
const LOCALES = require('./locales.js');

/** @typedef {import('intl-messageformat-parser').Element} MessageElement */
/** @typedef {import('intl-messageformat-parser').ArgumentElement} ArgumentElement */

const MESSAGE_INSTANCE_ID_REGEX = /(.* \| .*) # (\d+)$/;
// Above regex is very slow against large strings. Use QUICK_REGEX as a much quicker discriminator.
const MESSAGE_INSTANCE_ID_QUICK_REGEX = / # \d+$/;

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
 * - the default locale ('en-US') if no match is found
 *
 * If `locale` isn't provided, the default is used.
 * @param {string=} locale
 * @return {LH.Locale}
 */
function lookupLocale(locale) {
  // TODO: could do more work to sniff out default locale
  const canonicalLocale = Intl.getCanonicalLocales(locale)[0];

  const closestLocale = lookupClosestLocale(canonicalLocale, LOCALES);
  return closestLocale || 'en-US';
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
 * they will be used in the `icuMessage`, e.g. KB or milliseconds. The original
 * object is unchanged.
 * @param {string} icuMessage
 * @param {MessageFormat} messageFormatter
 * @param {Readonly<Record<string, string | number>>} values
 * @return {Record<string, string | number>}
 */
function _preformatValues(icuMessage, messageFormatter, values) {
  const elementMap = collectAllCustomElementsFromICU(messageFormatter.getAst().elements);
  const argumentElements = [...elementMap.values()];

  /** @type {Record<string, string | number>} */
  const formattedValues = {};

  for (const {id, format} of argumentElements) {
    // Throw an error if a message's value isn't provided
    if (id && (id in values) === false) {
      throw new Error(`ICU Message "${icuMessage}" contains a value reference ("${id}") ` +
        `that wasn't provided`);
    }

    const value = values[id];

    // Direct `{id}` replacement and non-numeric values need no formatting.
    if (!format || format.type !== 'numberFormat') {
      formattedValues[id] = value;
      continue;
    }

    if (typeof value !== 'number') {
      throw new Error(`ICU Message "${icuMessage}" contains a numeric reference ("${id}") ` +
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
      `ICU message "${icuMessage}"`);
  }

  return formattedValues;
}

/**
 * @typedef IcuMessageInstance
 * @prop {string} icuMessageId
 * @prop {string} icuMessage
 * @prop {Record<string, string | number>|undefined} [values]
 */

/** @type {Map<string, IcuMessageInstance[]>} */
const _icuMessageInstanceMap = new Map();

const _ICUMsgNotFoundMsg = 'ICU message not found in destination locale';
/**
 *
 * @param {LH.Locale} locale
 * @param {string} icuMessageId
 * @param {string=} uiStringMessage The original string given in 'UIStrings', used as a backup if no locale message can be found
 * @return {{localeMessage: string, formatter: MessageFormat}}
 */
function _getLocaleMessageAndCreateFormatter(locale, icuMessageId, uiStringMessage) {
  const localeMessages = LOCALES[locale];
  if (!localeMessages) throw new Error(`Unsupported locale '${locale}'`);
  let localeMessage = localeMessages[icuMessageId] && localeMessages[icuMessageId].message;

  // fallback to the original english message if we couldn't find a message in the specified locale
  // better to have an english message than no message at all, in some number cases it won't even matter
  if (!localeMessage && uiStringMessage) {
    // Try to use the original uiStringMessage
    localeMessage = uiStringMessage;

    // Warn the user that the UIString message != the `en-US` message ∴ they should update the strings
    if (!LOCALES['en-US'][icuMessageId] || localeMessage !== LOCALES['en-US'][icuMessageId].message) {
      console.log('i18n', `Message "${icuMessageId}" does not match its 'en-US' counterpart. ` +
        `Run 'i18n' to update.`);
    }
  }
  // At this point, there is no reasonable string to show to the user, so throw.
  if (!localeMessage) {
    throw new Error(_ICUMsgNotFoundMsg);
  }

  // when using accented english, force the use of a different locale for number formatting
  const localeForMessageFormat = (locale === 'en-XA' || locale === 'en-XL') ? 'de-DE' : locale;

  const formatter = new MessageFormat(localeMessage, localeForMessageFormat, formats);

  return {localeMessage, formatter};
}
/**
 *
 * @param {string} localeMessage
 * @param {MessageFormat} formatter
 * @param {Record<string, string | number>} [values]
 * @return {{formattedString: string, icuMessage: string}}
 */
function _formatMessage(localeMessage, formatter, values = {}) {
  // preformat values for the message format like KB and milliseconds
  const valuesForMessageFormat = _preformatValues(localeMessage, formatter, values);

  const formattedString = formatter.format(valuesForMessageFormat);
  return {formattedString, icuMessage: localeMessage};
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

  const icuMessageIds = Object.keys(localeMessages).filter(f => f.includes('core/report/html/'));
  const strings = /** @type {LH.I18NRendererStrings} */ ({});
  for (const icuMessageId of icuMessageIds) {
    const [filename, varName] = icuMessageId.split(' | ');
    if (!filename.endsWith('util.js')) throw new Error(`Unexpected message: ${icuMessageId}`);

    const key = /** @type {keyof LH.I18NRendererStrings} */ (varName);
    strings[key] = localeMessages[icuMessageId].message;
  }

  return strings;
}

/**
 * Register a file's UIStrings with i18n, return function to
 * generate the string ids.
 *
 * @param {string} filename
 * @param {Record<string, string>} fileStrings
 */
function createMessageInstanceIdFn(filename, fileStrings) {
  /**
   * Convert a message string & replacement values into an
   * indexed id value in the form '{messageid} | # {index}'.
   *
   * @param {string} icuMessage
   * @param {Record<string, string | number>} [values]
   * */
  const getMessageInstanceIdFn = (icuMessage, values) => {
    const keyname = Object.keys(fileStrings).find(key => fileStrings[key] === icuMessage);
    if (!keyname) throw new Error(`Could not locate: ${icuMessage}`);

    const unixStyleFilename = filename.replace(/\\/g, '/');
    const icuMessageId = `${unixStyleFilename} | ${keyname}`;
    const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];

    let indexOfInstance = icuMessageInstances.findIndex(inst => isDeepEqual(inst.values, values));
    if (indexOfInstance === -1) {
      icuMessageInstances.push({icuMessageId, icuMessage, values});
      indexOfInstance = icuMessageInstances.length - 1;
    }

    _icuMessageInstanceMap.set(icuMessageId, icuMessageInstances);

    return `${icuMessageId} # ${indexOfInstance}`;
  };

  return getMessageInstanceIdFn;
}

/**
 * Returns true if string is an ICUMessage reference.
 * @param {string} icuMessageIdOrRawString
 * @return {boolean}
 */
function isIcuMessage(icuMessageIdOrRawString) {
  return MESSAGE_INSTANCE_ID_QUICK_REGEX.test(icuMessageIdOrRawString) &&
      MESSAGE_INSTANCE_ID_REGEX.test(icuMessageIdOrRawString);
}

/**
 * @param {string} icuMessageIdOrRawString
 * @param {LH.Locale} locale
 * @return {string}
 */
function getFormatted(icuMessageIdOrRawString, locale) {
  if (isIcuMessage(icuMessageIdOrRawString)) {
    const {icuMessageId, icuMessageInstance} = _resolveIcuMessageInstanceId(icuMessageIdOrRawString);
    const {localeMessage, formatter} = _getLocaleMessageAndCreateFormatter(locale, icuMessageId, icuMessageInstance.icuMessage);
    const {formattedString} = _formatMessage(localeMessage, formatter, icuMessageInstance.values);
    return formattedString;
  }

  return icuMessageIdOrRawString;
}

/**
 * @param {string} icuMessageIdOrRawString
 * @param {LH.Locale} locale
 * @return {MessageFormat | string}
 */
function getFormatter(icuMessageIdOrRawString, locale) {
  if (isIcuMessage(icuMessageIdOrRawString)) {
    const {icuMessageId, icuMessageInstance} = _resolveIcuMessageInstanceId(icuMessageIdOrRawString);
    const {formatter} = _getLocaleMessageAndCreateFormatter(locale, icuMessageId, icuMessageInstance.icuMessage);

    return formatter;
  }

  return icuMessageIdOrRawString;
}

/**
 * @param {LH.Locale} locale
 * @param {string} icuMessageId
 * @param {Record<string, string | number>} [values]
 * @return {string}
 */
function getFormattedFromIdAndValues(locale, icuMessageId, values) {
  const icuMessageIdRegex = /(.* \| .*)$/;
  if (!icuMessageIdRegex.test(icuMessageId)) throw new Error('This is not an ICU message ID');

  const {localeMessage, formatter} = _getLocaleMessageAndCreateFormatter(locale, icuMessageId, undefined);
  const {formattedString} = _formatMessage(localeMessage, formatter, values);

  return formattedString;
}

/**
 * @param {string} icuMessageInstanceId
 * @return {{icuMessageId: string, icuMessageInstance: IcuMessageInstance}}
 */
function _resolveIcuMessageInstanceId(icuMessageInstanceId) {
  const matches = icuMessageInstanceId.match(MESSAGE_INSTANCE_ID_REGEX);
  if (!matches) throw new Error(`${icuMessageInstanceId} is not a valid message instance ID`);

  const [_, icuMessageId, icuMessageInstanceIndex] = matches;
  const icuMessageInstances = _icuMessageInstanceMap.get(icuMessageId) || [];
  const icuMessageInstance = icuMessageInstances[Number(icuMessageInstanceIndex)];

  return {icuMessageId, icuMessageInstance};
}

/**
 * Recursively walk the input object, looking for property values that are
 * string references and replace them with their localized values. Primarily
 * used with the full LHR as input.
 * @param {*} inputObject
 * @param {LH.Locale} locale
 * @return {LH.I18NMessages}
 */
function replaceIcuMessageInstanceIds(inputObject, locale) {
  /**
   * @param {*} subObject
   * @param {LH.I18NMessages} icuMessagePaths
   * @param {string[]} pathInLHR
   */
  function replaceInObject(subObject, icuMessagePaths, pathInLHR = []) {
    if (typeof subObject !== 'object' || !subObject) return;

    for (const [property, value] of Object.entries(subObject)) {
      const currentPathInLHR = pathInLHR.concat([property]);

      // Check to see if the value in the LHR looks like a string reference. If it is, replace it.
      if (typeof value === 'string' && isIcuMessage(value)) {
        const {icuMessageId, icuMessageInstance} = _resolveIcuMessageInstanceId(value);
        const {localeMessage, formatter} = _getLocaleMessageAndCreateFormatter(locale, icuMessageId, icuMessageInstance.icuMessage);
        const {formattedString} = _formatMessage(localeMessage, formatter, icuMessageInstance.values);

        const messageInstancesInLHR = icuMessagePaths[icuMessageInstance.icuMessageId] || [];
        const currentPathAsString = _formatPathAsString(currentPathInLHR);

        messageInstancesInLHR.push(
          icuMessageInstance.values ?
            {values: icuMessageInstance.values, path: currentPathAsString} :
            currentPathAsString
        );

        subObject[property] = formattedString;
        icuMessagePaths[icuMessageInstance.icuMessageId] = messageInstancesInLHR;
      } else {
        replaceInObject(value, icuMessagePaths, currentPathInLHR);
      }
    }
  }

  /** @type {LH.I18NMessages} */
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
    if (available[candidate]) {
      return candidate;
    }
    localeParts.pop();
  }
};

module.exports = {
  _formatPathAsString,
  _ICUMsgNotFoundMsg,
  lookupLocale,
  getRendererFormattedStrings,
  createMessageInstanceIdFn,
  getFormatted,
  getFormatter,
  getFormattedFromIdAndValues,
  replaceIcuMessageInstanceIds,
  isIcuMessage,
  collectAllCustomElementsFromICU,
  registerLocaleData,
};