// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
export class DeviceBoundSessionsModel extends Common.ObjectWrapper.ObjectWrapper {
    #siteSessions = new Map();
    #visibleSites = new Set();
    constructor() {
        super();
        SDK.TargetManager.TargetManager.instance().observeModels(SDK.NetworkManager.NetworkManager, this, { scoped: true });
    }
    modelAdded(networkManager) {
        networkManager.addEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
        networkManager.addEventListener(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
        void networkManager.enableDeviceBoundSessions();
    }
    modelRemoved(networkManager) {
        networkManager.removeEventListener(SDK.NetworkManager.Events.DeviceBoundSessionsAdded, this.#onSessionsSet, this);
        networkManager.removeEventListener(SDK.NetworkManager.Events.DeviceBoundSessionEventOccurred, this.#onEventOccurred, this);
    }
    addVisibleSite(site) {
        if (this.#visibleSites.has(site)) {
            return;
        }
        this.#visibleSites.add(site);
        this.dispatchEventToListeners("ADD_VISIBLE_SITE" /* DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE */, { site });
    }
    clearVisibleSites() {
        if (this.getPreserveLogSetting().get()) {
            return;
        }
        this.#visibleSites.clear();
        this.dispatchEventToListeners("CLEAR_VISIBLE_SITES" /* DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES */);
    }
    clearEvents() {
        if (this.getPreserveLogSetting().get()) {
            return;
        }
        const emptySessions = new Map();
        const noLongerFailedSessions = new Map();
        const emptySites = new Set();
        for (const [site, sessionIdToSessionMap] of [...this.#siteSessions]) {
            let emptySessionsSiteEntry = emptySessions.get(site);
            let noLongerFailedSessionsSiteEntry = noLongerFailedSessions.get(site);
            for (const [sessionId, sessionAndEvents] of sessionIdToSessionMap) {
                sessionAndEvents.eventsById.clear();
                if (sessionAndEvents.hasErrors) {
                    sessionAndEvents.hasErrors = false;
                    if (!noLongerFailedSessionsSiteEntry) {
                        noLongerFailedSessionsSiteEntry = [];
                        noLongerFailedSessions.set(site, noLongerFailedSessionsSiteEntry);
                    }
                    noLongerFailedSessionsSiteEntry.push(sessionId);
                }
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
        this.dispatchEventToListeners("CLEAR_EVENTS" /* DeviceBoundSessionModelEvents.CLEAR_EVENTS */, { emptySessions, emptySites, noLongerFailedSessions });
    }
    isSiteVisible(site) {
        return this.#visibleSites.has(site);
    }
    isSessionTerminated(site, sessionId) {
        const session = this.getSession(site, sessionId);
        if (session === undefined) {
            return false;
        }
        return session.isSessionTerminated;
    }
    sessionHasErrors(site, sessionId) {
        const session = this.getSession(site, sessionId);
        if (session === undefined) {
            return false;
        }
        return session.hasErrors;
    }
    getSession(site, sessionId) {
        return this.#siteSessions.get(site)?.get(sessionId);
    }
    getPreserveLogSetting() {
        return Common.Settings.Settings.instance().createSetting('device-bound-sessions-preserve-log', false);
    }
    #onSessionsSet({ data: sessions }) {
        for (const session of sessions) {
            const sessionAndEvents = this.#ensureSiteAndSessionInitialized(session.key.site, session.key.id);
            sessionAndEvents.session = session;
        }
        this.dispatchEventToListeners("INITIALIZE_SESSIONS" /* DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS */, { sessions });
    }
    #ensureSiteAndSessionInitialized(site, sessionId) {
        let sessionIdToSessionMap = this.#siteSessions.get(site);
        if (!sessionIdToSessionMap) {
            sessionIdToSessionMap = new Map();
            this.#siteSessions.set(site, sessionIdToSessionMap);
        }
        let sessionAndEvent = sessionIdToSessionMap.get(sessionId);
        if (!sessionAndEvent) {
            sessionAndEvent = {
                session: undefined,
                isSessionTerminated: false,
                hasErrors: false,
                eventsById: new Map()
            };
            sessionIdToSessionMap.set(sessionId, sessionAndEvent);
        }
        return sessionAndEvent;
    }
    #onEventOccurred({ data: event }) {
        const sessionAndEvent = this.#ensureSiteAndSessionInitialized(event.site, event.sessionId);
        // If this eventId has already been tracked, quit early.
        if (sessionAndEvent.eventsById.has(event.eventId)) {
            return;
        }
        // Add the new event.
        const eventWithTimestamp = { event, timestamp: new Date() };
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
        // Set the session's terminated status based on the event.
        if (event.succeeded) {
            if (event.terminationEventDetails) {
                sessionAndEvent.isSessionTerminated = true;
            }
            else if (event.creationEventDetails) {
                sessionAndEvent.isSessionTerminated = false;
            }
        }
        // Set that the session has errors if the latest event failed.
        if (!event.succeeded) {
            sessionAndEvent.hasErrors = true;
        }
        this.dispatchEventToListeners("EVENT_OCCURRED" /* DeviceBoundSessionModelEvents.EVENT_OCCURRED */, { site: eventWithTimestamp.event.site, sessionId: eventWithTimestamp.event.sessionId });
    }
}
//# sourceMappingURL=DeviceBoundSessionsModel.js.map