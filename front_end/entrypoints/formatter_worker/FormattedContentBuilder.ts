// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class FormattedContentBuilder {
  #lastOriginalPosition = 0;
  #formattedContent: string[] = [];
  #formattedContentLength = 0;
  #lastFormattedPosition = 0;
  #nestingLevel = 0;
  #newLines = 0;
  #enforceSpaceBetweenWords = true;
  #softSpace = false;
  #hardSpaces = 0;
  #cachedIndents = new Map<number, string>();
  #canBeIdentifierOrNumber = /[$\u200C\u200D\p{ID_Continue}]/u;

  mapping = {original: [0], formatted: [0]};

  constructor(private indentString: string) {
  }

  setEnforceSpaceBetweenWords(value: boolean): boolean {
    const oldValue = this.#enforceSpaceBetweenWords;
    this.#enforceSpaceBetweenWords = value;
    return oldValue;
  }

  addToken(token: string, offset: number): void {
    // Skip the regex check if `addSoftSpace` will be a no-op.
    if (this.#enforceSpaceBetweenWords && !this.#hardSpaces && !this.#softSpace) {
      const lastCharOfLastToken = this.#formattedContent.at(-1)?.at(-1) ?? '';
      if (this.#canBeIdentifierOrNumber.test(lastCharOfLastToken) && this.#canBeIdentifierOrNumber.test(token)) {
        this.addSoftSpace();
      }
    }

    this.#appendFormatting();

    // Insert token.
    this.#addMappingIfNeeded(offset);
    this.#addText(token);
  }

  addSoftSpace(): void {
    if (!this.#hardSpaces) {
      this.#softSpace = true;
    }
  }

  addHardSpace(): void {
    this.#softSpace = false;
    ++this.#hardSpaces;
  }

  addNewLine(noSquash?: boolean): void {
    // Avoid leading newlines.
    if (!this.#formattedContentLength) {
      return;
    }
    if (noSquash) {
      ++this.#newLines;
    } else {
      this.#newLines = this.#newLines || 1;
    }
  }

  increaseNestingLevel(): void {
    this.#nestingLevel += 1;
  }

  decreaseNestingLevel(): void {
    if (this.#nestingLevel > 0) {
      this.#nestingLevel -= 1;
    }
  }

  content(): string {
    return this.#formattedContent.join('') + (this.#newLines ? '\n' : '');
  }

  #appendFormatting(): void {
    if (this.#newLines) {
      for (let i = 0; i < this.#newLines; ++i) {
        this.#addText('\n');
      }
      this.#addText(this.#indent());
    } else if (this.#softSpace) {
      this.#addText(' ');
    }
    if (this.#hardSpaces) {
      for (let i = 0; i < this.#hardSpaces; ++i) {
        this.#addText(' ');
      }
    }
    this.#newLines = 0;
    this.#softSpace = false;
    this.#hardSpaces = 0;
  }

  #indent(): string {
    const cachedValue = this.#cachedIndents.get(this.#nestingLevel);
    if (cachedValue) {
      return cachedValue;
    }

    let fullIndent = '';
    for (let i = 0; i < this.#nestingLevel; ++i) {
      fullIndent += this.indentString;
    }

    // Cache a maximum of 20 nesting level indents.
    if (this.#nestingLevel <= 20) {
      this.#cachedIndents.set(this.#nestingLevel, fullIndent);
    }
    return fullIndent;
  }

  #addText(text: string): void {
    this.#formattedContent.push(text);
    this.#formattedContentLength += text.length;
  }

  #addMappingIfNeeded(originalPosition: number): void {
    if (originalPosition - this.#lastOriginalPosition === this.#formattedContentLength - this.#lastFormattedPosition) {
      return;
    }
    this.mapping.original.push(originalPosition);
    this.#lastOriginalPosition = originalPosition;
    this.mapping.formatted.push(this.#formattedContentLength);
    this.#lastFormattedPosition = this.#formattedContentLength;
  }
}
