// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

// PrerenderingRegistry is aimed to be used in PrerenderingModel.
// TODO(https://crbug.com/1384419): Add PrerenderingModel.

// Id for preloading events and prerendering attempt.
export type PreloadingId = string;

export type PrerenderingAttemptId = string;

export interface PrerenderingAttempt {
  prerenderingAttemptId: PrerenderingAttemptId;
  startedAt: number;
  trigger: PrerenderingTrigger;
  url: Platform.DevToolsPath.UrlString;
  status: PrerenderingStatus;
  discardedReason?: Protocol.Page.PrerenderFinalStatus|null|'Unknown';
}

type PrerenderingTrigger =
    PrerenderingTriggerSpecRules|PrerenderingTriggerDUI|PrerenderingTriggerDSE|PrerenderingTriggerOpaque;

interface PrerenderingTriggerSpecRules {
  kind: 'PrerenderingTriggerSpecRules';
  rule: object;
}

interface PrerenderingTriggerDUI {
  kind: 'PrerenderingTriggerDUI';
}

interface PrerenderingTriggerDSE {
  kind: 'PrerenderingTriggerDSE';
}

interface PrerenderingTriggerOpaque {
  kind: 'PrerenderingTriggerOpaque';
}

export const enum PrerenderingStatus {
  Prerendering = 'Prerendering',
  Activated = 'Activated',
  Discarded = 'Discarded',
}

export type PrerenderingAttemptEvent = PrerenderingAttemptEventAdd|PrerenderingAttemptEventUpdate;

export interface PrerenderingAttemptEventAdd {
  kind: 'PrerenderingAttemptEventAdd';
  attempt: PrerenderingAttempt;
}

export interface PrerenderingAttemptEventUpdate {
  kind: 'PrerenderingAttemptEventUpdate';
  update: PrerenderingAttempt;
}

export interface PrerenderingAttemptWithId {
  id: PreloadingId;
  attempt: PrerenderingAttempt;
}

// export only for testing.
export class PrerenderingRegistry {
  private entities: Map<PreloadingId, PrerenderingAttempt> = new Map<PreloadingId, PrerenderingAttempt>();
  // Currently, PrerenderAttemptCompleted event doesn't have information
  // to identify corresponding attempt. To mitigate this, we utilize the
  // fact that attempts are activated/cancelled if navigated out. So,
  // in many cases, we can identify an ongoing attempt by URL.
  private opaqueUrlToPreId: Map<Platform.DevToolsPath.UrlString, PreloadingId> =
      new Map<Platform.DevToolsPath.UrlString, PreloadingId>();

  // Returns reference. Don't save returned values.
  getById(id: PreloadingId): PrerenderingAttempt|null {
    return this.entities.get(id) || null;
  }

  // Returns array of pairs of id and reference. Don't save returned references.
  getAll(): PrerenderingAttemptWithId[] {
    return Array.from(this.entities.entries()).map(([id, attempt]) => ({id, attempt}));
  }

  private makePreloadingId(x: PrerenderingAttempt): PreloadingId {
    if (x.trigger.kind === 'PrerenderingTriggerOpaque') {
      return `PrerenderingAttempt-opaque:${x.prerenderingAttemptId}` as PreloadingId;
    }
    return `PrerenderingAttempt:${x.prerenderingAttemptId}` as PreloadingId;
  }

  private makePreIdOfPrerendering(frameId: Protocol.Page.FrameId): PreloadingId {
    return `PrerenderingAttempt-opaque:${frameId}` as PreloadingId;
  }

  // TODO(https://crbug.com/1384419): Make this private.
  processEvent(event: PrerenderingAttemptEvent): void {
    switch (event.kind) {
      case 'PrerenderingAttemptEventAdd': {
        this.entities.set(this.makePreloadingId(event.attempt), event.attempt);
        break;
      }
      case 'PrerenderingAttemptEventUpdate': {
        this.entities.set(this.makePreloadingId(event.update), event.update);

        const x = event.update;
        if (x.status !== PrerenderingStatus.Prerendering) {
          if (this.opaqueUrlToPreId.get(x.url)) {
            this.opaqueUrlToPreId.delete(x.url);
          }
        }

        break;
      }
    }
  }

  // Clear not ongoing prerendering attempts.
  clearNotOngoing(): void {
    for (const [id, x] of this.entities.entries()) {
      if (x.status !== PrerenderingStatus.Prerendering) {
        this.entities.delete(id);
      }
    }
  }

  // Initial support of detecting prerendering start
  // TODO: Make CDP changes correctly.
  maybeAddOpaquePrerendering(frameId: Protocol.Page.FrameId, url: Platform.DevToolsPath.UrlString): void {
    // Ad-hoc filtering
    //
    // If a page has SpeculationRules and browser navigated out to a not
    // related page, current Chrome throws PrerenderAttemptCompleted
    // event and then TargetInfoChanged event. This filtering prevents
    // adding a new prerendering attempt by the latter TargetInfoChanged.
    if (this.entities.get(this.makePreIdOfPrerendering(frameId)) !== undefined) {
      return;
    }

    const prerenderingAttemptId: PrerenderingAttemptId = frameId as PrerenderingAttemptId;
    const event: PrerenderingAttemptEventAdd = {
      kind: 'PrerenderingAttemptEventAdd',
      attempt: {
        prerenderingAttemptId: prerenderingAttemptId,
        startedAt: Date.now(),
        trigger: {
          kind: 'PrerenderingTriggerOpaque',
        },
        url,
        status: PrerenderingStatus.Prerendering,
      },
    };
    this.processEvent(event);

    const id = this.makePreIdOfPrerendering(frameId);
    this.opaqueUrlToPreId.set(url, id);
  }

  updateOpaquePrerenderingAttempt(event: Protocol.Page.PrerenderAttemptCompletedEvent): void {
    const id = this.opaqueUrlToPreId.get(event.prerenderingUrl as Platform.DevToolsPath.UrlString);

    if (id === undefined) {
      return;
    }

    const originalAttempt = this.entities.get(id);

    if (originalAttempt === undefined) {
      return;
    }

    const status = (event.finalStatus === Protocol.Page.PrerenderFinalStatus.Activated) ? PrerenderingStatus.Activated :
                                                                                          PrerenderingStatus.Discarded;
    const eventInternal: PrerenderingAttemptEventUpdate = {
      kind: 'PrerenderingAttemptEventUpdate',
      update: {
        prerenderingAttemptId: originalAttempt.prerenderingAttemptId,
        startedAt: originalAttempt.startedAt,
        trigger: originalAttempt.trigger,
        url: originalAttempt.url,
        status: status,
        discardedReason: this.getDiscardedReason(event),
      },
    };
    this.processEvent(eventInternal);
  }

  private getDiscardedReason(event: Protocol.Page.PrerenderAttemptCompletedEvent): Protocol.Page.PrerenderFinalStatus
      |null {
    switch (event.finalStatus) {
      case Protocol.Page.PrerenderFinalStatus.Activated:
        return null;
      case Protocol.Page.PrerenderFinalStatus.Destroyed:
        return null;
      default:
        return event.finalStatus;
    }
  }
}
