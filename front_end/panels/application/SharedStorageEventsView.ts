// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-imperative-dom-api */

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';
import sharedStorageEventsViewStyles from './sharedStorageEventsView.css.js';

const UIStrings = {
  /**
   * @description Placeholder text if no shared storage event has been selected.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  noEventSelected: 'No shared storage event selected',
  /**
   * @description Placeholder text instructing the user how to display shared
   * storage event details.
   * Shared storage allows to store and access data that can be shared across different sites.
   * A shared storage event is for example an access from a site to that storage.
   */
  clickToDisplayBody: 'Click on any shared storage event to display the event parameters',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/SharedStorageEventsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function eventEquals(
    a: Protocol.Storage.SharedStorageAccessedEvent, b: Protocol.Storage.SharedStorageAccessedEvent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export class SharedStorageEventsView extends UI.SplitWidget.SplitWidget {
  readonly #sharedStorageEventGrid = new ApplicationComponents.SharedStorageAccessGrid.SharedStorageAccessGrid();
  #events: Protocol.Storage.SharedStorageAccessedEvent[] = [];
  #noDisplayView: UI.Widget.VBox;
  #defaultId: Protocol.Page.FrameId = '' as Protocol.Page.FrameId;

  constructor() {
    super(/* isVertical */ false, /* secondIsSidebar: */ true);

    this.element.setAttribute('jslog', `${VisualLogging.pane('shared-storage-events')}`);

    this.#noDisplayView =
        new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noEventSelected), i18nString(UIStrings.clickToDisplayBody));
    this.#noDisplayView.setMinimumSize(0, 40);
    this.#sharedStorageEventGrid.setMinimumSize(0, 80);
    this.#sharedStorageEventGrid.onSelect = this.#onFocus.bind(this);

    this.setMainWidget(this.#sharedStorageEventGrid);
    this.setSidebarWidget(this.#noDisplayView);
    this.hideSidebar();

    this.#getMainFrameResourceTreeModel()?.addEventListener(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.clearEvents, this);
  }

  #getMainFrameResourceTreeModel(): SDK.ResourceTreeModel.ResourceTreeModel|null {
    const primaryPageTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    return primaryPageTarget?.model(SDK.ResourceTreeModel.ResourceTreeModel) || null;
  }

  #getMainFrame(): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    return this.#getMainFrameResourceTreeModel()?.mainFrame || null;
  }

  get id(): Protocol.Page.FrameId {
    return this.#getMainFrame()?.id || this.#defaultId;
  }

  override wasShown(): void {
    super.wasShown();
    const sidebar = this.sidebarWidget();
    if (sidebar) {
      sidebar.registerRequiredCSS(sharedStorageEventsViewStyles);
    }
  }

  addEvent(event: Protocol.Storage.SharedStorageAccessedEvent): void {
    // Only add event if main frame id matches.
    if (event.mainFrameId !== this.id) {
      return;
    }

    // Only add if not already present.
    if (this.#events.some(t => eventEquals(t, event))) {
      return;
    }

    if (this.showMode() !== UI.SplitWidget.ShowMode.BOTH) {
      this.showBoth();
    }

    this.#events.push(event);
    this.#sharedStorageEventGrid.events = this.#events;
  }

  clearEvents(): void {
    this.#events = [];
    this.#sharedStorageEventGrid.events = this.#events;
    this.setSidebarWidget(this.#noDisplayView);
    this.hideSidebar();
  }

  #onFocus(event: Protocol.Storage.SharedStorageAccessedEvent): void {
    const jsonView = SourceFrame.JSONView.JSONView.createViewSync(event);
    jsonView.setMinimumSize(0, 40);
    this.setSidebarWidget(jsonView);
  }

  setDefaultIdForTesting(id: Protocol.Page.FrameId): void {
    this.#defaultId = id;
  }

  getEventsForTesting(): Protocol.Storage.SharedStorageAccessedEvent[] {
    return this.#events;
  }

  getSharedStorageAccessGridForTesting(): ApplicationComponents.SharedStorageAccessGrid.SharedStorageAccessGrid {
    return this.#sharedStorageEventGrid;
  }
}
