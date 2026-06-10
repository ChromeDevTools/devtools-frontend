// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {findModuleConfiguration, resolveSourcePathToURL} from '../src/ModuleConfiguration.js';

describe('findModuleConfiguration', () => {
  const CONFIGA = {name: 'projectA.wasm', pathSubstitutions: []};
  const CONFIGB = {name: 'projectB.wasm', pathSubstitutions: []};
  const DEFAULT = {pathSubstitutions: [{from: '/foo', to: '/bar'}]};
  const URLA = new URL('http://localhost/projectA.wasm');
  const URLB = new URL('file:/C:/Users/Admin/Projects/projectB.wasm');
  const URLC = new URL('https://web.dev/projectC.wasm');

  it('correctly yields named configuration', () => {
    assert.strictEqual(findModuleConfiguration([CONFIGA], URLA), CONFIGA);
    assert.strictEqual(findModuleConfiguration([CONFIGA, CONFIGB], URLA), CONFIGA);
    assert.strictEqual(findModuleConfiguration([CONFIGB, CONFIGA], URLA), CONFIGA);
    assert.strictEqual(findModuleConfiguration([DEFAULT, CONFIGB, CONFIGA], URLB), CONFIGB);
    assert.strictEqual(findModuleConfiguration([CONFIGB, CONFIGA, DEFAULT], URLB), CONFIGB);
  });

  it('correctly yields default configuration', () => {
    assert.deepEqual(findModuleConfiguration([CONFIGA], URLB), {pathSubstitutions: []});
    assert.deepEqual(findModuleConfiguration([CONFIGA, CONFIGB], URLC), {pathSubstitutions: []});
    assert.deepEqual(findModuleConfiguration([CONFIGB, CONFIGA], URLC), {pathSubstitutions: []});
    assert.strictEqual(findModuleConfiguration([DEFAULT, CONFIGB, CONFIGA], URLC), DEFAULT);
    assert.strictEqual(findModuleConfiguration([CONFIGB, CONFIGA, DEFAULT], URLC), DEFAULT);
  });

  it('correctly matches basename *-patterns', () => {
    const STAR_WASM = {name: '*.wasm', pathSubstitutions: []};
    const PROJECTA_STAR = {name: 'projectA.*', pathSubstitutions: []};
    const PROJECT_STAR_WASM = {name: 'project*.wasm', pathSubstitutions: []};
    assert.strictEqual(findModuleConfiguration([PROJECTA_STAR], URLA), PROJECTA_STAR);
    assert.strictEqual(findModuleConfiguration([STAR_WASM, PROJECTA_STAR], URLA), STAR_WASM);
    assert.strictEqual(findModuleConfiguration([STAR_WASM, PROJECTA_STAR], new URL('http://example.com/projectA.foo')),
                       PROJECTA_STAR);
    assert.strictEqual(findModuleConfiguration([PROJECT_STAR_WASM], URLA), PROJECT_STAR_WASM);
    assert.strictEqual(findModuleConfiguration([PROJECT_STAR_WASM], URLB), PROJECT_STAR_WASM);
  });

  it('corectly matches **-patterns', () => {
    const PROJECT = {name: 'http://localhost/**/*.wasm', pathSubstitutions: []};
    assert.strictEqual(findModuleConfiguration([PROJECT], new URL('http://localhost/file.wasm')), PROJECT);
  });
});

