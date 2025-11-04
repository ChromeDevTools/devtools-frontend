var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/code_highlighter/codeHighlighter.css.js
var codeHighlighter_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.token-variable {
  color: var(--sys-color-token-variable);
}

.token-property {
  color: var(--sys-color-token-property);
}

.token-type {
  color: var(--sys-color-token-type);
}

.token-variable-special {
  color: var(--sys-color-token-variable-special);
}

.token-definition {
  color: var(--sys-color-token-definition);
}

.token-builtin {
  color: var(--sys-color-token-builtin);
}

.token-number {
  color: var(--sys-color-token-number);
}

.token-string {
  color: var(--sys-color-token-string);
}

.token-string-special {
  color: var(--sys-color-token-string-special);
}

.token-atom {
  color: var(--sys-color-token-atom);
}

.token-keyword {
  color: var(--sys-color-token-keyword);
}

.token-comment {
  color: var(--sys-color-token-comment);
}

.token-meta {
  color: var(--sys-color-token-meta);
}

.token-invalid {
  color: var(--sys-color-error);
}

.token-tag {
  color: var(--sys-color-token-tag);
}

.token-attribute {
  color: var(--sys-color-token-attribute);
}

.token-attribute-value {
  color: var(--sys-color-token-attribute-value);
}

.token-inserted {
  color: var(--sys-color-token-inserted);
}

.token-deleted {
  color: var(--sys-color-token-deleted);
}

.token-heading {
  color: var(--sys-color-token-variable-special);
  font-weight: bold;
}

.token-link {
  color: var(--sys-color-token-variable-special);
  text-decoration: underline;
}

.token-strikethrough {
  text-decoration: line-through;
}

.token-strong {
  font-weight: bold;
}

.token-emphasis {
  font-style: italic;
}

