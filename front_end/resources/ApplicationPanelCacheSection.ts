// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

import {ApplicationPanelTreeElement} from './ApplicationPanelTreeElement.js';
import {ResourcesPanel} from './ResourcesPanel.js';

export class ApplicationCacheManifestTreeElement extends ApplicationPanelTreeElement {
  private readonly manifestURL: string;

  constructor(resourcesPanel: ResourcesPanel, manifestURL: string) {
    const title = new Common.ParsedURL.ParsedURL(manifestURL).displayName;
    super(resourcesPanel, title, false);
    this.tooltip = manifestURL;
    this.manifestURL = manifestURL;
  }

  get itemURL(): string {
    return 'appcache://' + this.manifestURL;
  }

  onselect(selectedByUser: boolean|undefined): boolean {
    super.onselect(selectedByUser);
    this.resourcesPanel.showCategoryView(this.manifestURL, null);
    return false;
  }
}
