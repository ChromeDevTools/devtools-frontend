// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {isNotFoundError} from '../../utils/error.ts';

describe('error', () => {
  describe('isNotFoundError', () => {
    it('returns true for ENOENT and ENOTDIR errors', () => {
      const enoent: NodeJS.ErrnoException = new Error('no such file or directory');
      enoent.code = 'ENOENT';
      assert.isTrue(isNotFoundError(enoent));

      const enotdir: NodeJS.ErrnoException = new Error('not a directory');
      enotdir.code = 'ENOTDIR';
      assert.isTrue(isNotFoundError(enotdir));
    });

    it('returns false for EMFILE and other errors', () => {
      const emfile: NodeJS.ErrnoException = new Error('too many open files');
      emfile.code = 'EMFILE';
      assert.isFalse(isNotFoundError(emfile));

      assert.isFalse(isNotFoundError(new Error('generic error')));
      assert.isFalse(isNotFoundError(null));
      assert.isFalse(isNotFoundError(undefined));
    });
  });
});
