// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html, Directives} = LitHtml;
const ls = Common.ls;

const VARIABLE_FUNCTION_REGEX = /(var\()(--[^,)]+)(.*)/;

interface SwatchRenderData {
  text: string;
  computedValue: string|null;
  fromFallback: boolean;
  onLinkClick: (varialeName: string, event: Event) => void;
}

interface ParsedVariableFunction {
  pre: string;
  name: string;
  post: string;
}

export class CSSVarSwatch extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private text: string = '';
  private computedValue: string|null = null;
  private fromFallback: boolean = false;
  private onLinkClick: (varialeName: string, event: Event) => void = () => undefined;

  set data(data: SwatchRenderData) {
    this.text = data.text;
    this.computedValue = data.computedValue;
    this.fromFallback = data.fromFallback;
    this.onLinkClick = data.onLinkClick;

    this.render();
  }

  private parseVariableFunctionParts(): ParsedVariableFunction|null {
    const result = this.text.match(VARIABLE_FUNCTION_REGEX);
    if (!result) {
      return null;
    }

    return {
      pre: result[1],
      name: result[2],
      post: result[3],
    };
  }

  private get variableName(): string {
    const match = this.text.match(/--[^,)]+/);
    if (match) {
      return match[0];
    }
    return '';
  }

  private renderLink(variableName: string) {
    const isDefined = this.computedValue && !this.fromFallback;

    const classes = Directives.classMap({
      'css-var-link': true,
      'undefined': !isDefined,
    });
    const title = isDefined ? ls`Jump to definition` : ls`${variableName} is not defined`;
    const onClick = isDefined ? this.onLinkClick.bind(this, this.variableName) : null;

    return html`<span class="${classes}" title="${title}" @mousedown=${onClick} role="link" tabindex="-1">${
        variableName}</span>`;
  }

  private render() {
    const functionParts = this.parseVariableFunctionParts();
    if (!functionParts) {
      render('', this.shadow, {eventContext: this});
      return;
    }

    const link = this.renderLink(functionParts.name);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(
      html`<style>
      .css-var-link:not(.undefined) {
        cursor: pointer;
        text-decoration: underline;
      }
      </style><span title="${this.computedValue || ''}">${functionParts.pre}${link}${functionParts.post}</span>`,
      this.shadow, { eventContext: this });
    // clang-format on
  }
}

customElements.define('devtools-css-var-swatch', CSSVarSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-css-var-swatch': CSSVarSwatch;
  }
}
