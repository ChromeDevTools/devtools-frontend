// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import * as Diff from './diff.js';

const {DiffWrapper, Operation} = Diff.Diff;

describe('DiffWrapper', () => {
  describe('charDiff', () => {
    it('diffs two strings character by character', () => {
      assert.deepEqual(DiffWrapper.charDiff('test this sentence.', 'test that sentence'), [
        [Operation.Equal, 'test th'],
        [Operation.Delete, 'is'],
        [Operation.Insert, 'at'],
        [Operation.Equal, ' sentence'],
        [Operation.Delete, '.'],
      ]);
    });
  });

  // Unlike charDiff(), lineDiff() returns plain objects keyed by 0 and 1.
  describe('lineDiff', () => {
    it('diffs a changed line', () => {
      assert.deepEqual(DiffWrapper.lineDiff(['test this sentence.'], ['test that sentence']), [
        {0: Operation.Delete, 1: ['test this sentence.']},
        {0: Operation.Insert, 1: ['test that sentence']},
      ]);
    });

    it('diffs a deleted line', () => {
      assert.deepEqual(DiffWrapper.lineDiff(['a', 'b', 'c'], ['a', 'c']), [
        {0: Operation.Equal, 1: ['a']},
        {0: Operation.Delete, 1: ['b']},
        {0: Operation.Equal, 1: ['c']},
      ]);
    });

    it('diffs swapped lines', () => {
      assert.deepEqual(DiffWrapper.lineDiff(['a', 'b', 'c'], ['b', 'a', 'c']), [
        {0: Operation.Delete, 1: ['a']},
        {0: Operation.Equal, 1: ['b']},
        {0: Operation.Insert, 1: ['a']},
        {0: Operation.Equal, 1: ['c']},
      ]);
    });

    it('diffs an inserted line', () => {
      assert.deepEqual(DiffWrapper.lineDiff(['a', 'c'], ['a', 'b', 'c']), [
        {0: Operation.Equal, 1: ['a']},
        {0: Operation.Insert, 1: ['b']},
        {0: Operation.Equal, 1: ['c']},
      ]);
    });

    it('diffs changed, deleted, and inserted lines in a block of code', () => {
      assert.deepEqual(
          DiffWrapper.lineDiff(
              [
                'for (var i = 0; i < 100; i++) {',
                '    willBeLeftAlone()',
                '    willBeDeleted();',
                '}',
                'for (var j = 0; j < 100; j++) {',
                '    console.log(\'something changed\');',
                '    willBeDeletedAgain();',
                '}',
              ],
              [
                'for (var i = 0; i < 100; i++) {',
                '    willBeLeftAlone();',
                '}',
                'insertThisLine();',
                'for (var j = 0; j < 100; j++) {',
                '    console.log(\'changed\');',
                '}',
              ]),
          [
            {0: Operation.Equal, 1: ['for (var i = 0; i < 100; i++) {']},
            {0: Operation.Delete, 1: ['    willBeLeftAlone()', '    willBeDeleted();']},
            {0: Operation.Insert, 1: ['    willBeLeftAlone();']},
            {0: Operation.Equal, 1: ['}']},
            {0: Operation.Insert, 1: ['insertThisLine();']},
            {0: Operation.Equal, 1: ['for (var j = 0; j < 100; j++) {']},
            {0: Operation.Delete, 1: ['    console.log(\'something changed\');', '    willBeDeletedAgain();']},
            {0: Operation.Insert, 1: ['    console.log(\'changed\');']},
            {0: Operation.Equal, 1: ['}']},
          ]);
    });
  });
});
