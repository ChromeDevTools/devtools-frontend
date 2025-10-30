// gen/front_end/third_party/source-map-scopes-codec/package/src/vlq.js
var BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
var BASE64_CODES = new Uint8Array(123);
for (let index = 0; index < BASE64_CHARS.length; ++index) {
  BASE64_CODES[BASE64_CHARS.charCodeAt(index)] = index;
}
var VLQ_BASE_SHIFT = 5;
var VLQ_BASE_MASK = (1 << 5) - 1;
var VLQ_CONTINUATION_MASK = 1 << 5;
function encodeSigned(n) {
  n = n >= 0 ? 2 * n : 1 - 2 * n;
  return encodeUnsigned(n);
}
function encodeUnsigned(n) {
  let result = "";
  while (true) {
    const digit = n & 31;
    n >>>= 5;
    if (n === 0) {
      result += BASE64_CHARS[digit];
      break;
    } else {
      result += BASE64_CHARS[32 + digit];
    }
  }
  return result;
}
var TokenIterator = class {
  #string;
  #position;
  constructor(string) {
    this.#string = string;
    this.#position = 0;
  }
  nextChar() {
    return this.#string.charAt(this.#position++);
  }
  /** Returns the unicode value of the next character and advances the iterator  */
  nextCharCode() {
    return this.#string.charCodeAt(this.#position++);
  }
  peek() {
    return this.#string.charAt(this.#position);
  }
  hasNext() {
    return this.#position < this.#string.length;
  }
  nextSignedVLQ() {
    let result = this.nextUnsignedVLQ();
    const negative = result & 1;
    result >>>= 1;
    return negative ? -result : result;
  }
  nextUnsignedVLQ() {
    let result = 0;
    let shift = 0;
    let digit = 0;
    do {
      const charCode = this.nextCharCode();
      digit = BASE64_CODES[charCode];
      result += (digit & VLQ_BASE_MASK) << shift;
      shift += VLQ_BASE_SHIFT;
    } while (digit & VLQ_CONTINUATION_MASK);
    return result;
  }
  currentChar() {
    return this.#string.charAt(this.#position - 1);
  }
};

// gen/front_end/third_party/source-map-scopes-codec/package/src/util.js
function comparePositions(a, b) {
  return a.line - b.line || a.column - b.column;
}

