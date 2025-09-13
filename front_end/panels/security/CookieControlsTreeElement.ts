// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as IconButton from '../../ui/components/icon_button/icon_button.js';

import {SecurityPanelSidebarTreeElement} from './SecurityPanelSidebarTreeElement.js';

export class CookieControlsTreeElement extends SecurityPanelSidebarTreeElement {
  constructor(title: string, jslogContext: string|number) {
    super(title, false, jslogContext);
    this.setLeadingIcons([IconButton.Icon.create('gear', 'cookie-icon')]);
  }

  override get elemId(): string {
    return 'controls';
  }

  override showElement(): void {
    this.listItemElement.dispatchEvent(new CustomEvent('showFlagControls', {bubbles: true, composed: true}));
  }
}