describe('resolveSourcePathToURL', () => {
  it('correctly resolves absolute paths', () => {
    const BASE_URL = new URL('http://localhost/file.wasm');
    assert.strictEqual(resolveSourcePathToURL([], '/', BASE_URL).href, 'file:///');
    assert.strictEqual(resolveSourcePathToURL([], '/usr/local', BASE_URL).href, 'file:///usr/local');
    assert.strictEqual(resolveSourcePathToURL([], '/Users/Administrator', BASE_URL).href,
                       'file:///Users/Administrator');
    assert.strictEqual(resolveSourcePathToURL([], 'A:/', BASE_URL).href, 'file:///A:/');
    assert.strictEqual(resolveSourcePathToURL([], 'c:\\', BASE_URL).href, 'file:///c:/');
    assert.strictEqual(resolveSourcePathToURL([], 'c:\\Users\\Clippy\\Source', BASE_URL).href,
                       'file:///c:/Users/Clippy/Source');
    assert.strictEqual(resolveSourcePathToURL([], '\\\\network\\Server\\Source', BASE_URL).href,
                       'file://network/Server/Source');
  });

  it('correctly resolves relative paths', () => {
    assert.strictEqual(resolveSourcePathToURL([], 'stdint.h', new URL('http://localhost/file.wasm')).href,
                       'http://localhost/stdint.h');
    assert.strictEqual(
        resolveSourcePathToURL([], 'emscripten/include/iostream', new URL('http://localhost/dist/module.wasm')).href,
        'http://localhost/dist/emscripten/include/iostream');
    assert.strictEqual(resolveSourcePathToURL([], './src/main.cc', new URL('https://www.example.com/fast.wasm')).href,
                       'https://www.example.com/src/main.cc');
    assert.strictEqual(
        resolveSourcePathToURL([], '.\\Mein Projekt\\Datei.cpp', new URL('https://www.example.com/fast.wasm')).href,
        'https://www.example.com/Mein%20Projekt/Datei.cpp');
  });

  it('correctly applies source path substitutions', () => {
    const BASE_URL = new URL('http://localhost/file.wasm');
    assert.strictEqual(
        resolveSourcePathToURL([{from: '/usr/src', to: '/mnt/src'}], '/usr/include/stdio.h', BASE_URL).href,
        'file:///usr/include/stdio.h');
    assert.strictEqual(
        resolveSourcePathToURL([{from: '/usr/src', to: '/mnt/src'}], '/usr/src/include/stdio.h', BASE_URL).href,
        'file:///mnt/src/include/stdio.h');
    assert.strictEqual(resolveSourcePathToURL([{from: '/usr/src', to: '/mnt/src'}, {from: '/mnt/src', to: '/foo'}],
                                              '/usr/src/include/stdio.h', BASE_URL)
                           .href,
                       'file:///mnt/src/include/stdio.h');
    assert.strictEqual(
        resolveSourcePathToURL([{from: '/usr/src/include', to: '/mnt/include'}, {from: '/usr/src', to: '/mnt/src'}],
                               '/usr/src/include/stdio.h', BASE_URL)
            .href,
        'file:///mnt/include/stdio.h');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/srv/central/src'}], './include/string', BASE_URL).href,
                       'file:///srv/central/src/include/string');
  });

  it('correctly resolves the sidecar Wasm module path', () => {
    // We use resolveSourcePathToURL() with an empty source
    // map to locate the debugging sidecar Wasm module.
    assert.strictEqual(
        resolveSourcePathToURL([], 'file.wasm.debug.wasm', new URL('http://localhost:8000/wasm/file.wasm')).href,
        'http://localhost:8000/wasm/file.wasm.debug.wasm');
    assert.strictEqual(
        resolveSourcePathToURL([], '/usr/local/file.wasm.debug.wasm', new URL('http://localhost:8000/wasm/file.wasm'))
            .href,
        'file:///usr/local/file.wasm.debug.wasm');
    assert.strictEqual(resolveSourcePathToURL([], 'f:\\netdrive\\file.wasm.debug.wasm',
                                              new URL('http://localhost:8000/wasm/file.wasm'))
                           .href,
                       'file:///f:/netdrive/file.wasm.debug.wasm');
  });

  it('correctly deals with dot patterns', () => {
    // Test that we match LLDB's behavior as implemented for `settings set target.source-map`:
    // http://cs/github/llvm/llvm-project/lldb/source/Target/PathMappingList.cpp?l=157-185
    const BASE_URL = new URL('http://web.dev/file.wasm');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/foo/bar'}], 'include/header.h', BASE_URL).href,
                       'file:///foo/bar/include/header.h');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: 'c:\\foo\\bar'}], 'include/header.h', BASE_URL).href,
                       'file:///c:/foo/bar/include/header.h');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/foo'}], '/mnt/main.c', BASE_URL).href,
                       'file:///mnt/main.c');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: 'c:\\foo'}], '/mnt/main.c', BASE_URL).href,
                       'file:///mnt/main.c');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/foo'}], 'c:\\mnt\\main.c', BASE_URL).href,
                       'file:///c:/mnt/main.c');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: 'c:\\foo'}], 'c:\\mnt\\main.c', BASE_URL).href,
                       'file:///c:/mnt/main.c');
  });

  it('correctly deals with dot patterns when the source path is a URL', () => {
    const BASE_URL = new URL('http://web.dev/file.wasm');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'file:///main.cpp', BASE_URL).href,
                       'file:///main.cpp');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'http://localhost/main.cpp', BASE_URL).href,
                       'http://localhost/main.cpp');
    assert.strictEqual(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'https://localhost/main.cpp', BASE_URL).href,
                       'https://localhost/main.cpp');
  });
});
