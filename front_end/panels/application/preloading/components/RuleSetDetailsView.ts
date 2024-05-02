// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import type * as Protocol from '../../../../generated/protocol.js';
import * as CodeMirror from '../../../../third_party/codemirror.next/codemirror.next.js';
import * as CodeHighlighter from '../../../../ui/components/code_highlighter/code_highlighter.js';
import * as IconButton from '../../../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as TextEditor from '../../../../ui/components/text_editor/text_editor.js';
import type * as UI from '../../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import ruleSetDetailsViewStyles from './RuleSetDetailsView.css.js';

type RuleSet = Protocol.Preload.RuleSet;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();
const codeMirrorJsonType = await CodeHighlighter.CodeHighlighter.languageFromMIME('application/json');

export type RuleSetDetailsViewData = RuleSet|null;

export class RuleSetDetailsView extends LegacyWrapper.LegacyWrapper.WrappableComponent<UI.Widget.VBox> {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: RuleSetDetailsViewData = null;
  #editorState?: CodeMirror.EditorState;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [ruleSetDetailsViewStyles];
  }

  set data(data: RuleSetDetailsViewData) {
    this.#data = data;
    void this.#render();
  }

  async #render(): Promise<void> {
    await coordinator.write('RuleSetDetailsView render', () => {
      if (this.#data === null) {
        LitHtml.render(LitHtml.nothing, this.#shadow, {host: this});
        return;
      }

      // Disabled until https://crbug.com/1079231 is fixed.
      // clang-format off
      LitHtml.render(LitHtml.html`
        <div class="content">
          <div class="ruleset-header" id="ruleset-url">${this.#data?.url || SDK.TargetManager.TargetManager.instance().inspectedURL()}</div>
          ${this.#maybeError()}
        </div>
        <div class="text-ellipsis">
          ${this.#renderSource()}
        </div>
      `, this.#shadow, {host: this});
      // clang-format on
    });
  }

  // TODO(https://crbug.com/1425354): Support i18n.
  #maybeError(): LitHtml.LitTemplate {
    assertNotNullOrUndefined(this.#data);

    if (this.#data.errorMessage === undefined) {
      return LitHtml.nothing;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <div class="ruleset-header">
        <${IconButton.Icon.Icon.litTagName}
          .data=${{
            iconName: 'cross-circle',
            color: 'var(--icon-error)',
            width: '16px',
            height: '16px',
          } as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
        <span id="error-message-text">${this.#data.errorMessage}</span>
      </div>
    `;
    // clang-format on
  }

  #renderSource(): LitHtml.LitTemplate {
    this.#editorState = CodeMirror.EditorState.create({
      doc: this.#data?.sourceText,
      extensions: [
        TextEditor.Config.baseConfiguration(this.#data?.sourceText || ''),
        CodeMirror.lineNumbers(),
        CodeMirror.EditorState.readOnly.of(true),
        codeMirrorJsonType as CodeMirror.Extension,
        CodeMirror.syntaxHighlighting(CodeHighlighter.CodeHighlighter.highlightStyle),
      ],
    });

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // TODO(https://crbug.com/1425354): Add Raw button.
      return LitHtml.html`
        <${TextEditor.TextEditor.TextEditor.litTagName} .style.flexGrow = '1' .state=${
          this.#editorState
        }></${TextEditor.TextEditor.TextEditor.litTagName}>
      `;
    // clang-format on
  }
}

customElements.define('devtools-resources-rulesets-details-view', RuleSetDetailsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-resources-rulesets-details-view': RuleSetDetailsView;
  }
}
