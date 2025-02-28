// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export interface SymbolsBackendTestsModule extends EmscriptenModule {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  FS: typeof FS;
  callMain(args?: string[]): void;
}

declare let createModule: EmscriptenModuleFactory<SymbolsBackendTestsModule>;
export default createModule;
