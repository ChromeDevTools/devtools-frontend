// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import type * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import type * as UI from '../../ui/legacy/legacy.js';
import type {LitTemplate} from '../../ui/lit/lit.js';

export const enum Events {
  /**
   * Fired when the items returned by `leftToolbarItems()` or `rightToolbarItems()`
   * have changed and the toolbar needs to query them again.
   */
  TOOLBAR_ITEMS_CHANGED = 'ToolbarItemsChanged',
}

export interface EventTypes {
  [Events.TOOLBAR_ITEMS_CHANGED]: void;
}

export class Plugin extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
  constructor(
      protected readonly uiSourceCode: Workspace.UISourceCode.UISourceCode,
      _transformer?: SourceFrame.SourceFrame.Transformer) {
    super();
  }

  static accepts(_uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return false;
  }

  willHide(): void {
  }

  rightToolbarItems(): Array<UI.Toolbar.ToolbarItem|LitTemplate> {
    return [];
  }

  /**
   *
   * TODO(szuend): It is OK to asyncify this function (similar to {rightToolbarItems}),
   *               but it is currently not strictly necessary.
   */
  leftToolbarItems(): Array<UI.Toolbar.ToolbarItem|LitTemplate> {
    return [];
  }

  populateLineGutterContextMenu(_contextMenu: UI.ContextMenu.ContextMenu, _lineNumber: number): void {
  }

  populateTextAreaContextMenu(_contextMenu: UI.ContextMenu.ContextMenu, _lineNumber: number, _columnNumber: number):
      void {
  }

  decorationChanged(_type: Workspace.UISourceCode.DecoratorType, _editor: TextEditor.TextEditor.TextEditor): void {
  }

  editorExtension(): CodeMirror.Extension {
    return [];
  }

  editorInitialized(_editor: TextEditor.TextEditor.TextEditor): void {
  }

  dispose(): void {
  }
}
