// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as CodeMirror from '../../../third_party/codemirror.next/codemirror.next.js';

const t = CodeMirror.tags;

export const highlightStyle: CodeMirror.HighlightStyle = CodeMirror.HighlightStyle.define([
  {tag: t.variableName, class: 'token-variable'},
  {tag: t.definition(t.variableName), class: 'token-definition'},
  {tag: t.propertyName, class: 'token-property'},
  {tag: [t.typeName, t.className, t.namespace, t.macroName], class: 'token-type'},
  {tag: [t.special(t.name), t.constant(t.className)], class: 'token-variable-special'},
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
  {tag: t.heading, class: 'token-heading'},
  {tag: t.link, class: 'token-link'},
  {tag: t.strikethrough, class: 'token-strikethrough'},
  {tag: t.strong, class: 'token-strong'},
  {tag: t.emphasis, class: 'token-emphasis'},
]);

export async function create(code: string, mimeType: string): Promise<CodeHighlighter> {
  const language = await languageFromMIME(mimeType);
  let tree: CodeMirror.Tree;
  if (language) {
    tree = language.language.parser.parse(code);
  } else {
    tree = new CodeMirror.Tree(CodeMirror.NodeType.none, [], [], code.length);
  }
  return new CodeHighlighter(code, tree);
}

export async function highlightNode(node: Element, mimeType: string): Promise<void> {
  const code = node.textContent || '';
  const highlighter = await create(code, mimeType);
  node.removeChildren();
  highlighter.highlight((text, style) => {
    let token: Node = document.createTextNode(text);
    if (style) {
      const span = document.createElement('span');
      span.className = style;
      span.appendChild(token);
      token = span;
    }
    node.appendChild(token);
  });
}

export async function languageFromMIME(mimeType: string): Promise<CodeMirror.LanguageSupport|null> {
  switch (mimeType) {
    // The correct MIME type for JavaScript is text/javascript, but we also support
    // the legacy JavaScript MIME types here for backwards compatibility.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#legacy_javascript_mime_types
    case 'application/javascript':
    case 'application/ecmascript':
    case 'application/x-ecmascript':
    case 'application/x-javascript':
    case 'text/ecmascript':
    case 'text/javascript1.0':
    case 'text/javascript1.1':
    case 'text/javascript1.2':
    case 'text/javascript1.3':
    case 'text/javascript1.4':
    case 'text/javascript1.5':
    case 'text/jscript':
    case 'text/livescript ':
    case 'text/x-ecmascript':
    case 'text/x-javascript':
    case 'text/javascript':
    case 'text/jsx':
      // We intentionally allow JSX in normal .js as well as .jsx files,
      // because there are simply too many existing applications and
      // examples out there that use JSX within .js files, and we don't
      // want to break them.
      return CodeMirror.javascript.javascript({jsx: true});
    case 'text/typescript':
      return CodeMirror.javascript.javascript({typescript: true});
    case 'text/typescript-jsx':
      return CodeMirror.javascript.javascript({typescript: true, jsx: true});

    case 'text/css':
      return CodeMirror.css.css();

    case 'text/html':
      return CodeMirror.html.html({selfClosingTags: true});

    case 'application/xml':
      return (await CodeMirror.xml()).xml();

    case 'application/wasm':
      return (await CodeMirror.wast()).wast();

    case 'text/x-c++src':
      return (await CodeMirror.cpp()).cpp();

    case 'text/x-go':
      return new CodeMirror.LanguageSupport(await CodeMirror.go());

    case 'text/x-java':
      return (await CodeMirror.java()).java();

    case 'text/x-kotlin':
      return new CodeMirror.LanguageSupport(await CodeMirror.kotlin());

    case 'application/json':
    case 'application/manifest+json':
      return (await CodeMirror.json()).json();

    case 'application/x-httpd-php':
      return (await CodeMirror.php()).php();

    case 'text/x-python':
      return (await CodeMirror.python()).python();

    case 'text/markdown':
      return (await CodeMirror.markdown()).markdown();

    case 'text/x-sh':
      return new CodeMirror.LanguageSupport(await CodeMirror.shell());

    case 'text/x-coffeescript':
      return new CodeMirror.LanguageSupport(await CodeMirror.coffeescript());

    case 'text/x-clojure':
      return new CodeMirror.LanguageSupport(await CodeMirror.clojure());

    case 'application/vnd.dart':
      return new CodeMirror.LanguageSupport(await CodeMirror.dart());

    case 'text/x-gss':
      return new CodeMirror.LanguageSupport(await CodeMirror.gss());

    case 'text/x-less':
      return new CodeMirror.LanguageSupport(await CodeMirror.less());

    case 'text/x-sass':
      return new CodeMirror.LanguageSupport(await CodeMirror.sass());

    case 'text/x-scala':
      return new CodeMirror.LanguageSupport(await CodeMirror.scala());

    case 'text/x-scss':
      return new CodeMirror.LanguageSupport(await CodeMirror.scss());

    case 'text/x.angular':
      return (await CodeMirror.angular()).angular();

    case 'text/x.svelte':
      return (await CodeMirror.svelte()).svelte();

    case 'text/x.vue':
      return (await CodeMirror.vue()).vue();

    default:
      return null;
  }
}

export class CodeHighlighter {
  constructor(readonly code: string, readonly tree: CodeMirror.Tree) {
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
    CodeMirror.highlightTree(this.tree, highlightStyle, (from, to, style) => {
      flush(from, '');
      flush(to, style);
    }, from, to);
    flush(to, '');
  }
}
