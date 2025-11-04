// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../core/platform/platform.js';
const { urlString } = Platform.DevToolsPath;
export class TestPlugin {
    constructor(name) {
        this.name = name;
    }
    name;
    handleScript(_script) {
        return false;
    }
    createPageResourceLoadInitiator() {
        const extensionId = 'chrome-extension-id';
        return {
            target: null,
            frameId: null,
            extensionId,
            initiatorUrl: urlString `${extensionId}`,
        };
    }
    async evaluate(_expression, _context, _stopId) {
        return null;
    }
    async getProperties(_objectId) {
        return [];
    }
    async releaseObject(_objectId) {
    }
    async addRawModule(_rawModuleId, _symbolsURL, _rawModule) {
        return [];
    }
    async sourceLocationToRawLocation(_sourceLocation) {
        return [];
    }
    async rawLocationToSourceLocation(_rawLocation) {
        return [];
    }
    async getScopeInfo(type) {
        return { type, typeName: type };
    }
    async listVariablesInScope(_rawLocation) {
        return [];
    }
    async removeRawModule(_rawModuleId) {
    }
    async getFunctionInfo(_rawLocation) {
        return { frames: [] };
    }
    async getInlinedFunctionRanges(_rawLocation) {
        return [];
    }
    async getInlinedCalleesRanges(_rawLocation) {
        return [];
    }
    async getMappedLines(_rawModuleId, _sourceFileURL) {
        return undefined;
    }
}
//# sourceMappingURL=LanguagePluginHelpers.js.map