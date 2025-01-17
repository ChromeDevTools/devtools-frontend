// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as IconButton from '../../ui/components/icon_button/icon_button.js';

import {SecurityPanelSidebarTreeElement} from './SecurityPanelSidebarTreeElement.js';

export class CookieReportTreeElement extends SecurityPanelSidebarTreeElement {
  constructor(title: string, jslogContext: string|number) {
    super(title, false, jslogContext);
    this.setLeadingIcons([IconButton.Icon.create('cookie', 'cookie-icon')]);
  }

  override get elemId(): string {
    return 'report';
  }

  override showElement(): void {
    this.listItemElement.dispatchEvent(new CustomEvent('showCookieReport', {bubbles: true, composed: true}));
  }
}
