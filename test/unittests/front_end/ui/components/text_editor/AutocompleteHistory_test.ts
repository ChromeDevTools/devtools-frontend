// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as TextEditor from '../../../../../../front_end/ui/components/text_editor/text_editor.js';
import {describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('AutocompleteHistory', () => {
  let history: TextEditor.AutocompleteHistory.AutocompleteHistory;

  beforeEach(() => {
    history = new TextEditor.AutocompleteHistory.AutocompleteHistory();
  });

  describe('pushHistoryItem', () => {
    it('resets the history navigation back to the beginning', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');
      history.previous('');
      history.previous('');

      // Even though the user navigated back in the history, they can still commit a different text
      history.pushHistoryItem('entry 3');

      assert.isUndefined(history.next());
      assert.strictEqual(history.previous(''), 'entry 3');
    });
  });

  describe('previous', () => {
    it('returns "undefined" for an empty history', () => {
      assert.isUndefined(history.previous(''));
    });

    it('moves backwards through history', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      assert.strictEqual(history.previous(''), 'entry 2');
      assert.strictEqual(history.previous(''), 'entry 1');
      assert.isUndefined(history.previous(''));
    });
  });

  describe('next', () => {
    it('returns "undefined" for an empty history', () => {
      assert.isUndefined(history.next());
    });

    it('returns "undefined" when not navigating through the history', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      assert.isUndefined(history.next());
    });

    it('moves forwards through history', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');
      history.previous('');
      history.previous('');
      history.previous('');

      assert.strictEqual(history.next(), 'entry 1');
      assert.strictEqual(history.next(), 'entry 2');
    });
  });

  it('stores the "temporary input" on the first "previous" call with a non-empty history', () => {
    history.pushHistoryItem('entry 1');
    history.pushHistoryItem('entry 2');

    assert.strictEqual(history.previous('incomplete user inp'), 'entry 2');

    assert.strictEqual(history.next(), 'incomplete user inp');
  });
});