/*# sourceURL=${import.meta.resolve("./codeHighlighter.css")} */`;

// gen/front_end/ui/components/code_highlighter/CodeHighlighter.js
var CodeHighlighter_exports = {};
__export(CodeHighlighter_exports, {
  CodeHighlighter: () => CodeHighlighter,
  create: () => create,
  highlightNode: () => highlightNode,
  highlightStyle: () => highlightStyle,
  languageFromMIME: () => languageFromMIME
});
import * as CodeMirror from "./../../../third_party/codemirror.next/codemirror.next.js";
var t = CodeMirror.tags;
var highlightStyle = CodeMirror.HighlightStyle.define([
  { tag: t.variableName, class: "token-variable" },
  { tag: t.definition(t.variableName), class: "token-definition" },
  { tag: t.propertyName, class: "token-property" },
  { tag: [t.typeName, t.className, t.namespace, t.macroName], class: "token-type" },
  { tag: [t.special(t.name), t.constant(t.className)], class: "token-variable-special" },
  { tag: t.standard(t.variableName), class: "token-builtin" },
  { tag: [t.number, t.literal, t.unit], class: "token-number" },
  { tag: t.string, class: "token-string" },
  { tag: [t.special(t.string), t.regexp, t.escape], class: "token-string-special" },
  { tag: [t.atom, t.labelName, t.bool], class: "token-atom" },
  { tag: t.keyword, class: "token-keyword" },
  { tag: [t.comment, t.quote], class: "token-comment" },
  { tag: t.meta, class: "token-meta" },
  { tag: t.invalid, class: "token-invalid" },
  { tag: t.tagName, class: "token-tag" },
  { tag: t.attributeName, class: "token-attribute" },
  { tag: t.attributeValue, class: "token-attribute-value" },
  { tag: t.inserted, class: "token-inserted" },
  { tag: t.deleted, class: "token-deleted" },
  { tag: t.heading, class: "token-heading" },
  { tag: t.link, class: "token-link" },
  { tag: t.strikethrough, class: "token-strikethrough" },
  { tag: t.strong, class: "token-strong" },
  { tag: t.emphasis, class: "token-emphasis" }
]);
async function create(code, mimeType) {
  const language = await languageFromMIME(mimeType);
  let tree;
  if (language) {
    tree = language.language.parser.parse(code);
  } else {
    tree = new CodeMirror.Tree(CodeMirror.NodeType.none, [], [], code.length);
  }
  return new CodeHighlighter(code, tree);
}
async function highlightNode(node, mimeType) {
  const code = node.textContent || "";
  const highlighter = await create(code, mimeType);
  node.removeChildren();
  highlighter.highlight((text, style) => {
    let token = document.createTextNode(text);
    if (style) {
      const span = document.createElement("span");
      span.className = style;
      span.appendChild(token);
      token = span;
    }
    node.appendChild(token);
  });
}
async function languageFromMIME(mimeType) {
  switch (mimeType) {
    // The correct MIME type for JavaScript is text/javascript, but we also support
    // the legacy JavaScript MIME types here for backwards compatibility.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types#legacy_javascript_mime_types
    case "application/javascript":
    case "application/ecmascript":
    case "application/x-ecmascript":
    case "application/x-javascript":
    case "text/ecmascript":
    case "text/javascript1.0":
    case "text/javascript1.1":
    case "text/javascript1.2":
    case "text/javascript1.3":
    case "text/javascript1.4":
    case "text/javascript1.5":
    case "text/jscript":
    case "text/livescript ":
    case "text/x-ecmascript":
    case "text/x-javascript":
    case "text/javascript":
    case "text/jsx":
      return CodeMirror.javascript.javascript({ jsx: true });
    case "text/typescript":
      return CodeMirror.javascript.javascript({ typescript: true });
    case "text/typescript-jsx":
      return CodeMirror.javascript.javascript({ typescript: true, jsx: true });
    case "text/css":
      return CodeMirror.css.css();
    case "text/html":
      return CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true });
    case "application/xml":
    case "application/xhtml+xml":
    case "image/svg+xml":
      return (await CodeMirror.xml()).xml();
    case "application/wasm":
      return (await CodeMirror.wast()).wast();
    case "text/x-c++src":
      return (await CodeMirror.cpp()).cpp();
    case "text/x-go":
      return new CodeMirror.LanguageSupport(await CodeMirror.go());
    case "text/x-java":
      return (await CodeMirror.java()).java();
    case "text/x-kotlin":
      return new CodeMirror.LanguageSupport(await CodeMirror.kotlin());
    case "application/json":
    case "application/manifest+json": {
      const jsonLanguage = CodeMirror.javascript.javascriptLanguage.configure({ top: "SingleExpression" });
      return new CodeMirror.LanguageSupport(jsonLanguage);
    }
    case "application/x-httpd-php":
      return (await CodeMirror.php()).php();
    case "text/x-python":
      return (await CodeMirror.python()).python();
    case "text/markdown":
      return (await CodeMirror.markdown()).markdown();
    case "text/x-sh":
      return new CodeMirror.LanguageSupport(await CodeMirror.shell());
    case "text/x-coffeescript":
      return new CodeMirror.LanguageSupport(await CodeMirror.coffeescript());
    case "text/x-clojure":
      return new CodeMirror.LanguageSupport(await CodeMirror.clojure());
    case "application/vnd.dart":
      return new CodeMirror.LanguageSupport(await CodeMirror.dart());
    case "text/x-gss":
      return new CodeMirror.LanguageSupport(await CodeMirror.gss());
    case "text/x-less":
      return (await CodeMirror.less()).less();
    case "text/x-sass":
      return (await CodeMirror.sass()).sass({ indented: true });
    case "text/x-scala":
      return new CodeMirror.LanguageSupport(await CodeMirror.scala());
    case "text/x-scss":
      return (await CodeMirror.sass()).sass({ indented: false });
    case "text/x.angular":
      return (await CodeMirror.angular()).angular();
    case "text/x.svelte":
      return (await CodeMirror.svelte()).svelte();
    case "text/x.vue":
      return (await CodeMirror.vue()).vue();
    default:
      return null;
  }
}
var CodeHighlighter = class {
  code;
  tree;
  constructor(code, tree) {
    this.code = code;
    this.tree = tree;
  }
  highlight(token) {
    this.highlightRange(0, this.code.length, token);
  }
  highlightRange(from, to, token) {
    let pos = from;
    const flush = (to2, style) => {
      if (to2 > pos) {
        token(this.code.slice(pos, to2), style);
        pos = to2;
      }
    };
    CodeMirror.highlightTree(this.tree, highlightStyle, (from2, to2, style) => {
      flush(from2, "");
      flush(to2, style);
    }, from, to);
    flush(to, "");
  }
};
export {
  CodeHighlighter_exports as CodeHighlighter,
  codeHighlighter_css_default as codeHighlighterStyles
};
//# sourceMappingURL=code_highlighter.js.map
