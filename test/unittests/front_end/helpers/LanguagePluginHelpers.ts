// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../../extension-api/ExtensionAPI.js';
import * as Bindings from '../../../../front_end/models/bindings/bindings.js';

export class TestPlugin extends Bindings.DebuggerLanguagePlugins.DebuggerLanguagePlugin {
  constructor(name: string) {
    super(name);
  }

  async addRawModule(_rawModuleId: string, _symbolsURL: string, _rawModule: Chrome.DevTools.RawModule):
      Promise<string[]> {
    return [];
  }

  async sourceLocationToRawLocation(_sourceLocation: Chrome.DevTools.SourceLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }

  async rawLocationToSourceLocation(_rawLocation: Chrome.DevTools.RawLocation):
      Promise<Chrome.DevTools.SourceLocation[]> {
    return [];
  }

  async getScopeInfo(type: string): Promise<Chrome.DevTools.ScopeInfo> {
    return {type, typeName: type};
  }

  async listVariablesInScope(_rawLocation: Chrome.DevTools.RawLocation): Promise<Chrome.DevTools.Variable[]> {
    return [];
  }

  async removeRawModule(_rawModuleId: string): Promise<void> {
  }

  async getTypeInfo(_expression: string, _context: Chrome.DevTools.RawLocation):
      Promise<{typeInfos: Array<Chrome.DevTools.TypeInfo>, base: Chrome.DevTools.EvalBase}|null> {
    return null;
  }

  async getFormatter(
      _expressionOrField: string|{base: Chrome.DevTools.EvalBase, field: Array<Chrome.DevTools.FieldInfo>},
      _context: Chrome.DevTools.RawLocation): Promise<{js: string}|null> {
    return null;
  }

  getInspectableAddress(_field: {base: Chrome.DevTools.EvalBase, field: Array<Chrome.DevTools.FieldInfo>}):
      Promise<{js: string}> {
    throw new Error('Not implemented yet');
  }

  async getFunctionInfo(_rawLocation: Chrome.DevTools.RawLocation): Promise<{
    frames: Array<Chrome.DevTools.FunctionInfo>,
    missingSymbolFiles?: Array<string>,
  }> {
    return {frames: []};
  }

  async getInlinedFunctionRanges(_rawLocation: Chrome.DevTools.RawLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }

  async getInlinedCalleesRanges(_rawLocation: Chrome.DevTools.RawLocation):
      Promise<Chrome.DevTools.RawLocationRange[]> {
    return [];
  }

  async getMappedLines(_rawModuleId: string, _sourceFileURL: string): Promise<number[]|undefined> {
    return undefined;
  }
}
