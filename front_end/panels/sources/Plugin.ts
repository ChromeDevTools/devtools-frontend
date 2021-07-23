// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Workspace from '../../models/workspace/workspace.js';
import type * as UI from '../../ui/legacy/legacy.js';

export class Plugin {
  static accepts(_uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return false;
  }

  wasShown(): void {
  }

  willHide(): void {
  }

  async rightToolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [];
  }

  /**
   *
   * TODO(szuend): It is OK to asyncify this function (similar to {rightToolbarItems}),
   *               but it is currently not strictly necessary.
   */
  leftToolbarItems(): UI.Toolbar.ToolbarItem[] {
    return [];
  }

  populateLineGutterContextMenu(_contextMenu: UI.ContextMenu.ContextMenu, _lineNumber: number): Promise<void> {
    return Promise.resolve();
  }

  populateTextAreaContextMenu(_contextMenu: UI.ContextMenu.ContextMenu, _lineNumber: number, _columnNumber: number):
      Promise<void> {
    return Promise.resolve();
  }

  dispose(): void {
  }
}
