// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';

import {FragmentImpl} from './StackTraceImpl.js';
import {type RawFrame, Trie} from './Trie.js';

/**
 * The {@link StackTraceModel} is a thin wrapper around a fragment trie.
 *
 * We want to store stack trace fragments per target so a SDKModel is the natural choice.
 */
export class StackTraceModel extends SDK.SDKModel.SDKModel<unknown> {
  readonly #trie = new Trie();

  createFragment(frames: RawFrame[]): FragmentImpl {
    return FragmentImpl.getOrCreate(this.#trie.insert(frames));
  }
}

SDK.SDKModel.SDKModel.register(StackTraceModel, {capabilities: SDK.Target.Capability.NONE, autostart: false});
