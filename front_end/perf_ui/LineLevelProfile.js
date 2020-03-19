// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Platform from '../platform/platform.js';
import * as Profiler from '../profiler/profiler.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';  // eslint-disable-line no-unused-vars
import * as TextEditor from '../text_editor/text_editor.js';     // eslint-disable-line no-unused-vars
import * as Workspace from '../workspace/workspace.js';          // eslint-disable-line no-unused-vars

export class Performance {
  constructor() {
    this._helper = new Helper('performance');
  }

  reset() {
    this._helper.reset();
  }

  /**
   * @param {!SDK.CPUProfileDataModel.CPUProfileDataModel} profile
   */
  _appendLegacyCPUProfile(profile) {
    const target = profile.target();
    const nodesToGo = [profile.profileHead];
    const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      const nodes = nodesToGo.pop().children;
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
          this._helper.addLineData(target, node.url, line, time);
        }
      }
    }
  }

  /**
   * @param {!SDK.CPUProfileDataModel.CPUProfileDataModel} profile
   */
  appendCPUProfile(profile) {
    if (!profile.lines) {
      this._appendLegacyCPUProfile(profile);
      this._helper.scheduleUpdate();
      return;
    }
    const target = profile.target();
    for (let i = 1; i < profile.samples.length; ++i) {
      const line = profile.lines[i];
      if (!line) {
        continue;
      }
      const node = profile.nodeByIndex(i);
      const scriptIdOrUrl = node.scriptId || node.url;
      if (!scriptIdOrUrl) {
        continue;
      }
      const time = profile.timestamps[i] - profile.timestamps[i - 1];
      this._helper.addLineData(target, scriptIdOrUrl, line, time);
    }
    this._helper.scheduleUpdate();
  }
}

export class Memory {
  constructor() {
    this._helper = new Helper('memory');
  }

  reset() {
    this._helper.reset();
  }

  /**
   * @param {!Protocol.HeapProfiler.SamplingHeapProfile} profile
   * @param {?SDK.SDKModel.Target} target
   */
  appendHeapProfile(profile, target) {
    const helper = this._helper;
    processNode(profile.head);
    helper.scheduleUpdate();

    /**
     * @param {!Protocol.HeapProfiler.SamplingHeapProfileNode} node
     */
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
      helper.addLineData(target, script, line, node.selfSize);
    }
  }
}

export class Helper {
  /**
   * @param {string} type
   */
  constructor(type) {
    this._type = type;
    this._locationPool = new Bindings.LiveLocation.LiveLocationPool();
    this._updateTimer = null;
    this.reset();
  }

  reset() {
    // The second map uses string keys for script URLs and numbers for scriptId.
    /** @type {!Map<?SDK.SDKModel.Target, !Map<string|number, !Map<number, number>>>} */
    this._lineData = new Map();
    this.scheduleUpdate();
  }

  /**
   * @param {?SDK.SDKModel.Target} target
   * @param {string|number} scriptIdOrUrl
   * @param {number} line
   * @param {number} data
   */
  addLineData(target, scriptIdOrUrl, line, data) {
    let targetData = this._lineData.get(target);
    if (!targetData) {
      targetData = new Map();
      this._lineData.set(target, targetData);
    }
    let scriptData = targetData.get(scriptIdOrUrl);
    if (!scriptData) {
      scriptData = new Map();
      targetData.set(scriptIdOrUrl, scriptData);
    }
    scriptData.set(line, (scriptData.get(line) || 0) + data);
  }

  scheduleUpdate() {
    if (this._updateTimer) {
      return;
    }
    this._updateTimer = setTimeout(() => {
      this._updateTimer = null;
      this._doUpdate();
    }, 0);
  }

