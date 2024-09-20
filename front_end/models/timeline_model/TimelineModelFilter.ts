// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Trace from '../../models/trace/trace.js';

export abstract class TimelineModelFilter {
  abstract accept(_event: Trace.Types.Events.Event, parsedTrace?: Trace.Handlers.Types.ParsedTrace): boolean;
}

export class TimelineVisibleEventsFilter extends TimelineModelFilter {
  private readonly visibleTypes: Set<string>;
  constructor(visibleTypes: string[]) {
    super();
    this.visibleTypes = new Set(visibleTypes);
  }

  accept(event: Trace.Types.Events.Event): boolean {
    if (Trace.Types.Extensions.isSyntheticExtensionEntry(event)) {
      return true;
    }
    return this.visibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }

  static eventType(event: Trace.Types.Events.Event): Trace.Types.Events.Name {
    // Any blink.console category events are treated as ConsoleTime events
    if (Trace.Helpers.Trace.eventHasCategory(event, 'blink.console')) {
      return Trace.Types.Events.Name.CONSOLE_TIME;
    }
    // Any blink.user_timing egory events are treated as UserTiming events
    if (Trace.Helpers.Trace.eventHasCategory(event, 'blink.user_timing')) {
      return Trace.Types.Events.Name.USER_TIMING;
    }
    return event.name as Trace.Types.Events.Name;
  }
}

export class TimelineInvisibleEventsFilter extends TimelineModelFilter {
  #invisibleTypes: Set<Trace.Types.Events.Name>;

  constructor(invisibleTypes: Trace.Types.Events.Name[]) {
    super();
    this.#invisibleTypes = new Set(invisibleTypes);
  }

  accept(event: Trace.Types.Events.Event): boolean {
    return !this.#invisibleTypes.has(TimelineVisibleEventsFilter.eventType(event));
  }
}

export class ExclusiveNameFilter extends TimelineModelFilter {
  #excludeNames: Set<Trace.Types.Events.Name>;
  constructor(excludeNames: Trace.Types.Events.Name[]) {
    super();
    this.#excludeNames = new Set(excludeNames);
  }

  accept(event: Trace.Types.Events.Event): boolean {
    return !this.#excludeNames.has(event.name as Trace.Types.Events.Name);
  }
}
