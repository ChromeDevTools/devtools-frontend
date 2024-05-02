// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const replaceInSource = function(sourceFrame, string, replacement) {
  sourceFrame.textEditor.setReadOnly(false);

  for (let i = 0; i < sourceFrame.textEditor.linesCount; ++i) {
    const line = sourceFrame.textEditor.line(i);
    const column = line.indexOf(string);

    if (column === -1) {
      continue;
    }

    const range = new TextUtils.TextRange.TextRange(i, column, i, column + string.length);
    sourceFrame.textEditor.editRange(range, replacement);
    break;
  }
};

export const commitSource = function(sourceFrame) {
  sourceFrame.commitEditing();
};

export const undoSourceEditing = function(sourceFrame) {
  sourceFrame.textEditor.undo();
};
