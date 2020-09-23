// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

const html = LitHtml.html;
const render = LitHtml.render;

export interface MarkdownViewData {
  tokens: Object[];
}

export class MarkdownView extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private tokenData: ReadonlyArray<Object> = [];

  set data(data: MarkdownViewData) {
    this.tokenData = data.tokens;
    this.update();
  }

  private update() {
    this.render();
  }

  private render() {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
      .message {
        line-height: 20px;
        font-size: 14px;
        color: var(--issue-gray);
        margin-bottom: 4px;
        user-select: text;
      }

      .message p {
        margin-bottom: 16px;
        margin-block-start: 2px;
      }

      .message ul {
        list-style-type: none;
        list-style-position: inside;
        padding-inline-start: 0;
      }

      .message li {
        margin-top: 8px;
        display: list-item;
      }

      .message li::before {
        content: "→";
        -webkit-mask-image: none;
        padding-right: 5px;
        position: relative;
        top: -1px;
      }

      .message code {
        color: var(--issue-black);
        font-size: 12px;
        user-select: text;
        cursor: text;
        background: var(--issue-code);
      }
      </style>
      <div class='message'>
        ${this.tokenData.map(renderToken)}
      </div>
    `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-markdown-view', MarkdownView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-markdown-view': MarkdownView;
  }
}

// TODO(crbug.com/1108699): Fix types when they are available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderChildTokens = (token: any) => {
  return token.tokens.map(renderToken);
};

// TODO(crbug.com/1108699): Fix types when they are available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderText = (token: any) => {
  if (token.tokens && token.tokens.length > 0) {
    return html`${renderChildTokens(token)}`;
  }
  return html`${token.text}`;
};

// TODO(crbug.com/1108699): Fix types when they are available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tokenRenderers = new Map<string, (token: any) => LitHtml.TemplateResult>([
  ['paragraph', token => html`<p>${renderChildTokens(token)}</p>`],
  ['list', token => html`<ul>${token.items.map(renderToken)}</ul>`],
  ['list_item', token => html`<li>${renderChildTokens(token)}</li>`],
  ['text', renderText],
  ['codespan', token => html`<code>${token.text}</code>`],
  ['space', () => html``],
]);

// TODO(crbug.com/1108699): Fix types when they are available.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const renderToken = (token: any) => {
  const renderFn = tokenRenderers.get(token.type);
  if (!renderFn) {
    throw new Error(`Markdown token type '${token.type}' not supported.`);
  }
  return renderFn(token);
};
