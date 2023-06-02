// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import {type CommandAutocompleteSuggestionProvider} from './ProtocolMonitor.js';
const {Decorators} = LitHtml;
const {customElement, property} = Decorators;

@customElement('devtools-json-prompt-widget')
export class JSONPromptEditor extends LitHtml.LitElement {
  @property() declare textPrompt: UI.TextPrompt.TextPrompt;
  @property() declare parameter: string;
  @property() declare value: string;
  @property() declare private commandAutocompleteSuggestionProvider: CommandAutocompleteSuggestionProvider;

  constructor(
      parameter: string,
      value: string,
      commandAutocompleteSuggestionProvider: CommandAutocompleteSuggestionProvider,
  ) {
    super();
    this.addEventListener('click', this.messagesClicked.bind(this), true);
    this.textPrompt = new UI.TextPrompt.TextPrompt();
    this.parameter = parameter;
    this.value = value;
    this.commandAutocompleteSuggestionProvider = commandAutocompleteSuggestionProvider;
    this.textPrompt.initialize(
        this.commandAutocompleteSuggestionProvider.buildTextPromptCompletions.bind(
            this.commandAutocompleteSuggestionProvider,
            ),
        ' ',
    );
  }

  override render(): LitHtml.TemplateResult|undefined {
    return LitHtml.html`
    <div style="display: flex; margin-left: 20px; margin-top: 10px" class="json-prompt">
      <span class="webkit-css-property" style="margin-right: 10px">${this.parameter} : </span>
      <div style="min-width: 50px" ${LitHtml.Directives.ref(this.textPromptChanged.bind(this))}>
      </div>
    </div>
  `;
  }

  textPromptChanged(parent?: Element): void {
    if (parent) {
      this.textPrompt.attach(parent);
      this.textPrompt.setText(this.value);
    }
  }

  getText(): string {
    return this.textPrompt.text();
  }

  getKey(): string {
    return this.parameter;
  }

  setText(command: string): void {
    this.textPrompt.setText(command);
  }

  private messagesClicked(): void {
    this.textPrompt.focus();
    if (!this.textPrompt.isCaretInsidePrompt() && !this.hasSelection()) {
      this.textPrompt.moveCaretToEndOfPrompt();
    }
  }
}
