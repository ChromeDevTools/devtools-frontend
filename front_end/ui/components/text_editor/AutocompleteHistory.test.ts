// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import {
  createFakeSetting,
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';

import * as TextEditor from './text_editor.js';

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

  describe('edit preservation during navigation', () => {
    it('preserves edits made to history entries when navigating backward', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');
      history.pushHistoryItem('entry 3');

      // Navigate to entry 2
      history.previous('');  // now at entry 3
      history.previous('');  // now at entry 2

      // Edit entry 2 and navigate further back (passing edited text to previous)
      history.previous('entry 2 EDITED');  // now at entry 1

      // Navigate forward - should see the edit
      assert.strictEqual(history.next(), 'entry 2 EDITED');
    });

    it('preserves multiple edits at different history positions', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');
      history.pushHistoryItem('entry 3');

      // Edit entry 3 by passing edit when navigating away
      history.previous('entry 3 EDITED');  // save edit, now at entry 2

      // Edit entry 2 by passing edit when navigating away
      history.previous('entry 2 EDITED');  // save edit, now at entry 1

      // Navigate forward through edits
      assert.strictEqual(history.next(), 'entry 2 EDITED');
      assert.strictEqual(history.next(), 'entry 3 EDITED');
    });

    it('clears edits when a new command is committed', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      // Edit entry 2 by passing edit when navigating away
      history.previous('entry 2 EDITED');

      // Commit a new command
      history.pushHistoryItem('entry 3');

      // Navigate back - edit should be gone
      assert.strictEqual(history.previous(''), 'entry 3');
      assert.strictEqual(history.previous(''), 'entry 2');  // Original, not edited
    });

    it('preserves uncommitted input alongside history edits', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      // Start typing, then navigate back
      history.previous('my uncommitted input');  // now at entry 2

      // Edit entry 2 and go further back
      history.previous('entry 2 EDITED');  // now at entry 1

      // Navigate all the way forward
      assert.strictEqual(history.next(), 'entry 2 EDITED');
      assert.strictEqual(history.next(), 'my uncommitted input');
    });

    it('restores original if edit matches original', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      // Navigate to entry 2, "edit" it to same value
      history.previous('');
      history.previous('entry 2');  // edit back to original

      // Should still work
      assert.strictEqual(history.next(), 'entry 2');
    });

    it('restores original if text was emptied', () => {
      history.pushHistoryItem('entry 1');
      history.pushHistoryItem('entry 2');

      // Navigate to entry 2, edit it
      history.previous('');
      history.previous('entry 2 EDITED');  // now at entry 1 with edit saved

      // Verify edit is there
      assert.strictEqual(history.next(), 'entry 2 EDITED');

      // Now empty the text and navigate away
      history.previous('');  // empty text, navigate back to entry 1

      // Edit should be cleared, original restored
      assert.strictEqual(history.next(), 'entry 2');
    });
  });

});
