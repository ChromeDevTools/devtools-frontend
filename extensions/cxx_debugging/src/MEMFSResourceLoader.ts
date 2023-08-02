// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';
import type * as DWARFSymbols from './DWARFSymbols.js';

export class ResourceLoader implements DWARFSymbols.ResourceLoader {
  protected async fetchSymbolsData(rawModule: DWARFSymbols.RawModule, url: URL):
      Promise<{symbolsData: ArrayBuffer, symbolsDwpData?: ArrayBuffer}> {
    if (rawModule.code) {
      return {symbolsData: rawModule.code, symbolsDwpData: rawModule.dwp};
    }
    const symbolsResponse = await fetch(url.href, {mode: 'no-cors'});
    if (symbolsResponse.ok) {
      let symbolsDwpResponse = undefined;
      try {
        symbolsDwpResponse = await fetch(`${url.href}.dwp`, {mode: 'no-cors'});
      } catch (e) {
        // Unclear if this ever happens; usually if the file isn't there we
        // get a 404 response.
        console.error(`Failed to fetch dwp file: ${e}`);
      }
      if (!(symbolsDwpResponse && symbolsDwpResponse.ok)) {
        // Often this won't exist, but remember the missing file because if
        // we can't find symbol information later it is likely because this
        // file was missing.
        this.possiblyMissingSymbols = [`${url.pathname}.dwp`];
      }
      const [symbolsData, symbolsDwpData] = await Promise.all([
        symbolsResponse.arrayBuffer(),
        symbolsDwpResponse && symbolsDwpResponse.ok ? symbolsDwpResponse.arrayBuffer() : undefined,
      ]);
      return {symbolsData, symbolsDwpData};
    }
    const statusText = symbolsResponse.statusText || `status code ${symbolsResponse.status}`;
    if (rawModule.url !== url.href) {
      throw new Error(
          `NotFoundError: Unable to load debug symbols from '${url}' for the WebAssembly module '${rawModule.url}' (${
              statusText}), double-check the parameter to -gseparate-dwarf in your Emscripten link step`);
    }
    throw new Error(`NotFoundError: Unable to load debug symbols from '${url}' (${statusText})`);
  }

  protected getModuleFileName(rawModuleId: string): string {
    return `${self.btoa(rawModuleId)}.wasm`.replace(/\//g, '_');
  }

  async loadSymbols(
      rawModuleId: string,
      rawModule: Chrome.DevTools.RawModule,
      symbolsURL: URL,
      fileSystem: typeof FS,
      ): Promise<{symbolsFileName: string, symbolsDwpFileName: string|undefined}> {
    const {symbolsData, symbolsDwpData} = await this.fetchSymbolsData(rawModule, symbolsURL);
    const symbolsFileName = this.getModuleFileName(rawModuleId);
    const symbolsDwpFileName = symbolsDwpData && `${symbolsFileName}.dwp`;

    // This file is sometimes preserved on reload, causing problems.
    try {
      fileSystem.unlink('/' + symbolsFileName);
    } catch (_) {
    }

    fileSystem.createDataFile(
        '/', symbolsFileName, new Uint8Array(symbolsData), true /* canRead */, false /* canWrite */, true /* canOwn */);
    if (symbolsDwpData && symbolsDwpFileName) {
      fileSystem.createDataFile(
          '/', symbolsDwpFileName, new Uint8Array(symbolsDwpData), true /* canRead */, false /* canWrite */,
          true /* canOwn */);
    }

    return {symbolsFileName, symbolsDwpFileName};
  }

  createSymbolsBackendModulePromise(): Promise<WebAssembly.Module> {
    const url = new URL('SymbolsBackend.wasm', import.meta.url);
    return fetch(url.href, {credentials: 'same-origin'}).then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return WebAssembly.compileStreaming(response);
    });
  }

  possiblyMissingSymbols?: string[];
}
