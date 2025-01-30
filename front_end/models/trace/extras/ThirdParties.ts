// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

export type Entity = typeof ThirdPartyWeb.ThirdPartyWeb.entities[number];

export interface Summary {
  transferSize: number;
  mainThreadTime: Types.Timing.Micro;
}

export interface ThirdPartySummary {
  byEntity: Map<Entity, Summary>;
  byEvent: Map<Types.Events.Event, Summary>;
  eventsByEntity: Map<Entity, Types.Events.Event[]>;
  madeUpEntityCache: Map<string, Entity>;
}

function getOrMakeSummary(thirdPartySummary: ThirdPartySummary, event: Types.Events.Event, url: string): Summary|null {
  const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ??
      Handlers.Helpers.makeUpEntity(thirdPartySummary.madeUpEntityCache, url);
  if (!entity) {
    return null;
  }

  const events = thirdPartySummary.eventsByEntity.get(entity) ?? [];
  events.push(event);
  thirdPartySummary.eventsByEntity.set(entity, events);

  let summary = thirdPartySummary.byEntity.get(entity);
  if (summary) {
    thirdPartySummary.byEvent.set(event, summary);
    return summary;
  }

  summary = {transferSize: 0, mainThreadTime: Types.Timing.Micro(0)};
  thirdPartySummary.byEntity.set(entity, summary);
  thirdPartySummary.byEvent.set(event, summary);
  return summary;
}

function collectMainThreadActivity(
    thirdPartySummary: ThirdPartySummary, parsedTrace: Handlers.Types.ParsedTrace,
    bounds: Types.Timing.TraceWindowMicro): void {
  for (const process of parsedTrace.Renderer.processes.values()) {
    if (!process.isOnMainFrame) {
      continue;
    }

    for (const thread of process.threads.values()) {
      if (thread.name === 'CrRendererMain') {
        if (!thread.tree) {
          break;
        }

        for (const event of thread.entries) {
          if (!Helpers.Timing.eventIsInBounds(event, bounds)) {
            continue;
          }

          const node = parsedTrace.Renderer.entryToNode.get(event);
          if (!node || !node.selfTime) {
            continue;
          }

          const url = Handlers.Helpers.getNonResolvedURL(event, parsedTrace as Handlers.Types.ParsedTrace);
          if (!url) {
            continue;
          }

          const summary = getOrMakeSummary(thirdPartySummary, event, url);
          if (summary) {
            summary.mainThreadTime = (summary.mainThreadTime + node.selfTime) as Types.Timing.Micro;
          }
        }
      }
    }
  }
}

function collectNetworkActivity(
    thirdPartySummary: ThirdPartySummary, requests: Types.Events.SyntheticNetworkRequest[]): void {
  for (const request of requests) {
    const url = request.args.data.url;
    const summary = getOrMakeSummary(thirdPartySummary, request, url);
    if (summary) {
      summary.transferSize += request.args.data.encodedDataLength;
    }
  }
}

/**
 * @param networkRequests Won't be filtered by trace bounds, so callers should ensure it is filtered.
 */
export function summarizeThirdParties(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicro,
    networkRequests: Types.Events.SyntheticNetworkRequest[]): ThirdPartySummary {
  const thirdPartySummary: ThirdPartySummary = {
    byEntity: new Map(),
    byEvent: new Map(),
    eventsByEntity: new Map(),
    madeUpEntityCache: new Map(),
  };

  collectMainThreadActivity(thirdPartySummary, parsedTrace, traceBounds);
  collectNetworkActivity(thirdPartySummary, networkRequests);

  return thirdPartySummary;
}

function getSummaryMapWithMapping(
    events: Types.Events.Event[], entityByEvent: Map<Types.Events.Event, Handlers.Helpers.Entity>,
    eventsByEntity: Map<Handlers.Helpers.Entity, Types.Events.Event[]>): ThirdPartySummary {
  const byEvent = new Map<Types.Events.Event, Summary>();
  const byEntity = new Map<Handlers.Helpers.Entity, Summary>();
  const defaultSummary: Summary = {transferSize: 0, mainThreadTime: Types.Timing.Micro(0)};

  for (const event of events) {
    const urlSummary = byEvent.get(event) || {...defaultSummary};
    if (Types.Events.isSyntheticNetworkRequest(event)) {
      urlSummary.transferSize += event.args.data.encodedDataLength;
    }
    byEvent.set(event, urlSummary);
  }

  // Map each request's stat to a particular entity.
  for (const [request, requestSummary] of byEvent.entries()) {
    const entity = entityByEvent.get(request);
    if (!entity) {
      byEvent.delete(request);
      continue;
    }

    const entitySummary = byEntity.get(entity) || {...defaultSummary};
    entitySummary.transferSize += requestSummary.transferSize;
    byEntity.set(entity, entitySummary);
  }

  return {byEntity, byEvent, eventsByEntity, madeUpEntityCache: new Map()};
}

// TODO(crbug.com/352244718): Remove or refactor to use summarizeThirdParties/collectMainThreadActivity/etc.
/**
 * Note: unlike summarizeThirdParties, this does not calculate mainThreadTime. The reason is that it is not
 * needed for its one use case, and when dragging the trace bounds it takes a long time to calculate.
 * If it is ever needed, we need to make getSelfTimeByUrl (see deleted code/blame) much faster (cache + bucket?).
 */
export function getSummariesAndEntitiesWithMapping(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicro,
    entityMapping: Handlers.Helpers.EntityMappings): {
  summaries: ThirdPartySummary,
  entityByEvent: Map<Types.Events.Event, Handlers.Helpers.Entity>,
} {
  const entityByEvent = new Map(entityMapping.entityByEvent);
  const eventsByEntity = new Map(entityMapping.eventsByEntity);

  // Consider events only in bounds.
  const entityByEventArr = Array.from(entityByEvent.entries());
  const filteredEntries = entityByEventArr.filter(([event]) => {
    return Helpers.Timing.eventIsInBounds(event, traceBounds);
  });
  const entityByEventFiltered = new Map(filteredEntries);

  // Consider events only in bounds.
  const eventsByEntityArr = Array.from(eventsByEntity.entries());
  const filtered = eventsByEntityArr.filter(([, events]) => {
    events.map(event => {
      return Helpers.Timing.eventIsInBounds(event, traceBounds);
    });
    return events.length > 0;
  });
  const eventsByEntityFiltered = new Map(filtered);

  const allEvents = Array.from(entityByEvent.keys());
  const summaries = getSummaryMapWithMapping(allEvents, entityByEventFiltered, eventsByEntityFiltered);

  return {summaries, entityByEvent: entityByEventFiltered};
}
