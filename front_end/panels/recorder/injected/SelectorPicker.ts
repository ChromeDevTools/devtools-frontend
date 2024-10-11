// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Logger} from './Logger.js';
import {SelectorComputer} from './SelectorComputer.js';
import type {AccessibilityBindings} from './selectors/ARIASelector.js';
import {getClickableTargetFromEvent, getMouseEventOffsets, haultImmediateEvent} from './util.js';

declare global {
  interface Window {
    captureSelectors(data: string): void;
  }
}

class SelectorPicker {
  #logger: Logger;
  #computer: SelectorComputer;

  constructor(
      bindings: AccessibilityBindings,
      customAttribute = '',
      debug = true,
  ) {
    this.#logger = new Logger(debug ? 'debug' : 'silent');
    this.#logger.log('Creating a SelectorPicker');
    this.#computer = new SelectorComputer(
        bindings,
        this.#logger,
        customAttribute,
    );
  }

  #handleClickEvent = (event: MouseEvent): void => {
    haultImmediateEvent(event);

    const target = getClickableTargetFromEvent(event);
    window.captureSelectors(
        JSON.stringify({
          selectors: this.#computer.getSelectors(target),
          ...getMouseEventOffsets(event, target),
        }),
    );
  };

  start = (): void => {
    this.#logger.log('Setting up selector listeners');

    window.addEventListener('click', this.#handleClickEvent, true);
    window.addEventListener('mousedown', haultImmediateEvent, true);
    window.addEventListener('mouseup', haultImmediateEvent, true);
  };

  stop = (): void => {
    this.#logger.log('Tearing down selector listeners');

    window.removeEventListener('click', this.#handleClickEvent, true);
    window.removeEventListener('mousedown', haultImmediateEvent, true);
    window.removeEventListener('mouseup', haultImmediateEvent, true);
  };
}

export {SelectorPicker};
