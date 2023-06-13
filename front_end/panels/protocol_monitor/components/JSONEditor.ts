// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../recorder/components/components.js';

import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as RecorderComponents from '../../recorder/components/components.js';

import editorWidgetStyles from './JSONEditor.css.js';

const {html, Decorators, LitElement, nothing} = LitHtml;
const {customElement, property, state} = Decorators;
declare global {
  interface HTMLElementTagNameMap {
    'devtools-json-editor': JSONEditor;
  }
}

@customElement('devtools-json-editor')
export class JSONEditor extends LitElement {
  static override styles = [editorWidgetStyles];
  @property() declare jsonPromptEditors: RecorderComponents.RecorderInput.RecorderInput[];
  @property() declare parameters: {[x: string]: unknown};
  @property() declare protocolMethods: string[];
  @state() command: string = '';

  getCommand(): string {
    return this.command;
  }

  getParameters(): {[x: string]: unknown} {
    return this.parameters;
  }

  #handleTypeInputBlur = async(event: Event): Promise<void> => {
    if (event.target instanceof RecorderComponents.RecorderInput.RecorderInput) {
      this.command = event.target.value;
    }
  };

  #renderCommandRow(): LitHtml.TemplateResult|undefined {
    // clang-format off
    return html`<div class="row attribute padded" data-attribute="type">
      <div>command<span class="separator">:</span></div>
      <devtools-recorder-input
        .disabled=${false}
        .options=${this.protocolMethods}
        .value=${this.command}
        .placeholder=${'Enter your command...'}
        @blur=${this.#handleTypeInputBlur}
      ></devtools-recorder-input>
    </div>`;
    // clang-format on
  }

  /**
   * Renders the line with the word "parameter" in red. As opposed to the renderParametersRow method,
   * it does not render the value of a parameter.
   */
  #renderParameterRow(): LitHtml.TemplateResult|undefined {
    // clang-format off
    return html`<div class="row attribute padded" data-attribute="type">
      <div>parameters<span class="separator">:</span></div>
    </div>`;
    // clang-format on
  }

  /**
   * Renders the parameters list corresponding to a specific CDP command.
   */
  #renderParameters(parameters: {
    [x: string]: unknown,
  }): LitHtml.TemplateResult|undefined {
    // clang-format off
    return html`
      <ul>
        ${Object.keys(parameters).map(key => {
        const value = JSON.stringify(parameters[key]);
        return html`
              <div class="row attribute padded double" data-attribute="type">
                <div>${key}<span class="separator">:</span></div>
                <devtools-recorder-input
                  .disabled=${false}
                  .value=${value}
                  .placeholder=${'Enter your parameter...'}
                ></devtools-recorder-input>
              </div>
            `;
        })}
      </ul>`;
    // clang-format on
  }

  override render(): LitHtml.TemplateResult {
    // clang-format off
    return html`
    <div class="wrapper">
      ${this.#renderCommandRow()}
      ${this.parameters && Object.keys((this.parameters)).length !== 0 ? html`
          ${this.#renderParameterRow()}
          ${this.#renderParameters(this.parameters)}
        ` : nothing}
    </div>`;
    // clang-format on
  }
}
