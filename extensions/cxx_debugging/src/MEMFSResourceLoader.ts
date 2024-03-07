// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {Chrome} from '../../../extension-api/ExtensionAPI.js';

import type * as DWARFSymbols from './DWARFSymbols.js';
import {type HostInterface} from './WorkerRPC.js';

export class ResourceLoader implements DWARFSymbols.ResourceLoader {
  protected async fetchSymbolsData(rawModule: DWARFSymbols.RawModule, url: URL, hostInterface: HostInterface):
      Promise<{symbolsData: ArrayBuffer, symbolsDwpData?: ArrayBuffer}> {
    if (rawModule.code) {
      return {symbolsData: rawModule.code, symbolsDwpData: rawModule.dwp};
    }
    const symbolsResponse = await fetch(url.href, {mode: 'no-cors'});
    if (symbolsResponse.ok) {
      let symbolsDwpResponse = undefined;
      let symbolsDwpError;
      const dwpUrl = `${url.href}.dwp`;
      try {
        symbolsDwpResponse = await fetch(dwpUrl, {mode: 'no-cors'});
      } catch (e) {
        symbolsDwpError = (e as Error).message;
        // Unclear if this ever happens; usually if the file isn't there we
        // get a 404 response.
        console.error(symbolsDwpError);
      }
      if (!(symbolsDwpResponse && symbolsDwpResponse.ok)) {
        // Often this won't exist, but remember the missing file because if
        // we can't find symbol information later it is likely because this
        // file was missing.
        this.possiblyMissingSymbols = [`${url.pathname}.dwp`];
        if (symbolsDwpResponse) {
          symbolsDwpError = symbolsDwpResponse?.statusText || `status code ${symbolsDwpResponse.status}`;
        }
      }
      const [symbolsData, symbolsDwpData] = await Promise.all([
        symbolsResponse.arrayBuffer(),
        symbolsDwpResponse && symbolsDwpResponse.ok ? symbolsDwpResponse.arrayBuffer() : undefined,
      ]);
      hostInterface.reportResourceLoad(url.href, {success: true, size: symbolsData.byteLength});
      if (symbolsDwpData) {
        hostInterface.reportResourceLoad(dwpUrl, {success: true, size: symbolsDwpData.byteLength});
      } else {
        hostInterface.reportResourceLoad(
            dwpUrl, {success: false, errorMessage: `Failed to fetch dwp file: ${symbolsDwpError}`});
      }
      return {symbolsData, symbolsDwpData};
    }
    const statusText = symbolsResponse.statusText || `status code ${symbolsResponse.status}`;
    if (rawModule.url !== url.href) {
      const errorMessage = `NotFoundError: Unable to load debug symbols from '${url}' for the WebAssembly module '${
          rawModule.url}' (${statusText}), double-check the parameter to -gseparate-dwarf in your Emscripten link step`;
      hostInterface.reportResourceLoad(url.href, {success: false, errorMessage});
      throw new Error(errorMessage);
    }
    const errorMessage = `NotFoundError: Unable to load debug symbols from '${url}' (${statusText})`;
    hostInterface.reportResourceLoad(url.href, {success: false, errorMessage});
    throw new Error(errorMessage);
  }

  protected getModuleFileName(rawModuleId: string): string {
    return `${self.btoa(rawModuleId)}.wasm`.replace(/\//g, '_');
  }

  async loadSymbols(
      rawModuleId: string, rawModule: Chrome.DevTools.RawModule, symbolsURL: URL, fileSystem: typeof FS,
      hostInterface: HostInterface): Promise<{symbolsFileName: string, symbolsDwpFileName: string|undefined}> {
    const {symbolsData, symbolsDwpData} = await this.fetchSymbolsData(rawModule, symbolsURL, hostInterface);
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
