// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Diff from '../diff/diff.js';  // eslint-disable-line no-unused-vars
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextEditor from '../text_editor/text_editor.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';                            // eslint-disable-line no-unused-vars
import * as Workspace from '../workspace/workspace.js';
import * as WorkspaceDiff from '../workspace_diff/workspace_diff.js';

import {Plugin} from './Plugin.js';

export class GutterDiffPlugin extends Plugin {
  /**
   * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    super();
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;

    /** @type {!Array<!GutterDecoration>} */
    this._decorations = [];
    this._textEditor.installGutter(DiffGutterType, true);
    this._workspaceDiff = WorkspaceDiff.WorkspaceDiff.workspaceDiff();
    this._workspaceDiff.subscribeToDiffChange(this._uiSourceCode, this._update, this);
    this._update();
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return uiSourceCode.project().type() === Workspace.Workspace.projectTypes.Network;
  }

  /**
   * @param {!Array<!GutterDecoration>} removed
   * @param {!Array<!GutterDecoration>} added
   */
  _updateDecorations(removed, added) {
    this._textEditor.operation(operation);

    function operation() {
      for (const decoration of removed) {
        decoration.remove();
      }
      for (const decoration of added) {
        decoration.install();
      }
    }
  }

  _update() {
    if (this._uiSourceCode) {
      this._workspaceDiff.requestDiff(this._uiSourceCode).then(this._innerUpdate.bind(this));
    } else {
      this._innerUpdate(null);
    }
  }

  /**
   * @param {?Diff.Diff.DiffArray} lineDiff
   */
  _innerUpdate(lineDiff) {
    if (!lineDiff) {
      this._updateDecorations(this._decorations, []);
      this._decorations = [];
      return;
    }

    const diff = SourceFrame.SourceCodeDiff.SourceCodeDiff.computeDiff(lineDiff);

    /** @type {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.EditType}>} */
    const newDecorations = new Map();
    for (let i = 0; i < diff.length; ++i) {
      const diffEntry = diff[i];
      for (let lineNumber = diffEntry.from; lineNumber < diffEntry.to; ++lineNumber) {
        newDecorations.set(lineNumber, {lineNumber: lineNumber, type: diffEntry.type});
      }
    }

    const decorationDiff = this._calculateDecorationsDiff(newDecorations);
    const addedDecorations =
        decorationDiff.added.map(entry => new GutterDecoration(this._textEditor, entry.lineNumber, entry.type));

    this._decorations = decorationDiff.equal.concat(addedDecorations);
    this._updateDecorations(decorationDiff.removed, addedDecorations);
    this._decorationsSetForTest(newDecorations);
  }

  /**
   * @return {!Map<number, !GutterDecoration>}
   */
  _decorationsByLine() {
    const decorations = new Map();
    for (const decoration of this._decorations) {
      const lineNumber = decoration.lineNumber();
      if (lineNumber !== -1) {
        decorations.set(lineNumber, decoration);
      }
    }
    return decorations;
  }

  /**
   * @param {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.EditType}>} decorations
   */
  _calculateDecorationsDiff(decorations) {
    const oldDecorations = this._decorationsByLine();
    const leftKeys = [...oldDecorations.keys()];
    const rightKeys = [...decorations.keys()];
    leftKeys.sort((a, b) => a - b);
    rightKeys.sort((a, b) => a - b);

    const removed = [];
    const added = [];
    const equal = [];
    let leftIndex = 0;
    let rightIndex = 0;
    while (leftIndex < leftKeys.length && rightIndex < rightKeys.length) {
      const leftKey = leftKeys[leftIndex];
      const rightKey = rightKeys[rightIndex];
      const left = oldDecorations.get(leftKey);
      const right = decorations.get(rightKey);
      if (leftKey === rightKey && left.type === right.type) {
        equal.push(left);
        ++leftIndex;
        ++rightIndex;
      } else if (leftKey <= rightKey) {
        removed.push(left);
        ++leftIndex;
      } else {
        added.push(right);
        ++rightIndex;
      }
    }
    while (leftIndex < leftKeys.length) {
      const leftKey = leftKeys[leftIndex++];
      removed.push(oldDecorations.get(leftKey));
    }
    while (rightIndex < rightKeys.length) {
      const rightKey = rightKeys[rightIndex++];
      added.push(decorations.get(rightKey));
    }
    return {added: added, removed: removed, equal: equal};
  }

  /**
   * @param {!Map<number, !{lineNumber: number, type: !SourceFrame.SourceCodeDiff.EditType}>} decorations
   */
  _decorationsSetForTest(decorations) {
  }

  /**
   * @override
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @return {!Promise}
   */
  async populateLineGutterContextMenu(contextMenu, lineNumber) {
    GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu, this._uiSourceCode);
  }

  /**
   * @override
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {!Promise}
   */
  async populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
    GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu, this._uiSourceCode);
  }

  static _appendRevealDiffContextMenu(contextMenu, uiSourceCode) {
    if (!WorkspaceDiff.WorkspaceDiff.workspaceDiff().isUISourceCodeModified(uiSourceCode)) {
      return;
    }
    contextMenu.revealSection().appendItem(ls`Local Modifications...`, () => {
      Common.Revealer.reveal(new WorkspaceDiff.WorkspaceDiff.DiffUILocation(uiSourceCode));
    });
  }

  /**
   * @override
   */
  dispose() {
    for (const decoration of this._decorations) {
      decoration.remove();
    }
    WorkspaceDiff.WorkspaceDiff.workspaceDiff().unsubscribeFromDiffChange(this._uiSourceCode, this._update, this);
  }
}

