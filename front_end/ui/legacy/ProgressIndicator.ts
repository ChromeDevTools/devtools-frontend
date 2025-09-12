// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
