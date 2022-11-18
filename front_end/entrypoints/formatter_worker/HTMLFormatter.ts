// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../core/platform/platform.js';

import {CSSFormatter} from './CSSFormatter.js';
import {type FormattedContentBuilder} from './FormattedContentBuilder.js';
import {AbortTokenization, createTokenizer} from './FormatterWorker.js';
import {JavaScriptFormatter} from './JavaScriptFormatter.js';

export class HTMLFormatter {
  readonly #builder: FormattedContentBuilder;
  readonly #jsFormatter: JavaScriptFormatter;
  readonly #cssFormatter: CSSFormatter;
  #text?: string;
  #lineEndings?: number[];
  #model?: HTMLModel;

  constructor(builder: FormattedContentBuilder) {
    this.#builder = builder;
    this.#jsFormatter = new JavaScriptFormatter(builder);
    this.#cssFormatter = new CSSFormatter(builder);
  }

  format(text: string, lineEndings: number[]): void {
    this.#text = text;
    this.#lineEndings = lineEndings;
    this.#model = new HTMLModel(text);
    this.#walk(this.#model.document());
  }

  #formatTokensTill(element: FormatterElement, offset: number): void {
    if (!this.#model) {
      return;
    }

    let nextToken = this.#model.peekToken();
    while (nextToken && nextToken.startOffset < offset) {
      const token = (this.#model.nextToken() as Token);
      this.#formatToken(element, token);
      nextToken = this.#model.peekToken();
    }
  }

  #walk(element: FormatterElement): void {
    if (!element.openTag || !element.closeTag) {
      throw new Error('Element is missing open or close tag');
    }

    if (element.parent) {
      this.#formatTokensTill(element.parent, element.openTag.startOffset);
    }
    this.#beforeOpenTag(element);
    this.#formatTokensTill(element, element.openTag.endOffset);
    this.#afterOpenTag(element);
    for (let i = 0; i < element.children.length; ++i) {
      this.#walk(element.children[i]);
    }

