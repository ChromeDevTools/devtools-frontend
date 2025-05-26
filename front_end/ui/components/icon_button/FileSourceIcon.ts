// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import './IconButton.js';

import {Directives, html, render} from '../../lit/lit.js';

import fileSourceIconStyles from './fileSourceIcon.css.js';

const {classMap} = Directives;

export interface FileSourceIconData {
  iconType?: string;
  contentType?: string;
  hasDotBadge?: boolean;
  isDotPurple?: boolean;
}

export class FileSourceIcon extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #iconType?: string;
  #contentType?: string;
  #hasDotBadge?: boolean;
  #isDotPurple?: boolean;

  set data(data: FileSourceIconData) {
    this.#contentType = data.contentType;
    this.#hasDotBadge = data.hasDotBadge;
    this.#isDotPurple = data.isDotPurple;
    this.#iconType = data.iconType;
    this.#render();
  }

  get data(): FileSourceIconData {
    return {
      iconType: this.#iconType,
      contentType: this.#contentType,
      hasDotBadge: this.#hasDotBadge,
      isDotPurple: this.#isDotPurple,
    };
  }

  connectedCallback(): void {
    this.#render();
  }

  #render(): void {
    const iconClasses = classMap({
      dot: Boolean(this.#hasDotBadge),
      purple: Boolean(this.#hasDotBadge && this.#isDotPurple),
      green: Boolean(this.#hasDotBadge && !this.#isDotPurple),
      ...(this.#contentType ? {[this.#contentType]: this.#contentType} : null)
    });

    // clang-format off
    render(html`
      <style>${fileSourceIconStyles}</style>
      <devtools-icon .name=${this.#iconType ?? null} class=${iconClasses}></devtools-icon>`,
      this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-file-source-icon', FileSourceIcon);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-file-source-icon': FileSourceIcon;
  }
}
