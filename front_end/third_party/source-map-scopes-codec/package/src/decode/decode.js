// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import { TokenIterator } from "../vlq.js";
export const DEFAULT_DECODE_OPTIONS = {
    mode: 2 /* DecodeMode.LAX */,
    generatedOffset: { line: 0, column: 0 },
};
export function decode(sourceMap, options = DEFAULT_DECODE_OPTIONS) {
    const opts = { ...DEFAULT_DECODE_OPTIONS, ...options };
    if ("sections" in sourceMap) {
        return decodeIndexMap(sourceMap, {
            ...opts,
            generatedOffset: { line: 0, column: 0 },
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
            generatedOffset: section.offset,
        });
        for (const scope of scopes)
            scopeInfo.scopes.push(scope);
        for (const range of ranges)
            scopeInfo.ranges.push(range);
    }
    return scopeInfo;
}
const DEFAULT_SCOPE_STATE = {
    line: 0,
    column: 0,
    name: 0,
    kind: 0,
    variable: 0,
};
const DEFAULT_RANGE_STATE = {
    line: 0,
    column: 0,
    defScopeIdx: 0,
};
class Decoder {
    #encodedScopes;
    #names;
    #mode;
    #scopes = [];
    #ranges = [];
    #scopeState = { ...DEFAULT_SCOPE_STATE };
    #rangeState = { ...DEFAULT_RANGE_STATE };
    #scopeStack = [];
    #rangeStack = [];
    #flatOriginalScopes = [];
    #subRangeBindingsForRange = new Map();
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
                iter.nextChar(); // Consume ",".
                this.#scopes.push(null); // Add an EmptyItem;
                continue;
            }
            const tag = iter.nextUnsignedVLQ();
            switch (tag) {
                case 1 /* Tag.ORIGINAL_SCOPE_START */: {
                    const item = {
                        flags: iter.nextUnsignedVLQ(),
                        line: iter.nextUnsignedVLQ(),
                        column: iter.nextUnsignedVLQ(),
                    };
                    if (item.flags & 1 /* OriginalScopeFlags.HAS_NAME */) {
                        item.nameIdx = iter.nextSignedVLQ();
                    }
                    if (item.flags & 2 /* OriginalScopeFlags.HAS_KIND */) {
                        item.kindIdx = iter.nextSignedVLQ();
                    }
                    this.#handleOriginalScopeStartItem(item);
                    break;
                }
                case 3 /* Tag.ORIGINAL_SCOPE_VARIABLES */: {
                    const variableIdxs = [];
                    while (iter.hasNext() && iter.peek() !== ",") {
                        variableIdxs.push(iter.nextSignedVLQ());
                    }
                    this.#handleOriginalScopeVariablesItem(variableIdxs);
                    break;
                }
                case 2 /* Tag.ORIGINAL_SCOPE_END */: {
                    this.#handleOriginalScopeEndItem(iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ());
                    break;
                }
                case 4 /* Tag.GENERATED_RANGE_START */: {
                    const flags = iter.nextUnsignedVLQ();
                    const line = flags & 1 /* GeneratedRangeFlags.HAS_LINE */
                        ? iter.nextUnsignedVLQ()
                        : undefined;
                    const column = iter.nextUnsignedVLQ();
                    const definitionIdx = flags & 2 /* GeneratedRangeFlags.HAS_DEFINITION */
                        ? iter.nextSignedVLQ()
                        : undefined;
                    this.#handleGeneratedRangeStartItem({
                        flags,
                        line,
                        column,
                        definitionIdx,
                    });
                    break;
                }
                case 5 /* Tag.GENERATED_RANGE_END */: {
                    const lineOrColumn = iter.nextUnsignedVLQ();
                    const maybeColumn = iter.hasNext() && iter.peek() !== ","
                        ? iter.nextUnsignedVLQ()
                        : undefined;
                    if (maybeColumn !== undefined) {
                        this.#handleGeneratedRangeEndItem(lineOrColumn, maybeColumn);
                    }
                    else {
                        this.#handleGeneratedRangeEndItem(0, lineOrColumn);
                    }
                    break;
                }
                case 6 /* Tag.GENERATED_RANGE_BINDINGS */: {
                    const valueIdxs = [];
                    while (iter.hasNext() && iter.peek() !== ",") {
                        valueIdxs.push(iter.nextUnsignedVLQ());
                    }
                    this.#handleGeneratedRangeBindingsItem(valueIdxs);
                    break;
                }
                case 7 /* Tag.GENERATED_RANGE_SUBRANGE_BINDING */: {
                    const variableIndex = iter.nextUnsignedVLQ();
                    const bindings = [];
                    while (iter.hasNext() && iter.peek() !== ",") {
                        bindings.push([
                            iter.nextUnsignedVLQ(),
                            iter.nextUnsignedVLQ(),
                            iter.nextUnsignedVLQ(),
                        ]);
                    }
                    this.#recordGeneratedSubRangeBindingItem(variableIndex, bindings);
                    break;
                }
                case 8 /* Tag.GENERATED_RANGE_CALL_SITE */: {
                    this.#handleGeneratedRangeCallSite(iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ(), iter.nextUnsignedVLQ());
                    break;
                }
            }
            // Consume any trailing VLQ and the the ","
            while (iter.hasNext() && iter.peek() !== ",")
                iter.nextUnsignedVLQ();
            if (iter.hasNext())
                iter.nextChar();
        }
        if (iter.currentChar() === ",") {
            // Handle trailing EmptyItem.
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
        if (this.#mode === 1 /* DecodeMode.STRICT */)
            throw new Error(message);
    }
    #handleOriginalScopeStartItem(item) {
        this.#scopeState.line += item.line;
        if (item.line === 0) {
            this.#scopeState.column += item.column;
        }
        else {
            this.#scopeState.column = item.column;
        }
        const scope = {
            start: { line: this.#scopeState.line, column: this.#scopeState.column },
            end: { line: this.#scopeState.line, column: this.#scopeState.column },
            isStackFrame: false,
            variables: [],
            children: [],
        };
        if (item.nameIdx !== undefined) {
            this.#scopeState.name += item.nameIdx;
            scope.name = this.#resolveName(this.#scopeState.name);
        }
        if (item.kindIdx !== undefined) {
            this.#scopeState.kind += item.kindIdx;
            scope.kind = this.#resolveName(this.#scopeState.kind);
        }
        scope.isStackFrame = Boolean(item.flags & 4 /* OriginalScopeFlags.IS_STACK_FRAME */);
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
        }
        else {
            this.#scopeState.column = column;
        }
        const scope = this.#scopeStack.pop();
        if (!scope) {
            this.#throwInStrictMode("Encountered ORIGINAL_SCOPE_END without matching ORIGINAL_SCOPE_START!");
            return;
        }
        scope.end = {
            line: this.#scopeState.line,
            column: this.#scopeState.column,
        };
        if (this.#scopeStack.length > 0) {
            const parent = this.#scopeStack.at(-1);
            scope.parent = parent;
            parent.children.push(scope);
        }
        else {
            this.#scopes.push(scope);
            this.#scopeState.line = 0;
            this.#scopeState.column = 0;
        }
    }
    #handleGeneratedRangeStartItem(item) {
        if (item.line !== undefined) {
            this.#rangeState.line += item.line;
            this.#rangeState.column = item.column;
        }
        else {
            this.#rangeState.column += item.column;
        }
        const range = {
            start: {
                line: this.#rangeState.line,
                column: this.#rangeState.column,
            },
            end: {
                line: this.#rangeState.line,
                column: this.#rangeState.column,
            },
            isStackFrame: Boolean(item.flags & 4 /* GeneratedRangeFlags.IS_STACK_FRAME */),
            isHidden: Boolean(item.flags & 8 /* GeneratedRangeFlags.IS_HIDDEN */),
            values: [],
            children: [],
        };
        if (item.definitionIdx !== undefined) {
            this.#rangeState.defScopeIdx += item.definitionIdx;
            if (this.#rangeState.defScopeIdx < 0 ||
                this.#rangeState.defScopeIdx >= this.#flatOriginalScopes.length) {
                this.#throwInStrictMode("Invalid definition scope index");
            }
            else {
                range.originalScope =
                    this.#flatOriginalScopes[this.#rangeState.defScopeIdx];
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
            }
            else {
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
            column,
        };
    }
    #handleGeneratedRangeEndItem(line, column) {
        if (line !== 0) {
            this.#rangeState.line += line;
            this.#rangeState.column = column;
        }
        else {
            this.#rangeState.column += column;
        }
        const range = this.#rangeStack.pop();
        if (!range) {
            this.#throwInStrictMode("Encountered GENERATED_RANGE_END without matching GENERATED_RANGE_START!");
            return;
        }
        range.end = {
            line: this.#rangeState.line,
            column: this.#rangeState.column,
        };
        this.#handleGeneratedRangeSubRangeBindings(range);
        if (this.#rangeStack.length > 0) {
            const parent = this.#rangeStack.at(-1);
            range.parent = parent;
            parent.children.push(range);
        }
        else {
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
                value: value,
            });
            for (const [binding, line, column] of bindings) {
                lastLine += line;
                if (line === 0) {
                    lastColumn += column;
                }
                else {
                    lastColumn = column;
                }
                subRanges.push({
                    from: { line: lastLine, column: lastColumn },
                    to: { line: 0, column: 0 }, // This will be fixed in the post-processing step.
                    value: binding === 0 ? undefined : this.#resolveName(binding - 1),
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
}
//# sourceMappingURL=decode.js.map