// gen/front_end/third_party/source-map-scopes-codec/package/src/encode/encoder.js
var DEFAULT_SCOPE_STATE = {
  line: 0,
  column: 0,
  name: 0,
  kind: 0,
  variable: 0
};
var DEFAULT_RANGE_STATE = {
  line: 0,
  column: 0,
  defScopeIdx: 0
};
var Encoder = class {
  #info;
  #names;
  // Hash map to resolve indices of strings in the "names" array. Otherwise we'd have
  // to use 'indexOf' for every name we want to encode.
  #namesToIndex = /* @__PURE__ */ new Map();
  #scopeState = { ...DEFAULT_SCOPE_STATE };
  #rangeState = { ...DEFAULT_RANGE_STATE };
  #encodedItems = [];
  #currentItem = "";
  #scopeToCount = /* @__PURE__ */ new Map();
  #scopeCounter = 0;
  constructor(info, names) {
    this.#info = info;
    this.#names = names;
    for (let i = 0; i < names.length; ++i) {
      this.#namesToIndex.set(names[i], i);
    }
  }
  encode() {
    this.#encodedItems = [];
    this.#info.scopes.forEach((scope) => {
      this.#scopeState.line = 0;
      this.#scopeState.column = 0;
      this.#encodeOriginalScope(scope);
    });
    this.#info.ranges.forEach((range) => {
      this.#encodeGeneratedRange(range);
    });
    return this.#encodedItems.join(",");
  }
  #encodeOriginalScope(scope) {
    if (scope === null) {
      this.#encodedItems.push("");
      return;
    }
    this.#encodeOriginalScopeStart(scope);
    this.#encodeOriginalScopeVariables(scope);
    scope.children.forEach((child) => this.#encodeOriginalScope(child));
    this.#encodeOriginalScopeEnd(scope);
  }
  #encodeOriginalScopeStart(scope) {
    const { line, column } = scope.start;
    this.#verifyPositionWithScopeState(line, column);
    let flags = 0;
    const encodedLine = line - this.#scopeState.line;
    const encodedColumn = encodedLine === 0 ? column - this.#scopeState.column : column;
    this.#scopeState.line = line;
    this.#scopeState.column = column;
    let encodedName;
    if (scope.name !== void 0) {
      flags |= 1;
      const nameIdx = this.#resolveNamesIdx(scope.name);
      encodedName = nameIdx - this.#scopeState.name;
      this.#scopeState.name = nameIdx;
    }
    let encodedKind;
    if (scope.kind !== void 0) {
      flags |= 2;
      const kindIdx = this.#resolveNamesIdx(scope.kind);
      encodedKind = kindIdx - this.#scopeState.kind;
      this.#scopeState.kind = kindIdx;
    }
    if (scope.isStackFrame)
      flags |= 4;
    this.#encodeTag(
      "B"
      /* EncodedTag.ORIGINAL_SCOPE_START */
    ).#encodeUnsigned(flags).#encodeUnsigned(encodedLine).#encodeUnsigned(encodedColumn);
    if (encodedName !== void 0)
      this.#encodeSigned(encodedName);
    if (encodedKind !== void 0)
      this.#encodeSigned(encodedKind);
    this.#finishItem();
    this.#scopeToCount.set(scope, this.#scopeCounter++);
  }
  #encodeOriginalScopeVariables(scope) {
    if (scope.variables.length === 0)
      return;
    this.#encodeTag(
      "D"
      /* EncodedTag.ORIGINAL_SCOPE_VARIABLES */
    );
    for (const variable of scope.variables) {
      const idx = this.#resolveNamesIdx(variable);
      this.#encodeSigned(idx - this.#scopeState.variable);
      this.#scopeState.variable = idx;
    }
    this.#finishItem();
  }
  #encodeOriginalScopeEnd(scope) {
    const { line, column } = scope.end;
    this.#verifyPositionWithScopeState(line, column);
    const encodedLine = line - this.#scopeState.line;
    const encodedColumn = encodedLine === 0 ? column - this.#scopeState.column : column;
    this.#scopeState.line = line;
    this.#scopeState.column = column;
    this.#encodeTag(
      "C"
      /* EncodedTag.ORIGINAL_SCOPE_END */
    ).#encodeUnsigned(encodedLine).#encodeUnsigned(encodedColumn).#finishItem();
  }
  #encodeGeneratedRange(range) {
    this.#encodeGeneratedRangeStart(range);
    this.#encodeGeneratedRangeBindings(range);
    this.#encodeGeneratedRangeSubRangeBindings(range);
    this.#encodeGeneratedRangeCallSite(range);
    range.children.forEach((child) => this.#encodeGeneratedRange(child));
    this.#encodeGeneratedRangeEnd(range);
  }
  #encodeGeneratedRangeStart(range) {
    const { line, column } = range.start;
    this.#verifyPositionWithRangeState(line, column);
    let flags = 0;
    const encodedLine = line - this.#rangeState.line;
    let encodedColumn = column - this.#rangeState.column;
    if (encodedLine > 0) {
      flags |= 1;
      encodedColumn = column;
    }
    this.#rangeState.line = line;
    this.#rangeState.column = column;
    let encodedDefinition;
    if (range.originalScope) {
      const definitionIdx = this.#scopeToCount.get(range.originalScope);
      if (definitionIdx === void 0) {
        throw new Error("Unknown OriginalScope for definition!");
      }
      flags |= 2;
      encodedDefinition = definitionIdx - this.#rangeState.defScopeIdx;
      this.#rangeState.defScopeIdx = definitionIdx;
    }
    if (range.isStackFrame)
      flags |= 4;
    if (range.isHidden)
      flags |= 8;
    this.#encodeTag(
      "E"
      /* EncodedTag.GENERATED_RANGE_START */
    ).#encodeUnsigned(flags);
    if (encodedLine > 0)
      this.#encodeUnsigned(encodedLine);
    this.#encodeUnsigned(encodedColumn);
    if (encodedDefinition !== void 0)
      this.#encodeSigned(encodedDefinition);
    this.#finishItem();
  }
  #encodeGeneratedRangeSubRangeBindings(range) {
    if (range.values.length === 0)
      return;
    for (let i = 0; i < range.values.length; ++i) {
      const value = range.values[i];
      if (!Array.isArray(value) || value.length <= 1) {
        continue;
      }
      this.#encodeTag(
        "H"
        /* EncodedTag.GENERATED_RANGE_SUBRANGE_BINDING */
      ).#encodeUnsigned(i);
      let lastLine = range.start.line;
      let lastColumn = range.start.column;
      for (let j = 1; j < value.length; ++j) {
        const subRange = value[j];
        const prevSubRange = value[j - 1];
        if (comparePositions(prevSubRange.to, subRange.from) !== 0) {
          throw new Error("Sub-range bindings must not have gaps");
        }
        const encodedLine = subRange.from.line - lastLine;
        const encodedColumn = encodedLine === 0 ? subRange.from.column - lastColumn : subRange.from.column;
        if (encodedLine < 0 || encodedColumn < 0) {
          throw new Error("Sub-range bindings must be sorted");
        }
        lastLine = subRange.from.line;
        lastColumn = subRange.from.column;
        const binding = subRange.value === void 0 ? 0 : this.#resolveNamesIdx(subRange.value) + 1;
        this.#encodeUnsigned(binding).#encodeUnsigned(encodedLine).#encodeUnsigned(encodedColumn);
      }
      this.#finishItem();
    }
  }
  #encodeGeneratedRangeBindings(range) {
    if (range.values.length === 0)
      return;
    if (!range.originalScope) {
      throw new Error("Range has binding expressions but no OriginalScope");
    } else if (range.originalScope.variables.length !== range.values.length) {
      throw new Error("Range's binding expressions don't match OriginalScopes' variables");
    }
    this.#encodeTag(
      "G"
      /* EncodedTag.GENERATED_RANGE_BINDINGS */
    );
    for (const val of range.values) {
      if (val === null || val === void 0) {
        this.#encodeUnsigned(0);
      } else if (typeof val === "string") {
        this.#encodeUnsigned(this.#resolveNamesIdx(val) + 1);
      } else {
        const initialValue = val[0];
        const binding = initialValue.value === void 0 ? 0 : this.#resolveNamesIdx(initialValue.value) + 1;
        this.#encodeUnsigned(binding);
      }
    }
    this.#finishItem();
  }
  #encodeGeneratedRangeCallSite(range) {
    if (!range.callSite)
      return;
    const { sourceIndex, line, column } = range.callSite;
    this.#encodeTag(
      "I"
      /* EncodedTag.GENERATED_RANGE_CALL_SITE */
    ).#encodeUnsigned(sourceIndex).#encodeUnsigned(line).#encodeUnsigned(column).#finishItem();
  }
  #encodeGeneratedRangeEnd(range) {
    const { line, column } = range.end;
    this.#verifyPositionWithRangeState(line, column);
    let flags = 0;
    const encodedLine = line - this.#rangeState.line;
    let encodedColumn = column - this.#rangeState.column;
    if (encodedLine > 0) {
      flags |= 1;
      encodedColumn = column;
    }
    this.#rangeState.line = line;
    this.#rangeState.column = column;
    this.#encodeTag(
      "F"
      /* EncodedTag.GENERATED_RANGE_END */
    );
    if (encodedLine > 0)
      this.#encodeUnsigned(encodedLine);
    this.#encodeUnsigned(encodedColumn).#finishItem();
  }
  #resolveNamesIdx(name) {
    const index = this.#namesToIndex.get(name);
    if (index !== void 0)
      return index;
    const addedIndex = this.#names.length;
    this.#names.push(name);
    this.#namesToIndex.set(name, addedIndex);
    return addedIndex;
  }
  #verifyPositionWithScopeState(line, column) {
    if (this.#scopeState.line > line || this.#scopeState.line === line && this.#scopeState.column > column) {
      throw new Error(`Attempting to encode scope item (${line}, ${column}) that precedes the last encoded scope item (${this.#scopeState.line}, ${this.#scopeState.column})`);
    }
  }
  #verifyPositionWithRangeState(line, column) {
    if (this.#rangeState.line > line || this.#rangeState.line === line && this.#rangeState.column > column) {
      throw new Error(`Attempting to encode range item that precedes the last encoded range item (${line}, ${column})`);
    }
  }
  #encodeTag(tag) {
    this.#currentItem += tag;
    return this;
  }
  #encodeSigned(n) {
    this.#currentItem += encodeSigned(n);
    return this;
  }
  #encodeUnsigned(n) {
    this.#currentItem += encodeUnsigned(n);
    return this;
  }
  #finishItem() {
    this.#encodedItems.push(this.#currentItem);
    this.#currentItem = "";
  }
};

