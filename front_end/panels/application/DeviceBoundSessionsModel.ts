// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';

interface SessionAndEvents {
  session: Protocol.Network.DeviceBoundSession;
  // TODO(crbug.com/471017387): store events
}
type SessionIdToSessionMap = Map<string, SessionAndEvents>;

export class DeviceBoundSessionsModel extends Common.ObjectWrapper.ObjectWrapper<DeviceBoundSessionModelEventTypes>
    implements SDK.TargetManager.SDKModelObserver<SDK.NetworkManager.NetworkManager> {
  #siteSessions = new Map<string, SessionIdToSessionMap>();

  constructor() {
    super();
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this, {scoped: true});
  }

  modelAdded(networkManager: SDK.NetworkManager.NetworkManager): void {
    networkManager.addEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
    void networkManager.enableDeviceBoundSessions();
  }

  modelRemoved(networkManager: SDK.NetworkManager.NetworkManager): void {
    networkManager.removeEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
  }

  getSession(site: string, sessionId: string): SessionAndEvents|undefined {
    return this.#siteSessions.get(site)?.get(sessionId);
  }

  #onSessionsSet({data: sessions}: {data: Protocol.Network.DeviceBoundSession[]}): void {
    this.#storeSessions(sessions);
    this.dispatchEventToListeners(DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, {sessions});
  }

  #storeSessions(sessions: Protocol.Network.DeviceBoundSession[]): void {
    for (const session of sessions) {
      const site = session.key.site;
      const sessionId = session.key.id;

      let sessionIdToSessionMap = this.#siteSessions.get(site);
      if (!sessionIdToSessionMap) {
        sessionIdToSessionMap = new Map();
        this.#siteSessions.set(site, sessionIdToSessionMap);
      }

      const sessionAndEvents = sessionIdToSessionMap.get(sessionId);
      if (!sessionAndEvents) {
        sessionIdToSessionMap.set(sessionId, {session});
      }
    }
  }
}

export const enum DeviceBoundSessionModelEvents {
  INITIALIZE_SESSIONS = 'INITIALIZE_SESSIONS',
}

export interface DeviceBoundSessionModelEventTypes {
  [DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS]: {sessions: Protocol.Network.DeviceBoundSession[]};
}
