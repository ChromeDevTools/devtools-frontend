// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../formatter/formatter.js';

type ScopeTreeNode = Formatter.FormatterWorkerPool.ScopeTreeNode;

/**
 * Caches scope trees for whole scripts.
 *
 * We use `SDK.Script` as a key to uniquely identify scripts.
 * `SDK.Script` boils down to "target" + "script ID". This duplicates work in case of
 * identitical script running on multiple targets (e.g. workers).
 */
export class ScopeTreeCache {
  /** If a script failed to parse, we stash null in order to prevent unnecessary re-parsing */
  #scopeTrees = new WeakMap<SDK.Script.Script, ScopeTreeNode|null>();
  #pendingScopeTrees = new Map<SDK.Script.Script, Promise<ScopeTreeNode|null>>();

  static #instance?: ScopeTreeCache;

  static instance(): ScopeTreeCache {
    if (!ScopeTreeCache.#instance) {
      ScopeTreeCache.#instance = new ScopeTreeCache();
    }
    return ScopeTreeCache.#instance;
  }

  async scopeTreeForScript(script: SDK.Script.Script): Promise<ScopeTreeNode|null> {
    const maybeCachedTree = this.#scopeTrees.get(script);
    if (maybeCachedTree !== undefined) {
      // We intentionally return `null` here if the script already failed to parse once.
      return maybeCachedTree;
    }

    const {content} = await script.requestContent();
    if (content === null) {
      return null;
    }

    // We check for pending requests for this script AFTER we load the script content.
    // There must not be any suspension point between checking #pendingScopeTrees and
    // the actual call to the worker.
    // This is fine, since #requestContent does similar request de-duplication.
    const maybePromise = this.#pendingScopeTrees.get(script);
    if (maybePromise) {
      return maybePromise;
    }

    const sourceType = script.isModule ? 'module' : 'script';
    const scopeTreePromise =
        Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptScopeTree(content, sourceType);
    this.#pendingScopeTrees.set(script, scopeTreePromise);
    const scopeTree = await scopeTreePromise;
    this.#pendingScopeTrees.delete(script);
    this.#scopeTrees.set(script, scopeTree);
    return scopeTree;
  }
}
