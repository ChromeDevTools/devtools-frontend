// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import * as CodeMirror from '../third_party/codemirror.next/codemirror.next.js';

export class Printer extends SDK.CSSPropertyParser.TreeWalker {
  #printedText: string[] = [];
  #indent = 0;

  protected override enter({node}: SDK.CSSPropertyParser.SyntaxNodeRef): boolean {
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

  static log(ast: SDK.CSSPropertyParser.SyntaxTree): void {
    /* eslint-disable-next-line no-console */
    console.log(Printer.walk(ast).get());
  }

  static rule(rule: string): string {
    const ast = new SDK.CSSPropertyParser.SyntaxTree('', rule, CodeMirror.css.cssLanguage.parser.parse(rule).topNode);
    return Printer.walk(ast).get();
  }
}
