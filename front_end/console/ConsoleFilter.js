// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../sdk/sdk.js';
import * as TextUtils from '../text_utils/text_utils.js';

import {ConsoleViewMessage} from './ConsoleViewMessage.js';  // eslint-disable-line no-unused-vars

export class ConsoleFilter {
  /**
   * @param {string} name
   * @param {!Array<!TextUtils.TextUtils.ParsedFilter>} parsedFilters
   * @param {?SDK.RuntimeModel.ExecutionContext} executionContext
   * @param {!Object<string, boolean>=} levelsMask
   */
  constructor(name, parsedFilters, executionContext, levelsMask) {
    this.name = name;
    this.parsedFilters = parsedFilters;
    this.executionContext = executionContext;
    this.levelsMask = levelsMask || ConsoleFilter.defaultLevelsFilterValue();
  }

  /**
   * @return {!Object<string, boolean>}
   */
  static allLevelsFilterValue() {
    const result = {};
    for (const name of Object.values(SDK.ConsoleModel.MessageLevel)) {
      result[name] = true;
    }
    return result;
  }

  /**
   * @return {!Object<string, boolean>}
   */
  static defaultLevelsFilterValue() {
    const result = ConsoleFilter.allLevelsFilterValue();
    result[SDK.ConsoleModel.MessageLevel.Verbose] = false;
    return result;
  }

  /**
   * @param {string} level
   * @return {!Object<string, boolean>}
   */
  static singleLevelMask(level) {
    const result = {};
    result[level] = true;
    return result;
  }

  /**
   * @return {!ConsoleFilter}
   */
  clone() {
    const parsedFilters = this.parsedFilters.map(TextUtils.TextUtils.FilterParser.cloneFilter);
    const levelsMask = Object.assign({}, this.levelsMask);
    return new ConsoleFilter(this.name, parsedFilters, this.executionContext, levelsMask);
  }

  /**
   * @param {!ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  shouldBeVisible(viewMessage) {
    const message = viewMessage.consoleMessage();
    if (this.executionContext &&
        (this.executionContext.runtimeModel !== message.runtimeModel() ||
         this.executionContext.id !== message.executionContextId)) {
      return false;
    }

    if (message.type === SDK.ConsoleModel.MessageType.Command || message.type === SDK.ConsoleModel.MessageType.Result ||
        message.isGroupMessage()) {
      return true;
    }

    if (message.level && !this.levelsMask[/** @type {string} */ (message.level)]) {
      return false;
    }

    for (const filter of this.parsedFilters) {
      if (!filter.key) {
        if (filter.regex && viewMessage.matchesFilterRegex(filter.regex) === filter.negative) {
          return false;
        }
        if (filter.text && viewMessage.matchesFilterText(filter.text) === filter.negative) {
          return false;
        }
      } else {
        switch (filter.key) {
          case FilterType.Context: {
            if (!passesFilter(filter, message.context, false /* exactMatch */)) {
              return false;
            }
            break;
          }
          case FilterType.Source: {
            const sourceNameForMessage = message.source ?
                SDK.ConsoleModel.MessageSourceDisplayName.get(
                    /** @type {!SDK.ConsoleModel.MessageSource} */ (message.source)) :
                message.source;
            if (!passesFilter(filter, sourceNameForMessage, true /* exactMatch */)) {
              return false;
            }
            break;
          }
          case FilterType.Url: {
            if (!passesFilter(filter, message.url, false /* exactMatch */)) {
              return false;
            }
            break;
          }
        }
      }
    }
    return true;

    /**
     * @param {!TextUtils.TextUtils.ParsedFilter} filter
     * @param {?string|undefined} value
     * @param {boolean} exactMatch
     * @return {boolean}
     */
    function passesFilter(filter, value, exactMatch) {
      if (!filter.text) {
        return !!value === filter.negative;
      }
      if (!value) {
        return !filter.text === !filter.negative;
      }
      const filterText = /** @type {string} */ (filter.text).toLowerCase();
      const lowerCaseValue = value.toLowerCase();
      if (exactMatch && (lowerCaseValue === filterText) === filter.negative) {
        return false;
      }
      if (!exactMatch && lowerCaseValue.includes(filterText) === filter.negative) {
        return false;
      }
      return true;
    }
  }
}

/** @enum {string} */
export const FilterType = {
  Context: 'context',
  Source: 'source',
  Url: 'url'
};
