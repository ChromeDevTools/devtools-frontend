// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export class StackTraceImpl extends Common.ObjectWrapper.ObjectWrapper {
    syncFragment;
    asyncFragments;
    constructor(syncFragment, asyncFragments) {
        super();
        this.syncFragment = syncFragment;
        this.asyncFragments = asyncFragments;
        const fragment = (syncFragment instanceof DebuggableFragmentImpl || syncFragment instanceof ParsedErrorStackFragmentImpl) ?
            syncFragment.fragment :
            syncFragment;
        fragment.stackTraces.add(this);
        this.asyncFragments.forEach(asyncFragment => asyncFragment.fragment.stackTraces.add(this));
    }
}
export class FragmentImpl {
    static EMPTY_FRAGMENT = new FragmentImpl();
    node;
    stackTraces = new Set();
    /**
     * Fragments are deduplicated based on the node.
     *
     * In turn, each fragment can be part of multiple stack traces.
     */
    static getOrCreate(node) {
        if (!node.fragment) {
            node.fragment = new FragmentImpl(node);
        }
        return node.fragment;
    }
    constructor(node) {
        this.node = node;
    }
    get frames() {
        if (!this.node) {
            return [];
        }
        const frames = [];
        for (const node of this.node.getCallStack()) {
            frames.push(...node.frames);
        }
        return frames;
    }
}
export class AsyncFragmentImpl {
    description;
    fragment;
    constructor(description, fragment) {
        this.description = description;
        this.fragment = fragment;
    }
    get frames() {
        return this.fragment.frames;
    }
}
export class FrameImpl {
    url;
    uiSourceCode;
    name;
    line;
    column;
    missingDebugInfo;
    rawName;
    isWasm;
    isInline;
    constructor(url, uiSourceCode, name, line, column, missingDebugInfo, rawName, isWasm, isInline) {
        this.url = url;
        this.uiSourceCode = uiSourceCode;
        this.name = name;
        this.line = line;
        this.column = column;
        this.missingDebugInfo = missingDebugInfo;
        this.rawName = rawName;
        this.isWasm = isWasm;
        this.isInline = isInline;
    }
}
/**
 * Converts the internal recursive `EvalOrigin` trie representation into the public-facing
 * linear `ParsedErrorStackFrameImpl` representation.
 *
 * NOTE: The V8 Error#stack format only allows serializing a single location descriptor
 * per nested eval origin level (e.g. `eval at functionName (location)`). Therefore, the
 * public-facing API only surfaces the top-most logical frame (`evalOrigin.frames[0]`) at each
 * eval level. Any other inlined caller frames at that specific level are technically dropped
 * in the public API, but they are fully preserved in the internal trie representation for
 * debugging, navigation, and ignore list correlation.
 */
function createParsedErrorStackFrameImplFromEvalOrigin(evalOrigin, parsedFrameInfo) {
    if (!evalOrigin || evalOrigin.frames.length === 0) {
        return undefined;
    }
    const frame = evalOrigin.frames[0];
    const nestedOrigin = createParsedErrorStackFrameImplFromEvalOrigin(evalOrigin.evalOrigin, parsedFrameInfo?.evalOrigin?.parsedFrameInfo);
    return new ParsedErrorStackFrameImpl(frame, parsedFrameInfo?.evalOrigin?.parsedFrameInfo, nestedOrigin);
}
export class ParsedErrorStackFragmentImpl {
    fragment;
    constructor(fragment) {
        this.fragment = fragment;
    }
    get frames() {
        if (!this.fragment.node) {
            return [];
        }
        const frames = [];
        for (const node of this.fragment.node.getCallStack()) {
            const evalOrigin = createParsedErrorStackFrameImplFromEvalOrigin(node.evalOrigin, node.parsedFrameInfo);
            for (const frame of node.frames) {
                frames.push(new ParsedErrorStackFrameImpl(frame, node.parsedFrameInfo, evalOrigin));
            }
        }
        return frames;
    }
}
export class ParsedErrorStackFrameImpl {
    #frame;
    #parsedFrameInfo;
    #evalOrigin;
    constructor(frame, parsedFrameInfo, evalOrigin) {
        this.#frame = frame;
        this.#parsedFrameInfo = parsedFrameInfo;
        this.#evalOrigin = evalOrigin;
    }
    get url() {
        return this.#frame.url;
    }
    get uiSourceCode() {
        return this.#frame.uiSourceCode;
    }
    get name() {
        return this.#frame.name;
    }
    get line() {
        return this.#frame.line;
    }
    get column() {
        return this.#frame.column;
    }
    get missingDebugInfo() {
        return this.#frame.missingDebugInfo;
    }
    get rawName() {
        return this.#frame.rawName;
    }
    get isAsync() {
        return this.#parsedFrameInfo?.isAsync;
    }
    get isConstructor() {
        return this.#parsedFrameInfo?.isConstructor;
    }
    get isEval() {
        return this.#parsedFrameInfo?.isEval;
    }
    get evalOrigin() {
        return this.#evalOrigin;
    }
    get isWasm() {
        return this.#frame.isWasm;
    }
    get isInline() {
        return this.#frame.isInline;
    }
    get wasmModuleName() {
        return this.#parsedFrameInfo?.wasmModuleName;
    }
    get wasmFunctionIndex() {
        return this.#parsedFrameInfo?.wasmFunctionIndex;
    }
    get typeName() {
        return this.#parsedFrameInfo?.typeName;
    }
    get methodName() {
        return this.#parsedFrameInfo?.methodName;
    }
    get promiseIndex() {
        return this.#parsedFrameInfo?.promiseIndex;
    }
}
/**
 * A DebuggableFragmentImpl wraps an existing FragmentImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FragmentImpl will stay the same.
 */
export class DebuggableFragmentImpl {
    fragment;
    callFrames;
    constructor(fragment, callFrames) {
        this.fragment = fragment;
        this.callFrames = callFrames;
    }
    get frames() {
        if (!this.fragment.node) {
            return [];
        }
        const frames = [];
        let index = 0;
        for (const node of this.fragment.node.getCallStack()) {
            for (const [inlineIdx, frame] of node.frames.entries()) {
                // Create virtual frames for inlined frames.
                const sdkFrame = inlineIdx === 0 ? this.callFrames[index] :
                    this.callFrames[index].createVirtualCallFrame(inlineIdx, frame.name ?? '');
                frames.push(new DebuggableFrameImpl(frame, sdkFrame));
            }
            index++;
        }
        return frames;
    }
}
/**
 * A DebuggableFrameImpl wraps an existing FrameImpl. This is important: We can pause at the
 * same location multiple times and the paused information changes each and everytime while the underlying
 * FrameImpl will stay the same.
 */
export class DebuggableFrameImpl {
    #frame;
    #sdkFrame;
    constructor(frame, sdkFrame) {
        this.#frame = frame;
        this.#sdkFrame = sdkFrame;
    }
    get url() {
        return this.#frame.url;
    }
    get uiSourceCode() {
        return this.#frame.uiSourceCode;
    }
    get name() {
        return this.#frame.name;
    }
    get line() {
        return this.#frame.line;
    }
    get column() {
        return this.#frame.column;
    }
    get missingDebugInfo() {
        return this.#frame.missingDebugInfo;
    }
    get rawName() {
        return this.#frame.rawName;
    }
    get isWasm() {
        return this.#frame.isWasm;
    }
    get isInline() {
        return this.#frame.isInline;
    }
    get sdkFrame() {
        return this.#sdkFrame;
    }
}
//# sourceMappingURL=StackTraceImpl.js.map