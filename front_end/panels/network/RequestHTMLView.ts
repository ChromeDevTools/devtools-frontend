// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as TextUtils from '../../core/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, nothing, render} from '../../ui/lit/lit.js';

import requestHTMLViewStyles from './requestHTMLView.css.js';

interface ViewInput {
  dataURL: string|null;
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // Forbid to run JavaScript and set unique origin.
  // clang-format off
  render(html`
    <style>${requestHTMLViewStyles}</style>
    <div class="html request-view widget vbox">
      ${input.dataURL ? html`
        <!-- @ts-ignore -->
        <iframe class="html-preview-frame" sandbox
          csp="default-src 'none';img-src data:;style-src 'unsafe-inline'" src=${input.dataURL}
          tabindex="-1" role="presentation"></iframe>` : nothing}
    </div>`,
    target);
  // clang-format on
};

export class RequestHTMLView extends UI.Widget.VBox {
  #dataURL = '';
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  static create(contentData: TextUtils.ContentData.ContentData): RequestHTMLView|null {
    const dataURL = contentData.asDataUrl();
    if (!dataURL) {
      return null;
    }
    const view = new RequestHTMLView();
    view.dataURL = dataURL;
    return view;
  }

  get dataURL(): string {
    return this.#dataURL;
  }

  set dataURL(dataURL: string) {
    // Only data: URLs are allowed to be rendered in the sandboxed preview
    // frame; this used to be guaranteed by the private constructor.
    const safeURL = dataURL.startsWith('data:') ? dataURL : '';
    if (this.#dataURL === safeURL) {
      return;
    }
    this.#dataURL = safeURL;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.#view({dataURL: this.#dataURL}, {}, this.contentElement);
  }
}
