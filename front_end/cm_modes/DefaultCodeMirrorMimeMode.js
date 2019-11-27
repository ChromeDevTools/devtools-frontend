// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {TextEditor.CodeMirrorMimeMode}
 */
export class DefaultCodeMirrorMimeMode {
  /**
   * @param {!Root.Runtime.Extension} extension
   * @return {!Promise}
   * @override
   */
  async install(extension) {
    const modeFileName = extension.descriptor()['fileName'];

    return /** @type {!Promise} */ (eval(`import('./${modeFileName}')`));
  }
}

CmModes.DefaultCodeMirrorMimeMode = DefaultCodeMirrorMimeMode;
