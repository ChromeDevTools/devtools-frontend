// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {findModuleConfiguration, resolveSourcePathToURL} from '../src/ModuleConfiguration.js';

describe('findModuleConfiguration', () => {
  const CONFIGA = {name: 'projectA.wasm', pathSubstitutions: []};
  const CONFIGB = {name: 'projectB.wasm', pathSubstitutions: []};
  const DEFAULT = {pathSubstitutions: [{from: '/foo', to: '/bar'}]};
  const URLA = new URL('http://localhost/projectA.wasm');
  const URLB = new URL('file:/C:/Users/Admin/Projects/projectB.wasm');
  const URLC = new URL('https://web.dev/projectC.wasm');

  it('correctly yields named configuration', () => {
    expect(findModuleConfiguration([CONFIGA], URLA)).to.be.equal(CONFIGA);
    expect(findModuleConfiguration([CONFIGA, CONFIGB], URLA)).to.be.equal(CONFIGA);
    expect(findModuleConfiguration([CONFIGB, CONFIGA], URLA)).to.be.equal(CONFIGA);
    expect(findModuleConfiguration([DEFAULT, CONFIGB, CONFIGA], URLB)).to.be.equal(CONFIGB);
    expect(findModuleConfiguration([CONFIGB, CONFIGA, DEFAULT], URLB)).to.be.equal(CONFIGB);
  });

  it('correctly yields default configuration', () => {
    expect(findModuleConfiguration([CONFIGA], URLB)).to.deep.equal({pathSubstitutions: []});
    expect(findModuleConfiguration([CONFIGA, CONFIGB], URLC)).to.deep.equal({pathSubstitutions: []});
    expect(findModuleConfiguration([CONFIGB, CONFIGA], URLC)).to.deep.equal({pathSubstitutions: []});
    expect(findModuleConfiguration([DEFAULT, CONFIGB, CONFIGA], URLC)).to.be.equal(DEFAULT);
    expect(findModuleConfiguration([CONFIGB, CONFIGA, DEFAULT], URLC)).to.be.equal(DEFAULT);
  });

  it('correctly matches basename *-patterns', () => {
    const STAR_WASM = {name: '*.wasm', pathSubstitutions: []};
    const PROJECTA_STAR = {name: 'projectA.*', pathSubstitutions: []};
    const PROJECT_STAR_WASM = {name: 'project*.wasm', pathSubstitutions: []};
    expect(findModuleConfiguration([PROJECTA_STAR], URLA)).to.be.equal(PROJECTA_STAR);
    expect(findModuleConfiguration([STAR_WASM, PROJECTA_STAR], URLA)).to.be.equal(STAR_WASM);
    expect(findModuleConfiguration([STAR_WASM, PROJECTA_STAR], new URL('http://example.com/projectA.foo')))
        .to.be.equal(PROJECTA_STAR);
    expect(findModuleConfiguration([PROJECT_STAR_WASM], URLA)).to.be.equal(PROJECT_STAR_WASM);
    expect(findModuleConfiguration([PROJECT_STAR_WASM], URLB)).to.be.equal(PROJECT_STAR_WASM);
  });

  it('corectly matches **-patterns', () => {
    const PROJECT = {name: 'http://localhost/**/*.wasm', pathSubstitutions: []};
    expect(findModuleConfiguration([PROJECT], new URL('http://localhost/file.wasm'))).to.be.equal(PROJECT);
  });
});

