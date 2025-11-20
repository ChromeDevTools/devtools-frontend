// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Bindings from '../../../../models/bindings/bindings.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
let performanceInstance;
export class Performance {
    helper;
    constructor() {
        this.helper = new Helper("performance" /* Workspace.UISourceCode.DecoratorType.PERFORMANCE */);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!performanceInstance || forceNew) {
            performanceInstance = new Performance();
        }
        return performanceInstance;
    }
    reset() {
        this.helper.reset();
    }
    appendLegacyCPUProfile(profile, target) {
        const nodesToGo = [profile.profileHead];
        const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
        while (nodesToGo.length) {
            const nodes = nodesToGo.pop()?.children ?? [];
            for (let i = 0; i < nodes.length; ++i) {
                const node = nodes[i];
                nodesToGo.push(node);
                if (!node.url || !node.positionTicks) {
                    continue;
                }
                for (let j = 0; j < node.positionTicks.length; ++j) {
                    const lineInfo = node.positionTicks[j];
                    const line = lineInfo.line;
                    const time = lineInfo.ticks * sampleDuration;
                    // Since no column number is provided by legacy profile, default to 1 (beginning of line).
                    this.helper.addLocationData(target, node.url, { line, column: 1 }, time);
                }
            }
        }
    }
    appendCPUProfile(profile, target) {
        if (!profile.lines) {
            this.appendLegacyCPUProfile(profile, target);
            this.helper.scheduleUpdate();
            return;
        }
        if (!profile.samples || !profile.columns) {
            return;
        }
        for (let i = 1; i < profile.samples.length; ++i) {
            const line = profile.lines[i];
            const column = profile.columns?.[i];
            if (!line || !column) {
                continue;
            }
            const node = profile.nodeByIndex(i);
            if (!node) {
                continue;
            }
            const scriptIdOrUrl = Number(node.scriptId) || node.url;
            if (!scriptIdOrUrl) {
                continue;
            }
            const time = profile.timestamps[i] - profile.timestamps[i - 1];
            this.helper.addLocationData(target, scriptIdOrUrl, { line, column }, time);
        }
        this.helper.scheduleUpdate();
    }
}
let memoryInstance;
export class Memory {
    helper;
    constructor() {
        this.helper = new Helper("memory" /* Workspace.UISourceCode.DecoratorType.MEMORY */);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!memoryInstance || forceNew) {
            memoryInstance = new Memory();
        }
        return memoryInstance;
    }
    reset() {
        this.helper.reset();
    }
    appendHeapProfile(profile, target) {
        const helper = this.helper;
        processNode(profile.head);
        helper.scheduleUpdate();
        function processNode(node) {
            node.children.forEach(processNode);
            if (!node.selfSize) {
                return;
            }
            const script = Number(node.callFrame.scriptId) || node.callFrame.url;
            if (!script) {
                return;
            }
            const line = node.callFrame.lineNumber + 1;
            // Since no column number is provided by the heap profile, default to 1 (beginning of line).
            helper.addLocationData(target, script, { line, column: 1 }, node.selfSize);
        }
    }
}
export class Helper {
    type;
    locationPool = new Bindings.LiveLocation.LiveLocationPool();
    updateTimer = null;
    /**
     * Given a location in a script (with line and column numbers being 1-based) stores
     * the time spent at that location in a performance profile.
     */
    locationData = new Map();
    constructor(type) {
        this.type = type;
        this.reset();
    }
    reset() {
        // The second map uses string keys for script URLs and numbers for scriptId.
        this.locationData = new Map();
        this.scheduleUpdate();
    }
    /**
     * Stores the time taken running a given script location (line and column)
     */
    addLocationData(target, scriptIdOrUrl, { line, column }, data) {
        let targetData = this.locationData.get(target);
        if (!targetData) {
            targetData = new Map();
            this.locationData.set(target, targetData);
        }
        let scriptData = targetData.get(scriptIdOrUrl);
        if (!scriptData) {
            scriptData = new Map();
            targetData.set(scriptIdOrUrl, scriptData);
        }
        let lineData = scriptData.get(line);
        if (!lineData) {
            lineData = new Map();
            scriptData.set(line, lineData);
        }
        lineData.set(column, (lineData.get(column) || 0) + data);
    }
    scheduleUpdate() {
        if (this.updateTimer) {
            return;
        }
        this.updateTimer = window.setTimeout(() => {
            this.updateTimer = null;
            void this.doUpdate();
        }, 0);
    }
    async doUpdate() {
        this.locationPool.disposeAll();
        // Map from sources to line->value profile maps.
        const decorationsBySource = new Map();
        const pending = [];
        for (const [target, scriptToLineMap] of this.locationData) {
            const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
            for (const [scriptIdOrUrl, lineToDataMap] of scriptToLineMap) {
                // debuggerModel is null when the profile is loaded from file.
                // Try to get UISourceCode by the URL in this case.
                const workspace = Workspace.Workspace.WorkspaceImpl.instance();
                if (debuggerModel) {
                    const workspaceBinding = Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance();
                    for (const [lineNumber, lineData] of lineToDataMap) {
                        // lineData contains profiling data by column.
                        for (const [columnNumber, data] of lineData) {
                            const zeroBasedLine = lineNumber - 1;
                            const zeroBasedColumn = columnNumber - 1;
                            if (target) {
                                const rawLocation = typeof scriptIdOrUrl === 'string' ?
                                    debuggerModel.createRawLocationByURL(scriptIdOrUrl, zeroBasedLine, zeroBasedColumn || 0) :
                                    debuggerModel.createRawLocationByScriptId(String(scriptIdOrUrl), zeroBasedLine, zeroBasedColumn || 0);
                                if (rawLocation) {
                                    pending.push(workspaceBinding.rawLocationToUILocation(rawLocation).then(uiLocation => {
                                        if (uiLocation) {
                                            let lineMap = decorationsBySource.get(uiLocation.uiSourceCode);
                                            if (!lineMap) {
                                                lineMap = new Map();
                                                decorationsBySource.set(uiLocation.uiSourceCode, lineMap);
                                            }
                                            let columnMap = lineMap.get(lineNumber);
                                            if (!columnMap) {
                                                columnMap = new Map();
                                                lineMap.set(lineNumber, columnMap);
                                            }
                                            columnMap.set((zeroBasedColumn || 0) + 1, data);
                                        }
                                    }));
                                }
                            }
                        }
                    }
                }
                else if (typeof scriptIdOrUrl === 'string') {
                    const uiSourceCode = workspace.uiSourceCodeForURL(scriptIdOrUrl);
                    if (uiSourceCode) {
                        decorationsBySource.set(uiSourceCode, lineToDataMap);
                    }
                }
            }
            await Promise.all(pending);
            for (const [uiSourceCode, lineMap] of decorationsBySource) {
                uiSourceCode.setDecorationData(this.type, lineMap);
            }
        }
        for (const uiSourceCode of Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes()) {
            if (!decorationsBySource.has(uiSourceCode)) {
                uiSourceCode.setDecorationData(this.type, undefined);
            }
        }
    }
}
//# sourceMappingURL=LineLevelProfile.js.map