// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */
import {
  type Schema,
  type SelectorType,
  type StepType,
} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import {Logger} from './Logger.js';
import {SelectorComputer} from './SelectorComputer.js';
import {type Step} from './Step.js';
import {type AccessibilityBindings} from './selectors/ARIASelector.js';
import {queryCSSSelectorAll} from './selectors/CSSSelector.js';
import {type Selector} from './selectors/Selector.js';
import {
  getClickableTargetFromEvent,
  haultImmediateEvent,
  assert,
  createClickAttributes,
} from './util.js';

declare global {
  interface Window {
    stopShortcut(payload: string): void;
    addStep(step: string): void;
  }
}

interface Shortcut {
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  keyCode: number;
}

export interface RecordingClientOptions {
  debug: boolean;
  allowUntrustedEvents: boolean;
  selectorAttribute?: string;
  selectorTypesToRecord: SelectorType[];
  stopShortcuts?: Shortcut[];
}

/**
 * Determines whether an element is ignorable as an input.
 *
 * This is only called on input-like elements (elements that emit the `input`
 * event).
 *
 * With every `if` statement, please write a comment above explaining your
 * reasoning for ignoring the event.
 */
const isIgnorableInputElement = (element: Element): boolean => {
  if (element instanceof HTMLInputElement) {
    switch (element.type) {
      // Checkboxes are always changed as a consequence of another type of action
      // such as the keyboard or mouse. As such, we can safely ignore these
      // elements.
      case 'checkbox':
        return true;
        // Radios are always changed as a consequence of another type of action
        // such as the keyboard or mouse. As such, we can safely ignore these
        // elements.
      case 'radio':
        return true;
    }
  }
  return false;
};

const getShortcutLength = (shortcut: Shortcut): string => {
  return Object.values(shortcut).filter(key => Boolean(key)).length.toString();
};

class RecordingClient {
  static readonly defaultSetupOptions: Readonly<RecordingClientOptions> = Object.freeze({
    debug: false,
    allowUntrustedEvents: false,
    selectorTypesToRecord:
                             [
                               'aria',
                               'css',
                               'text',
                               'xpath',
                               'pierce',
                             ] as SelectorType[],
  });

  #computer: SelectorComputer;

  #isTrustedEvent = (event: Event): boolean => event.isTrusted;
  #stopShortcuts: Shortcut[] = [];
  #logger: Logger;

  constructor(
      bindings: AccessibilityBindings,
      options = RecordingClient.defaultSetupOptions,
  ) {
    this.#logger = new Logger(options.debug ? 'debug' : 'silent');
    this.#logger.log('creating a RecordingClient');
    this.#computer = new SelectorComputer(
        bindings,
        this.#logger,
        options.selectorAttribute,
        options.selectorTypesToRecord,
    );

    if (options.allowUntrustedEvents) {
      this.#isTrustedEvent = (): boolean => true;
    }

