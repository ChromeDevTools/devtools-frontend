// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../lit/lit.js';

import fileSourceIconStyles from './fileSourceIcon.css.legacy.js';
import {create} from './Icon.js';

const {html} = Lit;

export interface FileSourceIconData {
  contentType?: string;
  hasDotBadge?: boolean;
  isDotPurple?: boolean;
}

export class FileSourceIcon extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #iconType: string;
  #contentType?: string;
  #hasDotBadge?: boolean;
  #isDotPurple?: boolean;

  constructor(iconType: string) {
    super();
    this.#iconType = iconType;
  }

  set data(data: FileSourceIconData) {
    this.#contentType = data.contentType;
    this.#hasDotBadge = data.hasDotBadge;
    this.#isDotPurple = data.isDotPurple;
    this.#render();
  }

  get data(): FileSourceIconData {
    return {
      contentType: this.#contentType,
      hasDotBadge: this.#hasDotBadge,
      isDotPurple: this.#isDotPurple,
    };
  }

  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    let iconStyles: string[] = [];
    if (this.#hasDotBadge) {
      iconStyles = this.#isDotPurple ? ['dot', 'purple'] : ['dot', 'green'];
    }
    if (this.#contentType) {
      iconStyles.push(this.#contentType);
    }
    const icon = create(this.#iconType, iconStyles.join(' '));

    // clang-format off
    Lit.render(
      html`<style>${fileSourceIconStyles.cssContent}</style>${icon}`,
      this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-file-source-icon', FileSourceIcon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-file-source-icon': FileSourceIcon;
  }
}
