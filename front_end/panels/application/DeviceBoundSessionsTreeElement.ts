// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import {createIcon} from '../../ui/kit/kit.js';

import {ApplicationPanelTreeElement, ExpandableApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {
  DeviceBoundSessionModelEvents,
  type DeviceBoundSessionModelEventTypes,
  type DeviceBoundSessionsModel
} from './DeviceBoundSessionsModel.js';
import type {ResourcesPanel} from './ResourcesPanel.js';

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
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/DeviceBoundSessionsTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class RootTreeElement extends ExpandableApplicationPanelTreeElement {
  #model: DeviceBoundSessionsModel;
  #sites = new Map<string, {siteTreeElement: ExpandableApplicationPanelTreeElement, sessions: Set<string>}>();

  constructor(storagePanel: ResourcesPanel, model: DeviceBoundSessionsModel) {
    super(
        storagePanel, i18nString(UIStrings.deviceBoundSessions), i18nString(UIStrings.deviceBoundSessions),
        i18nString(UIStrings.deviceBoundSessionsCategoryDescription), 'device-bound-sessions-root');
    this.setLeadingIcons([createIcon('lock-person')]);
    this.#model = model;
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'device-bound-sessions://' as Platform.DevToolsPath.UrlString;
  }

  override onbind(): void {
    super.onbind();
    this.#model.addEventListener(DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, this.#onNewSessions, this);
  }

  override onunbind(): void {
    super.onunbind();
    this.#model.removeEventListener(DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS, this.#onNewSessions, this);
  }

  #onNewSessions({data: {sessions}}: Common.EventTarget.EventTargetEvent<
                 DeviceBoundSessionModelEventTypes[DeviceBoundSessionModelEvents.INITIALIZE_SESSIONS]>): void {
    for (const session of sessions) {
      const siteName = session.key.site;
      const sessionId = session.key.id;

      let siteMapEntry = this.#sites.get(siteName);
      if (!siteMapEntry) {
        const siteElement = new ExpandableApplicationPanelTreeElement(
            this.resourcesPanel, siteName, i18nString(UIStrings.deviceBoundSessions),
            i18nString(UIStrings.deviceBoundSessionsCategoryDescription), 'device-bound-sessions-site');
        siteElement.setLeadingIcons([createIcon('cloud')]);
        siteElement.itemURL = `device-bound-sessions://${siteName}` as Platform.DevToolsPath.UrlString;
        siteMapEntry = {siteTreeElement: siteElement, sessions: new Set()};
        this.#sites.set(siteName, siteMapEntry);
        this.appendChild(siteElement);
      }

      if (!siteMapEntry.sessions.has(sessionId)) {
        const sessionElement =
            new ApplicationPanelTreeElement(this.resourcesPanel, sessionId, false, 'device-bound-sessions-session');
        sessionElement.setLeadingIcons([createIcon('database')]);
        sessionElement.itemURL = `device-bound-sessions://${siteName}/${sessionId}` as Platform.DevToolsPath.UrlString;
        const defaultOnSelect = sessionElement.onselect.bind(sessionElement);
        sessionElement.onselect = (selectedByUser?: boolean): boolean => {
          defaultOnSelect(selectedByUser);
          this.resourcesPanel.showDeviceBoundSession(this.#model, siteName, sessionId);
          return false;
        };

        siteMapEntry.siteTreeElement.appendChild(sessionElement);
        siteMapEntry.sessions.add(sessionId);
      }
    }
  }
}
