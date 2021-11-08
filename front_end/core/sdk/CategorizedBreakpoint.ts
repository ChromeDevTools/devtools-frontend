// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class CategorizedBreakpoint {
  readonly #categoryInternal: string;
  titleInternal: string;
  enabledInternal: boolean;

  constructor(category: string, title: string) {
    this.#categoryInternal = category;
    this.titleInternal = title;
    this.enabledInternal = false;
  }

  category(): string {
    return this.#categoryInternal;
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
