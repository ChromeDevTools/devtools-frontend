/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
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

import type * as Common from '../../core/common/common.js';

import progressIndicatorStyles from './progressIndicator.css.js';
import {createShadowRootWithCoreStyles} from './UIUtils.js';

export class ProgressIndicator extends HTMLElement implements Common.Progress.Progress {
  readonly #shadowRoot: ShadowRoot;
  readonly #contentElement: Element;
  #labelElement: Element;
  #progressElement: HTMLProgressElement;
  readonly #stopButton?: Element;
  #isCanceled = false;
  #worked = 0;
  #isDone = false;

  constructor() {
    super();
    this.#shadowRoot = createShadowRootWithCoreStyles(this, {cssFile: progressIndicatorStyles});
    this.#contentElement = this.#shadowRoot.createChild('div', 'progress-indicator-shadow-container');

    this.#labelElement = this.#contentElement.createChild('div', 'title');
    this.#progressElement = this.#contentElement.createChild('progress');
    this.#progressElement.value = 0;

    // By default we show the stop button, but this can be controlled by
    // using the 'no-stop-button' attribute on the element.
    if (!this.hasAttribute('no-stop-button')) {
      this.#stopButton = this.#contentElement.createChild('button', 'progress-indicator-shadow-stop-button');
      this.#stopButton.addEventListener('click', this.cancel.bind(this));
    }
  }

  connectedCallback(): void {
    this.classList.add('progress-indicator');
  }

  done(): void {
    if (this.#isDone) {
      return;
    }
    this.#isDone = true;
    this.remove();
  }

  cancel(): void {
    this.#isCanceled = true;
  }

  isCanceled(): boolean {
    return this.#isCanceled;
  }

  setTitle(title: string): void {
    this.#labelElement.textContent = title;
  }

  setTotalWork(totalWork: number): void {
    this.#progressElement.max = totalWork;
  }

  setWorked(worked: number, title?: string): void {
    this.#worked = worked;
    this.#progressElement.value = worked;
    if (title) {
      this.setTitle(title);
    }
  }

  incrementWorked(worked?: number): void {
    this.setWorked(this.#worked + (worked || 1));
  }
}

customElements.define('devtools-progress', ProgressIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-progress': ProgressIndicator;
  }
}
