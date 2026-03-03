// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Platform from '../../../core/platform/platform.js';
import * as AiAssistanceModel from '../../../models/ai_assistance/ai_assistance.js';
import * as Logs from '../../../models/logs/logs.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../ui/lit/lit.js';

const {html} = Lit;

/**
 * The model returns multiline code blocks in an erroneous way with the language being in new line.
 * This renderer takes that into account and correctly updates the parsed multiline token with the language
 * correctly identified and stripped from the content.
 * Example:
 * ```
 * css <-- This should have been on the first line.
 * * {
 * color: red;
 * }
 * ```
 **/
export class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  #revealableLink(revealable: unknown, label: string): Lit.LitTemplate {
    return html`<devtools-link @click=${(e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      void Common.Revealer.reveal(revealable);
    }}>${Platform.StringUtilities.trimEndWithMaxLength(label, 100)}</devtools-link>`;
  }

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate|null {
    if (token.type === 'link') {
      if (token.href.startsWith('#req-')) {
        const request =
            Logs.NetworkLog.NetworkLog.instance().requests().find(req => req.requestId() === token.href.substring(5));

        if (request) {
          return this.#revealableLink(request, request.url());
        }

      } else if (token.href.startsWith('#file-')) {
        const file = AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.getUISourceCodes().find(
            file => AiAssistanceModel.ContextSelectionAgent.ContextSelectionAgent.uiSourceCodeId.get(file) ===
                Number(token.href.substring(6)));

        if (file) {
          return this.#revealableLink(file, file.name());
        }
      }
    }

    if (token.type === 'code') {
      const lines = (token.text).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }
}
