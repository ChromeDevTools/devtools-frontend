// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

let highlightStyle: CodeMirror.HighlightStyle|null = null;

function importCM(): Promise<typeof CodeMirror> {
  return import('../../../third_party/codemirror.next/codemirror.next.js');
}

export function getHighlightStyle(modCM: typeof CodeMirror): CodeMirror.HighlightStyle {
  if (!highlightStyle) {
    const t = modCM.tags;
    highlightStyle = modCM.HighlightStyle.define([
      {tag: t.variableName, class: 'token-variable'},
      {tag: t.propertyName, class: 'token-property'},
      {tag: [t.typeName, t.className, t.namespace, t.macroName], class: 'token-type'},
      {tag: [t.special(t.name), t.constant(t.className)], class: 'token-variable-special'},
      {tag: t.definition(t.name), class: 'token-definition'},
      {tag: t.standard(t.variableName), class: 'token-builtin'},

      {tag: [t.number, t.literal, t.unit], class: 'token-number'},
      {tag: t.string, class: 'token-string'},
      {tag: [t.special(t.string), t.regexp, t.escape], class: 'token-string-special'},
      {tag: [t.atom, t.labelName, t.bool], class: 'token-atom'},

      {tag: t.keyword, class: 'token-keyword'},
      {tag: [t.comment, t.quote], class: 'token-comment'},
      {tag: t.meta, class: 'token-meta'},
      {tag: t.invalid, class: 'token-invalid'},

      {tag: t.tagName, class: 'token-tag'},
      {tag: t.attributeName, class: 'token-attribute'},
      {tag: t.attributeValue, class: 'token-attribute-value'},

      {tag: t.inserted, class: 'token-inserted'},
      {tag: t.deleted, class: 'token-deleted'},
      {tag: t.heading, class: 'token-variable-special'},
      {tag: t.link, class: 'token-variable-special'},
      {tag: t.strikethrough, class: 'token-strikethrough'},
      {tag: t.strong, class: 'token-strong'},
      {tag: t.emphasis, class: 'token-emphasis'},
    ]);
  }
  return highlightStyle;
}

export async function create(code: string, mimeType: string): Promise<CodeHighlighter> {
  const CM = await importCM();
  const language = await languageFromMIME(mimeType);
  const tree = language ? language.language.parser.parse(code) : new CM.Tree(CM.NodeType.none, [], [], code.length);
  return new CodeHighlighter(code, tree, CM);
}

export async function languageFromMIME(mimeType: string): Promise<CodeMirror.LanguageSupport|null> {
  const CM = await importCM();

  switch (mimeType) {
    case 'text/javascript':
      return (await CM.javascript()).javascript();
    case 'text/jsx':
      return (await CM.javascript()).javascript({jsx: true});
    case 'text/typescript':
      return (await CM.javascript()).javascript({typescript: true});
    case 'text/typescript-jsx':
      return (await CM.javascript()).javascript({typescript: true, jsx: true});

    case 'text/css':
    case 'text/x-scss':
      return (await CM.css()).css();

    case 'text/html':
      return (await CM.html()).html();

    case 'application/xml':
      return (await CM.xml()).xml();

    case 'text/webassembly':
      return (await CM.wast()).wast();

    case 'text/x-c++src':
      return (await CM.cpp()).cpp();

    case 'text/x-java':
      return (await CM.java()).java();

    case 'application/json':
      return (await CM.json()).json();

    case 'application/x-httpd-php':
      return (await CM.php()).php();

    case 'text/x-python':
      return (await CM.python()).python();

    case 'text/markdown':
      return (await CM.markdown()).markdown();

    case 'text/x-sh':
      return new CM.LanguageSupport(await CM.shell());

    case 'text/x-coffeescript':
      return new CM.LanguageSupport(await CM.coffeescript());

    case 'text/x-clojure':
      return new CM.LanguageSupport(await CM.clojure());

    default:
      return null;
  }
}

export class CodeHighlighter {
  constructor(readonly code: string, readonly tree: CodeMirror.Tree, private readonly modCM: typeof CodeMirror) {
  }

  highlight(token: (text: string, style: string) => void): void {
    this.highlightRange(0, this.code.length, token);
  }

  highlightRange(from: number, to: number, token: (text: string, style: string) => void): void {
    let pos = from;
    const flush = (to: number, style: string): void => {
      if (to > pos) {
        token(this.code.slice(pos, to), style);
        pos = to;
      }
    };
    this.modCM.highlightTree(this.tree, getHighlightStyle(this.modCM).match, (from, to, style) => {
      flush(from, '');
      flush(to, style);
    }, from, to);
    flush(to, '');
  }
}
