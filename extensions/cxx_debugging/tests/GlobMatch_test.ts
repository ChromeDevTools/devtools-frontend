// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {globMatch} from '../src/GlobMatch.js';

describe('globMatch', () => {
  it('correctly matches basename *-patterns', () => {
    expect(globMatch('*.txt', 'http://server/file.txt')).to.be.true;
    expect(globMatch('*.txt', 'http://server/file.bat')).to.be.false;
    expect(globMatch('file.*', 'http://server/file.txt')).to.be.true;
    expect(globMatch('file.*', 'http://server/file.bat')).to.be.true;
    expect(globMatch('file.*', 'http://server/foo.file.bat')).to.be.false;
    expect(globMatch('file.*', 'http://file.com/something.txt')).to.be.false;
  });

  it('correctly matches dot', () => {
    expect(globMatch('file.wasm', 'http://host/file.wasm')).to.be.true;
    expect(globMatch('file.wasm', 'http://host/fileDwasm')).to.be.false;
  });

  it('correctly matches plus', () => {
    expect(globMatch('f+.wasm', 'http://host/f+.wasm')).to.be.true;
    expect(globMatch('f+.wasm', 'http://host/fff.wasm')).to.be.false;
  });

  it('correctly matches dollar', () => {
    expect(globMatch('x$', 'http://host/x$')).to.be.true;
    expect(globMatch('x$', 'http://host/x')).to.be.false;
  });

  it('correctly matches full URLs', () => {
    expect(globMatch('http://localhost/path/to/folder/with/file.js', 'http://localhost/path/to/folder/with/file.js'))
        .to.be.true;
  });

  it('correctly matches *-patterns with slashes', () => {
    expect(globMatch('http://*/file.txt', 'http://server/foo.txt')).to.be.false;
    expect(globMatch('http://*/file.txt', 'http://server/file.txt')).to.be.true;
    expect(globMatch('https://*/*/bar.js', 'https://localhost/foo/bar.js')).to.be.true;
    expect(globMatch('https://*/*/bar.js', 'https://localhost/foo/baz/bar.js')).to.be.false;
  });

  it('correctly matches **-patterns', () => {
    expect(globMatch('**/file.txt', 'http://server/file.txt')).to.be.true;
    expect(globMatch('**/file.txt', 'http://server/folder/file.txt')).to.be.true;
    expect(globMatch('http://**/file.txt', 'http://server/file.txt')).to.be.true;
    expect(globMatch('http://**/file.txt', 'http://server/folder/file.txt')).to.be.true;
    expect(globMatch('http://host/**/file.txt', 'http://host/file.txt')).to.be.true;
  });

  it('matches case-insensitive', () => {
    expect(globMatch('FILE.TXT', 'http://server/file.txt')).to.be.true;
    expect(globMatch('FILE.TXT', 'http://server/FiLe.TxT')).to.be.true;
    expect(globMatch('file.txt', 'http://server/FiLe.TxT')).to.be.true;
    expect(globMatch('file.txt', 'http://server/FILE.TXT')).to.be.true;
  });
});
