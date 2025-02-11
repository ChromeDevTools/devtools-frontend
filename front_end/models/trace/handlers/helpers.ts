// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../core/platform/platform.js';
import * as ThirdPartyWeb from '../../../third_party/third-party-web/third-party-web.js';
import * as Types from '../types/types.js';

import type {ParsedTrace} from './types.js';

export type Entity = typeof ThirdPartyWeb.ThirdPartyWeb.entities[number]&{
  isUnrecognized?: boolean,
};

export interface EntityMappings {
  createdEntityCache: Map<string, Entity>;
  entityByEvent: Map<Types.Events.Event, Entity>;
  /**
   * This holds the entities that had to be created, because they were not found using the
   * ThirdPartyWeb database.
   */
  eventsByEntity: Map<Entity, Types.Events.Event[]>;
}

export function getEntityForEvent(event: Types.Events.Event, entityCache: Map<string, Entity>): Entity|undefined {
  const url = getNonResolvedURL(event);
  if (!url) {
    return;
  }
  return getEntityForUrl(url, entityCache);
}

export function getEntityForUrl(url: string, entityCache: Map<string, Entity>): Entity|undefined {
  return ThirdPartyWeb.ThirdPartyWeb.getEntity(url) ?? makeUpEntity(entityCache, url);
}

export function getNonResolvedURL(
    entry: Types.Events.Event, parsedTrace?: ParsedTrace): Platform.DevToolsPath.UrlString|null {
  if (Types.Events.isProfileCall(entry)) {
    return entry.callFrame.url as Platform.DevToolsPath.UrlString;
  }

  if (Types.Events.isSyntheticNetworkRequest(entry)) {
    return entry.args.data.url as Platform.DevToolsPath.UrlString;
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
    domains: [],
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    totalOccurrences: 0,
  };

  entityCache.set(origin, chromeExtensionEntity);
  return chromeExtensionEntity;
}

export function addEventToEntityMapping(event: Types.Events.Event, entityMappings: EntityMappings): void {
  const entity = getEntityForEvent(event, entityMappings.createdEntityCache);
  if (!entity) {
    return;
  }

  const events = entityMappings.eventsByEntity.get(entity);
  if (events) {
    events.push(event);
  } else {
    entityMappings.eventsByEntity.set(entity, [event]);
  }

  entityMappings.entityByEvent.set(event, entity);
}
