// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

import {type AutocompleteHistory} from './AutocompleteHistory.js';
import {type TextEditor} from './TextEditor.js';

export const enum Direction {
  FORWARD = 1,
  BACKWARD = -1,
}

/**
 * Small helper class that connects a `TextEditor` and an `AutocompleteHistory`
 * instance.
 */
export class TextEditorHistory {
  #editor: TextEditor;
  #history: AutocompleteHistory;

  constructor(editor: TextEditor, history: AutocompleteHistory) {
    this.#editor = editor;
    this.#history = history;
  }

  /**
   * Replaces the text editor content with entries from the history. Does nothing
   * if the cursor is not positioned correctly (unless `force` is `true`).
   */
  moveHistory(dir: Direction, force = false): boolean {
    const {editor} = this.#editor, {main} = editor.state.selection;
    const isBackward = dir === Direction.BACKWARD;
    if (!force) {
      if (!main.empty) {
        return false;
      }
      const cursorCoords = editor.coordsAtPos(main.head);
      const endCoords = editor.coordsAtPos(isBackward ? 0 : editor.state.doc.length);
      // Check if there are wrapped lines in this direction, and let
      // the cursor move normally if there are.
      if (cursorCoords && endCoords &&
          (isBackward ? cursorCoords.top > endCoords.top + 5 : cursorCoords.bottom < endCoords.bottom - 5)) {
        return false;
      }
    }

    const text = editor.state.doc.toString();
    const history = this.#history;
    const newText = isBackward ? history.previous(text) : history.next();
    if (newText === undefined) {
      return false;
    }

    // Change the prompt input to the history content, and scroll to the end to
    // bring the full content (potentially multiple lines) into view.
    const cursorPos = newText.length;
    editor.dispatch({
      changes: {from: 0, to: editor.state.doc.length, insert: newText},
      selection: CodeMirror.EditorSelection.cursor(cursorPos),
      scrollIntoView: true,
    });
    if (isBackward) {
      // If we are going back in history, put the cursor to the end of the first line
      // so that the user can quickly go further back in history.
      const firstLineBreak = newText.search(/\n|$/);
      editor.dispatch({
        selection: CodeMirror.EditorSelection.cursor(firstLineBreak),
      });
    }
    return true;
  }

  historyCompletions(context: CodeMirror.CompletionContext): CodeMirror.CompletionResult|null {
    const {explicit, pos, state} = context;
    const text = state.doc.toString();
    const caretIsAtEndOfPrompt = pos === text.length;
    if (!caretIsAtEndOfPrompt || (!text.length && !explicit)) {
      return null;
    }

    const matchingEntries = this.#history.matchingEntries(text);
    if (!matchingEntries.size) {
      return null;
    }
    const options = [...matchingEntries].map(label => ({label, type: 'secondary', boost: -1e5}));
    return {from: 0, to: text.length, options};
  }
}