// gen/front_end/third_party/source-map-scopes-codec/package/src/encode/encode.js
function encode(scopesInfo, inputSourceMap) {
  inputSourceMap ||= {
    version: 3,
    mappings: "",
    sources: new Array(scopesInfo.scopes.length).fill(null)
  };
  inputSourceMap.names ||= [];
  if (inputSourceMap.sources.length !== scopesInfo.scopes.length) {
    throw new Error(`SourceMapJson.sources.length must match ScopesInfo.scopes! ${inputSourceMap.sources.length} vs ${scopesInfo.scopes.length}`);
  }
  inputSourceMap.scopes = new Encoder(scopesInfo, inputSourceMap.names).encode();
  return inputSourceMap;
}

// gen/front_end/third_party/source-map-scopes-codec/package/src/decode/decode.js
var DEFAULT_DECODE_OPTIONS = {
  mode: 2,
  generatedOffset: { line: 0, column: 0 }
};
function decode(sourceMap, options = DEFAULT_DECODE_OPTIONS) {
  const opts = { ...DEFAULT_DECODE_OPTIONS, ...options };
  if ("sections" in sourceMap) {
    return decodeIndexMap(sourceMap, {
      ...opts,
      generatedOffset: { line: 0, column: 0 }
    });
  }
  return decodeMap(sourceMap, opts);
}
function decodeMap(sourceMap, options) {
  if (!sourceMap.scopes || !sourceMap.names)
    return { scopes: [], ranges: [] };
  return new Decoder(sourceMap.scopes, sourceMap.names, options).decode();
}
function decodeIndexMap(sourceMap, options) {
  const scopeInfo = { scopes: [], ranges: [] };
  for (const section of sourceMap.sections) {
    const { scopes, ranges } = decode(section.map, {
      ...options,
      generatedOffset: section.offset
    });
    for (const scope of scopes)
      scopeInfo.scopes.push(scope);
    for (const range of ranges)
      scopeInfo.ranges.push(range);
  }
  return scopeInfo;
}
var DEFAULT_SCOPE_STATE2 = {
  line: 0,
  column: 0,
  name: 0,
  kind: 0,
  variable: 0
};
var DEFAULT_RANGE_STATE2 = {
  line: 0,
  column: 0,
  defScopeIdx: 0
};
var Decoder = class {
  #encodedScopes;
  #names;
  #mode;
  #scopes = [];
  #ranges = [];
  #scopeState = { ...DEFAULT_SCOPE_STATE2 };
  #rangeState = { ...DEFAULT_RANGE_STATE2 };
  #scopeStack = [];
  #rangeStack = [];
  #flatOriginalScopes = [];
  #subRangeBindingsForRange = /* @__PURE__ */ new Map();
  constructor(scopes, names, options) {
    this.#encodedScopes = scopes;
    this.#names = names;
    this.#mode = options.mode;
    this.#rangeState.line = options.generatedOffset.line;
    this.#rangeState.column = options.generatedOffset.column;
  }
  decode() {
    const iter = new TokenIterator(this.#encodedScopes);
    while (iter.hasNext()) {
      if (iter.peek() === ",") {
        iter.nextChar();
        this.#scopes.push(null);
        continue;
      }
      const tag = iter.nextUnsignedVLQ();
      switch (tag) {
        case 1: {
          const item = {
            flags: iter.nextUnsignedVLQ(),
            line: iter.nextUnsignedVLQ(),
            column: iter.nextUnsignedVLQ()
          };
          if (item.flags & 1) {
            item.nameIdx = iter.nextSignedVLQ();
          }
          if (item.flags & 2) {
            item.kindIdx = iter.nextSignedVLQ();
          }
          this.#handleOriginalScopeStartItem(item);
          break;
        }
        case 3: {
          const variableIdxs = [];
          while (iter.hasNext() && iter.peek() !== ",") {
            variableIdxs.push(iter.nextSignedVLQ());
          }
          this.#handleOriginalScopeVariablesItem(variableIdxs);
          break;
        }
        case 2: {
          this.#handleOriginalScopeEndItem(iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ());
          break;
        }
        case 4: {
          const flags = iter.nextUnsignedVLQ();
          const line = flags & 1 ? iter.nextUnsignedVLQ() : void 0;
          const column = iter.nextUnsignedVLQ();
          const definitionIdx = flags & 2 ? iter.nextSignedVLQ() : void 0;
          this.#handleGeneratedRangeStartItem({
            flags,
            line,
            column,
            definitionIdx
          });
          break;
        }
        case 5: {
          const lineOrColumn = iter.nextUnsignedVLQ();
          const maybeColumn = iter.hasNext() && iter.peek() !== "," ? iter.nextUnsignedVLQ() : void 0;
          if (maybeColumn !== void 0) {
            this.#handleGeneratedRangeEndItem(lineOrColumn, maybeColumn);
          } else {
            this.#handleGeneratedRangeEndItem(0, lineOrColumn);
          }
          break;
        }
        case 6: {
          const valueIdxs = [];
          while (iter.hasNext() && iter.peek() !== ",") {
            valueIdxs.push(iter.nextUnsignedVLQ());
          }
          this.#handleGeneratedRangeBindingsItem(valueIdxs);
          break;
        }
        case 7: {
          const variableIndex = iter.nextUnsignedVLQ();
          const bindings = [];
          while (iter.hasNext() && iter.peek() !== ",") {
            bindings.push([
              iter.nextUnsignedVLQ(),
              iter.nextUnsignedVLQ(),
              iter.nextUnsignedVLQ()
            ]);
          }
          this.#recordGeneratedSubRangeBindingItem(variableIndex, bindings);
          break;
        }
        case 8: {
          this.#handleGeneratedRangeCallSite(iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ());
          break;
        }
      }
      while (iter.hasNext() && iter.peek() !== ",")
        iter.nextUnsignedVLQ();
      if (iter.hasNext())
        iter.nextChar();
    }
    if (iter.currentChar() === ",") {
      this.#scopes.push(null);
    }
    if (this.#scopeStack.length > 0) {
      this.#throwInStrictMode("Encountered ORIGINAL_SCOPE_START without matching END!");
    }
    if (this.#rangeStack.length > 0) {
      this.#throwInStrictMode("Encountered GENERATED_RANGE_START without matching END!");
    }
    const info = { scopes: this.#scopes, ranges: this.#ranges };
    this.#scopes = [];
    this.#ranges = [];
    this.#flatOriginalScopes = [];
    return info;
  }
  #throwInStrictMode(message) {
    if (this.#mode === 1)
      throw new Error(message);
  }
  #handleOriginalScopeStartItem(item) {
    this.#scopeState.line += item.line;
    if (item.line === 0) {
      this.#scopeState.column += item.column;
    } else {
      this.#scopeState.column = item.column;
    }
    const scope = {
      start: { line: this.#scopeState.line, column: this.#scopeState.column },
      end: { line: this.#scopeState.line, column: this.#scopeState.column },
      isStackFrame: false,
      variables: [],
      children: []
    };
    if (item.nameIdx !== void 0) {
      this.#scopeState.name += item.nameIdx;
      scope.name = this.#resolveName(this.#scopeState.name);
    }
    if (item.kindIdx !== void 0) {
      this.#scopeState.kind += item.kindIdx;
      scope.kind = this.#resolveName(this.#scopeState.kind);
    }
    scope.isStackFrame = Boolean(
      item.flags & 4
      /* OriginalScopeFlags.IS_STACK_FRAME */
    );
    this.#scopeStack.push(scope);
    this.#flatOriginalScopes.push(scope);
  }
  #handleOriginalScopeVariablesItem(variableIdxs) {
    const scope = this.#scopeStack.at(-1);
    if (!scope) {
      this.#throwInStrictMode("Encountered ORIGINAL_SCOPE_VARIABLES without surrounding ORIGINAL_SCOPE_START");
      return;
    }
    for (const variableIdx of variableIdxs) {
      this.#scopeState.variable += variableIdx;
      scope.variables.push(this.#resolveName(this.#scopeState.variable));
    }
  }
  #handleOriginalScopeEndItem(line, column) {
    this.#scopeState.line += line;
    if (line === 0) {
      this.#scopeState.column += column;
    } else {
      this.#scopeState.column = column;
    }
    const scope = this.#scopeStack.pop();
    if (!scope) {
      this.#throwInStrictMode("Encountered ORIGINAL_SCOPE_END without matching ORIGINAL_SCOPE_START!");
      return;
    }
    scope.end = {
      line: this.#scopeState.line,
      column: this.#scopeState.column
    };
    if (this.#scopeStack.length > 0) {
      const parent = this.#scopeStack.at(-1);
      scope.parent = parent;
      parent.children.push(scope);
    } else {
      this.#scopes.push(scope);
      this.#scopeState.line = 0;
      this.#scopeState.column = 0;
    }
  }
  #handleGeneratedRangeStartItem(item) {
    if (item.line !== void 0) {
      this.#rangeState.line += item.line;
      this.#rangeState.column = item.column;
    } else {
      this.#rangeState.column += item.column;
    }
    const range = {
      start: {
        line: this.#rangeState.line,
        column: this.#rangeState.column
      },
      end: {
        line: this.#rangeState.line,
        column: this.#rangeState.column
      },
      isStackFrame: Boolean(
        item.flags & 4
        /* GeneratedRangeFlags.IS_STACK_FRAME */
      ),
      isHidden: Boolean(
        item.flags & 8
        /* GeneratedRangeFlags.IS_HIDDEN */
      ),
      values: [],
      children: []
    };
    if (item.definitionIdx !== void 0) {
      this.#rangeState.defScopeIdx += item.definitionIdx;
      if (this.#rangeState.defScopeIdx < 0 || this.#rangeState.defScopeIdx >= this.#flatOriginalScopes.length) {
        this.#throwInStrictMode("Invalid definition scope index");
      } else {
        range.originalScope = this.#flatOriginalScopes[this.#rangeState.defScopeIdx];
      }
    }
    this.#rangeStack.push(range);
    this.#subRangeBindingsForRange.clear();
  }
  #handleGeneratedRangeBindingsItem(valueIdxs) {
    const range = this.#rangeStack.at(-1);
    if (!range) {
      this.#throwInStrictMode("Encountered GENERATED_RANGE_BINDINGS without surrounding GENERATED_RANGE_START");
      return;
    }
    for (const valueIdx of valueIdxs) {
      if (valueIdx === 0) {
        range.values.push(null);
      } else {
        range.values.push(this.#resolveName(valueIdx - 1));
      }
    }
  }
  #recordGeneratedSubRangeBindingItem(variableIndex, bindings) {
    if (this.#subRangeBindingsForRange.has(variableIndex)) {
      this.#throwInStrictMode("Encountered multiple GENERATED_RANGE_SUBRANGE_BINDING items for the same variable");
      return;
    }
    this.#subRangeBindingsForRange.set(variableIndex, bindings);
  }
  #handleGeneratedRangeCallSite(sourceIndex, line, column) {
    const range = this.#rangeStack.at(-1);
    if (!range) {
      this.#throwInStrictMode("Encountered GENERATED_RANGE_CALL_SITE without surrounding GENERATED_RANGE_START");
      return;
    }
    range.callSite = {
      sourceIndex,
      line,
      column
    };
  }
  #handleGeneratedRangeEndItem(line, column) {
    if (line !== 0) {
      this.#rangeState.line += line;
      this.#rangeState.column = column;
    } else {
      this.#rangeState.column += column;
    }
    const range = this.#rangeStack.pop();
    if (!range) {
      this.#throwInStrictMode("Encountered GENERATED_RANGE_END without matching GENERATED_RANGE_START!");
      return;
    }
    range.end = {
      line: this.#rangeState.line,
      column: this.#rangeState.column
    };
    this.#handleGeneratedRangeSubRangeBindings(range);
    if (this.#rangeStack.length > 0) {
      const parent = this.#rangeStack.at(-1);
      range.parent = parent;
      parent.children.push(range);
    } else {
      this.#ranges.push(range);
    }
  }
  #handleGeneratedRangeSubRangeBindings(range) {
    for (const [variableIndex, bindings] of this.#subRangeBindingsForRange) {
      const value = range.values[variableIndex];
      const subRanges = [];
      range.values[variableIndex] = subRanges;
      let lastLine = range.start.line;
      let lastColumn = range.start.column;
      subRanges.push({
        from: { line: lastLine, column: lastColumn },
        to: { line: 0, column: 0 },
        value
      });
      for (const [binding, line, column] of bindings) {
        lastLine += line;
        if (line === 0) {
          lastColumn += column;
        } else {
          lastColumn = column;
        }
        subRanges.push({
          from: { line: lastLine, column: lastColumn },
          to: { line: 0, column: 0 },
          // This will be fixed in the post-processing step.
          value: binding === 0 ? void 0 : this.#resolveName(binding - 1)
        });
      }
    }
    for (const value of range.values) {
      if (Array.isArray(value)) {
        const subRanges = value;
        for (let i = 0; i < subRanges.length - 1; ++i) {
          subRanges[i].to = subRanges[i + 1].from;
        }
        subRanges[subRanges.length - 1].to = range.end;
      }
    }
  }
  #resolveName(index) {
    if (index < 0 || index >= this.#names.length) {
      this.#throwInStrictMode("Illegal index into the 'names' array");
    }
    return this.#names[index] ?? "";
  }
};

