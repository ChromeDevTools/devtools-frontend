// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {FormattedContentBuilder} from './FormattedContentBuilder.js';

export class IdentityFormatter {
  constructor(private builder: FormattedContentBuilder) {
  }

  format(text: string, _lineEndings: number[], fromOffset: number, toOffset: number): void {
    const content = text.substring(fromOffset, toOffset);
    this.builder.addToken(content, fromOffset);
  }
}
