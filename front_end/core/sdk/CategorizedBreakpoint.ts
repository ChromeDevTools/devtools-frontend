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
  Timer = 'Timer',
  Touch = 'Touch',
  TrustedTypeViolation = 'TrustedTypeViolation',
  WebAudio = 'WebAudio',
  Window = 'Window',
  Worker = 'Worker',
  Xhr = 'Xhr',
}

export class CategorizedBreakpoint {
  readonly #category: Category;
  titleInternal: string;
  enabledInternal: boolean;

  constructor(category: Category, title: string) {
    this.#category = category;
    this.titleInternal = title;
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

  title(): string {
    return this.titleInternal;
  }

  setTitle(title: string): void {
    this.titleInternal = title;
  }
}