// gen/front_end/third_party/source-map-scopes-codec/package/src/builder/builder.js
var ScopeInfoBuilder = class {
  #scopes = [];
  #ranges = [];
  #scopeStack = [];
  #rangeStack = [];
  #knownScopes = /* @__PURE__ */ new Set();
  #keyToScope = /* @__PURE__ */ new Map();
  #lastScope = null;
  addNullScope() {
    this.#scopes.push(null);
    return this;
  }
  startScope(line, column, options) {
    const scope = {
      start: { line, column },
      end: { line, column },
      variables: options?.variables?.slice(0) ?? [],
      children: [],
      isStackFrame: Boolean(options?.isStackFrame)
    };
    if (options?.name !== void 0)
      scope.name = options.name;
    if (options?.kind !== void 0)
      scope.kind = options.kind;
    if (this.#scopeStack.length > 0) {
      scope.parent = this.#scopeStack.at(-1);
    }
    this.#scopeStack.push(scope);
    this.#knownScopes.add(scope);
    if (options?.key !== void 0)
      this.#keyToScope.set(options.key, scope);
    return this;
  }
  setScopeName(name) {
    const scope = this.#scopeStack.at(-1);
    if (scope)
      scope.name = name;
    return this;
  }
  setScopeKind(kind) {
    const scope = this.#scopeStack.at(-1);
    if (scope)
      scope.kind = kind;
    return this;
  }
  setScopeStackFrame(isStackFrame) {
    const scope = this.#scopeStack.at(-1);
    if (scope)
      scope.isStackFrame = isStackFrame;
    return this;
  }
  setScopeVariables(variables) {
    const scope = this.#scopeStack.at(-1);
    if (scope)
      scope.variables = variables.slice(0);
    return this;
  }
  endScope(line, column) {
    const scope = this.#scopeStack.pop();
    if (!scope)
      return this;
    scope.end = { line, column };
    if (this.#scopeStack.length === 0) {
      this.#scopes.push(scope);
    } else {
      this.#scopeStack.at(-1).children.push(scope);
    }
    this.#lastScope = scope;
    return this;
  }
  /**
   * @returns The OriginalScope opened with the most recent `startScope` call, but not yet closed.
   */
  currentScope() {
    return this.#scopeStack.at(-1) ?? null;
  }
  /**
   * @returns The most recent OriginalScope closed with `endScope`.
   */
  lastScope() {
    return this.#lastScope;
  }
  /**
   * @param option The definition 'scope' of this range can either be the "OriginalScope" directly
   * (produced by this builder) or the scope's key set while building the scope.
   */
  startRange(line, column, options) {
    const range = {
      start: { line, column },
      end: { line, column },
      isStackFrame: Boolean(options?.isStackFrame),
      isHidden: Boolean(options?.isHidden),
      values: options?.values ?? [],
      children: []
    };
    if (this.#rangeStack.length > 0) {
      range.parent = this.#rangeStack.at(-1);
    }
    if (options?.scope !== void 0) {
      range.originalScope = options.scope;
    } else if (options?.scopeKey !== void 0) {
      range.originalScope = this.#keyToScope.get(options.scopeKey);
    }
    if (options?.callSite) {
      range.callSite = options.callSite;
    }
    this.#rangeStack.push(range);
    return this;
  }
  setRangeDefinitionScope(scope) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.originalScope = scope;
    return this;
  }
  setRangeDefinitionScopeKey(scopeKey) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.originalScope = this.#keyToScope.get(scopeKey);
    return this;
  }
  setRangeStackFrame(isStackFrame) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.isStackFrame = isStackFrame;
    return this;
  }
  setRangeHidden(isHidden) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.isHidden = isHidden;
    return this;
  }
  setRangeValues(values) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.values = values;
    return this;
  }
  setRangeCallSite(callSite) {
    const range = this.#rangeStack.at(-1);
    if (range)
      range.callSite = callSite;
    return this;
  }
  endRange(line, column) {
    const range = this.#rangeStack.pop();
    if (!range)
      return this;
    range.end = { line, column };
    if (this.#rangeStack.length === 0) {
      this.#ranges.push(range);
    } else {
      this.#rangeStack.at(-1).children.push(range);
    }
    return this;
  }
  build() {
    const info = { scopes: this.#scopes, ranges: this.#ranges };
    this.#scopes = [];
    this.#ranges = [];
    this.#knownScopes.clear();
    return info;
  }
  get scopeStack() {
    return this.#scopeStack;
  }
  get rangeStack() {
    return this.#rangeStack;
  }
  isKnownScope(scope) {
    return this.#knownScopes.has(scope);
  }
  isValidScopeKey(key) {
    return this.#keyToScope.has(key);
  }
  getScopeByValidKey(key) {
    return this.#keyToScope.get(key);
  }
};

