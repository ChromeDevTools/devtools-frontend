// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {globMatch} from '../src/GlobMatch.js';

describe('globMatch', () => {
  it('correctly matches basename *-patterns', () => {
    assert.isTrue(globMatch('*.txt', 'http://server/file.txt'));
    assert.isFalse(globMatch('*.txt', 'http://server/file.bat'));
    assert.isTrue(globMatch('file.*', 'http://server/file.txt'));
    assert.isTrue(globMatch('file.*', 'http://server/file.bat'));
    assert.isFalse(globMatch('file.*', 'http://server/foo.file.bat'));
    assert.isFalse(globMatch('file.*', 'http://file.com/something.txt'));
  });

  it('correctly matches dot', () => {
    assert.isTrue(globMatch('file.wasm', 'http://host/file.wasm'));
    assert.isFalse(globMatch('file.wasm', 'http://host/fileDwasm'));
  });

  it('correctly matches plus', () => {
    assert.isTrue(globMatch('f+.wasm', 'http://host/f+.wasm'));
    assert.isFalse(globMatch('f+.wasm', 'http://host/fff.wasm'));
  });

  it('correctly matches dollar', () => {
    assert.isTrue(globMatch('x$', 'http://host/x$'));
    assert.isFalse(globMatch('x$', 'http://host/x'));
  });

  it('correctly matches full URLs', () => {
    assert.isTrue(
        globMatch('http://localhost/path/to/folder/with/file.js', 'http://localhost/path/to/folder/with/file.js'));
  });

  it('correctly matches *-patterns with slashes', () => {
    assert.isFalse(globMatch('http://*/file.txt', 'http://server/foo.txt'));
    assert.isTrue(globMatch('http://*/file.txt', 'http://server/file.txt'));
    assert.isTrue(globMatch('https://*/*/bar.js', 'https://localhost/foo/bar.js'));
    assert.isFalse(globMatch('https://*/*/bar.js', 'https://localhost/foo/baz/bar.js'));
  });

  it('correctly matches **-patterns', () => {
    assert.isTrue(globMatch('**/file.txt', 'http://server/file.txt'));
    assert.isTrue(globMatch('**/file.txt', 'http://server/folder/file.txt'));
    assert.isTrue(globMatch('http://**/file.txt', 'http://server/file.txt'));
    assert.isTrue(globMatch('http://**/file.txt', 'http://server/folder/file.txt'));
    assert.isTrue(globMatch('http://host/**/file.txt', 'http://host/file.txt'));
  });

  it('matches case-insensitive', () => {
    assert.isTrue(globMatch('FILE.TXT', 'http://server/file.txt'));
    assert.isTrue(globMatch('FILE.TXT', 'http://server/FiLe.TxT'));
    assert.isTrue(globMatch('file.txt', 'http://server/FiLe.TxT'));
    assert.isTrue(globMatch('file.txt', 'http://server/FILE.TXT'));
  });
});
