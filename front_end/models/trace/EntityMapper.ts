// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';

import * as Handlers from './handlers/handlers.js';
import * as Helpers from './helpers/helpers.js';
import type {ParsedTrace} from './ModelImpl.js';
import type * as Types from './types/types.js';

export class EntityMapper {
  #parsedTrace: ParsedTrace;
  #entityMappings: Handlers.Helpers.EntityMappings;
  #firstPartyEntity: Handlers.Helpers.Entity|null;
  #thirdPartyEvents: Types.Events.Event[] = [];
  /**
   * When resolving urls and updating our entity mapping in the
   * SourceMapsResolver, a single call frame can appear multiple times
   * as different cpu profile nodes. To avoid duplicate work on the
   * same CallFrame, we can keep track of them.
   */
  #resolvedCallFrames = new Set<Protocol.Runtime.CallFrame>();

  constructor(parsedTrace: ParsedTrace) {
    this.#parsedTrace = parsedTrace;
    this.#entityMappings = this.#parsedTrace.data.Renderer.entityMappings;
    this.#firstPartyEntity = this.#findFirstPartyEntity();
    this.#thirdPartyEvents = this.#getThirdPartyEvents();
  }

  #findFirstPartyEntity(): Handlers.Helpers.Entity|null {
    // As a starting point, we consider the first navigation as the 1P.
    const nav =
        Array.from(this.#parsedTrace.data.Meta.navigationsByNavigationId.values()).sort((a, b) => a.ts - b.ts)[0];
    const firstPartyUrl = nav?.args.data?.documentLoaderURL ?? this.#parsedTrace.data.Meta.mainFrameURL;
    if (!firstPartyUrl) {
      return null;
    }
    return Handlers.Helpers.getEntityForUrl(firstPartyUrl, this.#entityMappings) ?? null;
  }

  #getThirdPartyEvents(): Types.Events.Event[] {
    const entries = Array.from(this.#entityMappings.eventsByEntity.entries());
    const thirdPartyEvents = entries.flatMap(([entity, events]) => {
      return entity !== this.#firstPartyEntity ? events : [];
    });
    return thirdPartyEvents;
  }

  /**
   * Returns an entity for a given event if any.
   */
  entityForEvent(event: Types.Events.Event): Handlers.Helpers.Entity|null {
    return this.#entityMappings.entityByEvent.get(event) ?? null;
  }

  /**
   * Returns trace events that correspond with a given entity if any.
   */
  eventsForEntity(entity: Handlers.Helpers.Entity): Types.Events.Event[] {
    return this.#entityMappings.eventsByEntity.get(entity) ?? [];
  }

  firstPartyEntity(): Handlers.Helpers.Entity|null {
    return this.#firstPartyEntity;
  }

  thirdPartyEvents(): Types.Events.Event[] {
    return this.#thirdPartyEvents;
  }

  mappings(): Handlers.Helpers.EntityMappings {
    return this.#entityMappings;
  }

  /**
   * This updates entity mapping given a callFrame and sourceURL (newly resolved),
   * updating both eventsByEntity and entityByEvent. The call frame provides us the
   * URL and sourcemap source location that events map to. This describes the exact events we
   * want to update. We then update the events with the new sourceURL.
   *
   * compiledURLs -> the actual file's url (e.g. my-big-bundle.min.js)
   * sourceURLs -> the resolved urls (e.g. react.development.js, my-app.ts)
   * @param callFrame
   * @param sourceURL
   */
  updateSourceMapEntities(callFrame: Protocol.Runtime.CallFrame, sourceURL: string): void {
    // Avoid the extra work, if we have already resolved this callFrame.
    if (this.#resolvedCallFrames.has(callFrame)) {
      return;
    }

    const compiledURL = callFrame.url;
    const currentEntity = Handlers.Helpers.getEntityForUrl(compiledURL, this.#entityMappings);
    const resolvedEntity = Handlers.Helpers.getEntityForUrl(sourceURL, this.#entityMappings);
    // If the entity changed, then we should update our caches. If we don't have a currentEntity,
    // we can't do much with that. Additionally without our current entity, we don't have a reference to the related
    // events so there are no relationships to be made.
    if ((resolvedEntity === currentEntity) || (!currentEntity || !resolvedEntity)) {
      return;
    }
    const currentEntityEvents = (currentEntity && this.#entityMappings.eventsByEntity.get(currentEntity)) ?? [];
    // The events of the entity that match said source location.
    const sourceLocationEvents: Types.Events.Event[] = [];
    // The events that don't match the source location, but that we should keep mapped to its current entity.
    const unrelatedEvents: Types.Events.Event[] = [];
    currentEntityEvents?.forEach(e => {
      const cf = Helpers.Trace.getStackTraceTopCallFrameInEventPayload(e);

      const matchesCallFrame = cf && Helpers.Trace.isMatchingCallFrame(cf, callFrame);
      if (matchesCallFrame) {
        sourceLocationEvents.push(e);
      } else {
        unrelatedEvents.push(e);
      }
    });
    // Update current entity.
    this.#entityMappings.eventsByEntity.set(currentEntity, unrelatedEvents);
    // Map the source location events to the new entity.
    this.#entityMappings.eventsByEntity.set(resolvedEntity, sourceLocationEvents);
    sourceLocationEvents.forEach(e => {
      this.#entityMappings.entityByEvent.set(e, resolvedEntity);
    });
    // Update our CallFrame cache when we've got a resolved entity.
    this.#resolvedCallFrames.add(callFrame);
  }

  // Update entities with proper Chrome Extension names.
  updateExtensionEntitiesWithName(executionContextNamesByOrigin: Map<Platform.DevToolsPath.UrlString, string>): void {
    const entities = Array.from(this.#entityMappings.eventsByEntity.keys());
    for (const [origin, name] of executionContextNamesByOrigin) {
      // In makeUpChromeExtensionEntity, the extension origin is set as the only domain for the entity.
      const entity = entities.find(e => e.domains[0] === origin);
      if (entity) {
        entity.name = entity.company = name;
      }
    }
  }
}
