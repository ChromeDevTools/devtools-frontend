// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Handlers from '../handlers/handlers.js';
import * as Types from '../types/types.js';

export abstract class TraceFilter {
  abstract accept(_event: Types.Events.Event, parsedTrace?: Handlers.Types.ParsedTrace): boolean;
}

export class VisibleEventsFilter extends TraceFilter {
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
    // Any blink.console category events are treated as ConsoleTime events
    if (event.cat.includes('blink.console')) {
      return Types.Events.Name.CONSOLE_TIME;
    }
    // Any blink.user_timing egory events are treated as UserTiming events
    if (event.cat.includes('blink.user_timing')) {
      return Types.Events.Name.USER_TIMING;
    }
    return event.name as Types.Events.Name;
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