// gen/front_end/third_party/source-map-scopes-codec/package/src/builder/safe_builder.js
var SafeScopeInfoBuilder = class extends ScopeInfoBuilder {
  addNullScope() {
    this.#verifyEmptyScopeStack("add null scope");
    this.#verifyEmptyRangeStack("add null scope");
    super.addNullScope();
    return this;
  }
  startScope(line, column, options) {
    this.#verifyEmptyRangeStack("start scope");
    const parent = this.scopeStack.at(-1);
    if (parent && comparePositions(parent.start, { line, column }) > 0) {
      throw new Error(`Scope start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`);
    }
    const precedingSibling = parent?.children.at(-1);
    if (precedingSibling && comparePositions(precedingSibling.end, { line, column }) > 0) {
      throw new Error(`Scope start (${line}, ${column}) must not precede preceding siblings' end (${precedingSibling.end.line, precedingSibling.end.column})`);
    }
    super.startScope(line, column, options);
    return this;
  }
  setScopeName(name) {
    this.#verifyScopePresent("setScopeName");
    this.#verifyEmptyRangeStack("setScopeName");
    super.setScopeName(name);
    return this;
  }
  setScopeKind(kind) {
    this.#verifyScopePresent("setScopeKind");
    this.#verifyEmptyRangeStack("setScopeKind");
    super.setScopeKind(kind);
    return this;
  }
  setScopeStackFrame(isStackFrame) {
    this.#verifyScopePresent("setScopeStackFrame");
    this.#verifyEmptyRangeStack("setScopeStackFrame");
    super.setScopeStackFrame(isStackFrame);
    return this;
  }
  setScopeVariables(variables) {
    this.#verifyScopePresent("setScopeVariables");
    this.#verifyEmptyRangeStack("setScopeVariables");
    super.setScopeVariables(variables);
    return this;
  }
  endScope(line, column) {
    this.#verifyEmptyRangeStack("end scope");
    if (this.scopeStack.length === 0) {
      throw new Error("No scope to end");
    }
    const scope = this.scopeStack.at(-1);
    if (comparePositions(scope.start, { line, column }) > 0) {
      throw new Error(`Scope end (${line}, ${column}) must not precede scope start (${scope.start.line}, ${scope.start.column})`);
    }
    super.endScope(line, column);
    return this;
  }
  startRange(line, column, options) {
    this.#verifyEmptyScopeStack("starRange");
    const parent = this.rangeStack.at(-1);
    if (parent && comparePositions(parent.start, { line, column }) > 0) {
      throw new Error(`Range start (${line}, ${column}) must not precede parent start (${parent.start.line}, ${parent.start.column})`);
    }
    const precedingSibling = parent?.children.at(-1);
    if (precedingSibling && comparePositions(precedingSibling.end, { line, column }) > 0) {
      throw new Error(`Range start (${line}, ${column}) must not precede preceding siblings' end (${precedingSibling.end.line, precedingSibling.end.column})`);
    }
    if (options?.scopeKey !== void 0 && !this.isValidScopeKey(options.scopeKey)) {
      throw new Error(`${options.scopeKey} does not reference a valid OriginalScope`);
    }
    if (options?.scope && !this.isKnownScope(options.scope)) {
      throw new Error("The provided definition scope was not produced by this builder!");
    }
    if (options?.values?.length && options?.scope === void 0 && options?.scopeKey === void 0) {
      throw new Error("Provided bindings without providing an OriginalScope");
    } else if (options?.values?.length && options?.scope && options.values.length !== options.scope.variables.length) {
      throw new Error("Provided bindings don't match up with OriginalScope.variables");
    } else if (options?.values?.length && options?.scopeKey !== void 0) {
      const scope = this.getScopeByValidKey(options.scopeKey);
      if (options.values.length !== scope.variables.length) {
        throw new Error("Provided bindings don't match up with OriginalScope.variables");
      }
    }
    super.startRange(line, column, options);
    return this;
  }
  setRangeDefinitionScope(scope) {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");
    if (!this.isKnownScope(scope)) {
      throw new Error("The provided definition scope was not produced by this builder!");
    }
    super.setRangeDefinitionScope(scope);
    return this;
  }
  setRangeDefinitionScopeKey(scopeKey) {
    this.#verifyEmptyScopeStack("setRangeDefinitionScope");
    this.#verifyRangePresent("setRangeDefinitionScope");
    if (!this.isValidScopeKey(scopeKey)) {
      throw new Error(`The provided scope key ${scopeKey} is not know nto the builder!`);
    }
    super.setRangeDefinitionScopeKey(scopeKey);
    return this;
  }
  setRangeStackFrame(isStackFrame) {
    this.#verifyEmptyScopeStack("setRangeStackFrame");
    this.#verifyRangePresent("setRangeStackFrame");
    super.setRangeStackFrame(isStackFrame);
    return this;
  }
  setRangeHidden(isHidden) {
    this.#verifyEmptyScopeStack("setRangeHidden");
    this.#verifyRangePresent("setRangeHidden");
    super.setRangeHidden(isHidden);
    return this;
  }
  setRangeValues(values) {
    this.#verifyEmptyScopeStack("setRangeValues");
    this.#verifyRangePresent("setRangeValues");
    const range = this.rangeStack.at(-1);
    if (!range.originalScope) {
      throw new Error("Setting an OriginalScope for a range is required before value bindings can be provided!");
    } else if (range.originalScope.variables.length !== values.length) {
      throw new Error("Provided bindings don't match up with OriginalScope.variables");
    }
    super.setRangeValues(values);
    return this;
  }
  setRangeCallSite(callSite) {
    this.#verifyEmptyScopeStack("setRangeCallSite");
    this.#verifyRangePresent("setRangeCallSite");
    super.setRangeCallSite(callSite);
    return this;
  }
  endRange(line, column) {
    this.#verifyEmptyScopeStack("endRange");
    if (this.rangeStack.length === 0) {
      throw new Error("No range to end");
    }
    const range = this.rangeStack.at(-1);
    if (comparePositions(range.start, { line, column }) > 0) {
      throw new Error(`Range end (${line}, ${column}) must not precede range start (${range.start.line}, ${range.start.column})`);
    }
    this.#verifyRangeValues(range, { line, column });
    super.endRange(line, column);
    return this;
  }
  build() {
    if (this.scopeStack.length > 0) {
      throw new Error("Can't build ScopeInfo while an OriginalScope is unclosed.");
    }
    this.#verifyEmptyRangeStack("build ScopeInfo");
    return super.build();
  }
  #verifyEmptyScopeStack(op) {
    if (this.scopeStack.length > 0) {
      throw new Error(`Can't ${op} while a OriginalScope is unclosed.`);
    }
  }
  #verifyEmptyRangeStack(op) {
    if (this.rangeStack.length > 0) {
      throw new Error(`Can't ${op} while a GeneratedRange is unclosed.`);
    }
  }
  #verifyScopePresent(op) {
    if (this.scopeStack.length === 0) {
      throw new Error(`Can't ${op} while no OriginalScope is on the stack.`);
    }
  }
  #verifyRangePresent(op) {
    if (this.rangeStack.length === 0) {
      throw new Error(`Can't ${op} while no GeneratedRange is on the stack.`);
    }
  }
  #verifyRangeValues(range, end) {
    for (const value of range.values) {
      if (!Array.isArray(value)) {
        continue;
      }
      const subRanges = value;
      if (subRanges.length === 0) {
        continue;
      }
      const first = subRanges.at(0);
      if (comparePositions(first.from, range.start) !== 0) {
        throw new Error(`Sub-range bindings must start at the generated range's start. Expected ${range.start.line}:${range.start.column}, but got ${first.from.line}:${first.from.column}`);
      }
      const last = subRanges.at(-1);
      if (comparePositions(last.to, end) !== 0) {
        throw new Error(`Sub-range bindings must end at the generated range's end. Expected ${end.line}:${end.column}, but got ${last.to.line}:${last.to.column}`);
      }
      for (let i = 0; i < subRanges.length; ++i) {
        const current = subRanges[i];
        if (comparePositions(current.from, current.to) >= 0) {
          throw new Error(`Sub-range binding 'from' (${current.from.line}:${current.from.column}) must precede 'to' (${current.to.line}:${current.to.column})`);
        }
        if (i > 0) {
          const prev = subRanges[i - 1];
          if (comparePositions(prev.to, current.from) !== 0) {
            throw new Error(`Sub-range bindings must be sorted and not overlap. Found gap between ${prev.to.line}:${prev.to.column} and ${current.from.line}:${current.from.column}`);
          }
        }
      }
    }
  }
};
export {
  SafeScopeInfoBuilder,
  ScopeInfoBuilder,
  decode,
  encode
};
//# sourceMappingURL=source-map-scopes-codec.js.map
