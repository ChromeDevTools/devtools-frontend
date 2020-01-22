// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Plugin {
  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return false;
  }

  wasShown() {
  }

  willHide() {
  }

  /**
   * @return {!Promise<!Array<!UI.ToolbarItem>>}
   */
  async rightToolbarItems() {
    return [];
  }

  /**
   * @return {!Array<!UI.ToolbarItem>}
   *
   * TODO(szuend): It is OK to asyncify this function (similar to {rightToolbarItems}),
   *               but it is currently not strictly necessary.
   */
  leftToolbarItems() {
    return [];
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @return {!Promise}
   */
  populateLineGutterContextMenu(contextMenu, lineNumber) {
    return Promise.resolve();
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise}
   */
  populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    return Promise.resolve();
  }

  dispose() {
  }
}
