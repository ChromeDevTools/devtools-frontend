// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const enum Category {
  Animation = 'Animation',
  AuctionWorklet = 'AuctionWorklet',
  Canvas = 'Canvas',
  Clipboard = 'Clipboard',
  Control = 'Control',
  Device = 'Device',
  DomMutation = 'DomMutation',
  DragDrop = 'DragDrop',
  Geolocation = 'Geolocation',
  Keyboard = 'Keyboard',
  Load = 'Load',
  Media = 'Media',
  Mouse = 'Mouse',
  Notification = 'Notification',
  Parse = 'Parse',
  PictureInPicture = 'PictureInPicture',
  Pointer = 'Pointer',
  Script = 'Script',
  SharedStorageWorklet = 'SharedStorageWorklet',
  Timer = 'Timer',
  Touch = 'Touch',
  TrustedTypeViolation = 'TrustedTypeViolation',
  WebAudio = 'WebAudio',
  Window = 'Window',
  Worker = 'Worker',
  Xhr = 'Xhr',
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
