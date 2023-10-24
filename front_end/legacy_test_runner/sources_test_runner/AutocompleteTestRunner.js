// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextUtils from '../../models/text_utils/text_utils.js';
import {TestRunner} from '../test_runner/test_runner.js';

import {dumpTextWithSelection} from './EditorTestRunner.js';

/**
 * @fileoverview using private properties isn't a Closure violation in tests.
 */

export const dumpSuggestions = function(textEditor, lines) {
  let resolve;
  const promise = new Promise(fulfill => {
    resolve = fulfill;
  });
  let lineNumber = -1;
  let columnNumber;

  for (let i = 0; i < lines.length; ++i) {
    columnNumber = lines[i].indexOf('|');

    if (columnNumber !== -1) {
      lineNumber = i;
      break;
    }
  }

  if (lineNumber === -1) {
    throw new Error('Test case is invalid: cursor position is not marked with \'|\' symbol.');
  }

  textEditor.setText(lines.join('\n').replace('|', ''));
  textEditor.setSelection(TextUtils.TextRange.TextRange.createFromLocation(lineNumber, columnNumber));
  TestRunner.addSniffer(
      TextEditor.TextEditorAutocompleteController.prototype, 'onSuggestionsShownForTest', suggestionsShown);
  textEditor.autocompleteController.autocomplete();

  function suggestionsShown(words) {
    TestRunner.addResult('========= Selection In Editor =========');
    dumpTextWithSelection(textEditor);
    TestRunner.addResult('======= Autocomplete Suggestions =======');
    TestRunner.addResult('[' + words.map(item => item.text).join(', ') + ']');
    resolve();
  }

  return promise;
};