export class GutterDecoration {
  /**
   * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor
   * @param {number} lineNumber
   * @param {!SourceFrame.SourceCodeDiff.EditType} type
   */
  constructor(textEditor, lineNumber, type) {
    this._textEditor = textEditor;
    this._position = this._textEditor.textEditorPositionHandle(lineNumber, 0);
    this._className = '';
    if (type === SourceFrame.SourceCodeDiff.EditType.Insert) {
      this._className = 'diff-entry-insert';
    } else if (type === SourceFrame.SourceCodeDiff.EditType.Delete) {
      this._className = 'diff-entry-delete';
    } else if (type === SourceFrame.SourceCodeDiff.EditType.Modify) {
      this._className = 'diff-entry-modify';
    }
    this.type = type;
  }

  /**
   * @return {number}
   */
  lineNumber() {
    const location = this._position.resolve();
    if (!location) {
      return -1;
    }
    return location.lineNumber;
  }

  install() {
    const location = this._position.resolve();
    if (!location) {
      return;
    }
    const element = createElementWithClass('div', 'diff-marker');
    element.textContent = '\xA0';
    this._textEditor.setGutterDecoration(location.lineNumber, DiffGutterType, element);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, true);
  }

  remove() {
    const location = this._position.resolve();
    if (!location) {
      return;
    }
    this._textEditor.setGutterDecoration(location.lineNumber, DiffGutterType, null);
    this._textEditor.toggleLineClass(location.lineNumber, this._className, false);
  }
}

/** @type {string} */
export const DiffGutterType = 'CodeMirror-gutter-diff';

/**
 * @implements {UI.ContextMenu.Provider}
 * @unrestricted
 */
export class ContextMenuProvider {
  /**
   * @override
   * @param {!Event} event
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!Object} target
   */
  appendApplicableItems(event, contextMenu, target) {
    let uiSourceCode = /** @type {!Workspace.UISourceCode.UISourceCode} */ (target);
    const binding = self.Persistence.persistence.binding(uiSourceCode);
    if (binding) {
      uiSourceCode = binding.network;
    }
    GutterDiffPlugin._appendRevealDiffContextMenu(contextMenu, uiSourceCode);
  }
}
