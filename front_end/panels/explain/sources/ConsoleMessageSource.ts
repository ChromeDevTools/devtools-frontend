// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../core/sdk/sdk.js';
import * as Bindings from '../../../models/bindings/bindings.js';
import type * as Console from '../../console/console.js';

export class ConsoleMessageSource {
  #consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage;
  constructor(consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage) {
    this.#consoleMessage = consoleMessage;
  }

  getAnchor(): AnchorBox {
    const rect = this.#consoleMessage.contentElement().getBoundingClientRect();
    return new AnchorBox(rect.left, rect.top, rect.width, rect.height);
  }

  async getPrompt(): Promise<string> {
    const callframe = this.#consoleMessage.consoleMessage().stackTrace?.callFrames[0];
    const runtimeModel = this.#consoleMessage.consoleMessage().runtimeModel();
    const debuggerModel = runtimeModel?.debuggerModel();

    const relatedCode: string[] = [];
    let relatedCodeSize = 0;

    if (callframe && debuggerModel) {
      const rawLocation = new SDK.DebuggerModel.Location(
          debuggerModel, callframe.scriptId, callframe.lineNumber, callframe.columnNumber);
      const mappedLocation =
          await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
              rawLocation);
      const content = await mappedLocation?.uiSourceCode.requestContent();
      const text = !content?.isEncoded && content?.content ? content.content : '';
      if (text) {
        const lines = text.split('\n');
        let currentLineNumber = mappedLocation?.lineNumber as number;
        while (lines[currentLineNumber] !== undefined && (relatedCodeSize + lines[currentLineNumber].length < 500)) {
          relatedCode.push(lines[currentLineNumber]);
          relatedCodeSize += lines[currentLineNumber].length;
          currentLineNumber--;
        }
        relatedCode.reverse();
        currentLineNumber = (mappedLocation?.lineNumber as number) + 1;
        while (lines[currentLineNumber] !== undefined && (relatedCodeSize + lines[currentLineNumber].length < 1000)) {
          relatedCode.push(lines[currentLineNumber]);
          relatedCodeSize += lines[currentLineNumber].length;
          currentLineNumber++;
        }
      }
    }

    return `You are an expert software engineer looking at a console message in DevTools.
Given a console message, give an explanation of what the console message means.
Start with the explanation immediately without repeating the given console message.
Respond only with the explanation, no console message.

### Console message:
Script snippet #1:1 Uncaught Error: Unexpected\n    at Script snippet #1:1:7\n(anonymous) @ Script snippet #1:1

### Explanation:
An unexpected error has been thrown.

### Code that threw an error:

\`\`\`
throw new Error('Unexpected');
\`\`\`
---

### Console message:
${this.#consoleMessage.toExportString()}

### Code that threw an error:

\`\`\`
${relatedCode.join('\n')}
\`\`\`

### Explanation:`;
  }
}
