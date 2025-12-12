// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var _a;
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
// eslint-disable-next-line @devtools/es-modules-import
import * as StackTrace from './stack_trace.js';
import { AsyncFragmentImpl, DebuggableFragmentImpl, FragmentImpl, FrameImpl, StackTraceImpl } from './StackTraceImpl.js';
import { Trie } from './Trie.js';
/**
 * The {@link StackTraceModel} is a thin wrapper around a fragment trie.
 *
 * We want to store stack trace fragments per target so a SDKModel is the natural choice.
 */
export class StackTraceModel extends SDK.SDKModel.SDKModel {
    #trie = new Trie();
    #mutex = new Common.Mutex.Mutex();
    /** @returns the {@link StackTraceModel} for the target, or the model for the primaryPageTarget when passing null/undefined */
    static #modelForTarget(target) {
        const model = (target ?? SDK.TargetManager.TargetManager.instance().primaryPageTarget())?.model(_a);
        if (!model) {
            throw new Error('Unable to find StackTraceModel');
        }
        return model;
    }
    async createFromProtocolRuntime(stackTrace, rawFramesToUIFrames) {
        const [syncFragment, asyncFragments] = await Promise.all([
            this.#createFragment(stackTrace.callFrames, rawFramesToUIFrames),
            this.#createAsyncFragments(stackTrace, rawFramesToUIFrames),
        ]);
        return new StackTraceImpl(syncFragment, asyncFragments);
    }
    async createFromDebuggerPaused(pausedDetails, rawFramesToUIFrames) {
        const [syncFragment, asyncFragments] = await Promise.all([
            this.#createDebuggableFragment(pausedDetails, rawFramesToUIFrames),
            this.#createAsyncFragments(pausedDetails, rawFramesToUIFrames),
        ]);
        return new StackTraceImpl(syncFragment, asyncFragments);
    }
    /** Trigger re-translation of all fragments with the provide script in their call stack */
    async scriptInfoChanged(script, translateRawFrames) {
        const release = await this.#mutex.acquire();
        try {
            const translatePromises = [];
            let stackTracesToUpdate = new Set();
            for (const fragment of this.#affectedFragments(script)) {
                // We trigger re-translation only for fragments of leaf-nodes. Any fragment along the ancestor-chain
                // is re-translated as a side-effect.
                // We just need to remember the stack traces of the skipped over fragments, so we can send the
                // UPDATED event also to them.
                if (fragment.node.children.length === 0) {
                    translatePromises.push(this.#translateFragment(fragment, translateRawFrames));
                }
                stackTracesToUpdate = stackTracesToUpdate.union(fragment.stackTraces);
            }
            await Promise.all(translatePromises);
            for (const stackTrace of stackTracesToUpdate) {
                stackTrace.dispatchEventToListeners("UPDATED" /* StackTrace.StackTrace.Events.UPDATED */);
            }
        }
        finally {
            release();
        }
    }
    async #createDebuggableFragment(pausedDetails, rawFramesToUIFrames) {
        const fragment = await this.#createFragment(pausedDetails.callFrames.map(frame => ({
            scriptId: frame.script.scriptId,
            url: frame.script.sourceURL,
            functionName: frame.functionName,
            lineNumber: frame.location().lineNumber,
            columnNumber: frame.location().columnNumber,
        })), rawFramesToUIFrames);
        return new DebuggableFragmentImpl(fragment, pausedDetails.callFrames);
    }
    async #createAsyncFragments(stackTraceOrPausedEvent, rawFramesToUIFrames) {
        const asyncFragments = [];
        const debuggerModel = this.target().model(SDK.DebuggerModel.DebuggerModel);
        if (debuggerModel) {
            for await (const { stackTrace: asyncStackTrace, target } of debuggerModel.iterateAsyncParents(stackTraceOrPausedEvent)) {
                if (asyncStackTrace.callFrames.length === 0) {
                    // Skip empty async fragments, they don't add value.
                    continue;
                }
                const model = _a.#modelForTarget(target);
                const asyncFragmentPromise = model.#createFragment(asyncStackTrace.callFrames, rawFramesToUIFrames)
                    .then(fragment => new AsyncFragmentImpl(asyncStackTrace.description ?? '', fragment));
                asyncFragments.push(asyncFragmentPromise);
            }
        }
        return await Promise.all(asyncFragments);
    }
    async #createFragment(frames, rawFramesToUIFrames) {
        const release = await this.#mutex.acquire();
        try {
            const node = this.#trie.insert(frames);
            const requiresTranslation = !Boolean(node.fragment);
            const fragment = FragmentImpl.getOrCreate(node);
            if (requiresTranslation) {
                await this.#translateFragment(fragment, rawFramesToUIFrames);
            }
            return fragment;
        }
        finally {
            release();
        }
    }
    async #translateFragment(fragment, rawFramesToUIFrames) {
        const rawFrames = fragment.node.getCallStack().map(node => node.rawFrame).toArray();
        const uiFrames = await rawFramesToUIFrames(rawFrames, this.target());
        console.assert(rawFrames.length === uiFrames.length, 'Broken rawFramesToUIFrames implementation');
        let i = 0;
        for (const node of fragment.node.getCallStack()) {
            node.frames = uiFrames[i++].map(frame => new FrameImpl(frame.url, frame.uiSourceCode, frame.name, frame.line, frame.column, frame.missingDebugInfo));
        }
    }
    #affectedFragments(script) {
        // 1. Collect branches with the matching script.
        const affectedBranches = new Set();
        this.#trie.walk(null, node => {
            // scriptId has precedence, but if the frame does not have one, check the URL.
            if (node.rawFrame.scriptId === script.scriptId ||
                (!node.rawFrame.scriptId && node.rawFrame.url === script.sourceURL)) {
                affectedBranches.add(node);
                return false;
            }
            return true;
        });
        // 2. For each branch collect all the fragments.
        const fragments = new Set();
        for (const branch of affectedBranches) {
            this.#trie.walk(branch, node => {
                if (node.fragment) {
                    fragments.add(node.fragment);
                }
                return true;
            });
        }
        return fragments;
    }
}
_a = StackTraceModel;
SDK.SDKModel.SDKModel.register(StackTraceModel, { capabilities: 0 /* SDK.Target.Capability.NONE */, autostart: false });
//# sourceMappingURL=StackTraceModel.js.map