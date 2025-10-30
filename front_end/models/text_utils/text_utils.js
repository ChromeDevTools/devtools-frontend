var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/models/text_utils/CodeMirrorUtils.js
var CodeMirrorUtils_exports = {};
__export(CodeMirrorUtils_exports, {
  createCssTokenizer: () => createCssTokenizer
});
import * as CodeMirror from "./../../third_party/codemirror.next/codemirror.next.js";
function createCssTokenizer() {
  async function tokenize(line, callback) {
    const streamParser = await CodeMirror.cssStreamParser();
    const stream = new CodeMirror.StringStream(line, 4, 2);
    const state = streamParser.startState(2);
    let lastPos = stream.pos;
    while (!stream.eol()) {
      stream.start = lastPos;
      let tokenType = streamParser.token(stream, state);
      if (tokenType === "error" && state.state === "maybeprop") {
        tokenType = "property";
      }
      const segment = stream.current();
      callback(segment, tokenType);
      lastPos = stream.pos;
    }
  }
  return tokenize;
}

// gen/front_end/models/text_utils/ContentData.js
var ContentData_exports = {};
__export(ContentData_exports, {
  ContentData: () => ContentData,
  EMPTY_TEXT_CONTENT_DATA: () => EMPTY_TEXT_CONTENT_DATA
});
import * as Platform4 from "./../../core/platform/platform.js";

// gen/front_end/models/text_utils/ContentProvider.js
var ContentProvider_exports = {};
__export(ContentProvider_exports, {
  SearchMatch: () => SearchMatch,
  contentAsDataURL: () => contentAsDataURL,
  isStreamingContentProvider: () => isStreamingContentProvider
});
var SearchMatch = class {
  lineNumber;
  lineContent;
  columnNumber;
  matchLength;
  constructor(lineNumber, lineContent, columnNumber, matchLength) {
    this.lineNumber = lineNumber;
    this.lineContent = lineContent;
    this.columnNumber = columnNumber;
    this.matchLength = matchLength;
  }
  static comparator(a, b) {
    return a.lineNumber - b.lineNumber || a.columnNumber - b.columnNumber;
  }
};
var contentAsDataURL = function(content, mimeType, contentEncoded, charset, limitSize = true) {
  const maxDataUrlSize = 1024 * 1024;
  if (content === void 0 || content === null || limitSize && content.length > maxDataUrlSize) {
    return null;
  }
  content = contentEncoded ? content : encodeURIComponent(content);
  return "data:" + mimeType + (charset ? ";charset=" + charset : "") + (contentEncoded ? ";base64" : "") + "," + content;
};
var isStreamingContentProvider = function(provider) {
  return "requestStreamingContent" in provider;
};

// gen/front_end/models/text_utils/Text.js
var Text_exports = {};
__export(Text_exports, {
  Text: () => Text
});
import * as Platform3 from "./../../core/platform/platform.js";

// gen/front_end/models/text_utils/TextCursor.js
var TextCursor_exports = {};
__export(TextCursor_exports, {
  TextCursor: () => TextCursor
});
import * as Platform from "./../../core/platform/platform.js";
var TextCursor = class {
  #lineEndings;
  #offset = 0;
  #lineNumber = 0;
  #columnNumber = 0;
  constructor(lineEndings) {
    this.#lineEndings = lineEndings;
  }
  advance(offset) {
    this.#offset = offset;
    while (this.#lineNumber < this.#lineEndings.length && this.#lineEndings[this.#lineNumber] < this.#offset) {
      ++this.#lineNumber;
    }
    this.#columnNumber = this.#lineNumber ? this.#offset - this.#lineEndings[this.#lineNumber - 1] - 1 : this.#offset;
  }
  offset() {
    return this.#offset;
  }
  resetTo(offset) {
    this.#offset = offset;
    this.#lineNumber = Platform.ArrayUtilities.lowerBound(this.#lineEndings, offset, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
    this.#columnNumber = this.#lineNumber ? this.#offset - this.#lineEndings[this.#lineNumber - 1] - 1 : this.#offset;
  }
  lineNumber() {
    return this.#lineNumber;
  }
  columnNumber() {
    return this.#columnNumber;
  }
};

