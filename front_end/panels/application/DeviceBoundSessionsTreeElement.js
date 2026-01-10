// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import { createIcon } from '../../ui/kit/kit.js';
import { ApplicationPanelTreeElement } from './ApplicationPanelTreeElement.js';
const UIStrings = {
    /**
     *@description Text for section title Application panel sidebar. A website
     * may decide to create a session for a user, for example when the user logs
     * in. They can use a protocol to make it a "device bound session". That
     * means that when the session expires, it is only possible for it to be
     * extended on the device it was created on. Thus the session is considered
     * to be bound to that device. For more details on the protocol, see
     * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
     * https://w3c.github.io/webappsec-dbsc/.
     */
    deviceBoundSessions: 'Device bound sessions',
    /**
     *@description Empty state description for root tree element and site tree
     * elements. A website may decide to create a session for a user, for example
     * when the user logs in. They can use a protocol to make it a "device bound
     * session". That means that when the session expires, it is only possible
     * for it to be extended on the device it was created on. Thus the session
     * is considered to be bound to that device. A session can have various events,
     * such as when it's first created, when it's extended, or when it's
     * terminated. For more details on the protocol, see
     * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
     * https://w3c.github.io/webappsec-dbsc/.
     */
    deviceBoundSessionsCategoryDescription: 'On this page you can view device bound sessions and associated events',
    /**
     *@description Events are sometimes linked to sessions. These are grouped
     * visually either by session name or by 'No session' if any events are not
     * linked to a session.
     */
    noSession: 'No session',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/DeviceBoundSessionsTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RootTreeElement extends ApplicationPanelTreeElement {
    #model;
    #sites = new Map();
    constructor(storagePanel, model) {
        super(storagePanel, i18nString(UIStrings.deviceBoundSessions), /* expandable=*/ true, 'device-bound-sessions-root');
        this.setLeadingIcons([createIcon('lock-person')]);
        this.#model = model;
    }
    get itemURL() {
        return 'device-bound-sessions://';
    }
    onselect(selectedByUser) {
        super.onselect(selectedByUser);
        this.resourcesPanel.showDeviceBoundSessionDefault(this.#model, i18nString(UIStrings.deviceBoundSessions), i18nString(UIStrings.deviceBoundSessionsCategoryDescription));
        return false;
    }
    onbind() {
        super.onbind();
        this.#model.addEventListener("INITIALIZE_SESSIONS" /* DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS */, this.#onNewSessions, this);
        this.#model.addEventListener("ADD_VISIBLE_SITE" /* DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE */, this.#onVisibleSiteAdded, this);
        this.#model.addEventListener("CLEAR_VISIBLE_SITES" /* DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES */, this.#onVisibleSitesCleared, this);
        this.#model.addEventListener("EVENT_OCCURRED" /* DeviceBoundSessionModelEvents.EVENT_OCCURRED */, this.#onEventOccurred, this);
        this.#model.addEventListener("CLEAR_EVENTS" /* DeviceBoundSessionModelEvents.CLEAR_EVENTS */, this.#onClearEvents, this);
    }
    onunbind() {
        super.onunbind();
        this.#model.removeEventListener("INITIALIZE_SESSIONS" /* DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS */, this.#onNewSessions, this);
        this.#model.removeEventListener("ADD_VISIBLE_SITE" /* DeviceBoundSessionModelEvents.ADD_VISIBLE_SITE */, this.#onVisibleSiteAdded, this);
        this.#model.removeEventListener("CLEAR_VISIBLE_SITES" /* DeviceBoundSessionModelEvents.CLEAR_VISIBLE_SITES */, this.#onVisibleSitesCleared, this);
        this.#model.removeEventListener("EVENT_OCCURRED" /* DeviceBoundSessionModelEvents.EVENT_OCCURRED */, this.#onEventOccurred, this);
        this.#model.removeEventListener("CLEAR_EVENTS" /* DeviceBoundSessionModelEvents.CLEAR_EVENTS */, this.#onClearEvents, this);
    }
    #updateSiteTreeElementVisibility(site) {
        const siteMapEntry = this.#sites.get(site);
        if (!siteMapEntry) {
            return;
        }
        const siteTreeElement = siteMapEntry.siteTreeElement;
        const isElementPresent = this.indexOfChild(siteTreeElement) >= 0;
        const isSiteAllowed = this.#model.isSiteVisible(site);
        if (isSiteAllowed && !isElementPresent) {
            // Appending a child element that already has children requires a workaround of
            // detaching and repopulating them so that the selection background color UI works.
            // TODO(crbug.com/471021582): Can this fix safely be moved to Treeoutline.ts?
            this.appendChild(siteTreeElement);
            const children = [...siteTreeElement.children()];
            siteTreeElement.removeChildren();
            for (const child of children) {
                siteTreeElement.appendChild(child);
            }
        }
        else if (!isSiteAllowed && isElementPresent) {
            this.removeChild(siteTreeElement);
        }
    }
    #addSiteSessionIfMissing(site, sessionId) {
        let siteMapEntry = this.#sites.get(site);
        if (!siteMapEntry) {
            const siteElement = new ApplicationPanelTreeElement(this.resourcesPanel, site, /* expandable=*/ true, 'device-bound-sessions-site');
            siteElement.setLeadingIcons([createIcon('cloud')]);
            siteElement.itemURL = `device-bound-sessions://${site}`;
            const defaultOnSelect = siteElement.onselect.bind(siteElement);
            siteElement.onselect = (selectedByUser) => {
                defaultOnSelect(selectedByUser);
                this.resourcesPanel.showDeviceBoundSessionDefault(this.#model, i18nString(UIStrings.deviceBoundSessions), i18nString(UIStrings.deviceBoundSessionsCategoryDescription));
                return false;
            };
            siteMapEntry = { siteTreeElement: siteElement, sessions: new Map() };
            this.#sites.set(site, siteMapEntry);
        }
        if (!siteMapEntry.sessions.has(sessionId)) {
            const sessionElement = new ApplicationPanelTreeElement(this.resourcesPanel, sessionId ?? i18nString(UIStrings.noSession), false, 'device-bound-sessions-session');
            sessionElement.setLeadingIcons([createIcon('database')]);
            sessionElement.itemURL = `device-bound-sessions://${site}/${sessionId || ''}`;
            const defaultOnSelect = sessionElement.onselect.bind(sessionElement);
            sessionElement.onselect = (selectedByUser) => {
                defaultOnSelect(selectedByUser);
                this.resourcesPanel.showDeviceBoundSession(this.#model, site, sessionId);
                return false;
            };
            if (sessionId === undefined) {
                // The "No session" session is always listed at the top.
                siteMapEntry.siteTreeElement.insertChild(sessionElement, 0);
            }
            else {
                siteMapEntry.siteTreeElement.appendChild(sessionElement);
            }
            siteMapEntry.sessions.set(sessionId, sessionElement);
        }
        this.#updateSiteTreeElementVisibility(site);
    }
    #removeEmptyElements(emptySessions, emptySites) {
        for (const emptySite of emptySites) {
            const siteData = this.#sites.get(emptySite);
            if (siteData) {
                this.removeChild(siteData.siteTreeElement);
                this.#sites.delete(emptySite);
            }
        }
        for (const [site, emptySessionIds] of emptySessions) {
            const siteData = this.#sites.get(site);
            if (siteData) {
                for (const emptySessionId of emptySessionIds) {
                    const sessionElement = siteData.sessions.get(emptySessionId);
                    if (sessionElement) {
                        siteData.siteTreeElement.removeChild(sessionElement);
                        siteData.sessions.delete(emptySessionId);
                    }
                }
            }
        }
    }
    #onNewSessions({ data: { sessions } }) {
        for (const session of sessions) {
            this.#addSiteSessionIfMissing(session.key.site, session.key.id);
        }
    }
    #onVisibleSiteAdded({ data: { site } }) {
        this.#updateSiteTreeElementVisibility(site);
    }
    #onVisibleSitesCleared() {
        this.removeChildren();
    }
    #onEventOccurred({ data: { site, sessionId } }) {
        this.#addSiteSessionIfMissing(site, sessionId);
    }
    #onClearEvents({ data: { emptySessions, emptySites } }) {
        this.#removeEmptyElements(emptySessions, emptySites);
    }
}
//# sourceMappingURL=DeviceBoundSessionsTreeElement.js.map