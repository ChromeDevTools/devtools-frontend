// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';

import {type SecurityPanel} from './SecurityPanel.js';

export class SecurityPanelSidebarTreeElement extends UI.TreeOutline.TreeElement {
  protected readonly securityPanel: SecurityPanel|undefined;

  constructor(securityPanel: SecurityPanel|undefined, title: string = '', expandable: boolean = false) {
    super(title, expandable);
    this.securityPanel = securityPanel;
    UI.ARIAUtils.setLabel(this.listItemElement, title);
  }

  showView(view: UI.Widget.VBox): void {
    if (this.securityPanel) {
      this.securityPanel.setVisibleView(view);
    }
  }
}
