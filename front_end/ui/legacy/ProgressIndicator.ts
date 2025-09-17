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
  #stopButton?: Element;
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
  }

  connectedCallback(): void {
    this.classList.add('progress-indicator');
    // By default we show the stop button, but this can be controlled by
    // using the 'no-stop-button' attribute on the element.
    if (!this.hasAttribute('no-stop-button')) {
      this.#stopButton = this.#contentElement.createChild('button', 'progress-indicator-shadow-stop-button');
      this.#stopButton.addEventListener('click', () => {
        this.canceled = true;
      });
    }
  }

  set done(done: boolean) {
    if (this.#isDone === done) {
      return;
    }
    this.#isDone = done;
    if (done) {
      this.remove();
    }
  }

  get done(): boolean {
    return this.#isDone;
  }

  set canceled(value: boolean) {
    this.#isCanceled = value;
  }

  get canceled(): boolean {
    return this.#isCanceled;
  }

  override set title(title: string) {
    this.#labelElement.textContent = title;
  }

  override get title(): string {
    return this.#labelElement.textContent ?? '';
  }

  set totalWork(totalWork: number) {
    this.#progressElement.max = totalWork;
  }

  get totalWork(): number {
    return this.#progressElement.max;
  }

  set worked(worked: number) {
    this.#worked = worked;
    this.#progressElement.value = worked;
  }

  get worked(): number {
    return this.#worked;
  }
}

customElements.define('devtools-progress', ProgressIndicator);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-progress': ProgressIndicator;
  }
}
