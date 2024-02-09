// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum Category {
  Animation = 'animation',
  AuctionWorklet = 'auction-worklet',
  Canvas = 'canvas',
  Clipboard = 'clipboard',
  Control = 'control',
  Device = 'device',
  DomMutation = 'dom-mutation',
  DragDrop = 'drag-drop',
  Geolocation = 'geolocation',
  Keyboard = 'keyboard',
  Load = 'load',
  Media = 'media',
  Mouse = 'mouse',
  Notification = 'notification',
  Parse = 'parse',
  PictureInPicture = 'picture-in-picture',
  Pointer = 'pointer',
  Script = 'script',
  SharedStorageWorklet = 'shared-storage-worklet',
  Timer = 'timer',
  Touch = 'touch',
  TrustedTypeViolation = 'trusted-type-violation',
  WebAudio = 'web-audio',
  Window = 'window',
  Worker = 'worker',
  Xhr = 'xhr',
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
