// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';

import {type ConsoleGroupViewMessage, type ConsoleViewMessage} from './ConsoleViewMessage.js';

export type LevelsMask = {
  [x: string]: boolean,
};

export class ConsoleFilter {
  name: string;
  parsedFilters: TextUtils.TextUtils.ParsedFilter[];
  executionContext: SDK.RuntimeModel.ExecutionContext|null;
  levelsMask: LevelsMask;

  constructor(
      name: string, parsedFilters: TextUtils.TextUtils.ParsedFilter[],
      executionContext: SDK.RuntimeModel.ExecutionContext|null, levelsMask?: LevelsMask) {
    this.name = name;
    this.parsedFilters = parsedFilters;
    this.executionContext = executionContext;
    this.levelsMask = levelsMask || ConsoleFilter.defaultLevelsFilterValue();
  }

  static allLevelsFilterValue(): LevelsMask {
    const result: LevelsMask = {};
    const logLevels: Protocol.EnumerableEnum<typeof Protocol.Log.LogEntryLevel> = {
      Verbose: Protocol.Log.LogEntryLevel.Verbose,
      Info: Protocol.Log.LogEntryLevel.Info,
      Warning: Protocol.Log.LogEntryLevel.Warning,
      Error: Protocol.Log.LogEntryLevel.Error,
    };
    for (const name of Object.values(logLevels)) {
      result[name] = true;
    }
    return result;
  }

  static defaultLevelsFilterValue(): LevelsMask {
    const result = ConsoleFilter.allLevelsFilterValue();
    result[Protocol.Log.LogEntryLevel.Verbose] = false;
    return result;
  }

  static singleLevelMask(level: string): LevelsMask {
    const result: LevelsMask = {};
    result[level] = true;
    return result;
  }

  clone(): ConsoleFilter {
    const parsedFilters = this.parsedFilters.map(TextUtils.TextUtils.FilterParser.cloneFilter);
    const levelsMask = Object.assign({}, this.levelsMask);
    return new ConsoleFilter(this.name, parsedFilters, this.executionContext, levelsMask);
  }

  shouldBeVisible(viewMessage: ConsoleViewMessage): boolean {
    const message = viewMessage.consoleMessage();
    if (this.executionContext &&
        (this.executionContext.runtimeModel !== message.runtimeModel() ||
         this.executionContext.id !== message.getExecutionContextId())) {
      return false;
    }

    if (message.type === SDK.ConsoleModel.FrontendMessageType.Command ||
        message.type === SDK.ConsoleModel.FrontendMessageType.Result ||
        message.type === Protocol.Runtime.ConsoleAPICalledEventType.EndGroup) {
      return true;
    }

    if (message.level && !this.levelsMask[message.level as string]) {
      return false;
    }

    return this.applyFilter(viewMessage) || this.parentGroupHasMatch(viewMessage.consoleGroup());
  }

  // A message is visible if there is a match in any of the parent groups' titles.
  parentGroupHasMatch(viewMessage: ConsoleGroupViewMessage|null): boolean {
    if (viewMessage === null) {
      return false;
    }
    return this.applyFilter(viewMessage) || this.parentGroupHasMatch(viewMessage.consoleGroup());
  }

  applyFilter(viewMessage: ConsoleViewMessage): boolean {
    const message = viewMessage.consoleMessage();
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
                SDK.ConsoleModel.MessageSourceDisplayName.get((message.source as SDK.ConsoleModel.MessageSource)) :
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

    function passesFilter(
        filter: TextUtils.TextUtils.ParsedFilter, value: string|null|undefined, exactMatch: boolean): boolean {
      if (!filter.text) {
        return Boolean(value) === filter.negative;
      }
      if (!value) {
        return !filter.text === !filter.negative;
      }
      const filterText = (filter.text as string).toLowerCase();
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

export enum FilterType {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  Context = 'context',
  Source = 'source',
  Url = 'url',
  /* eslint-enable @typescript-eslint/naming-convention */
}