    this.#formatTokensTill(element, element.closeTag.startOffset);
    this.#beforeCloseTag(element);
    this.#formatTokensTill(element, element.closeTag.endOffset);
    this.#afterCloseTag(element);
  }

  #beforeOpenTag(element: FormatterElement): void {
    if (!this.#model) {
      return;
    }

    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.addNewLine();
  }

  #afterOpenTag(element: FormatterElement): void {
    if (!this.#model) {
      return;
    }

    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.increaseNestingLevel();
    this.#builder.addNewLine();
  }

  #beforeCloseTag(element: FormatterElement): void {
    if (!this.#model) {
      return;
    }

    if (!element.children.length || element === this.#model.document()) {
      return;
    }
    this.#builder.decreaseNestingLevel();
    this.#builder.addNewLine();
  }

  #afterCloseTag(_element: FormatterElement): void {
    this.#builder.addNewLine();
  }

  #formatToken(element: FormatterElement, token: Token): void {
    if (Platform.StringUtilities.isWhitespace(token.value)) {
      return;
    }
    if (hasTokenInSet(token.type, 'comment') || hasTokenInSet(token.type, 'meta')) {
      this.#builder.addNewLine();
      this.#builder.addToken(token.value.trim(), token.startOffset);
      this.#builder.addNewLine();
      return;
    }

    if (!element.openTag || !element.closeTag) {
      return;
    }

    const isBodyToken =
        element.openTag.endOffset <= token.startOffset && token.startOffset < element.closeTag.startOffset;
    if (isBodyToken && element.name === 'style') {
      this.#builder.addNewLine();
      this.#builder.increaseNestingLevel();
      this.#cssFormatter.format(this.#text || '', this.#lineEndings || [], token.startOffset, token.endOffset);
      this.#builder.decreaseNestingLevel();
      return;
    }
    if (isBodyToken && element.name === 'script') {
      this.#builder.addNewLine();
      this.#builder.increaseNestingLevel();
      if (this.#scriptTagIsJavaScript(element)) {
        this.#jsFormatter.format(this.#text || '', this.#lineEndings || [], token.startOffset, token.endOffset);
      } else {
        this.#builder.addToken(token.value, token.startOffset);
        this.#builder.addNewLine();
      }
      this.#builder.decreaseNestingLevel();
      return;
    }

    if (!isBodyToken && hasTokenInSet(token.type, 'attribute')) {
      this.#builder.addSoftSpace();
    }

    this.#builder.addToken(token.value, token.startOffset);
  }

  #scriptTagIsJavaScript(element: FormatterElement): boolean {
    if (!element.openTag) {
      return true;
    }

    if (!element.openTag.attributes.has('type')) {
      return true;
    }

    let type = element.openTag.attributes.get('type');
    if (!type) {
      return true;
    }

    type = type.toLowerCase();
    const isWrappedInQuotes = /^(["\'])(.*)\1$/.exec(type.trim());
    if (isWrappedInQuotes) {
      type = isWrappedInQuotes[2];
    }
    return HTMLFormatter.SupportedJavaScriptMimeTypes.has(type.trim());
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly SupportedJavaScriptMimeTypes = new Set([
    'application/ecmascript',
    'application/javascript',
    'application/x-ecmascript',
    'application/x-javascript',
    'text/ecmascript',
    'text/javascript',
    'text/javascript1.0',
    'text/javascript1.1',
    'text/javascript1.2',
    'text/javascript1.3',
    'text/javascript1.4',
    'text/javascript1.5',
    'text/jscript',
    'text/livescript',
    'text/x-ecmascript',
    'text/x-javascript',
  ]);
}

function hasTokenInSet(tokenTypes: Set<string>, type: string): boolean {
  // We prefix the CodeMirror HTML tokenizer with the xml- prefix
  // in a full version. When running in a worker context, this
  // prefix is not appended, as the global is only overridden
  // in CodeMirrorTextEditor.js.
  return tokenTypes.has(type) || tokenTypes.has(`xml-${type}`);
}

export class HTMLModel {
  #state: ParseState;
  readonly #documentInternal: FormatterElement;
  #stack: FormatterElement[];
  readonly #tokens: Token[];
  #tokenIndex: number;
  #attributes: Map<string, string>;
  #attributeName: string;
  #tagName: string;
  #isOpenTag: boolean;
  #tagStartOffset?: number|null;
  #tagEndOffset?: number|null;

  constructor(text: string) {
    this.#state = ParseState.Initial;
    this.#documentInternal = new FormatterElement('document');
    this.#documentInternal.openTag = new Tag('document', 0, 0, new Map(), true, false);
    this.#documentInternal.closeTag = new Tag('document', text.length, text.length, new Map(), false, false);

    this.#stack = [this.#documentInternal];

    this.#tokens = [];
    this.#tokenIndex = 0;
    this.#build(text);

    this.#attributes = new Map();
    this.#attributeName = '';
    this.#tagName = '';
    this.#isOpenTag = false;
  }

  #build(text: string): void {
    const tokenizer = createTokenizer('text/html');
    let baseOffset = 0, lastOffset = 0;
    const lowerCaseText = text.toLowerCase();
    let pendingToken: Token|null = null;

    const pushToken = (token: Token): Object|undefined => {
      this.#tokens.push(token);
      this.#updateDOM(token);

      const element = this.#stack[this.#stack.length - 1];
      if (element && (element.name === 'script' || element.name === 'style') && element.openTag &&
          element.openTag.endOffset === lastOffset) {
        return AbortTokenization;
      }

      return;
    };

    const processToken = (
        tokenValue: string,
        type: string|null,
        tokenStart: number,
        tokenEnd: number,
        ): Object|undefined => {
      tokenStart += baseOffset;
      tokenEnd += baseOffset;
      lastOffset = tokenEnd;

      const tokenType = type ? new Set<string>(type.split(' ')) : new Set<string>();
      const token = new Token(tokenValue, tokenType, tokenStart, tokenEnd);

      // This is a pretty horrible work-around for a bug in the CodeMirror 5 HTML
      // tokenizer, which isn't easy to fix because it shares this code with the
      // XML parser[^1], and which is also not actively maintained anymore. The
      // real fix here is to migrate off of CodeMirror 5 also for formatting and
      // pretty printing and use CodeMirror 6 instead, but that's a bigger
      // project. For now we ducktape the problem by merging a '/' token
      // following a string token in the HTML formatter, which does the trick.
      //
      // [^1]: https://github.com/codemirror/codemirror5/blob/742627a/mode/xml/xml.js#L137
      //
      if (pendingToken) {
        if (tokenValue === '/' && type === 'attribute') {
          token.startOffset = pendingToken.startOffset;
          token.value = `${pendingToken.value}${tokenValue}`;
          token.type = pendingToken.type;
        } else if (pushToken(pendingToken) === AbortTokenization) {
          return AbortTokenization;
        }
        pendingToken = null;
      } else if (type === 'string') {
        pendingToken = token;
        return;
      }

      return pushToken(token);
    };

    while (true) {
      baseOffset = lastOffset;
      tokenizer(text.substring(lastOffset), processToken);
      if (pendingToken) {
        pushToken(pendingToken);
        pendingToken = null;
      }
      if (lastOffset >= text.length) {
        break;
      }
      const element = this.#stack[this.#stack.length - 1];
      if (!element) {
        break;
      }

      lastOffset = lowerCaseText.indexOf('</' + element.name, lastOffset);
      if (lastOffset === -1) {
        lastOffset = text.length;
      }

      if (!element.openTag) {
        break;
      }

      const tokenStart = element.openTag.endOffset;
      const tokenEnd = lastOffset;
      const tokenValue = text.substring(tokenStart, tokenEnd);
      this.#tokens.push(new Token(tokenValue, new Set(), tokenStart, tokenEnd));
    }

    while (this.#stack.length > 1) {
      const element = this.#stack[this.#stack.length - 1];
      if (!element) {
        break;
      }

      this.#popElement(new Tag(element.name, text.length, text.length, new Map(), false, false));
    }
  }

  #updateDOM(token: Token): void {
    const value = token.value;
    const type = token.type;
    switch (this.#state) {
      case ParseState.Initial:
        if (hasTokenInSet(type, 'bracket') && (value === '<' || value === '</')) {
          this.#onStartTag(token);
          this.#state = ParseState.Tag;
        }
        return;
      case ParseState.Tag:
        if (hasTokenInSet(type, 'tag') && !hasTokenInSet(type, 'bracket')) {
          this.#tagName = value.trim().toLowerCase();
        } else if (hasTokenInSet(type, 'attribute')) {
          this.#attributeName = value.trim().toLowerCase();
          this.#attributes.set(this.#attributeName, '');
          this.#state = ParseState.AttributeName;
        } else if (hasTokenInSet(type, 'bracket') && (value === '>' || value === '/>')) {
          this.#onEndTag(token);
          this.#state = ParseState.Initial;
        }
        return;
      case ParseState.AttributeName:
        if (!type.size && value === '=') {
          this.#state = ParseState.AttributeValue;
        } else if (hasTokenInSet(type, 'bracket') && (value === '>' || value === '/>')) {
          this.#onEndTag(token);
          this.#state = ParseState.Initial;
        }
        return;
      case ParseState.AttributeValue:
        if (hasTokenInSet(type, 'string')) {
          this.#attributes.set(this.#attributeName, value);
          this.#state = ParseState.Tag;
        } else if (hasTokenInSet(type, 'bracket') && (value === '>' || value === '/>')) {
          this.#onEndTag(token);
          this.#state = ParseState.Initial;
        }
        return;
    }
  }

  #onStartTag(token: Token): void {
    this.#tagName = '';
    this.#tagStartOffset = token.startOffset;
    this.#tagEndOffset = null;
    this.#attributes = new Map();
    this.#attributeName = '';
    this.#isOpenTag = token.value === '<';
  }

  #onEndTag(token: Token): void {
    this.#tagEndOffset = token.endOffset;
    const selfClosingTag = token.value === '/>' || SelfClosingTags.has(this.#tagName);
    const tag = new Tag(
        this.#tagName, this.#tagStartOffset || 0, this.#tagEndOffset, this.#attributes, this.#isOpenTag,
        selfClosingTag);
    this.#onTagComplete(tag);
  }

  #onTagComplete(tag: Tag): void {
    if (tag.isOpenTag) {
      const topElement = this.#stack[this.#stack.length - 1];
      if (topElement) {
        const tagSet = AutoClosingTags.get(topElement.name);
        if (topElement !== this.#documentInternal && topElement.openTag && topElement.openTag.selfClosingTag) {
          this.#popElement(autocloseTag(topElement, topElement.openTag.endOffset));
        } else if (tagSet && tagSet.has(tag.name)) {
          this.#popElement(autocloseTag(topElement, tag.startOffset));
        }
        this.#pushElement(tag);
      }
      return;
    }

    let lastTag = this.#stack[this.#stack.length - 1];
    while (this.#stack.length > 1 && lastTag && lastTag.name !== tag.name) {
      this.#popElement(autocloseTag(lastTag, tag.startOffset));
      lastTag = this.#stack[this.#stack.length - 1];
    }
    if (this.#stack.length === 1) {
      return;
    }
    this.#popElement(tag);

    function autocloseTag(element: FormatterElement, offset: number): Tag {
      return new Tag(element.name, offset, offset, new Map(), false, false);
    }
  }

  #popElement(closeTag: Tag): void {
    const element = this.#stack.pop();
    if (!element) {
      return;
    }
    element.closeTag = closeTag;
  }

  #pushElement(openTag: Tag): void {
    const topElement = this.#stack[this.#stack.length - 1];
    const newElement = new FormatterElement(openTag.name);
    if (topElement) {
      newElement.parent = topElement;
      topElement.children.push(newElement);
    }
    newElement.openTag = openTag;
    this.#stack.push(newElement);
  }

  peekToken(): Token|null {
    return this.#tokenIndex < this.#tokens.length ? this.#tokens[this.#tokenIndex] : null;
  }

  nextToken(): Token|null {
    return this.#tokens[this.#tokenIndex++];
  }

  document(): FormatterElement {
    return this.#documentInternal;
  }
}

