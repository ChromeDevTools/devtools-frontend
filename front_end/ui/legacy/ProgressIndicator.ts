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

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import {createShadowRootWithCoreStyles} from './utils/create-shadow-root-with-core-styles.js';

export class ProgressIndicator implements Common.Progress.Progress {
  element: HTMLDivElement;
  _shadowRoot: ShadowRoot;
  _contentElement: Element;
  _labelElement: Element;
  _progressElement: HTMLProgressElement;
  _stopButton: Element;
  _isCanceled: boolean;
  _worked: number;
  _isDone?: boolean;

  constructor() {
    this.element = document.createElement('div');
    this.element.classList.add('progress-indicator');
    this._shadowRoot = createShadowRootWithCoreStyles(
        this.element, {cssFile: 'ui/legacy/progressIndicator.css', delegatesFocus: undefined});
    this._contentElement = this._shadowRoot.createChild('div', 'progress-indicator-shadow-container');

    this._labelElement = this._contentElement.createChild('div', 'title');
    this._progressElement = (this._contentElement.createChild('progress') as HTMLProgressElement);
    this._progressElement.value = 0;
    this._stopButton = this._contentElement.createChild('button', 'progress-indicator-shadow-stop-button');
    this._stopButton.addEventListener('click', this.cancel.bind(this));

    this._isCanceled = false;
    this._worked = 0;
  }

  show(parent: Element): void {
    parent.appendChild(this.element);
  }

  done(): void {
    if (this._isDone) {
      return;
    }
    this._isDone = true;
    this.element.remove();
  }

  cancel(): void {
    this._isCanceled = true;
  }

  isCanceled(): boolean {
    return this._isCanceled;
  }

  setTitle(title: string): void {
    this._labelElement.textContent = title;
  }

  setTotalWork(totalWork: number): void {
    this._progressElement.max = totalWork;
  }

  setWorked(worked: number, title?: string): void {
    this._worked = worked;
    this._progressElement.value = worked;
    if (title) {
      this.setTitle(title);
    }
  }

  incrementWorked(worked?: number): void {
    this.setWorked(this._worked + (worked || 1));
  }
}
