// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';

import {type NameValue} from './NetworkRequest.js';

const UIStrings = {
  /**
   *@description Text in Server Timing
   */
  deprecatedSyntaxFoundPleaseUse: 'Deprecated syntax found. Please use: <name>;dur=<duration>;desc=<description>',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  duplicateParameterSIgnored: 'Duplicate parameter "{PH1}" ignored.',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  noValueFoundForParameterS: 'No value found for parameter "{PH1}".',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   */
  unrecognizedParameterS: 'Unrecognized parameter "{PH1}".',
  /**
   *@description Text in Server Timing
   */
  extraneousTrailingCharacters: 'Extraneous trailing characters.',
  /**
   *@description Text in Server Timing
   *@example {https} PH1
   *@example {2.0} PH2
   */
  unableToParseSValueS: 'Unable to parse "{PH1}" value "{PH2}".',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/ServerTiming.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ServerTiming {
  metric: string;
  value: number|null;
  description: string|null;

  constructor(metric: string, value: number|null, description: string|null) {
    this.metric = metric;
    this.value = value;
    this.description = description;
  }

  static parseHeaders(headers: NameValue[]): ServerTiming[]|null {
    const rawServerTimingHeaders = headers.filter(item => item.name.toLowerCase() === 'server-timing');
    if (!rawServerTimingHeaders.length) {
      return null;
    }

    const serverTimings = rawServerTimingHeaders.reduce((memo, header) => {
      const timing = this.createFromHeaderValue(header.value);
      memo.push(...timing.map(function(entry) {
        return new ServerTiming(
            entry.name, entry.hasOwnProperty('dur') ? entry.dur : null, entry.hasOwnProperty('desc') ? entry.desc : '');
      }));
      return memo;
    }, ([] as ServerTiming[]));
    serverTimings.sort((a, b) => Platform.StringUtilities.compare(a.metric.toLowerCase(), b.metric.toLowerCase()));
    return serverTimings;
  }

  /**
   * TODO(crbug.com/1011811): Instead of using !Object<string, *> we should have a proper type
   *                          with #name, desc and dur properties.
   */
  static createFromHeaderValue(valueString: string): {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  }[] {
    function trimLeadingWhiteSpace(): void {
      valueString = valueString.replace(/^\s*/, '');
    }
    function consumeDelimiter(char: string): boolean {
      console.assert(char.length === 1);
      trimLeadingWhiteSpace();
      if (valueString.charAt(0) !== char) {
        return false;
      }

      valueString = valueString.substring(1);
      return true;
    }
    function consumeToken(): string|null {
      // https://tools.ietf.org/html/rfc7230#appendix-B
      const result = /^(?:\s*)([\w!#$%&'*+\-.^`|~]+)(?:\s*)(.*)/.exec(valueString);
      if (!result) {
        return null;
      }

      valueString = result[2];
      return result[1];
    }
    function consumeTokenOrQuotedString(): string|null {
      trimLeadingWhiteSpace();
      if (valueString.charAt(0) === '"') {
        return consumeQuotedString();
      }

      return consumeToken();
    }
    function consumeQuotedString(): string|null {
      console.assert(valueString.charAt(0) === '"');
      valueString = valueString.substring(1);  // remove leading DQUOTE

      let value = '';
      while (valueString.length) {
        // split into two parts:
        //  -everything before the first " or \
        //  -everything else
        const result = /^([^"\\]*)(.*)/.exec(valueString);
        if (!result) {
          return null;  // not a valid quoted-string
        }
        value += result[1];
        if (result[2].charAt(0) === '"') {
          // we have found our closing "
          valueString = result[2].substring(1);  // strip off everything after the closing "
          return value;                          // we are done here
        }

        console.assert(result[2].charAt(0) === '\\');
        // special rules for \ found in quoted-string (https://tools.ietf.org/html/rfc7230#section-3.2.6)
        value += result[2].charAt(1);          // grab the character AFTER the \ (if there was one)
        valueString = result[2].substring(2);  // strip off \ and next character
      }

      return null;  // not a valid quoted-string
    }
    function consumeExtraneous(): void {
      const result = /([,;].*)/.exec(valueString);
      if (result) {
        valueString = result[1];
      }
    }

    const result = [];
    let name;
    while ((name = consumeToken()) !== null) {
      const entry = {name};

      if (valueString.charAt(0) === '=') {
        this.showWarning(i18nString(UIStrings.deprecatedSyntaxFoundPleaseUse));
      }

      while (consumeDelimiter(';')) {
        let paramName;
        if ((paramName = consumeToken()) === null) {
          continue;
        }

        paramName = paramName.toLowerCase();
        const parseParameter = this.getParserForParameter(paramName);
        let paramValue: (string|null)|null = null;
        if (consumeDelimiter('=')) {
          // always parse the value, even if we don't recognize the parameter #name
          paramValue = consumeTokenOrQuotedString();
          consumeExtraneous();
        }

        if (parseParameter) {
          // paramName is valid
          if (entry.hasOwnProperty(paramName)) {
            this.showWarning(i18nString(UIStrings.duplicateParameterSIgnored, {PH1: paramName}));
            continue;
          }

          if (paramValue === null) {
            this.showWarning(i18nString(UIStrings.noValueFoundForParameterS, {PH1: paramName}));
          }

          parseParameter.call(this, entry, paramValue);
        } else {
          // paramName is not valid
          this.showWarning(i18nString(UIStrings.unrecognizedParameterS, {PH1: paramName}));
        }
      }

      result.push(entry);
      if (!consumeDelimiter(',')) {
        break;
      }
    }

    if (valueString.length) {
      this.showWarning(i18nString(UIStrings.extraneousTrailingCharacters));
    }
    return result;
  }

  static getParserForParameter(paramName: string):
      ((arg0: {
         // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         [x: string]: any,
       },
        arg1: string|null) => void)|null {
    switch (paramName) {
      case 'dur': {
        function durParser(
            entry: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            },
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paramValue: any): void {
          entry.dur = 0;
          if (paramValue !== null) {
            const duration = parseFloat(paramValue);
            if (isNaN(duration)) {
              ServerTiming.showWarning(i18nString(UIStrings.unableToParseSValueS, {PH1: paramName, PH2: paramValue}));
              return;
            }
            entry.dur = duration;
          }
        }
        return durParser;
      }

      case 'desc': {
        function descParser(
            entry: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            },
            paramValue: string|null): void {
          entry.desc = paramValue || '';
        }
        return descParser;
      }

      default: {
        return null;
      }
    }
  }

  static showWarning(msg: string): void {
    Common.Console.Console.instance().warn(`ServerTiming: ${msg}`);
  }
}
