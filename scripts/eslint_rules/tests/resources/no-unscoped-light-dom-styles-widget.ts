// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class Widget {
  readonly useShadowDom: boolean;

  constructor(options?: {useShadowDom?: boolean}) {
    this.useShadowDom = Boolean(options?.useShadowDom);
  }

  registerRequiredCSS(_styles: unknown): void {
  }
}
