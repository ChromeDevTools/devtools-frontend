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

  getPrompt(): string {
    return `You are an expert software engineer who mentors junior software engineers.
Given some code, give an explanation of what the code does.
Start with the explanation immediately without repeating the given code.
Respond only with the explanation, no code.

### Code:
import pdb
pdb.set_trace()
### Explanation:
This code imports the python debugging module and then calls the debugging module to start a debugging session at that line in the program.

---

### Code:
str.toLowerCase()
### Explanation:
This code converts a string to lower case, assuming that \`str\` is the string that you want to convert to lower case.

---

### Code:
${this.#code}

### Explanation:`;
  }
}