  _doUpdate() {
    this._locationPool.disposeAll();
    Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(this._type));
    for (const targetToScript of this._lineData) {
      const target = /** @type {?SDK.SDKModel.Target} */ (targetToScript[0]);
      const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
      const scriptToLineMap = /** @type {!Map<string|number, !Map<number, number>>} */ (targetToScript[1]);
      for (const scriptToLine of scriptToLineMap) {
        const scriptIdOrUrl = /** @type {string|number} */ (scriptToLine[0]);
        const lineToDataMap = /** @type {!Map<number, number>} */ (scriptToLine[1]);
        // debuggerModel is null when the profile is loaded from file.
        // Try to get UISourceCode by the URL in this case.
        const uiSourceCode = !debuggerModel && typeof scriptIdOrUrl === 'string' ?
            Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(scriptIdOrUrl) :
            null;
        if (!debuggerModel && !uiSourceCode) {
          continue;
        }
        for (const lineToData of lineToDataMap) {
          const line = /** @type {number} */ (lineToData[0]) - 1;
          const data = /** @type {number} */ (lineToData[1]);
          if (uiSourceCode) {
            uiSourceCode.addLineDecoration(line, this._type, data);
            continue;
          }
          const rawLocation = typeof scriptIdOrUrl === 'string' ?
              debuggerModel.createRawLocationByURL(scriptIdOrUrl, line, 0) :
              debuggerModel.createRawLocationByScriptId(String(scriptIdOrUrl), line, 0);
          if (rawLocation) {
            new Presentation(rawLocation, this._type, data, this._locationPool);
          }
        }
      }
    }
  }
}

export class Presentation {
  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {string} type
   * @param {number} time
   * @param {!Bindings.LiveLocation.LiveLocationPool} locationPool
   */
  constructor(rawLocation, type, time, locationPool) {
    this._type = type;
    this._time = time;
    this._uiLocation = null;
    Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().createLiveLocation(
        rawLocation, this.updateLocation.bind(this), locationPool);
  }

  /**
   * @param {!Bindings.LiveLocation.LiveLocation} liveLocation
   */
  async updateLocation(liveLocation) {
    if (this._uiLocation) {
      this._uiLocation.uiSourceCode.removeDecorationsForType(this._type);
    }
    this._uiLocation = await liveLocation.uiLocation();
    if (this._uiLocation) {
      this._uiLocation.uiSourceCode.addLineDecoration(this._uiLocation.lineNumber, this._type, this._time);
    }
  }
}

/**
 * @implements {SourceFrame.SourceFrame.LineDecorator}
 */
export class LineDecorator {
  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor.CodeMirrorTextEditor} textEditor
   * @param {string} type
   */
  decorate(uiSourceCode, textEditor, type) {
    const gutterType = `CodeMirror-gutter-${type}`;
    const decorations = uiSourceCode.decorationsForType(type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations || !decorations.size) {
      return;
    }
    textEditor.installGutter(gutterType, false);
    for (const decoration of decorations) {
      const value = /** @type {number} */ (decoration.data());
      const element = this._createElement(type, value);
      textEditor.setGutterDecoration(decoration.range().startLine, gutterType, element);
    }
  }

  /**
   * @param {string} type
   * @param {number} value
   * @return {!Element}
   */
  _createElement(type, value) {
    const element = createElementWithClass('div', 'text-editor-line-marker-text');
    if (type === 'performance') {
      const intensity = Platform.NumberUtilities.clamp(Math.log10(1 + 10 * value) / 5, 0.02, 1);
      element.textContent = Common.UIString.UIString('%.1f', value);
      element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
      element.createChild('span', 'line-marker-units').textContent = ls`ms`;
    } else {
      const intensity = Platform.NumberUtilities.clamp(Math.log10(1 + 2e-3 * value) / 5, 0.02, 1);
      element.style.backgroundColor = `hsla(217, 100%, 70%, ${intensity.toFixed(3)})`;
      value /= 1e3;
      let units;
      let fractionDigits;
      if (value >= 1e3) {
        units = ls`MB`;
        value /= 1e3;
        fractionDigits = value >= 20 ? 0 : 1;
      } else {
        units = ls`KB`;
        fractionDigits = 0;
      }
      element.textContent = Common.UIString.UIString(`%.${fractionDigits}f`, value);
      element.createChild('span', 'line-marker-units').textContent = units;
    }
    return element;
  }
}
