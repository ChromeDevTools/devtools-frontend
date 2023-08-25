// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Marked from '../../third_party/marked/marked.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Console from '../console/console.js';
import type * as Sources from '../sources/sources.js';

async function runPrompt(input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation) {
      return reject(new Error('doAidaConversation is not available'));
    }
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.doAidaConversation(
        JSON.stringify({
          input,
          client: 'GENERAL',
        }),
        result => {
          try {
            const results = JSON.parse(result.response);
            const text = results.map((result: {textChunk: {text: string}}) => result.textChunk.text).join(' ');
            resolve(text);
          } catch (err) {
            reject(err);
          }
        });
  });
}

interface Source {
  getAnchor(): AnchorBox;
  getPrompt(): string;
}

export class CodeFrameSource implements Source {
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
        leftCorner.left, leftCorner.top - 2, rightCorner.right - leftCorner.left, rightCorner.bottom - leftCorner.top);
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

export class ConsoleMessageSource implements Source {
  #consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage;
  constructor(consoleMessage: Console.ConsoleViewMessage.ConsoleViewMessage) {
    this.#consoleMessage = consoleMessage;
  }
  getAnchor(): AnchorBox {
    const rect = this.#consoleMessage.contentElement().getBoundingClientRect();
    return new AnchorBox(rect.left, rect.top, rect.width, rect.height);
  }
  getPrompt(): string {
    return `You are an expert software engineer looking at a console message in DevTools.
Given some console message, give an explanation of what the console message means.
Start with the explanation immediately without repeating the given console message.
Respond only with the explanation, no console message.

### Console message:
Failed to load resource: net::ERR_TOO_MANY_REDIRECTS.

### Explanation:
This messaage means that one of the requests had too many HTTP redirects.

---

### Console message:
${this.#consoleMessage.consoleMessage().messageText}

### Explanation:`;
  }
}

export class ExplainPopover {
  #source: Source;
  #contentElement = document.createElement('div');

  constructor(source: Source) {
    this.#source = source;
    this.#contentElement.style.margin = '16px';
    this.#contentElement.style.maxWidth = ' 400px';
  }

  #renderMarkdown(content: string): void {
    const markdown = new MarkdownView.MarkdownView.MarkdownView();
    markdown.data = {tokens: Marked.Marked.lexer(content)};
    this.#contentElement.removeChildren();
    this.#contentElement.append(markdown);
  }

  async show(): Promise<void> {
    this.#renderMarkdown('loading...');
    const popover = UI.PopoverHelper.PopoverHelper.createPopover();
    popover.contentElement.classList.toggle('has-padding', false);
    popover.contentElement.addEventListener('mousemove', () => {}, true);
    popover.contentElement.addEventListener('mouseout', () => {}, true);
    popover.contentElement.classList.toggle('has-padding', false);
    popover.contentElement.appendChild(this.#contentElement);
    popover.setContentAnchorBox(this.#source.getAnchor());
    popover.show(document);
    // TODO: handle closing popover better.
    popover.contentElement.addEventListener('dblclick', () => {
      popover.hide();
    });
    try {
      const result = await runPrompt(this.#source.getPrompt());
      this.#renderMarkdown(result);
    } catch (err) {
      this.#renderMarkdown(`loading failed: ${err.message}`);
    }
    popover.positionContent();
  }
}
