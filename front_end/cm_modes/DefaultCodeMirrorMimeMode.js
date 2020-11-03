// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../root/root.js';                      // eslint-disable-line no-unused-vars
import * as TextEditor from '../text_editor/text_editor.js';  // eslint-disable-line no-unused-vars

/**
 * @implements {TextEditor.CodeMirrorTextEditor.CodeMirrorMimeMode}
 */
export class DefaultCodeMirrorMimeMode {
  /**
   * @param {!Root.Runtime.Extension} extension
   * @return {!Promise<void>}
   * @override
   */
  async install(extension) {
    return Promise.resolve();
  }
}

self.CmModes = self.CmModes || {DefaultCodeMirrorMimeMode};
CmModes = CmModes || {DefaultCodeMirrorMimeMode};

CmModes.DefaultCodeMirrorMimeMode = DefaultCodeMirrorMimeMode;
