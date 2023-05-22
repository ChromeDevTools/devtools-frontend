// Copyright (c) 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';

import iconStyles from './newIcon.css.js';

export class NewIcon extends LitHtml.LitElement {
  @LitHtml
      .Decorators.property({
        type: String,
      }) name = '';

  static override get styles(): CSSStyleSheet[] {
    return [iconStyles];
  }

  override render(): LitHtml.LitTemplate {
    const path = this.pathFromName(this.name);
    const styles = {webkitMaskImage: `url(${path})`};
    return LitHtml.html`<span style=${LitHtml.Directives.styleMap(styles)}></span>`;
  }

  pathFromName(name: string|null): string {
    return new URL(`../../../Images/${name}.svg`, import.meta.url).toString();
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-new-icon', NewIcon);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-new-icon': NewIcon;
  }
}
