// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Console from '../console/console.js';

export class PromptBuilder {
  #consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage;
  constructor(consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage) {
    this.#consoleMessage = consoleMessage;
  }

  async buildPrompt(): Promise<string> {
    const callframe = this.#consoleMessage.consoleMessage().stackTrace?.callFrames[0];
    const runtimeModel = this.#consoleMessage.consoleMessage().runtimeModel();
    const debuggerModel = runtimeModel?.debuggerModel();

    const relatedCode: string[] = [];
    let relatedCodeSize = 0;
    const MAX_CODE_SIZE = 1000;

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
        const columnNumber = mappedLocation?.columnNumber as number;
        if (lines[currentLineNumber].length >= MAX_CODE_SIZE / 2) {
          const start = Math.max(columnNumber - MAX_CODE_SIZE / 2, 0);
          const end = Math.min(columnNumber + MAX_CODE_SIZE / 2, lines[currentLineNumber].length);
          relatedCode.push(lines[currentLineNumber].substring(start, end));
          relatedCodeSize += end - start;
        } else {
          while (lines[currentLineNumber] !== undefined &&
                 (relatedCodeSize + lines[currentLineNumber].length < MAX_CODE_SIZE / 2)) {
            relatedCode.push(lines[currentLineNumber]);
            relatedCodeSize += lines[currentLineNumber].length;
            currentLineNumber--;
          }
        }
        relatedCode.reverse();
        currentLineNumber = (mappedLocation?.lineNumber as number) + 1;
        while (lines[currentLineNumber] !== undefined &&
               (relatedCodeSize + lines[currentLineNumber].length < MAX_CODE_SIZE)) {
          relatedCode.push(lines[currentLineNumber]);
          relatedCodeSize += lines[currentLineNumber].length;
          currentLineNumber++;
        }
      }
    }

    const consoleMessageHeader = '### Console message:';
    const relatedCodeHeader = '### Code that generated the error:';
    const explanationHeader = '### Summary:';

    const preamble = `
You are an expert software engineer looking at a console message in DevTools.

You will follow these rules strictly:
- Answer the question as truthfully as possible using the provided context
- if you don't have the answer, say "I don't know" and suggest looking for this information
  elsewhere
- Start with the explanation immediately without repeating the given console message.
- Always wrap code with three backticks (\`\`\`)

${consoleMessageHeader}
Uncaught TypeError: Cannot read properties of undefined (reading 'setState') at home.jsx:15
    at delta (home.jsx:15:14)
    at Object.Dc (react-dom.production.min.js:54:317)
    at Fc (react-dom.production.min.js:54:471)
    at jc (react-dom.production.min.js:55:35)
    at ai (react-dom.production.min.js:105:68)
    at Ks (react-dom.production.min.js:106:380)
    at react-dom.production.min.js:117:104
    at Pu (react-dom.production.min.js:274:42)
    at vs (react-dom.production.min.js:52:375)
    at Dl (react-dom.production.min.js:109:469)
delta @ home.jsx:15


Dc @ react-dom.production.min.js:54
Fc @ react-dom.production.min.js:54
jc @ react-dom.production.min.js:55
ai @ react-dom.production.min.js:105
Ks @ react-dom.production.min.js:106
(anonymous) @ react-dom.production.min.js:117
Pu @ react-dom.production.min.js:274
vs @ react-dom.production.min.js:52
Dl @ react-dom.production.min.js:109
eu @ react-dom.production.min.js:74
bc @ react-dom.production.min.js:73

${relatedCodeHeader}
\`\`\`
  class Counter extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            count : 1
        };

        this.delta.bind(this);
    }

    delta() {
        this.setState({
            count : this.state.count++
        });
    }

    render() {
        return (
            <div>
                <h1>{this.state.count}</h1>
                <button onClick={this.delta}>+</button>
            </div>
        );
    }
}
\`\`\`

${explanationHeader}
The error occurs because this.delta is not bound to the instance of the Counter component. The fix is it to change the code to be \` this.delta = this.delta.bind(this);\`

${consoleMessageHeader}
Uncaught TypeError: Cannot set properties of null (setting 'innerHTML')
    at (index):57:49
(anonymous) @ (index):57

${relatedCodeHeader}
\`\`\`
    <script>
      document.getElementById("test").innerHTML = "Element does not exist";
    </script>
    <div id="test"></div>
\`\`\`

${explanationHeader}
The error means that getElementById returns null instead of the div element. This happens because the script runs before the element is added to the DOM.

${consoleMessageHeader}
Uncaught SyntaxError: Unexpected token ')' (at script.js:39:14)

${relatedCodeHeader}
\`\`\`
if (10 < 120)) {
  console.log('test')
}
\`\`\`

${explanationHeader}
There is an extra closing \`)\`. Remove it to fix the issue.`;

    return `${preamble}

${consoleMessageHeader}
${this.#consoleMessage.toExportString()}

${relatedCodeHeader}
\`\`\`
${relatedCode.join('\n')}
\`\`\`

${explanationHeader}`;
  }
}
