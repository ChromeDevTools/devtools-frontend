// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Protocol from '../../generated/protocol.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {type ResourcesPanel} from './ResourcesPanel.js';
import {InterestGroupStorageView} from './InterestGroupStorageView.js';

const UIStrings = {
  /**
   *@description Label for an item in the Application Panel Sidebar of the Application panel
   * An interest group is an ad targeting group stored on the browser that can
   * be used to show a certain set of advertisements in the future as the
   * outcome of a FLEDGE auction. (https://developer.chrome.com/blog/fledge-api/)
   */
  interestGroups: 'Interest groups',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/InterestGroupTreeElement.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class InterestGroupTreeElement extends ApplicationPanelTreeElement {
  private view: InterestGroupStorageView;

  constructor(storagePanel: ResourcesPanel) {
    super(storagePanel, i18nString(UIStrings.interestGroups), false);
    const interestGroupIcon = UI.Icon.Icon.create('database', 'resource-tree-item');
    this.setLeadingIcons([interestGroupIcon]);
    this.view = new InterestGroupStorageView(this);
  }

  override get itemURL(): Platform.DevToolsPath.UrlString {
    return 'interest-groups://' as Platform.DevToolsPath.UrlString;
  }

  async getInterestGroupDetails(owner: string, name: string): Promise<Protocol.Storage.InterestGroupDetails|null> {
    const mainTarget = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return null;
    }
    const response =
        await mainTarget.storageAgent().invoke_getInterestGroupDetails({'ownerOrigin': owner, 'name': name});
    return response.details;
  }

  override onselect(selectedByUser?: boolean): boolean {
    super.onselect(selectedByUser);
    this.showView(this.view);
    Host.userMetrics.panelShown(Host.UserMetrics.PanelCodes[Host.UserMetrics.PanelCodes.interest_groups]);
    return false;
  }

  addEvent(event: Protocol.Storage.InterestGroupAccessedEvent): void {
    this.view.addEvent(event);
  }

  clearEvents(): void {
    this.view.clearEvents();
  }
}
