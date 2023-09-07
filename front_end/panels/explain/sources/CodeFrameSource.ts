// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Sources from '../../sources/sources.js';

export class CodeFrameSource {
  #frame: Sources.UISourceCodeFrame.UISourceCodeFrame;
  #code: string;

  constructor(frame: Sources.UISourceCodeFrame.UISourceCodeFrame) {
    this.#frame = frame;
    const {state: editorState} = frame.textEditor;
    this.#code = editorState.sliceDoc(editorState.selection.main.from, editorState.selection.main.to);
  }

  getAnchor(): AnchorBox {
    const frame = this.#frame;
    const {state: editorState} = frame.textEditor;
    const selectionRange = editorState.selection.main;
    const leftCorner = frame.textEditor.editor.coordsAtPos(selectionRange.from);
    const rightCorner = frame.textEditor.editor.coordsAtPos(selectionRange.to);
    if (!leftCorner || !rightCorner) {
      throw new Error('no coordinates');
    }
    return new AnchorBox(
        leftCorner.left, leftCorner.top, rightCorner.right - leftCorner.left, rightCorner.bottom - leftCorner.top);
  }

  async getPrompt(): Promise<string> {
    return `You are an expert software engineer who debugs web applications.
Given some code, give an explanation of what the code does.
Start with the explanation immediately and do not repeat the given code.
Respond only with the explanation, no code.

### Code:
function removeArrayItem(input, valueToRemove) {
  const index = input.indexOf(valueToRemove);
  if (index > -1) {
    input.splice(index, 1);
  }
  return input;
}
### Explanation:
This function removes the provided value from an array. Removes the first found value from the array and modifies the array in-place.

---

### Code:
window.location.href = 'target.html';
### Explanation:
The code navigates the page to a new URL.

---

### Code:
"target".includes("r")
### Explanation:
The code checks if the string \`"target"\` has the \`r\` character in it.

---

### Code:
${this.#code}

### Explanation:`;
  }
}
