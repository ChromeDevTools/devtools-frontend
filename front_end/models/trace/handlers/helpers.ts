// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Types from '../types/types.js';

import type {TraceEventsForNetworkRequest} from './NetworkRequestsHandler.js';
import type {ParsedTrace} from './types.js';

export type Entity = typeof ThirdPartyWeb.ThirdPartyWeb.entities[number]&{
  isUnrecognized?: boolean,
};

export interface EntityMappings {
  createdEntityCache: Map<string, Entity>;
  entityByEvent: Map<Types.Events.Event, Entity>;
  eventsByEntity: Map<Entity, Types.Events.Event[]>;
  entityByUrlCache: Map<string, Entity>;
}

export function getEntityForEvent(event: Types.Events.Event, entityMappings: EntityMappings): Entity|undefined {
  const url = getNonResolvedURL(event);
  if (!url) {
    return;
  }
  return getEntityForUrl(url, entityMappings);
}

export function getEntityForUrl(url: string, entityMappings: EntityMappings): Entity|undefined {
  const cachedByUrl = entityMappings.entityByUrlCache.get(url);
  if (cachedByUrl) {
    return cachedByUrl;
  }
  const entity = ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ?? makeUpEntity(entityMappings.createdEntityCache, url);
  if (entity) {
    entityMappings.entityByUrlCache.set(url, entity);
  }
  return entity;
}

export function getNonResolvedURL(
    entry: Types.Events.Event, parsedTrace?: ParsedTrace): Platform.DevToolsPath.UrlString|null {
  if (Types.Events.isProfileCall(entry)) {
    return entry.callFrame.url as Platform.DevToolsPath.UrlString;
  }

  if (Types.Events.isSyntheticNetworkRequest(entry)) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  if (Types.Events.isParseAuthorStyleSheetEvent(entry) && entry.args) {
    return entry.args.data.stylesheetUrl as Platform.DevToolsPath.UrlString;
  }

  if (entry.args?.data?.stackTrace && entry.args.data.stackTrace.length > 0) {
    return entry.args.data.stackTrace[0].url as Platform.DevToolsPath.UrlString;
  }

  // ParseHTML events store the URL under beginData, not data.
  if (Types.Events.isParseHTML(entry)) {
    return entry.args.beginData.url as Platform.DevToolsPath.UrlString;
  }

  if (parsedTrace) {
    // DecodeImage events use the URL from the relevant PaintImage event.
    if (Types.Events.isDecodeImage(entry)) {
      const paintEvent = parsedTrace.ImagePainting.paintImageForEvent.get(entry);
      return paintEvent ? getNonResolvedURL(paintEvent, parsedTrace) : null;
    }

    // DrawLazyPixelRef events use the URL from the relevant PaintImage event.
    if (Types.Events.isDrawLazyPixelRef(entry) && entry.args?.LazyPixelRef) {
      const paintEvent = parsedTrace.ImagePainting.paintImageByDrawLazyPixelRef.get(entry.args.LazyPixelRef);
      return paintEvent ? getNonResolvedURL(paintEvent, parsedTrace) : null;
    }
  }

  // For all other events, try to see if the URL is provided, else return null.
  if (entry.args?.data?.url) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
  }

  // Many events don't have a url, but are associated with a request. Use the
  // request's url.
  const requestId = (entry.args?.data as {requestId?: string})?.requestId;
  if (parsedTrace && requestId) {
    const url = parsedTrace.NetworkRequests.byId.get(requestId)?.args.data.url;
    if (url) {
      return url as Platform.DevToolsPath.UrlString;
    }
  }

  return null;
}

export function makeUpEntity(entityCache: Map<string, Entity>, url: string): Entity|undefined {
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
    domains: [origin],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0,
  };

  entityCache.set(origin, chromeExtensionEntity);
  return chromeExtensionEntity;
}

export function addEventToEntityMapping(event: Types.Events.Event, entityMappings: EntityMappings): void {
  // As we share the entityMappings between Network and Renderer... We can have ResourceSendRequest events passed in here
  // that were already mapped in Network. So, to avoid mapping twice, we always check that we didn't yet.
  if (entityMappings.entityByEvent.has(event)) {
    return;
  }

  const entity = getEntityForEvent(event, entityMappings);
  if (!entity) {
    return;
  }

  const mappedEvents = entityMappings.eventsByEntity.get(entity);
  if (mappedEvents) {
    mappedEvents.push(event);
  } else {
    entityMappings.eventsByEntity.set(entity, [event]);
  }
  entityMappings.entityByEvent.set(event, entity);
}

// A slight upgrade of addEventToEntityMapping to handle the sub-events of a network request.
export function addNetworkRequestToEntityMapping(
    networkRequest: Types.Events.SyntheticNetworkRequest, entityMappings: EntityMappings,
    requestTraceEvents: TraceEventsForNetworkRequest): void {
  const entity = getEntityForEvent(networkRequest, entityMappings);
  if (!entity) {
    return;
  }
  // In addition to mapping the network request, we'll also assign this entity to its "child" instant events like receiveData, willSendRequest, finishLoading, etc,
  const eventsToMap = [networkRequest, ...Object.values(requestTraceEvents).flat()];
  const mappedEvents = entityMappings.eventsByEntity.get(entity);
  if (mappedEvents) {
    mappedEvents.push(...eventsToMap);
  } else {
    entityMappings.eventsByEntity.set(entity, eventsToMap);
  }
  for (const evt of eventsToMap) {
    entityMappings.entityByEvent.set(evt, entity);
  }
}
