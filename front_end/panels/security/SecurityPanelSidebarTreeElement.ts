// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as UI from '../../ui/legacy/legacy.js';

export class SecurityPanelSidebarTreeElement extends UI.TreeOutline.TreeElement {
  constructor(title = '', expandable = false, jslogContext?: string|number) {
    super(title, expandable, jslogContext);
    UI.ARIAUtils.setLabel(this.listItemElement, title);
  }

  get elemId(): string {
    // default landing spot for the security panel
    return 'overview';
  }

  showElement(): void {
    throw new Error('Unimplemented Method');
  }

  override onselect(selectedByUser?: boolean): boolean {
    if (selectedByUser) {
      const id = this.elemId;
      this.listItemElement.dispatchEvent(
          new CustomEvent('update-sidebar-selection', {bubbles: true, composed: true, detail: {id}}));
      this.showElement();
    }
    return false;
  }
}