// gen/front_end/models/text_utils/TextRange.js
var TextRange_exports = {};
__export(TextRange_exports, {
  SourceRange: () => SourceRange,
  TextRange: () => TextRange
});
import * as Platform2 from "./../../core/platform/platform.js";
var MAX_SAFE_INT32 = 2 ** 31 - 1;
var TextRange = class _TextRange {
  startLine;
  startColumn;
  endLine;
  endColumn;
  constructor(startLine, startColumn, endLine, endColumn) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.endLine = endLine;
    this.endColumn = endColumn;
  }
  static createFromLocation(line, column) {
    return new _TextRange(line, column, line, column);
  }
  static createUnboundedFromLocation(line, column) {
    return new _TextRange(line, column, MAX_SAFE_INT32, MAX_SAFE_INT32);
  }
  static fromObject(serializedTextRange) {
    return new _TextRange(serializedTextRange.startLine, serializedTextRange.startColumn, serializedTextRange.endLine, serializedTextRange.endColumn);
  }
  static comparator(range1, range2) {
    return range1.compareTo(range2);
  }
  static fromEdit(oldRange, newText) {
    let endLine = oldRange.startLine;
    let endColumn = oldRange.startColumn + newText.length;
    const lineEndings = Platform2.StringUtilities.findLineEndingIndexes(newText);
    if (lineEndings.length > 1) {
      endLine = oldRange.startLine + lineEndings.length - 1;
      const len = lineEndings.length;
      endColumn = lineEndings[len - 1] - lineEndings[len - 2] - 1;
    }
    return new _TextRange(oldRange.startLine, oldRange.startColumn, endLine, endColumn);
  }
  isEmpty() {
    return this.startLine === this.endLine && this.startColumn === this.endColumn;
  }
  immediatelyPrecedes(range) {
    if (!range) {
      return false;
    }
    return this.endLine === range.startLine && this.endColumn === range.startColumn;
  }
  immediatelyFollows(range) {
    if (!range) {
      return false;
    }
    return range.immediatelyPrecedes(this);
  }
  follows(range) {
    return range.endLine === this.startLine && range.endColumn <= this.startColumn || range.endLine < this.startLine;
  }
  get linesCount() {
    return this.endLine - this.startLine;
  }
  collapseToEnd() {
    return new _TextRange(this.endLine, this.endColumn, this.endLine, this.endColumn);
  }
  collapseToStart() {
    return new _TextRange(this.startLine, this.startColumn, this.startLine, this.startColumn);
  }
  normalize() {
    if (this.startLine > this.endLine || this.startLine === this.endLine && this.startColumn > this.endColumn) {
      return new _TextRange(this.endLine, this.endColumn, this.startLine, this.startColumn);
    }
    return this.clone();
  }
  clone() {
    return new _TextRange(this.startLine, this.startColumn, this.endLine, this.endColumn);
  }
  serializeToObject() {
    return {
      startLine: this.startLine,
      startColumn: this.startColumn,
      endLine: this.endLine,
      endColumn: this.endColumn
    };
  }
  compareTo(other) {
    if (this.startLine > other.startLine) {
      return 1;
    }
    if (this.startLine < other.startLine) {
      return -1;
    }
    if (this.startColumn > other.startColumn) {
      return 1;
    }
    if (this.startColumn < other.startColumn) {
      return -1;
    }
    return 0;
  }
  compareToPosition(lineNumber, columnNumber) {
    if (lineNumber < this.startLine || lineNumber === this.startLine && columnNumber < this.startColumn) {
      return -1;
    }
    if (lineNumber > this.endLine || lineNumber === this.endLine && columnNumber > this.endColumn) {
      return 1;
    }
    return 0;
  }
  equal(other) {
    return this.startLine === other.startLine && this.endLine === other.endLine && this.startColumn === other.startColumn && this.endColumn === other.endColumn;
  }
  relativeTo(line, column) {
    const relative = this.clone();
    if (this.startLine === line) {
      relative.startColumn -= column;
    }
    if (this.endLine === line) {
      relative.endColumn -= column;
    }
    relative.startLine -= line;
    relative.endLine -= line;
    return relative;
  }
  relativeFrom(line, column) {
    const relative = this.clone();
    if (this.startLine === 0) {
      relative.startColumn += column;
    }
    if (this.endLine === 0) {
      relative.endColumn += column;
    }
    relative.startLine += line;
    relative.endLine += line;
    return relative;
  }
  rebaseAfterTextEdit(originalRange, editedRange) {
    console.assert(originalRange.startLine === editedRange.startLine);
    console.assert(originalRange.startColumn === editedRange.startColumn);
    const rebase = this.clone();
    if (!this.follows(originalRange)) {
      return rebase;
    }
    const lineDelta = editedRange.endLine - originalRange.endLine;
    const columnDelta = editedRange.endColumn - originalRange.endColumn;
    rebase.startLine += lineDelta;
    rebase.endLine += lineDelta;
    if (rebase.startLine === editedRange.endLine) {
      rebase.startColumn += columnDelta;
    }
    if (rebase.endLine === editedRange.endLine) {
      rebase.endColumn += columnDelta;
    }
    return rebase;
  }
  toString() {
    return JSON.stringify(this);
  }
  /**
   * Checks whether this {@link TextRange} contains the location identified by the
   * {@link lineNumber} and {@link columnNumber}. The beginning of the text range is
   * considered inclusive while the end of the text range is considered exclusive
   * for this comparison, meaning that for example a range `(0,1)-(1,4)` contains the
   * location `(0,1)` but does not contain the location `(1,4)`.
   *
   * @param lineNumber the location's line offset.
   * @param columnNumber the location's column offset.
   * @returns `true` if the location identified by {@link lineNumber} and {@link columnNumber}
   *          is contained within this text range.
   */
  containsLocation(lineNumber, columnNumber) {
    if (this.startLine === this.endLine) {
      return this.startLine === lineNumber && this.startColumn <= columnNumber && columnNumber < this.endColumn;
    }
    if (this.startLine === lineNumber) {
      return this.startColumn <= columnNumber;
    }
    if (this.endLine === lineNumber) {
      return columnNumber < this.endColumn;
    }
    return this.startLine < lineNumber && lineNumber < this.endLine;
  }
  get start() {
    return { lineNumber: this.startLine, columnNumber: this.startColumn };
  }
  get end() {
    return { lineNumber: this.endLine, columnNumber: this.endColumn };
  }
  /**
   * Checks whether this and `that` {@link TextRange} overlap and if they do, computes the
   * intersection range. If they don't overlap an empty text range is returned instead (for
   * which {@link #isEmpty()} yields `true`).
   *
   * The beginning of text ranges is considered to be includes while the end of the text
   * ranges is considered exclusive for the intersection, meaning that for example intersecting
   * `(0,1)-(1,4)` and `(1,4)-(1,6)` yields an empty range.
   *
   * @param that the other text range.
   * @returns the intersection of this and `that` text range, which might be empty if their don't
   *          overlap.
   */
  intersection(that) {
    let { startLine, startColumn } = this;
    if (startLine < that.startLine) {
      startLine = that.startLine;
      startColumn = that.startColumn;
    } else if (startLine === that.startLine) {
      startColumn = Math.max(startColumn, that.startColumn);
    }
    let { endLine, endColumn } = this;
    if (endLine > that.endLine) {
      endLine = that.endLine;
      endColumn = that.endColumn;
    } else if (endLine === that.endLine) {
      endColumn = Math.min(endColumn, that.endColumn);
    }
    if (startLine > endLine || startLine === endLine && startColumn >= endColumn) {
      return new _TextRange(0, 0, 0, 0);
    }
    return new _TextRange(startLine, startColumn, endLine, endColumn);
  }
};
var SourceRange = class {
  offset;
  length;
  constructor(offset, length) {
    this.offset = offset;
    this.length = length;
  }
};

