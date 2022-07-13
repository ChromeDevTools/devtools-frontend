// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import {type Suggestion} from './SuggestBox.js';

export class FilterSuggestionBuilder {
  private readonly keys: string[];
  private readonly valueSorter: ((arg0: string, arg1: Array<string>) => void)|
      ((key: string, result: string[]) => string[]);
  private readonly valuesMap: Map<string, Set<string>>;

  constructor(keys: string[], valueSorter?: ((arg0: string, arg1: Array<string>) => void)) {
    this.keys = keys;
    this.valueSorter = valueSorter || ((key: string, result: string[]): string[] => result.sort());
    this.valuesMap = new Map();
  }

  completions(expression: string, prefix: string, force?: boolean): Promise<Suggestion[]> {
    if (!prefix && !force) {
      return Promise.resolve([]);
    }

    const negative = prefix.startsWith('-');
    if (negative) {
      prefix = prefix.substring(1);
    }
    const modifier = negative ? '-' : '';
    const valueDelimiterIndex = prefix.indexOf(':');

    const suggestions: Suggestion[] = [];
    if (valueDelimiterIndex === -1) {
      const matcher = new RegExp('^' + Platform.StringUtilities.escapeForRegExp(prefix), 'i');
      for (const key of this.keys) {
        if (matcher.test(key)) {
          suggestions.push(({text: modifier + key + ':'} as Suggestion));
        }
      }
    } else {
      const key = prefix.substring(0, valueDelimiterIndex).toLowerCase();
      const value = prefix.substring(valueDelimiterIndex + 1);
      const matcher = new RegExp('^' + Platform.StringUtilities.escapeForRegExp(value), 'i');
      const values = Array.from(this.valuesMap.get(key) || new Set<string>());
      this.valueSorter(key, values);
      for (const item of values) {
        if (matcher.test(item) && (item !== value)) {
          suggestions.push(({text: modifier + key + ':' + item} as Suggestion));
        }
      }
    }
    return Promise.resolve(suggestions);
  }

  addItem(key: string, value?: string|null): void {
    if (!value) {
      return;
    }

    let set = this.valuesMap.get(key);
    if (!set) {
      set = (new Set() as Set<string>);
      this.valuesMap.set(key, set);
    }
    set.add(value);
  }

  clear(): void {
    this.valuesMap.clear();
  }
}
