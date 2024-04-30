// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {type Vector} from '../src/SymbolsBackend.js';

export interface Debugger {
  runToLine(line: string): Promise<void>;
  evaluate(expr: string): Promise<EvalResult>;
  exit(): Promise<void>;
}

export interface EvalResult {
  error?: string;
  result?: string;
}

interface Module extends EmscriptenModule {
  StringArray: Vector<string>;
  runTests(dbg: Debugger, args: Vector<string>): Promise<number>;
}

declare var loadModule: EmscriptenModuleFactory<Module>;
export default loadModule;
