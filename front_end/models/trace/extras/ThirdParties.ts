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
  mainThreadTime: Types.Timing.MicroSeconds;
}

export interface SummaryMaps {
  byEntity: Map<Entity, Summary>;
  byEvent: Map<Types.Events.Event, Summary>;
  eventsByEntity: Map<Entity, Types.Events.Event[]>;
}

function getSelfTimeByUrl(
    parsedTrace: Handlers.Types.ParsedTrace, bounds: Types.Timing.TraceWindowMicroSeconds): Map<string, number> {
  const selfTimeByUrl = new Map<string, number>();

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

          selfTimeByUrl.set(url, node.selfTime + (selfTimeByUrl.get(url) ?? 0));
        }
      }
    }
  }

  return selfTimeByUrl;
}

export function getEntitiesByRequest(requests: Types.Events.SyntheticNetworkRequest[]):
    {entityByRequest: Map<Types.Events.SyntheticNetworkRequest, Entity>, madeUpEntityCache: Map<string, Entity>} {
  const entityByRequest = new Map<Types.Events.SyntheticNetworkRequest, Entity>();
  const madeUpEntityCache = new Map<string, Entity>();
  for (const request of requests) {
    const url = request.args.data.url;
    const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ?? Handlers.Helpers.makeUpEntity(madeUpEntityCache, url);
    if (entity) {
      entityByRequest.set(request, entity);
    }
  }
  return {entityByRequest, madeUpEntityCache};
}

function getSummaryMap(
    requests: Types.Events.SyntheticNetworkRequest[],
    entityByRequest: Map<Types.Events.SyntheticNetworkRequest, Entity>,
    selfTimeByUrl: Map<string, number>): SummaryMaps {
  const byRequest = new Map<Types.Events.SyntheticNetworkRequest, Summary>();
  const byEntity = new Map<Entity, Summary>();
  const defaultSummary: Summary = {transferSize: 0, mainThreadTime: Types.Timing.MicroSeconds(0)};

  for (const request of requests) {
    const urlSummary = byRequest.get(request) || {...defaultSummary};
    urlSummary.transferSize += request.args.data.encodedDataLength;
    urlSummary.mainThreadTime =
        Types.Timing.MicroSeconds(urlSummary.mainThreadTime + (selfTimeByUrl.get(request.args.data.url) ?? 0));
    byRequest.set(request, urlSummary);
  }

  // Map each request's stat to a particular entity.
  const requestsByEntity = new Map<Entity, Types.Events.SyntheticNetworkRequest[]>();
  for (const [request, requestSummary] of byRequest.entries()) {
    const entity = entityByRequest.get(request);
    if (!entity) {
      byRequest.delete(request);
      continue;
    }

    const entitySummary = byEntity.get(entity) || {...defaultSummary};
    entitySummary.transferSize += requestSummary.transferSize;
    entitySummary.mainThreadTime =
        Types.Timing.MicroSeconds(entitySummary.mainThreadTime + requestSummary.mainThreadTime);
    byEntity.set(entity, entitySummary);

    const entityRequests = requestsByEntity.get(entity) || [];
    entityRequests.push(request);
    requestsByEntity.set(entity, entityRequests);
  }

  return {byEntity, byEvent: byRequest, eventsByEntity: requestsByEntity};
}

export function getSummariesAndEntitiesForTraceBounds(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicroSeconds,
    networkRequests: Types.Events.SyntheticNetworkRequest[]): {
  summaries: SummaryMaps,
  entityByRequest: Map<Types.Events.SyntheticNetworkRequest, Entity>,
  madeUpEntityCache: Map<string, Entity>,
} {
  // Ensure we only handle requests that are within the given traceBounds.
  const reqs = networkRequests.filter(event => {
    return Helpers.Timing.eventIsInBounds(event, traceBounds);
  });

  const {entityByRequest, madeUpEntityCache} = getEntitiesByRequest(reqs);

  const selfTimeByUrl = getSelfTimeByUrl(parsedTrace, traceBounds);
  // TODO(crbug.com/352244718): re-work to still collect main thread activity if no request is present
  const summaries = getSummaryMap(reqs, entityByRequest, selfTimeByUrl);

  return {summaries, entityByRequest, madeUpEntityCache};
}

function getSummaryMapWithMapping(
    events: Types.Events.Event[], entityByEvent: Map<Types.Events.Event, Handlers.Helpers.Entity>,
    selfTimeByUrl: Map<string, number>, eventsByEntity: Map<Handlers.Helpers.Entity, Types.Events.Event[]>,
    parsedTrace: Handlers.Types.ParsedTrace): SummaryMaps {
  const byEvent = new Map<Types.Events.Event, Summary>();
  const byEntity = new Map<Handlers.Helpers.Entity, Summary>();
  const defaultSummary: Summary = {transferSize: 0, mainThreadTime: Types.Timing.MicroSeconds(0)};

  for (const event of events) {
    const url = Handlers.Helpers.getNonResolvedURL(event, parsedTrace) ?? '';
    const urlSummary = byEvent.get(event) || {...defaultSummary};
    if (Types.Events.isSyntheticNetworkRequest(event)) {
      urlSummary.transferSize += event.args.data.encodedDataLength;
    }
    urlSummary.mainThreadTime = Types.Timing.MicroSeconds(urlSummary.mainThreadTime + (selfTimeByUrl.get(url) ?? 0));
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
    entitySummary.mainThreadTime =
        Types.Timing.MicroSeconds(entitySummary.mainThreadTime + requestSummary.mainThreadTime);
    byEntity.set(entity, entitySummary);
  }

  return {byEntity, byEvent, eventsByEntity};
}

export function getSummariesAndEntitiesWithMapping(
    parsedTrace: Handlers.Types.ParsedTrace, traceBounds: Types.Timing.TraceWindowMicroSeconds,
    entityMapping: Handlers.Helpers.EntityMappings): {
  summaries: SummaryMaps,
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
  const selfTimeByUrl = getSelfTimeByUrl(parsedTrace, traceBounds);
  // TODO(crbug.com/352244718): re-work to still collect main thread activity if no request is present
  const summaries =
      getSummaryMapWithMapping(allEvents, entityByEventFiltered, selfTimeByUrl, eventsByEntityFiltered, parsedTrace);

  return {summaries, entityByEvent: entityByEventFiltered};
}
