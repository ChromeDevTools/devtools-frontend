/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import emptyWidgetStyles from './emptyWidget.css.js';
import {VBox} from './Widget.js';
import {XLink} from './XLink.js';

const UIStrings = {
  /**
   *@description Text that is usually a hyperlink to more documentation
   */
  learnMore: 'Learn more',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/EmptyWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class EmptyWidget extends VBox {
  #headerElement: HTMLElement;
  #textElement: HTMLElement;

  constructor(header: string, text: string) {
    super();
    this.element.classList.add('empty-view-scroller');
    this.contentElement = this.element.createChild('div', 'empty-state');
    this.contentElement.setAttribute('jslog', `${VisualLogging.section('empty-view')}`);
    this.#headerElement = this.contentElement.createChild('div', 'header');
    this.#headerElement.textContent = header;
    this.#textElement = this.contentElement.createChild('div', 'description').createChild('span');
    this.#textElement.textContent = text;
  }

  appendLink(link: Platform.DevToolsPath.UrlString): HTMLElement {
    const learnMoreLink = XLink.create(link, i18nString(UIStrings.learnMore), undefined, undefined, 'learn-more');
    this.#textElement.insertAdjacentElement('afterend', learnMoreLink);
    return learnMoreLink;
  }

  set text(text: string) {
    this.#textElement.textContent = text;
  }

  set header(header: string) {
    this.#headerElement.textContent = header;
  }

  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([emptyWidgetStyles]);
  }
}