const SelfClosingTags = new Set<string>([
  'area',
  'base',
  'br',
  'col',
  'command',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

// @see https://www.w3.org/TR/html/syntax.html 8.1.2.4 Optional tags
const AutoClosingTags = new Map([
  ['head', new Set(['body'])],
  ['li', new Set(['li'])],
  ['dt', new Set(['dt', 'dd'])],
  ['dd', new Set(['dt', 'dd'])],
  [
    'p',
    new Set([
      'address', 'article', 'aside', 'blockquote', 'div', 'dl',      'fieldset', 'footer', 'form',
      'h1',      'h2',      'h3',    'h4',         'h5',  'h6',      'header',   'hgroup', 'hr',
      'main',    'nav',     'ol',    'p',          'pre', 'section', 'table',    'ul',
    ]),
  ],
  ['rb', new Set(['rb', 'rt', 'rtc', 'rp'])],
  ['rt', new Set(['rb', 'rt', 'rtc', 'rp'])],
  ['rtc', new Set(['rb', 'rtc', 'rp'])],
  ['rp', new Set(['rb', 'rt', 'rtc', 'rp'])],
  ['optgroup', new Set(['optgroup'])],
  ['option', new Set(['option', 'optgroup'])],
  ['colgroup', new Set(['colgroup'])],
  ['thead', new Set(['tbody', 'tfoot'])],
  ['tbody', new Set(['tbody', 'tfoot'])],
  ['tfoot', new Set(['tbody'])],
  ['tr', new Set(['tr'])],
  ['td', new Set(['td', 'th'])],
  ['th', new Set(['td', 'th'])],
]);

const enum ParseState {
  Initial = 'Initial',
  Tag = 'Tag',
  AttributeName = 'AttributeName',
  AttributeValue = 'AttributeValue',
}

class Token {
  value: string;
  type: Set<string>;
  startOffset: number;
  endOffset: number;

  constructor(value: string, type: Set<string>, startOffset: number, endOffset: number) {
    this.value = value;
    this.type = type;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
  }
}

class Tag {
  name: string;
  startOffset: number;
  endOffset: number;
  attributes: Map<string, string>;
  isOpenTag: boolean;
  selfClosingTag: boolean;

  constructor(
      name: string, startOffset: number, endOffset: number, attributes: Map<string, string>, isOpenTag: boolean,
      selfClosingTag: boolean) {
    this.name = name;
    this.startOffset = startOffset;
    this.endOffset = endOffset;
    this.attributes = attributes;
    this.isOpenTag = isOpenTag;
    this.selfClosingTag = selfClosingTag;
  }
}

class FormatterElement {
  name: string;
  children: FormatterElement[] = [];
  parent: FormatterElement|null = null;
  openTag: Tag|null = null;
  closeTag: Tag|null = null;

  constructor(name: string) {
    this.name = name;
  }
}
