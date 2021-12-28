// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';

// TODO(crbug/1282837): This is too naive and doesn't support
// most (anticipated) uses of the ANSI color sequences (i.e.
// setting both foreground and background color).
const ANSI_COLOR_CODES = new Map([
  // Foreground codes
  [30, 'color:black'],
  [31, 'color:red'],
  [32, 'color:green'],
  [33, 'color:yellow'],
  [34, 'color:blue'],
  [35, 'color:magenta'],
  [36, 'color:cyan'],
  [37, 'color:lightGray'],
  [39, 'color:default'],
  [90, 'color:darkGray'],
  [91, 'color:lightRed'],
  [92, 'color:lightGreen'],
  [93, 'color:lightYellow'],
  [94, 'color:lightBlue'],
  [95, 'color:lightMagenta'],
  [96, 'color:lightCyan'],
  [97, 'color:white'],
  // Background codes
  [40, 'background:black'],
  [41, 'background:red'],
  [42, 'background:green'],
  [43, 'background:yellow'],
  [44, 'background:blue'],
  [45, 'background:magenta'],
  [46, 'background:cyan'],
  [47, 'background:lightGray'],
  [49, 'background:default'],
  [100, 'background:darkGray'],
  [101, 'background:lightRed'],
  [102, 'background:lightGreen'],
  [103, 'background:lightYellow'],
  [104, 'background:lightBlue'],
  [105, 'background:lightMagenta'],
  [106, 'background:lightCyan'],
  [107, 'background:white'],
]);

export type FormatToken = {
  type: 'generic'|'optimal',
  value: SDK.RemoteObject.RemoteObject,
}|{
  type: 'string' | 'style',
  value: string,
};

/**
 * This is the front-end part of the Formatter function specified in the
 * Console Standard (https://console.spec.whatwg.org/#formatter). Here we
 * assume that all type conversions have already happened in V8 before and
 * are only concerned with performing the actual substitutions and dealing
 * with generic and optimal object formatting as well as styling.
 *
 * @param fmt the format string.
 * @param args the substitution arguments for `fmt`.
 * @returns a list of `FormatToken`s as well as the unused arguments.
 */
export const format = (fmt: string, args: SDK.RemoteObject.RemoteObject[]): {
  tokens: FormatToken[],
  args: SDK.RemoteObject.RemoteObject[],
} => {
  const tokens: FormatToken[] = [];

  function addStringToken(value: string): void {
    if (!value) {
      return;
    }
    if (tokens.length && tokens[tokens.length - 1].type === 'string') {
      tokens[tokens.length - 1].value += value;
      return;
    }
    tokens.push({type: 'string', value});
  }

  let argIndex = 0;
  const re = /%([%_Oocsdfi])|\x1B\[(\d+)m/;
  for (let match = re.exec(fmt); match !== null; match = re.exec(fmt)) {
    addStringToken(match.input.substring(0, match.index));
    let substitution: number|string|undefined = undefined;
    const specifier = match[1];
    switch (specifier) {
      case '%':
        addStringToken('%');
        substitution = '';
        break;
      case 's':
        if (argIndex < args.length) {
          const {description} = args[argIndex++];
          substitution = description ?? '';
        }
        break;
      case 'c':
        if (argIndex < args.length) {
          const type = 'style';
          const value = args[argIndex++].description ?? '';
          tokens.push({type, value});
          substitution = '';
        }
        break;
      case 'o':
      case 'O':
        if (argIndex < args.length) {
          const type = specifier === 'O' ? 'generic' : 'optimal';
          const value = args[argIndex++];
          tokens.push({type, value});
          substitution = '';
        }
        break;
      case '_':
        if (argIndex < args.length) {
          argIndex++;
          substitution = '';
        }
        break;
      case 'd':
      case 'f':
      case 'i':
        if (argIndex < args.length) {
          const {value} = args[argIndex++];
          substitution = typeof value !== 'number' ? NaN : value;
          if (specifier !== 'f') {
            substitution = Math.floor(substitution);
          }
        }
        break;
      case undefined: {
        const value = ANSI_COLOR_CODES.get(parseInt(match[2], 10));
        if (value !== undefined) {
          const type = 'style';
          tokens.push({type, value});
          substitution = '';
        }
        break;
      }
    }
    if (substitution === undefined) {
      // If there's no substitution, emit the original specifier / sequence verbatim.
      addStringToken(match[0]);
      substitution = '';
    }
    fmt = substitution + match.input.substring(match.index + match[0].length);
  }
  addStringToken(fmt);
  return {tokens, args: args.slice(argIndex)};
};
