// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {createIcon} from '../../ui/kit/kit.js';

import {SecurityPanelSidebarTreeElement} from './SecurityPanelSidebarTreeElement.js';

export class CookieReportTreeElement extends SecurityPanelSidebarTreeElement {
  constructor(title: string, jslogContext: string|number) {
    super(title, false, jslogContext);
    this.setLeadingIcons([createIcon('cookie', 'cookie-icon')]);
  }

  override get elemId(): string {
    return 'report';
  }

  override showElement(): void {
    this.listItemElement.dispatchEvent(new CustomEvent('showCookieReport', {bubbles: true, composed: true}));
  }
}
