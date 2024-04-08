// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Elements from '../panels/elements/elements.js';
import * as CodeMirror from '../third_party/codemirror.next/codemirror.next.js';

export class Printer extends Elements.PropertyParser.TreeWalker {
  #printedText: string[] = [];
  #indent = 0;

  protected override enter({node}: Elements.PropertyParser.SyntaxNodeRef): boolean {
    const text = this.ast.text(node);
    this.#printedText.push(`${'|'.repeat(this.#indent)} ${node.name}${text !== node.name ? `: ${text}` : ''}`);
    this.#indent++;
    return true;
  }
  protected override leave(): void {
    this.#indent--;
  }

  get(): string {
    return this.#printedText.join('\n');
  }

  static log(ast: Elements.PropertyParser.SyntaxTree): void {
    /* eslint-disable-next-line no-console */
    console.log(Printer.walk(ast).get());
  }

  static rule(rule: string): string {
    const ast = new Elements.PropertyParser.SyntaxTree('', rule, CodeMirror.css.cssLanguage.parser.parse(rule).topNode);
    return Printer.walk(ast).get();
  }
}
