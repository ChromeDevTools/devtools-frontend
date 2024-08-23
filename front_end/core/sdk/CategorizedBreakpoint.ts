// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum Category {
  ANIMATION = 'animation',
  AUCTION_WORKLET = 'auction-worklet',
  CANVAS = 'canvas',
  CLIPBOARD = 'clipboard',
  CONTROL = 'control',
  DEVICE = 'device',
  DOM_MUTATION = 'dom-mutation',
  DRAG_DROP = 'drag-drop',
  GEOLOCATION = 'geolocation',
  KEYBOARD = 'keyboard',
  LOAD = 'load',
  MEDIA = 'media',
  MOUSE = 'mouse',
  NOTIFICATION = 'notification',
  PARSE = 'parse',
  PICTURE_IN_PICTURE = 'picture-in-picture',
  POINTER = 'pointer',
  SCRIPT = 'script',
  SHARED_STORAGE_WORKLET = 'shared-storage-worklet',
  TIMER = 'timer',
  TOUCH = 'touch',
  TRUSTED_TYPE_VIOLATION = 'trusted-type-violation',
  WEB_AUDIO = 'web-audio',
  WINDOW = 'window',
  WORKER = 'worker',
  XHR = 'xhr',
}

export class CategorizedBreakpoint {
  /**
   * The name of this breakpoint as passed to 'setInstrumentationBreakpoint',
   * 'setEventListenerBreakpoint' and 'setBreakOnCSPViolation'.
   *
   * Note that the backend adds a 'listener:' and 'instrumentation:' prefix
   * to this name in the 'Debugger.paused' CDP event.
   */
  readonly name: string;

  readonly #category: Category;
  private enabledInternal: boolean;

  constructor(category: Category, name: string) {
    this.#category = category;
    this.name = name;
    this.enabledInternal = false;
  }

  category(): Category {
    return this.#category;
  }

  enabled(): boolean {
    return this.enabledInternal;
  }

  setEnabled(enabled: boolean): void {
    this.enabledInternal = enabled;
  }
}
