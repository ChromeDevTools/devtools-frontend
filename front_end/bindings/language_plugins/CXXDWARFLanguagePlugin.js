// Copyright 2020 the Chromium project authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DebuggerLanguagePlugin, DebuggerLanguagePluginError, RawLocation, RawModule, SourceLocation, Variable} from '../DebuggerLanguagePlugins.js';  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *            sources:!Array<string>
 *          }}
 */
let AddRawModuleResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            rawLocation:!Array<!RawLocation>
 *          }}
 */
let SourceLocationToRawLocationResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            sourceLocation:!Array<!SourceLocation>
 *          }}
 */
let RawLocationToSourceLocationResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            variable:!Array<!Variable>
 *          }}
 */
let ListVariablesInScopeResponse;  // eslint-disable-line no-unused-vars
/**
 * @typedef {{
 *            value:!RawModule
 *          }}
 */
let EvaluateVariableResponse;  // eslint-disable-line no-unused-vars

/**
 * @param {string} method
 * @param {!Object} params
 * @return {!AddRawModuleResponse|!SourceLocationToRawLocationResponse|!RawLocationToSourceLocationResponse|!ListVariablesInScopeResponse|!EvaluateVariableResponse}
 *
 */
function _sendJsonRPC(method, params) {
  const request = new XMLHttpRequest();
  request.open('POST', 'http://localhost:8888', false);
  request.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  const payload = JSON.stringify({jsonrpc: '2.0', method: method, params, id: 0});
  request.send(payload);
  if (request.status !== 200) {
    throw new DebuggerLanguagePluginError(request.status.toString(), 'JSON-RPC request failed');
  }
  const response = JSON.parse(request.responseText).result;
  if (response.error) {
    throw new DebuggerLanguagePluginError(response.error.code, response.error.message);
  }
  return response;
}

/**
 * @implements {DebuggerLanguagePlugin}
 */
export class CXXDWARFLanguagePlugin {
  /**
   * @override
   * @param {!SDK.Script} script
   * @return {boolean} True if this plugin should handle this script
   */
  handleScript(script) {
    return script.sourceMapURL.startsWith('wasm://');
  }

  /** Notify the plugin about a new script
   * @override
   * @param {string} rawModuleId
   * @param {string} symbols
   * @param {!RawModule} rawModule
   * @return {!Promise<!Array<string>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async addRawModule(rawModuleId, symbols, rawModule) {
    return _sendJsonRPC(
               'addRawModule', {rawModuleId: rawModuleId, symbols: symbols, rawModule: getProtocolModule(rawModule)})
        .sources;

    function getProtocolModule(rawModule) {
      if (!rawModule.code) {
        return {url: rawModule.url};
      }
      const moduleBytes = new Uint8Array(rawModule.code);

      let binary = '';
      const len = moduleBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(moduleBytes[i]);
      }

      return {code: btoa(binary)};
    }
  }

  /** Find locations in raw modules from a location in a source file
   * TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @override
   * @param {!SourceLocation} sourceLocation
   * @return {!Array<!RawLocation>}
   * @throws {DebuggerLanguagePluginError}
  */
  /* async */ sourceLocationToRawLocation(sourceLocation) {
    return _sendJsonRPC('sourceLocationToRawLocation', sourceLocation).rawLocation;
  }

  /** Find locations in source files from a location in a raw module
   * TODO(chromium:1032016): Make async once chromium:1032016 is complete.
   * @override
   * @param {!RawLocation} rawLocation
   * @return {!Array<!SourceLocation>}
   * @throws {DebuggerLanguagePluginError}
  */
  /* async */ rawLocationToSourceLocation(rawLocation) {
    return _sendJsonRPC('rawLocationToSourceLocation', rawLocation).sourceLocation;
  }

  /** List all variables in lexical scope at a given location in a raw module
   * @override
   * @param {!RawLocation} rawLocation
   * @return {!Promise<!Array<!Variable>>}
   * @throws {DebuggerLanguagePluginError}
  */
  async listVariablesInScope(rawLocation) {
    return [];
  }

  /** Evaluate the content of a variable in a given lexical scope
   * @override
   * @param {string} name
   * @param {!RawLocation} location
   * @return {!Promise<?RawModule>}
   * @throws {DebuggerLanguagePluginError}
  */
  async evaluateVariable(name, location) {
    return null;
  }

  /**
   * @override
   */
  dispose() {
  }
}