    this.#stopShortcuts = options.stopShortcuts ?? [];
  }

  start = (): void => {
    this.#logger.log('Setting up recording listeners');

    window.addEventListener('keydown', this.#onKeyDown, true);
    window.addEventListener('beforeinput', this.#onBeforeInput, true);
    window.addEventListener('input', this.#onInput, true);
    window.addEventListener('keyup', this.#onKeyUp, true);

    window.addEventListener('pointerdown', this.#onPointerDown, true);
    window.addEventListener('click', this.#onClick, true);
    window.addEventListener('auxclick', this.#onClick, true);

    window.addEventListener('beforeunload', this.#onBeforeUnload, true);
  };

  stop = (): void => {
    this.#logger.log('Tearing down client listeners');

    window.removeEventListener('keydown', this.#onKeyDown, true);
    window.removeEventListener('beforeinput', this.#onBeforeInput, true);
    window.removeEventListener('input', this.#onInput, true);
    window.removeEventListener('keyup', this.#onKeyUp, true);

    window.removeEventListener('pointerdown', this.#onPointerDown, true);
    window.removeEventListener('click', this.#onClick, true);
    window.removeEventListener('auxclick', this.#onClick, true);

    window.removeEventListener('beforeunload', this.#onBeforeUnload, true);
  };

  getSelectors = (node: Node): Selector[] => {
    return this.#computer.getSelectors(node);
  };

  getCSSSelector = (node: Node): Selector|undefined => {
    return this.#computer.getCSSSelector(node);
  };

  getTextSelector = (node: Node): Selector|undefined => {
    return this.#computer.getTextSelector(node);
  };

  queryCSSSelectorAllForTesting = (selector: Selector): Element[] => {
    return queryCSSSelectorAll(selector);
  };

  #wasStopShortcutPress = (event: KeyboardEvent): boolean => {
    for (const shortcut of this.#stopShortcuts ?? []) {
      if (event.shiftKey === shortcut.shift && event.ctrlKey === shortcut.ctrl && event.metaKey === shortcut.meta &&
          event.keyCode === shortcut.keyCode) {
        this.stop();
        haultImmediateEvent(event);
        window.stopShortcut(getShortcutLength(shortcut));
        return true;
      }
    }
    return false;
  };

  #initialInputTarget: {element: Element, selectors: Selector[]} = {element: document.documentElement, selectors: []};

  /**
   * Sets the current input target and computes the selector.
   *
   * This needs to be called before any input-related events (keydown, keyup,
   * input, change, etc) occur so the precise selector is known. Since we
   * capture on the `Window`, it suffices to call this on the first event in any
   * given input sequence. This will always be either `keydown`, `beforeinput`,
   * or `input`.
   */
  #setInitialInputTarget = (event: Event): void => {
    const element = event.composedPath()[0];
    assert(element instanceof Element);
    if (this.#initialInputTarget.element === element) {
      return;
    }
    this.#initialInputTarget = {element, selectors: this.getSelectors(element)};
  };

  #onKeyDown = (event: KeyboardEvent): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    if (this.#wasStopShortcutPress(event)) {
      return;
    }
    this.#setInitialInputTarget(event);
    this.#addStep({
      type: 'keyDown' as StepType.KeyDown,
      key: event.key as Schema.Key,
    });
  };

  #onBeforeInput = (event: Event): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#setInitialInputTarget(event);
  };

  #onInput = (event: Event): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#setInitialInputTarget(event);
    if (isIgnorableInputElement(this.#initialInputTarget.element)) {
      return;
    }
    const {element, selectors} = this.#initialInputTarget;
    this.#addStep({
      type: 'change' as StepType.Change,
      selectors,
      value: 'value' in element ? element.value as string : element.textContent as string,
    });
  };

  #onKeyUp = (event: KeyboardEvent): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#addStep({
      type: 'keyUp' as StepType.KeyUp,
      key: event.key as Schema.Key,
    });
  };

  #initialPointerTarget: {element: Element, selectors: Selector[]} = {
    element: document.documentElement,
    selectors: [],
  };
  #setInitialPointerTarget = (event: Event): void => {
    const element = getClickableTargetFromEvent(event);
    if (this.#initialPointerTarget.element === element) {
      return;
    }
    this.#initialPointerTarget = {
      element,
      selectors: this.#computer.getSelectors(element),
    };
  };

  #pointerDownTimestamp = 0;
  #onPointerDown = (event: MouseEvent): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#pointerDownTimestamp = event.timeStamp;
    this.#setInitialPointerTarget(event);
  };

  #onClick = (event: MouseEvent): void => {
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#setInitialPointerTarget(event);
    const attributes = createClickAttributes(event, this.#initialPointerTarget.element);
    if (!attributes) {
      return;
    }
    const duration = event.timeStamp - this.#pointerDownTimestamp;
    this.#addStep({
      type: event.detail === 2 ? 'doubleClick' as StepType.DoubleClick : 'click' as StepType.Click,
      selectors: this.#initialPointerTarget.selectors,
      duration: duration > 350 ? duration : undefined,
      ...attributes,
    });
  };

  #onBeforeUnload = (event: Event): void => {
    this.#logger.log('Unloading...');
    if (!this.#isTrustedEvent(event)) {
      return;
    }
    this.#addStep({type: 'beforeUnload'});
  };

  #addStep = (step: Step): void => {
    const payload = JSON.stringify(step);
    this.#logger.log(`Adding step: ${payload}`);
    window.addStep(payload);
  };
}

export {RecordingClient};
