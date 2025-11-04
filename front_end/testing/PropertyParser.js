// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import * as CodeMirror from '../third_party/codemirror.next/codemirror.next.js';
export class Printer extends SDK.CSSPropertyParser.TreeWalker {
    #printedText = [];
    #indent = 0;
    enter({ node }) {
        const text = this.ast.text(node);
        this.#printedText.push(`${'|'.repeat(this.#indent)} ${node.name}${text !== node.name ? `: ${text}` : ''}`);
        this.#indent++;
        return true;
    }
    leave() {
        this.#indent--;
    }
    get() {
        return this.#printedText.join('\n');
    }
    static log(ast) {
        /* eslint-disable-next-line no-console */
        console.log('\n' + Printer.walk(ast).get());
    }
    static rule(rule) {
        const ast = new SDK.CSSPropertyParser.SyntaxTree('', rule, CodeMirror.css.cssLanguage.parser.parse(rule).topNode);
        return Printer.walk(ast).get();
    }
}
//# sourceMappingURL=PropertyParser.js.map