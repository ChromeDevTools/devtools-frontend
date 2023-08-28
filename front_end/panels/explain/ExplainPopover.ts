// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../core/host/host.js';
import * as Marked from '../../third_party/marked/marked.js';
import * as MarkdownView from '../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../ui/legacy/legacy.js';

export class ExplainPopover {
  #source: Source;
  #contentElement = document.createElement('div');
  #detectOutsideInteraction = (event: Event): void => {
    const el = event?.composedPath()[0] as Node;
    if (!el.isDescendant(this.#contentElement) && this.#contentElement !== el) {
      this.hide();
    }
  };
  #popover = UI.PopoverHelper.PopoverHelper.createPopover();

  constructor(source: Source) {
    this.#source = source;
    this.#contentElement.style.padding = '16px';
    this.#contentElement.style.maxWidth = '500px';
    this.#popover.contentElement.classList.toggle('has-padding', false);
    this.#popover.contentElement.appendChild(this.#contentElement);
  }

  #renderMarkdown(content: string): void {
    const markdown = new MarkdownView.MarkdownView.MarkdownView();
    markdown.data = {tokens: Marked.Marked.lexer(content)};
    this.#contentElement.removeChildren();
    this.#contentElement.append(markdown);
  }

  #setupListeners(): void {
    window.addEventListener('mousedown', this.#detectOutsideInteraction);
    window.addEventListener('focusin', this.#detectOutsideInteraction);
    window.addEventListener('wheel', this.#detectOutsideInteraction);
    window.addEventListener('keydown', this.#detectOutsideInteraction);
  }

  #teardownListeners(): void {
    window.removeEventListener('mousedown', this.#detectOutsideInteraction);
    window.removeEventListener('focusin', this.#detectOutsideInteraction);
    window.removeEventListener('wheel', this.#detectOutsideInteraction);
    window.removeEventListener('keydown', this.#detectOutsideInteraction);
  }

  async show(): Promise<void> {
    this.#setupListeners();
    this.#renderMarkdown('loading...');
    this.#popover.setContentAnchorBox(this.#source.getAnchor());
    this.#popover.show(document);
    try {
      const result = await runPrompt(this.#source.getPrompt());
      this.#renderMarkdown(result);
    } catch (err) {
      this.#renderMarkdown(`loading failed: ${err.message}`);
    }
    this.#popover.positionContent();
  }

  hide(): void {
    this.#popover.hide();
    this.#teardownListeners();
  }
}

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
