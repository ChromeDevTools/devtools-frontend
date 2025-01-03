// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {compare} from './StringUtilities.js';

export interface NameValue {
  name: string;
  value: string;
}
const defaultWarningMessages: ServerTimingParsingWarningMessage = {
  deprecratedSyntax() {
    return 'Deprecated syntax found. Please use: <name>;dur=<duration>;desc=<description>';
  },
  duplicateParameter(parameter) {
    return `Duplicate parameter "${parameter}" ignored.`;
  },
  noValueFoundForParameter(parameter) {
    return `No value found for parameter "${parameter}".`;
  },
  unrecognizedParameter(parameter) {
    return `Unrecognized parameter "${parameter}".`;
  },
  extraneousTrailingCharacters() {
    return 'Extraneous trailing characters.';
  },
  unableToParseValue(parameter, value) {
    return `Unable to parse "${parameter}" value "${value}".`;
  },
};

export type ServerTimingParsingWarningMessage = {
  deprecratedSyntax: () => string,
  duplicateParameter: (parameter: string) => string,
  noValueFoundForParameter: (parameter: string) => string,
  unrecognizedParameter: (parameter: string) => string,
  extraneousTrailingCharacters: () => string,
  unableToParseValue: (parameter: string, value: string) => string,
};

export class ServerTiming {
  metric: string;
  value: number;
  description: string|null;
  start: number|null;

  constructor(metric: string, value: number, description: string|null, start: number|null) {
    this.metric = metric;
    this.value = value;
    this.description = description;
    this.start = start;
  }

  static parseHeaders(
      headers: NameValue[],
      warningMessages: ServerTimingParsingWarningMessage = defaultWarningMessages): ServerTiming[]|null {
    const rawServerTimingHeaders = headers.filter(item => item.name.toLowerCase() === 'server-timing');
    if (!rawServerTimingHeaders.length) {
      return null;
    }

    const serverTimings = rawServerTimingHeaders.reduce((memo, header) => {
      const timing = this.createFromHeaderValue(header.value, warningMessages);
      memo.push(...timing.map(function(entry) {
        return new ServerTiming(
            entry.name, entry.hasOwnProperty('dur') ? entry.dur : null, entry.hasOwnProperty('desc') ? entry.desc : '',
            entry.hasOwnProperty('start') ? entry.start : null);
      }));
      return memo;
    }, ([] as ServerTiming[]));
    serverTimings.sort((a, b) => compare(a.metric.toLowerCase(), b.metric.toLowerCase()));
    return serverTimings;
  }

  /**
   * TODO(crbug.com/1011811): Instead of using !Object<string, *> we should have a proper type
   *                          with #name, desc and dur properties.
   */
  static createFromHeaderValue(
      valueString: string, warningMessages: ServerTimingParsingWarningMessage = defaultWarningMessages): {
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
        this.showWarning(warningMessages['deprecratedSyntax']());
      }

      while (consumeDelimiter(';')) {
        let paramName;
        if ((paramName = consumeToken()) === null) {
          continue;
        }

        paramName = paramName.toLowerCase();
        const parseParameter = this.getParserForParameter(paramName, warningMessages);
        let paramValue: (string|null)|null = null;
        if (consumeDelimiter('=')) {
          // always parse the value, even if we don't recognize the parameter #name
          paramValue = consumeTokenOrQuotedString();
          consumeExtraneous();
        }

        if (parseParameter) {
          // paramName is valid
          if (entry.hasOwnProperty(paramName)) {
            this.showWarning(warningMessages['duplicateParameter'](paramName));
            continue;
          }

          if (paramValue === null) {
            this.showWarning(warningMessages['noValueFoundForParameter'](paramName));
          }

          parseParameter.call(this, entry, paramValue);
        } else {
          // paramName is not valid
          this.showWarning(warningMessages['unrecognizedParameter'](paramName));
        }
      }

      result.push(entry);
      if (!consumeDelimiter(',')) {
        break;
      }
    }

    if (valueString.length) {
      this.showWarning(warningMessages['extraneousTrailingCharacters']());
    }
    return result;
  }

  static getParserForParameter(paramName: string, warningMessages: ServerTimingParsingWarningMessage):
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
              ServerTiming.showWarning(warningMessages['unableToParseValue'](paramName, paramValue));
              return;
            }
            entry.dur = duration;
          }
        }
        return durParser;
      }
      case 'start': {
        function startParser(
            entry: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            },
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            paramValue: any): void {
          entry.start = null;
          if (paramValue !== null) {
            const start = parseFloat(paramValue);
            if (isNaN(start)) {
              ServerTiming.showWarning(warningMessages['unableToParseValue'](paramName, paramValue));
              return;
            }
            entry.start = start;
          }
        }
        return startParser;
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
    console.warn(`ServerTiming: ${msg}`);
  }
}
