// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import createModule, {type SymbolsBackendTestsModule} from './SymbolsBackendTests.js';

it('SymbolsBackend', async () => {
  await createModule({
    onExit(status: number) {
      if (status !== 0) {
        throw new Error(`Unittests failed (return code ${status})`);
      }
    },
    // @ts-expect-error
    preRun({FS}: SymbolsBackendTestsModule) {  // eslint-disable-line @typescript-eslint/naming-convention
      FS.mkdir('tests');
      FS.mkdir('tests/inputs');
      FS.mkdir('cxx_debugging');
      FS.mkdir('cxx_debugging/tests');
      FS.mkdir('cxx_debugging/tests/inputs');
      ['hello.s.wasm',
       'windows_paths.s.wasm',
       'globals.s.wasm',
       'classstatic.s.wasm',
       'namespaces.s.wasm',
       'shadowing.s.wasm',
       'inline.s.wasm',
      ]
          .forEach(
              name => FS.createPreloadedFile(
                  'cxx_debugging/tests/inputs', name, `build/tests/inputs/${name}`, true, false));
      ['split-dwarf.s.dwo',
       'split-dwarf.s.wasm',
      ].forEach(name => FS.createPreloadedFile('tests/inputs', name, `build/tests/inputs/${name}`, true, false));
    },
  });
});
