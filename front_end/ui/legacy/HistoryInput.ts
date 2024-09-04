// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Keys} from './KeyboardShortcut.js';
import {registerCustomElement} from './UIUtils.js';

let cachedConstructor: (() => Element)|null = null;

export class HistoryInput extends HTMLInputElement {
  private history: string[];
  private historyPosition: number;

  constructor() {
    super();
    this.history = [''];
    this.historyPosition = 0;
    this.addEventListener('keydown', this.onKeyDown.bind(this), false);
    this.addEventListener('input', this.onInput.bind(this), false);
  }

  static create(): HistoryInput {
    if (!cachedConstructor) {
      cachedConstructor = registerCustomElement('input', 'history-input', HistoryInput);
    }

    return cachedConstructor() as HistoryInput;
  }

  private onInput(_event: Event): void {
    if (this.history.length === this.historyPosition + 1) {
      this.history[this.history.length - 1] = this.value;
    }
  }

  private onKeyDown(ev: Event): void {
    const event = (ev as KeyboardEvent);
    if (event.keyCode === Keys.Up.code) {
      this.historyPosition = Math.max(this.historyPosition - 1, 0);
      this.value = this.history[this.historyPosition];
      this.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
      event.consume(true);
    } else if (event.keyCode === Keys.Down.code) {
      this.historyPosition = Math.min(this.historyPosition + 1, this.history.length - 1);
      this.value = this.history[this.historyPosition];
      this.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
      event.consume(true);
    } else if (event.keyCode === Keys.Enter.code) {
      this.saveToHistory();
    }
  }

  private saveToHistory(): void {
    if (this.history.length > 1 && this.history[this.history.length - 2] === this.value) {
      return;
    }
    this.history[this.history.length - 1] = this.value;
    this.historyPosition = this.history.length - 1;
    this.history.push('');
  }
}
