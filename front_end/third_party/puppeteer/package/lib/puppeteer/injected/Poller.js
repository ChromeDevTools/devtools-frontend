/**
 * @license
 * Copyright 2022 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { assert } from '../util/assert.js';
import { Deferred } from '../util/Deferred.js';
const MUTATION_OBSERVER_OPTIONS = {
    childList: true,
    subtree: true,
    attributes: true,
};
function canHostShadowRoots(node) {
    return (node.nodeType === Node.ELEMENT_NODE ||
        node.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
}
/**
 * A shadow root has no parent, so the walk up continues through its host to
 * stay inside the tree the node was added to.
 */
function parentOf(node) {
    return node.parentNode ?? node.host ?? null;
}
function hasAncestorIn(node, nodes) {
    let current = node;
    let parent;
    while ((parent = parentOf(current))) {
        if (nodes.has(parent)) {
            return true;
        }
        current = parent;
    }
    return false;
}
/**
 * @internal
 */
export class MutationPoller {
    #fn;
    #root;
    #observer;
    #observedRoots = new WeakSet();
    #deferred;
    constructor(fn, root) {
        this.#fn = fn;
        this.#root = root;
    }
    async start() {
        const deferred = (this.#deferred = Deferred.create());
        const result = await this.#fn();
        if (result) {
            deferred.resolve(result);
            return;
        }
        this.#observedRoots = new WeakSet();
        this.#observer = new MutationObserver(async (mutations) => {
            this.#observeAddedShadowRoots(mutations);
            const result = await this.#fn();
            if (!result) {
                return;
            }
            deferred.resolve(result);
            await this.stop();
        });
        this.#observe(this.#root);
    }
    /**
     * A `subtree` observation does not cross shadow boundaries, so every shadow
     * root needs to be observed on its own.
     */
    #observe(root) {
        if (!this.#observer || this.#observedRoots.has(root)) {
            return;
        }
        this.#observedRoots.add(root);
        this.#observer.observe(root, MUTATION_OBSERVER_OPTIONS);
        this.#observeShadowRoots(root);
    }
    /**
     * A batch can report a subtree and nodes inside it, so the added nodes are
     * pruned to the top-most ones and each tree is walked once.
     */
    #observeAddedShadowRoots(mutations) {
        const addedNodes = new Set();
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (!canHostShadowRoots(node)) {
                    continue;
                }
                addedNodes.add(node);
            }
        }
        for (const node of addedNodes) {
            if (!hasAncestorIn(node, addedNodes)) {
                this.#observeShadowRoots(node);
            }
        }
    }
    /**
     * Attaching a shadow root does not emit a mutation, so shadow roots are
     * instead picked up from the trees they arrive in.
     */
    #observeShadowRoots(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        do {
            const { shadowRoot } = walker.currentNode;
            if (shadowRoot) {
                this.#observe(shadowRoot);
            }
        } while (walker.nextNode());
    }
    async stop() {
        assert(this.#deferred, 'Polling never started.');
        if (!this.#deferred.finished()) {
            this.#deferred.reject(new Error('Polling stopped'));
        }
        if (this.#observer) {
            this.#observer.disconnect();
            this.#observer = undefined;
        }
    }
    result() {
        assert(this.#deferred, 'Polling never started.');
        return this.#deferred.valueOrThrow();
    }
}
/**
 * @internal
 */
export class RAFPoller {
    #fn;
    #deferred;
    constructor(fn) {
        this.#fn = fn;
    }
    async start() {
        const deferred = (this.#deferred = Deferred.create());
        const result = await this.#fn();
        if (result) {
            deferred.resolve(result);
            return;
        }
        const poll = async () => {
            if (deferred.finished()) {
                return;
            }
            const result = await this.#fn();
            if (!result) {
                window.requestAnimationFrame(poll);
                return;
            }
            deferred.resolve(result);
            await this.stop();
        };
        window.requestAnimationFrame(poll);
    }
    async stop() {
        assert(this.#deferred, 'Polling never started.');
        if (!this.#deferred.finished()) {
            this.#deferred.reject(new Error('Polling stopped'));
        }
    }
    result() {
        assert(this.#deferred, 'Polling never started.');
        return this.#deferred.valueOrThrow();
    }
}
/**
 * @internal
 */
export class IntervalPoller {
    #fn;
    #ms;
    #interval;
    #deferred;
    constructor(fn, ms) {
        this.#fn = fn;
        this.#ms = ms;
    }
    async start() {
        const deferred = (this.#deferred = Deferred.create());
        const result = await this.#fn();
        if (result) {
            deferred.resolve(result);
            return;
        }
        this.#interval = setInterval(async () => {
            const result = await this.#fn();
            if (!result) {
                return;
            }
            deferred.resolve(result);
            await this.stop();
        }, this.#ms);
    }
    async stop() {
        assert(this.#deferred, 'Polling never started.');
        if (!this.#deferred.finished()) {
            this.#deferred.reject(new Error('Polling stopped'));
        }
        if (this.#interval) {
            clearInterval(this.#interval);
            this.#interval = undefined;
        }
    }
    result() {
        assert(this.#deferred, 'Polling never started.');
        return this.#deferred.valueOrThrow();
    }
}
//# sourceMappingURL=Poller.js.map