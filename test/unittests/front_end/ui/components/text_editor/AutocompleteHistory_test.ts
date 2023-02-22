// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../../../../front_end/core/common/common.js';
import * as TextEditor from '../../../../../../front_end/ui/components/text_editor/text_editor.js';

import {createFakeSetting, describeWithEnvironment} from '../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

describeWithEnvironment('AutocompleteHistory', () => {
  let setting: Common.Settings.Setting<string[]>;
  let history: TextEditor.AutocompleteHistory.AutocompleteHistory;

  beforeEach(() => {
    setting = createFakeSetting('history', []);
    history = new TextEditor.AutocompleteHistory.AutocompleteHistory(setting);
  });

  describe('pushHistoryItem', () => {
    it('stores the commited text in the setting', () => {
      history.pushHistoryItem('sample input');

      assert.deepEqual(setting.get(), ['sample input']);
    });

    it('ignores sub-sequent identical inputs', () => {
      history.pushHistoryItem('entry x');
      history.pushHistoryItem('entry x');

      assert.deepEqual(setting.get(), ['entry x']);
    });

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

  it('does not write the temporary user input to the setting', () => {
    history.pushHistoryItem('entry 1');
    assert.strictEqual(history.previous('incomplete user inp'), 'entry 1');

    assert.deepEqual(setting.get(), ['entry 1']);
  });

  describe('matchingEntries', () => {
    it('returns the appropriate matches', () => {
      history.pushHistoryItem('x === 5');
      history.pushHistoryItem('y < 42');
      history.pushHistoryItem('x > 20');

      const matches = history.matchingEntries('x ');

      assert.deepEqual([...matches], ['x > 20', 'x === 5']);
    });

    it('respects the "limit" argument', () => {
      for (let i = 0; i < 20; ++i) {
        history.pushHistoryItem(`x === ${i}`);
      }

      const matches = history.matchingEntries('x ', 3);

      assert.deepEqual([...matches], ['x === 19', 'x === 18', 'x === 17']);
    });
  });
});
