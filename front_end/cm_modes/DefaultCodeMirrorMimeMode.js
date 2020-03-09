// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

CmModes.DefaultCodeMirrorMimeMode = DefaultCodeMirrorMimeMode;
