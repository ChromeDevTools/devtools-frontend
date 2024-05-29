// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as SDK from '../../core/sdk/sdk.js';
import * as Formatter from '../formatter/formatter.js';
import * as TextUtils from '../text_utils/text_utils.js';

type ScopeTreeNode = Formatter.FormatterWorkerPool.ScopeTreeNode;

/** If a script failed to parse, we stash null in order to prevent unnecessary re-parsing */
const scopeTrees = new WeakMap<SDK.Script.Script, Promise<ScopeTreeNode|null>>();

/**
 * Computes and caches the scope tree for `script`.
 *
 * We use {@link SDK.Script.Script} as a key to uniquely identify scripts.
 * {@link SDK.Script.Script} boils down to "target" + "script ID". This
 * duplicates work in case of identitical script running on multiple targets
 * (e.g. workers).
 */
export function scopeTreeForScript(script: SDK.Script.Script): Promise<ScopeTreeNode|null> {
  let promise = scopeTrees.get(script);
  if (promise === undefined) {
    promise = script.requestContentData().then(content => {
      if (TextUtils.ContentData.ContentData.isError(content)) {
        return null;
      }

      const sourceType = script.isModule ? 'module' : 'script';
      return Formatter.FormatterWorkerPool.formatterWorkerPool().javaScriptScopeTree(content.text, sourceType);
    });
    scopeTrees.set(script, promise);
  }
  // We intentionally return `null` here if the script already failed to parse once.
  return promise;
}
