// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import type * as Sources from '../sources/sources.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as Marked from '../../third_party/marked/marked.js';

export class ExplainPopover {
  constructor(frame: Sources.UISourceCodeFrame.UISourceCodeFrame) {
    const {state: editorState} = frame.textEditor;
    const selectionRange = editorState.selection.main;
    const leftCorner = frame.textEditor.editor.coordsAtPos(selectionRange.from);
    const rightCorner = frame.textEditor.editor.coordsAtPos(selectionRange.to);
    if (!leftCorner || !rightCorner) {
      return;
    }
    const box = new AnchorBox(leftCorner.left, leftCorner.top - 2, rightCorner.right - leftCorner.left, rightCorner.bottom - leftCorner.top);
    const popover = UI.PopoverHelper.PopoverHelper.createPopover();
    popover.contentElement.classList.toggle('has-padding', false);
    popover.contentElement.addEventListener('mousemove', () => {}, true);
    popover.contentElement.addEventListener('mouseout', () => {}, true);
    const div = document.createElement('div');
    const ouput = 'This code creates a class called `PageHandlerPendingReceiver`. The constructor takes a handle as input and stores it in the `handle` property. The `bindInBrowser` method takes a scope as input and uses it to bind the `handle` to the interface `ntp.history_clusters.mojom.PageHandler`.';
    const component = new MarkdownView.MarkdownView.MarkdownView();
    component.data = {tokens: Marked.Marked.lexer(ouput)};
    div.append(component);
    div.style.margin = '16px';
    div.style.maxWidth = ' 400px';
    popover.contentElement.classList.toggle('has-padding', false);
    popover.contentElement.appendChild(div);
    popover.setContentAnchorBox(box);
    popover.show(document);
    frame.addEventListener(SourceFrame.SourceFrame.Events.EditorScroll, () => {
      popover.hide();
    }, this);
  }
}
