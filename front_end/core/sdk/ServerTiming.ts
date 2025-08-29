// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

import type {NameValue} from './NetworkRequest.js';

const UIStrings = {
  /**
   * @description Text in Server Timing
   * @example {sql-lookup} PH1
   */
  deprecatedSyntaxFoundPleaseUse:
      'Deprecated syntax found for metric "{PH1}". Please use: <name>;dur=<duration>;desc=<description>',
  /**
   * @description Text in Server Timing
   * @example {https} PH1
   */
  duplicateParameterSIgnored: 'Duplicate parameter "{PH1}" ignored.',
  /**
   * @description Text in Server Timing
   * @example {https} PH1
   */
  noValueFoundForParameterS: 'No value found for parameter "{PH1}".',
  /**
   * @description Text in Server Timing
   * @example {https} PH1
   */
  unrecognizedParameterS: 'Unrecognized parameter "{PH1}".',
  /**
   * @description Text in Server Timing
   */
  extraneousTrailingCharacters: 'Extraneous trailing characters.',
  /**
   * @description Text in Server Timing
   * @example {https} PH1
   * @example {2.0} PH2
   */
  unableToParseSValueS: 'Unable to parse "{PH1}" value "{PH2}".',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/ServerTiming.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 * Represents an authored single server timing metric. https://w3c.github.io/server-timing/#the-server-timing-header-field
 */
export interface ServerTimingMetric {
  /** The name of the metric, a single token */
  name: string;
  /** A human-readable description of the metric. */
  desc?: string;
  /** The duration; milliseconds is recommended. https://w3c.github.io/server-timing/#duration-attribute. */
  dur?: number;
}

export const cloudflarePrefix = '(cf) ';
export const cloudinaryPrefix = '(cld) ';

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

    const serverTimings = rawServerTimingHeaders.reduce((timings, header) => {
      const timing = this.createFromHeaderValue(header.value);
      timings.push(...timing.map(function(entry) {
        return new ServerTiming(entry.name, entry.dur ?? null, entry.desc ?? '');
      }));
      return timings;
    }, ([] as ServerTiming[]));
    return serverTimings;
  }

  static createFromHeaderValue(valueString: string): ServerTimingMetric[] {
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

    const result: ServerTimingMetric[] = [];
    let name;
    while ((name = consumeToken()) !== null) {
      const entry: ServerTimingMetric = {name};

      if (valueString.charAt(0) === '=') {
        this.showWarning(i18nString(UIStrings.deprecatedSyntaxFoundPleaseUse, {PH1: name}));
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
          // TODO(paulirish): consider showing other included params, like `start`: https://github.com/w3c/server-timing/issues/43
          this.showWarning(i18nString(UIStrings.unrecognizedParameterS, {PH1: paramName}));
        }
      }

      result.push(entry);

      // Special parsing for cloudflare's bespoke format. https://blog.cloudflare.com/new-standards/#measuring-impact
      // We extract the individual items of the cfL4 server-timing for clear presentation
      if (entry.name === 'cfL4' && entry.desc) {
        new URLSearchParams(entry.desc).entries().forEach(([key, val]) => {
          result.push({name: `${cloudflarePrefix}${key}`, desc: val});
        });
      }

      // Special parsing for cloudinary's bespoke format. https://cloudinary.com/blog/inside_the_black_box_with_server_timing#what_details_are_you_sharing_
      // The format has changed since this blog post
      if (entry.name === 'content-info' && entry.desc) {
        new URLSearchParams(entry.desc.replace(/,/g, '&')).entries().forEach(([key, val]) => {
          result.push({name: `${cloudinaryPrefix}${key}`, desc: val});
        });
      }

      if (!consumeDelimiter(',')) {
        break;
      }
    }

    if (valueString.length) {
      this.showWarning(i18nString(UIStrings.extraneousTrailingCharacters));
    }
    return result;
  }

  static getParserForParameter(paramName: string): ((arg0: ServerTimingMetric, arg1: string|null) => void)|null {
    switch (paramName) {
      case 'dur': {
        function durParser(entry: ServerTimingMetric, paramValue: string|null): void {
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
        function descParser(entry: ServerTimingMetric, paramValue: string|null): void {
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
