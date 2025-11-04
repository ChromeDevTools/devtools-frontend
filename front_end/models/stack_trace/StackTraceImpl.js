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
        syncFragment.stackTraces.add(this);
        this.asyncFragments.forEach(asyncFragment => asyncFragment.fragment.stackTraces.add(this));
    }
}
export class FragmentImpl {
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
    constructor(url, uiSourceCode, name, line, column, missingDebugInfo) {
        this.url = url;
        this.uiSourceCode = uiSourceCode;
        this.name = name;
        this.line = line;
        this.column = column;
        this.missingDebugInfo = missingDebugInfo;
    }
}
//# sourceMappingURL=StackTraceImpl.js.map