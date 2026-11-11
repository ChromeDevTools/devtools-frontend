// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import * as Types from '../types/types.js';

export abstract class TraceFilter {
  abstract accept(_event: Types.Events.Event, handlerData?: Handlers.Types.HandlerData): boolean;
}

export class VisibleEventsFilter extends TraceFilter {
  // Real traces contain ~15 distinct category strings; memoizing the substring
  // checks avoids scanning event.cat on every event in hot tree-build loops.
  static #categoryToEventName = new Map<string, Types.Events.Name|null>();
  private readonly visibleTypes: Set<string>;
  constructor(visibleTypes: string[]) {
    super();
    this.visibleTypes = new Set(visibleTypes);
  }

  accept(event: Types.Events.Event): boolean {
    if (Types.Extensions.isSyntheticExtensionEntry(event)) {
      return true;
    }
    return this.visibleTypes.has(VisibleEventsFilter.eventType(event));
  }

  static eventType(event: Types.Events.Event): Types.Events.Name {
    let type = VisibleEventsFilter.#categoryToEventName.get(event.cat);
    if (type === undefined) {
      if (event.cat.includes('blink.console')) {
        type = Types.Events.Name.CONSOLE_TIME;
      } else if (event.cat.includes('blink.user_timing')) {
        type = Types.Events.Name.USER_TIMING;
      } else {
        type = null;
      }
      if (VisibleEventsFilter.#categoryToEventName.size < 256) {
        VisibleEventsFilter.#categoryToEventName.set(event.cat, type);
      }
    }
    return type ?? (event.name as Types.Events.Name);
  }
}

export class InvisibleEventsFilter extends TraceFilter {
  #invisibleTypes: Set<Types.Events.Name>;

  constructor(invisibleTypes: Types.Events.Name[]) {
    super();
    this.#invisibleTypes = new Set(invisibleTypes);
  }

  accept(event: Types.Events.Event): boolean {
    return !this.#invisibleTypes.has(VisibleEventsFilter.eventType(event));
  }
}

export class ExclusiveNameFilter extends TraceFilter {
  #excludeNames: Set<Types.Events.Name>;
  constructor(excludeNames: Types.Events.Name[]) {
    super();
    this.#excludeNames = new Set(excludeNames);
  }

  accept(event: Types.Events.Event): boolean {
    return !this.#excludeNames.has(event.name as Types.Events.Name);
  }
}
