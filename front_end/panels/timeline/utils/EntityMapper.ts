// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../models/trace/trace.js';

export class EntityMapper {
  #parsedTrace: Trace.Handlers.Types.ParsedTrace;
  #entityMappings: Trace.Handlers.Helpers.EntityMappings;

  constructor(parsedTrace: Trace.Handlers.Types.ParsedTrace) {
    this.#parsedTrace = parsedTrace;
    this.#entityMappings = this.#initializeEntityMappings(this.#parsedTrace);
  }

  /**
   * This initializes our maps using the parsedTrace data from both the RendererHandler and
   * the NetworkRequestsHandler.
   */
  #initializeEntityMappings(parsedTrace: Trace.Handlers.Types.ParsedTrace): Trace.Handlers.Helpers.EntityMappings {
    // NetworkRequestHander caches.
    const entityByNetworkEvent = parsedTrace.NetworkRequests.entityMappings.entityByEvent;
    const networkEventsByEntity = parsedTrace.NetworkRequests.entityMappings.eventsByEntity;
    const networkCreatedCache = parsedTrace.NetworkRequests.entityMappings.createdEntityCache;

    // RendrerHandler caches.
    const entityByRendererEvent = parsedTrace.Renderer.entityMappings.entityByEvent;
    const rendererEventsByEntity = parsedTrace.Renderer.entityMappings.eventsByEntity;
    const rendererCreatedCache = parsedTrace.Renderer.entityMappings.createdEntityCache;

    // Build caches.
    const entityByEvent = new Map([...entityByNetworkEvent, ...entityByRendererEvent]);
    const createdEntityCache = new Map([...networkCreatedCache, ...rendererCreatedCache]);
    const eventsByEntity = this.#mergeEventsByEntities(rendererEventsByEntity, networkEventsByEntity);

    return {
      entityByEvent,
      eventsByEntity,
      createdEntityCache,
    };
  }

  #mergeEventsByEntities(
      a: Map<Trace.Handlers.Helpers.Entity, Trace.Types.Events.Event[]>,
      b: Map<Trace.Handlers.Helpers.Entity, Trace.Types.Events.Event[]>):
      Map<Trace.Handlers.Helpers.Entity, Trace.Types.Events.Event[]> {
    const merged = new Map(a);
    for (const [entity, events] of b.entries()) {
      if (merged.has(entity)) {
        const currentEvents = merged.get(entity) ?? [];
        merged.set(entity, [...currentEvents, ...events]);
      } else {
        merged.set(entity, [...events]);
      }
    }
    return merged;
  }

  /**
   * Returns an entity for a given event if any.
   */
  entityForEvent(event: Trace.Types.Events.Event): Trace.Handlers.Helpers.Entity|null {
    return this.#entityMappings.entityByEvent.get(event) ?? null;
  }

  /**
   * Returns trace events that correspond with a given entity if any.
   */
  eventsForEntity(entity: Trace.Handlers.Helpers.Entity): Trace.Types.Events.Event[] {
    return this.#entityMappings.eventsByEntity.get(entity) ?? [];
  }

  mappings(): Trace.Handlers.Helpers.EntityMappings {
    return this.#entityMappings;
  }
}
