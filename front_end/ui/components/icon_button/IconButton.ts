// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import {Icon} from './Icon.js';
import iconButtonStyles from './iconButton.css.js';

import type {IconData} from './Icon.js';

export interface IconWithTextData {
  iconName: string;
  iconColor?: string;
  iconWidth?: string;
  iconHeight?: string;
  text?: string;
}

export interface IconButtonData {
  clickHandler?: () => void;
  groups: IconWithTextData[];
  leadingText?: string;
  trailingText?: string;
}

export class IconButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`icon-button`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  private clickHandler: undefined|(() => void) = undefined;
  private groups: IconWithTextData[] = [];
  private leadingText: string = '';
  private trailingText: string = '';

  set data(data: IconButtonData) {
    this.groups = data.groups.map(group => ({...group}));  // Ensure we make a deep copy.
    this.clickHandler = data.clickHandler;
    this.trailingText = data.trailingText ?? '';
    this.leadingText = data.leadingText ?? '';
    this.render();
  }

  setTexts(texts: (string|undefined)[]): void {
    if (texts.length !== this.groups.length) {
      throw new Error(`Wrong number of texts, expected ${this.groups.length} but got ${texts.length}`);
    }
    for (let i = 0; i < texts.length; ++i) {
      this.groups[i].text = texts[i];
    }
    this.render();
  }

  connectedCallback(): void {
    this.shadow.adoptedStyleSheets = [iconButtonStyles];
  }

  private onClickHandler(event: Event): void {
    if (this.clickHandler) {
      event.preventDefault();
      this.clickHandler();
    }
  }

  private render(): void {
    const buttonClasses = LitHtml.Directives.classMap({
      'icon-button': true,
      'with-click-handler': Boolean(this.clickHandler),
    });
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <button class="${buttonClasses}" @click=${this.onClickHandler}>
      ${this.leadingText ? LitHtml.html`<span class="icon-button-title">${this.leadingText}</span>` : LitHtml.nothing}
      ${this.groups.filter(counter => counter.text !== undefined).map(counter =>
      LitHtml.html`
      <${Icon.litTagName} class="status-icon"
      .data=${{iconName: counter.iconName, color: counter.iconColor || '', width: counter.iconWidth || '1.5ex', height: counter.iconHeight || '1.5ex'} as IconData}>
      </${Icon.litTagName}>
      <span class="icon-button-title">${counter.text}</span>
      </button>`)}
      ${this.trailingText ? LitHtml.html`<span class="icon-button-title">${this.trailingText}</span>` : LitHtml.nothing}
    `, this.shadow, { host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('icon-button', IconButton);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'icon-button': IconButton;
  }
}