// gen/front_end/models/text_utils/Text.js
var Text = class {
  #value;
  #lineEndings;
  constructor(value) {
    this.#value = value;
  }
  lineEndings() {
    if (!this.#lineEndings) {
      this.#lineEndings = Platform3.StringUtilities.findLineEndingIndexes(this.#value);
    }
    return this.#lineEndings;
  }
  value() {
    return this.#value;
  }
  lineCount() {
    const lineEndings = this.lineEndings();
    return lineEndings.length;
  }
  offsetFromPosition(lineNumber, columnNumber) {
    return (lineNumber ? this.lineEndings()[lineNumber - 1] + 1 : 0) + columnNumber;
  }
  positionFromOffset(offset) {
    const lineEndings = this.lineEndings();
    const lineNumber = Platform3.ArrayUtilities.lowerBound(lineEndings, offset, Platform3.ArrayUtilities.DEFAULT_COMPARATOR);
    return { lineNumber, columnNumber: offset - (lineNumber && lineEndings[lineNumber - 1] + 1) };
  }
  lineAt(lineNumber) {
    const lineEndings = this.lineEndings();
    const lineStart = lineNumber > 0 ? lineEndings[lineNumber - 1] + 1 : 0;
    const lineEnd = lineEndings[lineNumber];
    let lineContent = this.#value.substring(lineStart, lineEnd);
    if (lineContent.length > 0 && lineContent.charAt(lineContent.length - 1) === "\r") {
      lineContent = lineContent.substring(0, lineContent.length - 1);
    }
    return lineContent;
  }
  toSourceRange(range) {
    const start = this.offsetFromPosition(range.startLine, range.startColumn);
    const end = this.offsetFromPosition(range.endLine, range.endColumn);
    return new SourceRange(start, end - start);
  }
  toTextRange(sourceRange) {
    const cursor = new TextCursor(this.lineEndings());
    const result = TextRange.createFromLocation(0, 0);
    cursor.resetTo(sourceRange.offset);
    result.startLine = cursor.lineNumber();
    result.startColumn = cursor.columnNumber();
    cursor.advance(sourceRange.offset + sourceRange.length);
    result.endLine = cursor.lineNumber();
    result.endColumn = cursor.columnNumber();
    return result;
  }
  replaceRange(range, replacement) {
    const sourceRange = this.toSourceRange(range);
    return this.#value.substring(0, sourceRange.offset) + replacement + this.#value.substring(sourceRange.offset + sourceRange.length);
  }
  extract(range) {
    const sourceRange = this.toSourceRange(range);
    return this.#value.substr(sourceRange.offset, sourceRange.length);
  }
};

