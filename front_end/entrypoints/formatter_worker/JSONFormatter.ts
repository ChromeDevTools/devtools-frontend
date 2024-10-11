// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {FormattedContentBuilder} from './FormattedContentBuilder.js';
import {createTokenizer} from './FormatterWorker.js';

export class JSONFormatter {
  builder: FormattedContentBuilder;
  toOffset!: number;
  fromOffset!: number;
  lineEndings!: number[];
  lastLine: number;
  text!: string;
  constructor(builder: FormattedContentBuilder) {
    this.builder = builder;
    this.lastLine = -1;
  }

  format(text: string, lineEndings: number[], fromOffset: number, toOffset: number): void {
    this.lineEndings = lineEndings;
    this.fromOffset = fromOffset;
    this.toOffset = toOffset;
    this.lastLine = -1;
    this.text = text;
    const tokenize = createTokenizer('application/json');
    tokenize(text.substring(this.fromOffset, this.toOffset), this.tokenCallback.bind(this));
  }

  tokenCallback(token: string, type: string|null, startPosition: number): void {
    switch (token.charAt(0)) {
      case '{':
      case '[':
        if (this.text[startPosition + 1] === '}' || this.text[startPosition + 1] === ']') {
          this.builder.addToken(token, startPosition);
        } else {
          this.builder.addToken(token, startPosition);
          this.builder.addNewLine();
          this.builder.increaseNestingLevel();
        }
        break;
      case '}':
      case ']':
        if (this.text[startPosition - 1] === '{' || this.text[startPosition - 1] === '[') {
          this.builder.addToken(token, startPosition);
        } else {
          this.builder.decreaseNestingLevel();
          this.builder.addNewLine();
          this.builder.addToken(token, startPosition);
        }
        break;
      case ':':
        this.builder.addToken(token, startPosition);
        this.builder.addSoftSpace();
        break;
      case ',':
        this.builder.addToken(token, startPosition);
        this.builder.addNewLine();
        break;
      case '':
      case ' ':
      case '\n':
        break;
      default:
        this.builder.addToken(token, startPosition);
        break;
    }
  }
}
