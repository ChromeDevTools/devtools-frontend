// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as TextEditor from '../text_editor/text_editor.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {TextEditor.CodeMirrorTextEditor.CodeMirrorMimeMode}
 */
export class DefaultCodeMirrorMimeMode {
  /**
   * @param {!Root.Runtime.Extension} extension
   * @return {!Promise}
   * @override
   */
  async install(extension) {
    return Promise.resolve();
  }
}

self.CmModes = self.CmModes || {};
CmModes = CmModes || {};

CmModes.DefaultCodeMirrorMimeMode = DefaultCodeMirrorMimeMode;