// gen/front_end/models/text_utils/ContentData.js
var ContentData = class _ContentData {
  mimeType;
  charset;
  #contentAsBase64;
  #contentAsText;
  #contentAsTextObj;
  constructor(data, isBase64, mimeType, charset) {
    this.charset = charset || "utf-8";
    if (isBase64) {
      this.#contentAsBase64 = data;
    } else {
      this.#contentAsText = data;
    }
    this.mimeType = mimeType;
    if (!this.mimeType) {
      this.mimeType = isBase64 ? "application/octet-stream" : "text/plain";
    }
  }
  /**
   * Returns the data as base64.
   *
   * @throws if this `ContentData` was constructed from text content.
   */
  get base64() {
    if (this.#contentAsBase64 === void 0) {
      throw new Error("Encoding text content as base64 is not supported");
    }
    return this.#contentAsBase64;
  }
  /**
   * Returns the content as text. If this `ContentData` was constructed with base64
   * encoded bytes, it will use the provided charset to attempt to decode the bytes.
   *
   * @throws if `mimeType` is not a text type.
   */
  get text() {
    if (this.#contentAsText !== void 0) {
      return this.#contentAsText;
    }
    if (!this.isTextContent) {
      throw new Error("Cannot interpret binary data as text");
    }
    const binaryString = window.atob(this.#contentAsBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    this.#contentAsText = new TextDecoder(this.charset).decode(bytes);
    return this.#contentAsText;
  }
  /** @returns true, if this `ContentData` was constructed from text content or the mime type indicates text that can be decoded */
  get isTextContent() {
    return this.#createdFromText || Platform4.MimeType.isTextType(this.mimeType);
  }
  get isEmpty() {
    return !Boolean(this.#contentAsBase64) && !Boolean(this.#contentAsText);
  }
  get createdFromBase64() {
    return this.#contentAsBase64 !== void 0;
  }
  get #createdFromText() {
    return this.#contentAsBase64 === void 0;
  }
  /**
   * Returns the text content as a `Text` object. The returned object is always the same to
   * minimize the number of times we have to calculate the line endings array.
   *
   * @throws if `mimeType` is not a text type.
   */
  get textObj() {
    if (this.#contentAsTextObj === void 0) {
      this.#contentAsTextObj = new Text(this.text);
    }
    return this.#contentAsTextObj;
  }
  /**
   * @returns True, iff the contents (base64 or text) are equal.
   * Does not compare mime type and charset, but will decode base64 data if both
   * mime types indicate that it's text content.
   */
  contentEqualTo(other) {
    if (this.#contentAsBase64 !== void 0 && other.#contentAsBase64 !== void 0) {
      return this.#contentAsBase64 === other.#contentAsBase64;
    }
    if (this.#contentAsText !== void 0 && other.#contentAsText !== void 0) {
      return this.#contentAsText === other.#contentAsText;
    }
    if (this.isTextContent && other.isTextContent) {
      return this.text === other.text;
    }
    return false;
  }
  asDataUrl() {
    if (this.#contentAsBase64 !== void 0) {
      const charset = this.isTextContent ? this.charset : null;
      return contentAsDataURL(this.#contentAsBase64, this.mimeType ?? "", true, charset);
    }
    return contentAsDataURL(this.text, this.mimeType ?? "", false, "utf-8");
  }
  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  asDeferedContent() {
    if (this.isTextContent) {
      return { content: this.text, isEncoded: false };
    }
    if (this.#contentAsText !== void 0) {
      return { content: this.#contentAsText, isEncoded: false };
    }
    if (this.#contentAsBase64 !== void 0) {
      return { content: this.#contentAsBase64, isEncoded: true };
    }
    throw new Error("Unreachable");
  }
  static isError(contentDataOrError) {
    return "error" in contentDataOrError;
  }
  /** @returns `value` if the passed `ContentDataOrError` is an error, or the text content otherwise */
  static textOr(contentDataOrError, value) {
    if (_ContentData.isError(contentDataOrError)) {
      return value;
    }
    return contentDataOrError.text;
  }
  /** @returns an empty 'text/plain' content data if the passed `ContentDataOrError` is an error, or the content data itself otherwise */
  static contentDataOrEmpty(contentDataOrError) {
    if (_ContentData.isError(contentDataOrError)) {
      return EMPTY_TEXT_CONTENT_DATA;
    }
    return contentDataOrError;
  }
  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  static asDeferredContent(contentDataOrError) {
    if (_ContentData.isError(contentDataOrError)) {
      return { error: contentDataOrError.error, content: null, isEncoded: false };
    }
    return contentDataOrError.asDeferedContent();
  }
};
var EMPTY_TEXT_CONTENT_DATA = new ContentData(
  "",
  /* isBase64 */
  false,
  "text/plain"
);

// gen/front_end/models/text_utils/StaticContentProvider.js
var StaticContentProvider_exports = {};
__export(StaticContentProvider_exports, {
  StaticContentProvider: () => StaticContentProvider
});

// gen/front_end/models/text_utils/TextUtils.js
var TextUtils_exports = {};
__export(TextUtils_exports, {
  BalancedJSONTokenizer: () => BalancedJSONTokenizer,
  FilterParser: () => FilterParser,
  Utils: () => Utils,
  detectIndentation: () => detectIndentation,
  getOverlap: () => getOverlap,
  isMinified: () => isMinified,
  performSearchInContent: () => performSearchInContent,
  performSearchInContentData: () => performSearchInContentData,
  performSearchInSearchMatches: () => performSearchInSearchMatches
});
import * as Platform5 from "./../../core/platform/platform.js";
var KEY_VALUE_FILTER_REGEXP = /(?:^|\s)(\-)?([\w\-]+):([^\s]+)/;
var REGEXP_FILTER_REGEXP = /(?:^|\s)(\-)?\/([^\/\\]+(\\.[^\/]*)*)\//;
var TEXT_FILTER_REGEXP = /(?:^|\s)(\-)?([^\s]+)/;
var SPACE_CHAR_REGEXP = /\s/;
var Utils = {
  isSpaceChar: function(char) {
    return SPACE_CHAR_REGEXP.test(char);
  },
  lineIndent: function(line) {
    let indentation = 0;
    while (indentation < line.length && Utils.isSpaceChar(line.charAt(indentation))) {
      ++indentation;
    }
    return line.substr(0, indentation);
  },
  splitStringByRegexes(text, regexes) {
    const matches = [];
    const globalRegexes = [];
    for (let i = 0; i < regexes.length; i++) {
      const regex = regexes[i];
      if (!regex.global) {
        globalRegexes.push(new RegExp(regex.source, regex.flags ? regex.flags + "g" : "g"));
      } else {
        globalRegexes.push(regex);
      }
    }
    doSplit(text, 0, 0);
    return matches;
    function doSplit(text2, regexIndex, startIndex) {
      if (regexIndex >= globalRegexes.length) {
        matches.push({ value: text2, position: startIndex, regexIndex: -1, captureGroups: [] });
        return;
      }
      const regex = globalRegexes[regexIndex];
      let currentIndex = 0;
      let result;
      regex.lastIndex = 0;
      while ((result = regex.exec(text2)) !== null) {
        const stringBeforeMatch = text2.substring(currentIndex, result.index);
        if (stringBeforeMatch) {
          doSplit(stringBeforeMatch, regexIndex + 1, startIndex + currentIndex);
        }
        const match = result[0];
        matches.push({
          value: match,
          position: startIndex + result.index,
          regexIndex,
          captureGroups: result.slice(1)
        });
        currentIndex = result.index + match.length;
      }
      const stringAfterMatches = text2.substring(currentIndex);
      if (stringAfterMatches) {
        doSplit(stringAfterMatches, regexIndex + 1, startIndex + currentIndex);
      }
    }
  }
};
var FilterParser = class {
  keys;
  constructor(keys) {
    this.keys = keys;
  }
  static cloneFilter(filter) {
    return { key: filter.key, text: filter.text, regex: filter.regex, negative: filter.negative };
  }
  parse(query) {
    const splitFilters = Utils.splitStringByRegexes(query, [KEY_VALUE_FILTER_REGEXP, REGEXP_FILTER_REGEXP, TEXT_FILTER_REGEXP]);
    const parsedFilters = [];
    for (const { regexIndex, captureGroups } of splitFilters) {
      if (regexIndex === -1) {
        continue;
      }
      if (regexIndex === 0) {
        const startsWithMinus = captureGroups[0];
        const parsedKey = captureGroups[1];
        const parsedValue = captureGroups[2];
        if (this.keys.indexOf(parsedKey) !== -1) {
          parsedFilters.push({
            key: parsedKey,
            regex: void 0,
            text: parsedValue,
            negative: Boolean(startsWithMinus)
          });
        } else {
          parsedFilters.push({
            key: void 0,
            regex: void 0,
            text: `${parsedKey}:${parsedValue}`,
            negative: Boolean(startsWithMinus)
          });
        }
      } else if (regexIndex === 1) {
        const startsWithMinus = captureGroups[0];
        const parsedRegex = captureGroups[1];
        try {
          parsedFilters.push({
            key: void 0,
            regex: new RegExp(parsedRegex, "im"),
            text: void 0,
            negative: Boolean(startsWithMinus)
          });
        } catch {
          parsedFilters.push({
            key: void 0,
            regex: void 0,
            text: `/${parsedRegex}/`,
            negative: Boolean(startsWithMinus)
          });
        }
      } else if (regexIndex === 2) {
        const startsWithMinus = captureGroups[0];
        const parsedText = captureGroups[1];
        parsedFilters.push({
          key: void 0,
          regex: void 0,
          text: parsedText,
          negative: Boolean(startsWithMinus)
        });
      }
    }
    return parsedFilters;
  }
};
var BalancedJSONTokenizer = class {
  callback;
  index;
  balance;
  buffer;
  findMultiple;
  closingDoubleQuoteRegex;
  lastBalancedIndex;
  constructor(callback, findMultiple) {
    this.callback = callback;
    this.index = 0;
    this.balance = 0;
    this.buffer = "";
    this.findMultiple = findMultiple || false;
    this.closingDoubleQuoteRegex = /[^\\](?:\\\\)*"/g;
  }
  write(chunk) {
    this.buffer += chunk;
    const lastIndex = this.buffer.length;
    const buffer = this.buffer;
    let index;
    for (index = this.index; index < lastIndex; ++index) {
      const character = buffer[index];
      if (character === '"') {
        this.closingDoubleQuoteRegex.lastIndex = index;
        if (!this.closingDoubleQuoteRegex.test(buffer)) {
          break;
        }
        index = this.closingDoubleQuoteRegex.lastIndex - 1;
      } else if (character === "{") {
        ++this.balance;
      } else if (character === "}") {
        --this.balance;
        if (this.balance < 0) {
          this.reportBalanced();
          return false;
        }
        if (!this.balance) {
          this.lastBalancedIndex = index + 1;
          if (!this.findMultiple) {
            break;
          }
        }
      } else if (character === "]" && !this.balance) {
        this.reportBalanced();
        return false;
      }
    }
    this.index = index;
    this.reportBalanced();
    return true;
  }
  reportBalanced() {
    if (!this.lastBalancedIndex) {
      return;
    }
    this.callback(this.buffer.slice(0, this.lastBalancedIndex));
    this.buffer = this.buffer.slice(this.lastBalancedIndex);
    this.index -= this.lastBalancedIndex;
    this.lastBalancedIndex = 0;
  }
  remainder() {
    return this.buffer;
  }
};
var detectIndentation = function(lines) {
  const frequencies = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let tabs = 0, previous = 0;
  for (const line of lines) {
    let current = 0;
    if (line.length !== 0) {
      let char = line.charAt(0);
      if (char === "	") {
        tabs++;
        continue;
      }
      while (char === " ") {
        char = line.charAt(++current);
      }
    }
    if (current === line.length) {
      previous = 0;
      continue;
    }
    const delta = Math.abs(current - previous);
    if (delta < frequencies.length) {
      frequencies[delta] = frequencies[delta] + 1;
    }
    previous = current;
  }
  let mostFrequentDelta = 0, highestFrequency = 0;
  for (let delta = 1; delta < frequencies.length; ++delta) {
    const frequency = frequencies[delta];
    if (frequency > highestFrequency) {
      highestFrequency = frequency;
      mostFrequentDelta = delta;
    }
  }
  if (tabs > mostFrequentDelta) {
    return "	";
  }
  if (!mostFrequentDelta) {
    return null;
  }
  return " ".repeat(mostFrequentDelta);
};
var isMinified = function(text) {
  let lineCount = 0;
  for (let lastIndex = 0; lastIndex < text.length; ++lineCount) {
    let eolIndex = text.indexOf("\n", lastIndex);
    if (eolIndex < 0) {
      eolIndex = text.length;
    }
    lastIndex = eolIndex + 1;
  }
  return (text.length - lineCount) / lineCount >= 80;
};
var performSearchInContentData = function(contentData, query, caseSensitive, isRegex) {
  if (ContentData.isError(contentData) || !contentData.isTextContent) {
    return [];
  }
  return performSearchInContent(contentData.textObj, query, caseSensitive, isRegex);
};
var performSearchInContent = function(text, query, caseSensitive, isRegex) {
  const regex = Platform5.StringUtilities.createSearchRegex(query, caseSensitive, isRegex);
  const result = [];
  for (let i = 0; i < text.lineCount(); ++i) {
    const lineContent = text.lineAt(i);
    const matches = lineContent.matchAll(regex);
    for (const match of matches) {
      result.push(new SearchMatch(i, lineContent, match.index, match[0].length));
    }
  }
  return result;
};
var performSearchInSearchMatches = function(matches, query, caseSensitive, isRegex) {
  const regex = Platform5.StringUtilities.createSearchRegex(query, caseSensitive, isRegex);
  const result = [];
  for (const { lineNumber, lineContent } of matches) {
    const matches2 = lineContent.matchAll(regex);
    for (const match of matches2) {
      result.push(new SearchMatch(lineNumber, lineContent, match.index, match[0].length));
    }
  }
  return result;
};
var getOverlap = function(s1, s2) {
  const minLen = Math.min(s1.length, s2.length);
  for (let n = minLen; n > 0; n--) {
    const suffix = s1.slice(-n);
    const prefix = s2.substring(0, n);
    if (suffix === prefix) {
      return suffix;
    }
  }
  return null;
};

// gen/front_end/models/text_utils/StaticContentProvider.js
var StaticContentProvider = class _StaticContentProvider {
  #contentURL;
  #contentType;
  #lazyContent;
  constructor(contentURL, contentType, lazyContent) {
    this.#contentURL = contentURL;
    this.#contentType = contentType;
    this.#lazyContent = lazyContent;
  }
  static fromString(contentURL, contentType, content) {
    const lazyContent = () => Promise.resolve(new ContentData(
      content,
      /* isBase64 */
      false,
      contentType.canonicalMimeType()
    ));
    return new _StaticContentProvider(contentURL, contentType, lazyContent);
  }
  contentURL() {
    return this.#contentURL;
  }
  contentType() {
    return this.#contentType;
  }
  requestContentData() {
    return this.#lazyContent();
  }
  async searchInContent(query, caseSensitive, isRegex) {
    const contentData = await this.requestContentData();
    return performSearchInContentData(contentData, query, caseSensitive, isRegex);
  }
};

// gen/front_end/models/text_utils/StreamingContentData.js
var StreamingContentData_exports = {};
__export(StreamingContentData_exports, {
  StreamingContentData: () => StreamingContentData,
  asContentDataOrError: () => asContentDataOrError,
  isError: () => isError
});
import * as Common from "./../../core/common/common.js";
import * as Platform6 from "./../../core/platform/platform.js";
var StreamingContentData = class _StreamingContentData extends Common.ObjectWrapper.ObjectWrapper {
  mimeType;
  #charset;
  #disallowStreaming;
  #chunks = [];
  #contentData;
  constructor(mimeType, charset, initialContent) {
    super();
    this.mimeType = mimeType;
    this.#charset = charset;
    this.#disallowStreaming = Boolean(initialContent && !initialContent.createdFromBase64);
    this.#contentData = initialContent;
  }
  /**
   * Creates a new StreamingContentData with the given MIME type/charset.
   */
  static create(mimeType, charset) {
    return new _StreamingContentData(mimeType, charset);
  }
  /**
   * Creates a new StringContentData from an existing ContentData instance.
   *
   * Calling `addChunk` is on the resulting `StreamingContentData` is illegal if
   * `content` was not created from base64 data. The reason is that JavaScript TextEncoder
   * only supports UTF-8. We can't convert text with arbitrary encoding back to base64 for concatenation.
   */
  static from(content) {
    return new _StreamingContentData(content.mimeType, content.charset, content);
  }
  /** @returns true, if this `ContentData` was constructed from text content or the mime type indicates text that can be decoded */
  get isTextContent() {
    if (this.#contentData) {
      return this.#contentData.isTextContent;
    }
    return Platform6.MimeType.isTextType(this.mimeType);
  }
  /** @param chunk base64 encoded data */
  addChunk(chunk) {
    if (this.#disallowStreaming) {
      throw new Error("Cannot add base64 data to a text-only ContentData.");
    }
    this.#chunks.push(chunk);
    this.dispatchEventToListeners("ChunkAdded", { content: this, chunk });
  }
  /** @returns An immutable ContentData with all the bytes received so far */
  content() {
    if (this.#contentData && this.#chunks.length === 0) {
      return this.#contentData;
    }
    const initialBase64 = this.#contentData?.base64 ?? "";
    const base64Content = this.#chunks.reduce((acc, chunk) => Platform6.StringUtilities.concatBase64(acc, chunk), initialBase64);
    this.#contentData = new ContentData(
      base64Content,
      /* isBase64=*/
      true,
      this.mimeType,
      this.#charset
    );
    this.#chunks = [];
    return this.#contentData;
  }
};
var isError = function(contentDataOrError) {
  return "error" in contentDataOrError;
};
var asContentDataOrError = function(contentDataOrError) {
  if (isError(contentDataOrError)) {
    return contentDataOrError;
  }
  return contentDataOrError.content();
};

// gen/front_end/models/text_utils/WasmDisassembly.js
var WasmDisassembly_exports = {};
__export(WasmDisassembly_exports, {
  WasmDisassembly: () => WasmDisassembly
});
import * as Platform7 from "./../../core/platform/platform.js";
var WasmDisassembly = class extends ContentData {
  lines;
  #offsets;
  #functionBodyOffsets;
  // Wasm can be potentially very large, so we calculate `text' lazily.
  #cachedText;
  constructor(lines, offsets, functionBodyOffsets) {
    super(
      "",
      /* isBase64 */
      false,
      "text/x-wast",
      "utf-8"
    );
    if (lines.length !== offsets.length) {
      throw new Error("Lines and offsets don't match");
    }
    this.lines = lines;
    this.#offsets = offsets;
    this.#functionBodyOffsets = functionBodyOffsets;
  }
  get text() {
    if (typeof this.#cachedText === "undefined") {
      this.#cachedText = this.lines.join("\n");
    }
    return this.#cachedText;
  }
  get isEmpty() {
    return this.lines.length === 0 || this.lines.length === 1 && this.lines[0].length === 0;
  }
  get lineNumbers() {
    return this.#offsets.length;
  }
  bytecodeOffsetToLineNumber(bytecodeOffset) {
    return Platform7.ArrayUtilities.upperBound(this.#offsets, bytecodeOffset, Platform7.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
  }
  lineNumberToBytecodeOffset(lineNumber) {
    return this.#offsets[lineNumber];
  }
  /**
   * returns an iterable enumerating all the non-breakable line numbers in the disassembly
   */
  *nonBreakableLineNumbers() {
    let lineNumber = 0;
    let functionIndex = 0;
    while (lineNumber < this.lineNumbers) {
      if (functionIndex < this.#functionBodyOffsets.length) {
        const offset = this.lineNumberToBytecodeOffset(lineNumber);
        if (offset >= this.#functionBodyOffsets[functionIndex].start) {
          lineNumber = this.bytecodeOffsetToLineNumber(this.#functionBodyOffsets[functionIndex++].end) + 1;
          continue;
        }
      }
      yield lineNumber++;
    }
  }
  /**
   * @deprecated Used during migration from `DeferredContent` to `ContentData`.
   */
  asDeferedContent() {
    return { content: "", isEncoded: false, wasmDisassemblyInfo: this };
  }
};
export {
  CodeMirrorUtils_exports as CodeMirrorUtils,
  ContentData_exports as ContentData,
  ContentProvider_exports as ContentProvider,
  StaticContentProvider_exports as StaticContentProvider,
  StreamingContentData_exports as StreamingContentData,
  Text_exports as Text,
  TextCursor_exports as TextCursor,
  TextRange_exports as TextRange,
  TextUtils_exports as TextUtils,
  WasmDisassembly_exports as WasmDisassembly
};
//# sourceMappingURL=text_utils.js.map
