// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

interface EventWithTimestamp {
  event: Protocol.Network.DeviceBoundSessionEventOccurredEvent;
  timestamp: Date;
}
export interface SessionAndEvents {
  session?: Protocol.Network.DeviceBoundSession;
  eventsById: Map<string, EventWithTimestamp>;
}
type SessionIdToSessionMap = Map<string|undefined, SessionAndEvents>;

export class DeviceBoundSessionsModel extends Common.ObjectWrapper.ObjectWrapper<DeviceBoundSessionModelEventTypes>
    implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
  #siteSessions = new Map<string, SessionIdToSessionMap>();
  #visibleSites = new Set<string>();

  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this, {scoped: true});
  }

  modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void {
    networkManager.addEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
    networkManager.addEventListener(
        SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
    void networkManager.enableDeviceBoundSessions();
  }

  modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void {
    networkManager.removeEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
    networkManager.removeEventListener(
        SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
  }

  addVisibleSite(site: string): void {
    if (this.#visibleSites.has(site)) {
      return;
    }
    this.#visibleSites.add(site);
    this.dispatchEventToListeners(DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE, {site});
  }

  clearVisibleSites(): void {
    if (this.getPreserveLogSetting().get()) {
      return;
    }
    this.#visibleSites.clear();
    this.dispatchEventToListeners(DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES);
  }

  clearEvents(): void {
    if (this.getPreserveLogSetting().get()) {
      return;
    }
    const emptySessions = new Map<string, Array<string|undefined>>();
    const emptySites = new Set<string>();
    for (const [site, sessionIdToSessionMap] of [...this.#siteSessions]) {
      let emptySessionsSiteEntry = emptySessions.get(site);
      for (const [sessionId, sessionAndEvents] of sessionIdToSessionMap) {
        sessionAndEvents.eventsById.clear();
        if (sessionAndEvents.session) {
          continue;
        }
        // Remove empty sessions.
        sessionIdToSessionMap.delete(sessionId);
        if (!emptySessionsSiteEntry) {
          emptySessionsSiteEntry = [];
          emptySessions.set(site, emptySessionsSiteEntry);
        }
        emptySessionsSiteEntry.push(sessionId);
      }

      // Remove empty sites.
      if (sessionIdToSessionMap.size === 0) {
        this.#siteSessions.delete(site);
        emptySites.add(site);
      }
    }

    this.dispatchEventToListeners(DeviceBoundSessionModelEvents.CLEAR_EVENTS, {emptySessions, emptySites});
  }

  isSiteVisible(site: string): boolean {
    return this.#visibleSites.has(site);
  }

  getSession(site: string, sessionId?: string): SessionAndEvents|undefined {
    return this.#siteSessions.get(site)?.get(sessionId);
  }

  getPreserveLogSetting(): Common.Settings.Setting<boolean> {
    return Common.Settings.Settings.instance().createSetting('device-bound-sessions-preserve-log', false);
  }

  #onSessionsSet({data: sessions}: {data: Protocol.Network.DeviceBoundSession[]}): void {
    for (const session of sessions) {
      const sessionAndEvents = this.#ensureSiteAndSessionInitialized(session.key.site, session.key.id);
      sessionAndEvents.session = session;
    }
    this.dispatchEventToListeners(DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions});
  }

  #ensureSiteAndSessionInitialized(site: string, sessionId?: string): SessionAndEvents {
    let sessionIdToSessionMap = this.#siteSessions.get(site);
    if (!sessionIdToSessionMap) {
      sessionIdToSessionMap = new Map();
      this.#siteSessions.set(site, sessionIdToSessionMap);
    }

    let sessionAndEvent = sessionIdToSessionMap.get(sessionId);
    if (!sessionAndEvent) {
      sessionAndEvent = {session: undefined, eventsById: new Map<string, EventWithTimestamp>()};
      sessionIdToSessionMap.set(sessionId, sessionAndEvent);
    }
    return sessionAndEvent;
  }

  #onEventOccurred({data: event}: {data: Protocol.Network.DeviceBoundSessionEventOccurredEvent}): void {
    const sessionAndEvent = this.#ensureSiteAndSessionInitialized(event.site, event.sessionId);

    // If this eventId has already been tracked, quit early.
    if (sessionAndEvent.eventsById.has(event.eventId)) {
      return;
    }

    // Add the new event.
    const eventWithTimestamp = {event, timestamp: new Date()};
    sessionAndEvent.eventsById.set(event.eventId, eventWithTimestamp);

    // Add the new session if there is one.
    const newSession = event.creationEventDetails?.newSession || event.refreshEventDetails?.newSession;
    if (newSession) {
      sessionAndEvent.session = newSession;
    }

    // Add the new challenge onto the session if there is one.
    if (event.succeeded && sessionAndEvent.session && event.challengeEventDetails) {
      sessionAndEvent.session.cachedChallenge = event.challengeEventDetails.challenge;
    }

    this.dispatchEventToListeners(
        DeviceBoundSessionModelEvents.EVENT_OCCURRED,
        {site: eventWithTimestamp.event.site, sessionId: eventWithTimestamp.event.sessionId});
  }
}

export const enum DeviceBoundSessionModelEvents {
  INITIALIZE_SESSIONS = 'INITIALIZE_SESSIONS',
  ADD_VISIBLE_SITE = 'ADD_VISIBLE_SITE',
  CLEAR_VISIBLE_SITES = 'CLEAR_VISIBLE_SITES',
  EVENT_OCCURRED = 'EVENT_OCCURRED',
  CLEAR_EVENTS = 'CLEAR_EVENTS',
}

export interface DeviceBoundSessionModelEventTypes {
  [DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS]: {sessions: Protocol.Network.DeviceBoundSession[]};
  [DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE]: {site: string};
  [DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES]: void;
  [DeviceBoundSessionModelEvents.EVENT_OCCURRED]: {site: string, sessionId?: string};
  [DeviceBoundSessionModelEvents.CLEAR_EVENTS]:
      {emptySessions: Map<string, Array<string|undefined>>, emptySites: Set<string>};
}
