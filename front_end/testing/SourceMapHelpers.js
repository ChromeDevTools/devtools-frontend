// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../core/sdk/sdk.js';
import * as Bindings from '../models/bindings/bindings.js';
import * as Workspace from '../models/workspace/workspace.js';
import { dispatchEvent, setMockConnectionResponseHandler } from './MockConnection.js';
export function setupPageResourceLoaderForSourceMap(sourceMapContent) {
    const loadSourceMap = async (_url) => {
        return {
            success: true,
            content: sourceMapContent,
            errorDescription: { message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true },
        };
    };
    SDK.PageResourceLoader.PageResourceLoader.instance({ forceNew: true, loadOverride: loadSourceMap, maxConcurrentLoads: 1 });
}
export async function loadBasicSourceMapExample(target) {
    const SCRIPT_ID = '25';
    const SCRIPT_URL = 'file://main.js';
    // Generated with:
    // `terser main.js --mangle --toplevel  --output gen.js  --source-map url='gen.js.map'` v5.15.0
    const SCRIPT_SOURCE = 'function n(){o("hi");console.log("done")}function o(n){const o=performance.now();while(performance.now()-o<n);}n();o(200);\n//# sourceMappingURL=gen.js.map';
    const SOURCE_MAP = {
        version: 3,
        names: ['sayHi', 'someFunction', 'console', 'log', 'breakDuration', 'started', 'performance', 'now'],
        sources: ['main.js'],
        mappings: 'AAAA,SAASA,IACLC,EAAW,MACXC,QAAQC,IAAI,OAChB,CAEA,SAASF,EAAWG,GAChB,MAAMC,EAAUC,YAAYC,MAC5B,MAAQD,YAAYC,MAAQF,EAAWD,GAC3C,CAEAJ,IACAC,EAAW',
    };
    const SOURCE_MAP_URL = 'file://gen.js.map';
    const workspace = Workspace.Workspace.WorkspaceImpl.instance();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const resourceMapping = new Bindings.ResourceMapping.ResourceMapping(targetManager, workspace);
    const ignoreListManager = Workspace.IgnoreListManager.IgnoreListManager.instance({ forceNew: true });
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance({
        forceNew: true,
        resourceMapping,
        targetManager,
        ignoreListManager,
    });
    SDK.PageResourceLoader.PageResourceLoader.instance({
        forceNew: true,
        loadOverride: async (_) => ({
            success: true,
            content: JSON.stringify(SOURCE_MAP),
            errorDescription: { message: '', statusCode: 0, netError: 0, netErrorName: '', urlValid: true },
        }),
        maxConcurrentLoads: 1,
    });
    const debuggerModel = target.model(SDK.DebuggerModel.DebuggerModel);
    let sourceMapAttachedCallback = () => { };
    const sourceMapAttachedPromise = new Promise(res => {
        sourceMapAttachedCallback = res;
    });
    if (!debuggerModel) {
        throw new Error('DebuggerModel was unexpectedly not found');
    }
    debuggerModel.sourceMapManager().addEventListener(SDK.SourceMapManager.Events.SourceMapAttached, sourceMapAttachedCallback);
    setMockConnectionResponseHandler('Debugger.getScriptSource', getScriptSourceHandler);
    // Load the script and source map into the frontend.
    dispatchEvent(target, 'Debugger.scriptParsed', {
        scriptId: SCRIPT_ID,
        url: SCRIPT_URL,
        startLine: 0,
        startColumn: 0,
        endLine: (SCRIPT_SOURCE.match(/^/gm)?.length ?? 1) - 1,
        endColumn: SCRIPT_SOURCE.length - SCRIPT_SOURCE.lastIndexOf('\n') - 1,
        executionContextId: 1,
        hash: '',
        buildId: '',
        hasSourceURL: false,
        sourceMapURL: SOURCE_MAP_URL,
    });
    function getScriptSourceHandler(_) {
        return { scriptSource: SCRIPT_SOURCE };
    }
    await sourceMapAttachedPromise;
    const script = debuggerModel.scriptForId(String(SCRIPT_ID));
    if (!script) {
        throw new Error('Script could not be registered');
    }
    const sourceMap = script.sourceMap();
    if (!sourceMap) {
        throw new Error('Source map could not be registered');
    }
    return { sourceMap, script };
}
//# sourceMappingURL=SourceMapHelpers.js.map