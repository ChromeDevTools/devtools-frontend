// Copyright 2012 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import progressIndicatorStyles from './progressIndicator.css.js';
import { createShadowRootWithCoreStyles } from './UIUtils.js';
export class ProgressIndicator extends HTMLElement {
    #shadowRoot;
    #contentElement;
    #labelElement;
    #progressElement;
    #stopButton;
    #isCanceled = false;
    #worked = 0;
    #isDone = false;
    constructor() {
        super();
        this.#shadowRoot = createShadowRootWithCoreStyles(this, { cssFile: progressIndicatorStyles });
        this.#contentElement = this.#shadowRoot.createChild('div', 'progress-indicator-shadow-container');
        this.#labelElement = this.#contentElement.createChild('div', 'title');
        this.#progressElement = this.#contentElement.createChild('progress');
        this.#progressElement.value = 0;
    }
    connectedCallback() {
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
    set done(done) {
        if (this.#isDone === done) {
            return;
        }
        this.#isDone = done;
        if (done) {
            this.remove();
        }
    }
    get done() {
        return this.#isDone;
    }
    set canceled(value) {
        this.#isCanceled = value;
    }
    get canceled() {
        return this.#isCanceled;
    }
    set title(title) {
        this.#labelElement.textContent = title;
    }
    get title() {
        return this.#labelElement.textContent ?? '';
    }
    set totalWork(totalWork) {
        this.#progressElement.max = totalWork;
    }
    get totalWork() {
        return this.#progressElement.max;
    }
    set worked(worked) {
        this.#worked = worked;
        this.#progressElement.value = worked;
    }
    get worked() {
        return this.#worked;
    }
}
customElements.define('devtools-progress', ProgressIndicator);
//# sourceMappingURL=ProgressIndicator.js.map