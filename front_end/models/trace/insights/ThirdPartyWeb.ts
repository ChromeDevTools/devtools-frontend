// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Extras from '../extras/extras.js';
import type * as Handlers from '../handlers/handlers.js';
import * as Helpers from '../helpers/helpers.js';
import * as Types from '../types/types.js';

import {type InsightResult, type InsightSetContext, type RequiredData} from './types.js';

export function deps(): ['Meta', 'NetworkRequests', 'Renderer', 'ImagePainting'] {
  return ['Meta', 'NetworkRequests', 'Renderer', 'ImagePainting'];
}

export type Entity = typeof ThirdPartyWeb.ThirdPartyWeb.entities[number];

export interface Summary {
  transferSize: number;
  mainThreadTime: Types.Timing.MicroSeconds;
}

export type ThirdPartyWebInsightResult = InsightResult<{
  entityByRequest: Map<Types.Events.SyntheticNetworkRequest, Entity>,
  requestsByEntity: Map<Entity, Types.Events.SyntheticNetworkRequest[]>,
  summaryByRequest: Map<Types.Events.SyntheticNetworkRequest, Summary>,
  summaryByEntity: Map<Entity, Summary>,
  /** The entity for this navigation's URL. Any other entity is from a third party. */
  firstPartyEntity?: Entity,
}>;

/**
 * Returns the origin portion of a Chrome extension URL.
 */
function getChromeExtensionOrigin(url: URL): string {
  return url.protocol + '//' + url.host;
}

function makeUpChromeExtensionEntity(entityCache: Map<string, Entity>, url: string, extensionName?: string): Entity {
  const parsedUrl = new URL(url);
  const origin = getChromeExtensionOrigin(parsedUrl);
  const host = new URL(origin).host;
  const name = extensionName || host;

  const cachedEntity = entityCache.get(origin);
  if (cachedEntity) {
    return cachedEntity;
  }

  const chromeExtensionEntity = {
    name,
    company: name,
    category: 'Chrome Extension',
    homepage: 'https://chromewebstore.google.com/detail/' + host,
    categories: [],
    domains: [],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0,
  };

  entityCache.set(origin, chromeExtensionEntity);
  return chromeExtensionEntity;
}

function makeUpEntity(entityCache: Map<string, Entity>, url: string): Entity|undefined {
  if (url.startsWith('chrome-extension:')) {
    return makeUpChromeExtensionEntity(entityCache, url);
  }

  // Make up an entity only for valid http/https URLs.
  if (!url.startsWith('http')) {
    return;
  }

  // NOTE: Lighthouse uses a tld database to determine the root domain, but here
  // we are using third party web's database. Doesn't really work for the case of classifying
  // domains 3pweb doesn't know about, so it will just give us a guess.
  const rootDomain = ThirdPartyWeb.ThirdPartyWeb.getRootDomain(url);
  if (!rootDomain) {
    return;
  }

  if (entityCache.has(rootDomain)) {
    return entityCache.get(rootDomain);
  }

  const unrecognizedEntity = {
    name: rootDomain,
    company: rootDomain,
    category: '',
    categories: [],
    domains: [rootDomain],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0,
    isUnrecognized: true,
  };
  entityCache.set(rootDomain, unrecognizedEntity);
  return unrecognizedEntity;
}

interface SummaryMaps {
  byEntity: Map<Entity, Summary>;
  byRequest: Map<Types.Events.SyntheticNetworkRequest, Summary>;
  requestsByEntity: Map<Entity, Types.Events.SyntheticNetworkRequest[]>;
}

function getSelfTimeByUrl(parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): Map<string, number> {
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
          if (!Helpers.Timing.eventIsInBounds(event, context.bounds)) {
            continue;
          }

          const node = parsedTrace.Renderer.entryToNode.get(event);
          if (!node || !node.selfTime) {
            continue;
          }

          const url = Extras.URLForEntry.getNonResolved(parsedTrace as Handlers.Types.ParsedTrace, event);
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

function getSummaries(
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

  return {byEntity, byRequest, requestsByEntity};
}

function getRelatedEvents(summaries: SummaryMaps, firstPartyEntity: Entity|undefined): Types.Events.Event[] {
  const events = [];

  for (const [entity, requests] of summaries.requestsByEntity.entries()) {
    if (entity !== firstPartyEntity) {
      events.push(...requests);
    }
  }

  return events;
}

export function generateInsight(
    parsedTrace: RequiredData<typeof deps>, context: InsightSetContext): ThirdPartyWebInsightResult {
  const networkRequests = parsedTrace.NetworkRequests.byTime.filter(event => {
    if (!context.navigation) {
      return false;
    }

    if (event.args.data.frame !== context.frameId) {
      return false;
    }

    return Helpers.Timing.eventIsInBounds(event, context.bounds);
  });

  const entityByRequest = new Map<Types.Events.SyntheticNetworkRequest, Entity>();
  const madeUpEntityCache = new Map<string, Entity>();
  for (const request of networkRequests) {
    const url = request.args.data.url;
    const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ?? makeUpEntity(madeUpEntityCache, url);
    if (entity) {
      entityByRequest.set(request, entity);
    }
  }

  const selfTimeByUrl = getSelfTimeByUrl(parsedTrace, context);
  // TODO(crbug.com/352244718): re-work to still collect main thread activity if no request is present
  const summaries = getSummaries(networkRequests, entityByRequest, selfTimeByUrl);

  const firstPartyUrl = context.navigation?.args.data?.documentLoaderURL ?? parsedTrace.Meta.mainFrameURL;
  const firstPartyEntity =
      ThirdPartyWeb.ThirdPartyWeb.getEntity(firstPartyUrl) || makeUpEntity(madeUpEntityCache, firstPartyUrl);

  return {
    relatedEvents: getRelatedEvents(summaries, firstPartyEntity),
    entityByRequest,
    requestsByEntity: summaries.requestsByEntity,
    summaryByRequest: summaries.byRequest,
    summaryByEntity: summaries.byEntity,
    firstPartyEntity,
  };
}