describe('resolveSourcePathToURL', () => {
  it('correctly resolves absolute paths', () => {
    const BASE_URL = new URL('http://localhost/file.wasm');
    expect(resolveSourcePathToURL([], '/', BASE_URL).href).to.equal('file:///');
    expect(resolveSourcePathToURL([], '/usr/local', BASE_URL).href).to.equal('file:///usr/local');
    expect(resolveSourcePathToURL([], '/Users/Administrator', BASE_URL).href).to.equal('file:///Users/Administrator');
    expect(resolveSourcePathToURL([], 'A:/', BASE_URL).href).to.equal('file:///A:/');
    expect(resolveSourcePathToURL([], 'c:\\', BASE_URL).href).to.equal('file:///c:/');
    expect(resolveSourcePathToURL([], 'c:\\Users\\Clippy\\Source', BASE_URL).href)
        .to.equal('file:///c:/Users/Clippy/Source');
    expect(resolveSourcePathToURL([], '\\\\network\\Server\\Source', BASE_URL).href)
        .to.equal('file://network/Server/Source');
  });

  it('correctly resolves relative paths', () => {
    expect(resolveSourcePathToURL([], 'stdint.h', new URL('http://localhost/file.wasm')).href)
        .to.equal('http://localhost/stdint.h');
    expect(resolveSourcePathToURL([], 'emscripten/include/iostream', new URL('http://localhost/dist/module.wasm')).href)
        .to.equal('http://localhost/dist/emscripten/include/iostream');
    expect(resolveSourcePathToURL([], './src/main.cc', new URL('https://www.example.com/fast.wasm')).href)
        .to.equal('https://www.example.com/src/main.cc');
    expect(resolveSourcePathToURL([], '.\\Mein Projekt\\Datei.cpp', new URL('https://www.example.com/fast.wasm')).href)
        .to.equal('https://www.example.com/Mein%20Projekt/Datei.cpp');
  });

  it('correctly applies source path substitutions', () => {
    const BASE_URL = new URL('http://localhost/file.wasm');
    expect(resolveSourcePathToURL([{from: '/usr/src', to: '/mnt/src'}], '/usr/include/stdio.h', BASE_URL).href)
        .to.equal('file:///usr/include/stdio.h');
    expect(resolveSourcePathToURL([{from: '/usr/src', to: '/mnt/src'}], '/usr/src/include/stdio.h', BASE_URL).href)
        .to.equal('file:///mnt/src/include/stdio.h');
    expect(
        resolveSourcePathToURL(
            [{from: '/usr/src', to: '/mnt/src'}, {from: '/mnt/src', to: '/foo'}], '/usr/src/include/stdio.h', BASE_URL)
            .href)
        .to.equal('file:///mnt/src/include/stdio.h');
    expect(resolveSourcePathToURL(
               [{from: '/usr/src/include', to: '/mnt/include'}, {from: '/usr/src', to: '/mnt/src'}],
               '/usr/src/include/stdio.h', BASE_URL)
               .href)
        .to.equal('file:///mnt/include/stdio.h');
    expect(resolveSourcePathToURL([{from: '.', to: '/srv/central/src'}], './include/string', BASE_URL).href)
        .to.equal('file:///srv/central/src/include/string');
  });

  it('correctly resolves the sidecar Wasm module path', () => {
    // We use resolveSourcePathToURL() with an empty source
    // map to locate the debugging sidecar Wasm module.
    expect(resolveSourcePathToURL([], 'file.wasm.debug.wasm', new URL('http://localhost:8000/wasm/file.wasm')).href)
        .to.equal('http://localhost:8000/wasm/file.wasm.debug.wasm');
    expect(
        resolveSourcePathToURL([], '/usr/local/file.wasm.debug.wasm', new URL('http://localhost:8000/wasm/file.wasm'))
            .href)
        .to.equal('file:///usr/local/file.wasm.debug.wasm');
    expect(resolveSourcePathToURL(
               [], 'f:\\netdrive\\file.wasm.debug.wasm', new URL('http://localhost:8000/wasm/file.wasm'))
               .href)
        .to.equal('file:///f:/netdrive/file.wasm.debug.wasm');
  });

  it('correctly deals with dot patterns', () => {
    // Test that we match LLDB's behavior as implemented for `settings set target.source-map`:
    // http://cs/github/llvm/llvm-project/lldb/source/Target/PathMappingList.cpp?l=157-185
    const BASE_URL = new URL('http://web.dev/file.wasm');
    expect(resolveSourcePathToURL([{from: '.', to: '/foo/bar'}], 'include/header.h', BASE_URL).href)
        .to.equal('file:///foo/bar/include/header.h');
    expect(resolveSourcePathToURL([{from: '.', to: 'c:\\foo\\bar'}], 'include/header.h', BASE_URL).href)
        .to.equal('file:///c:/foo/bar/include/header.h');
    expect(resolveSourcePathToURL([{from: '.', to: '/foo'}], '/mnt/main.c', BASE_URL).href)
        .to.equal('file:///mnt/main.c');
    expect(resolveSourcePathToURL([{from: '.', to: 'c:\\foo'}], '/mnt/main.c', BASE_URL).href)
        .to.equal('file:///mnt/main.c');
    expect(resolveSourcePathToURL([{from: '.', to: '/foo'}], 'c:\\mnt\\main.c', BASE_URL).href)
        .to.equal('file:///c:/mnt/main.c');
    expect(resolveSourcePathToURL([{from: '.', to: 'c:\\foo'}], 'c:\\mnt\\main.c', BASE_URL).href)
        .to.equal('file:///c:/mnt/main.c');
  });

  it('correctly deals with dot patterns when the source path is a URL', () => {
    const BASE_URL = new URL('http://web.dev/file.wasm');
    expect(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'file:///main.cpp', BASE_URL).href)
        .to.equal('file:///main.cpp');
    expect(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'http://localhost/main.cpp', BASE_URL).href)
        .to.equal('http://localhost/main.cpp');
    expect(resolveSourcePathToURL([{from: '.', to: '/bar'}], 'https://localhost/main.cpp', BASE_URL).href)
        .to.equal('https://localhost/main.cpp');
  });
});
