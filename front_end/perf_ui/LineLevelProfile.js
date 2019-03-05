// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

PerfUI.LineLevelProfile = class {
  constructor() {
    this._locationPool = new Bindings.LiveLocationPool();
    this._updateTimer = null;
    this.reset();
  }

  reset() {
    // The second map uses string keys for script URLs and numbers for scriptId.
    /** @type {!Map<?SDK.Target, !Map<string|number, !Map<number, number>>>} */
    this._lineData = new Map();
    this._scheduleUpdate();
  }

  /**
   * @return {!PerfUI.LineLevelProfile}
   */
  static instance() {
    if (!PerfUI.LineLevelProfile._instance)
      PerfUI.LineLevelProfile._instance = new PerfUI.LineLevelProfile();
    return PerfUI.LineLevelProfile._instance;
  }

  /**
   * @param {!SDK.CPUProfileDataModel} profile
   */
  _appendLegacyCPUProfile(profile) {
    const target = profile.target();
    let dataByTarget = this._lineData.get(target);
    if (!dataByTarget) {
      dataByTarget = new Map();
      this._lineData.set(target, dataByTarget);
    }
    const nodesToGo = [profile.profileHead];
    const sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      const nodes = nodesToGo.pop().children;
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        nodesToGo.push(node);
        if (!node.url || !node.positionTicks)
          continue;
        let fileInfo = dataByTarget.get(node.url);
        if (!fileInfo) {
          fileInfo = new Map();
          dataByTarget.set(node.url, fileInfo);
        }
        for (let j = 0; j < node.positionTicks.length; ++j) {
          const lineInfo = node.positionTicks[j];
          const line = lineInfo.line;
          const time = lineInfo.ticks * sampleDuration;
          fileInfo.set(line, (fileInfo.get(line) || 0) + time);
        }
      }
    }
  }

  /**
   * @param {!SDK.CPUProfileDataModel} profile
   */
  appendCPUProfile(profile) {
    if (!profile.lines) {
      this._appendLegacyCPUProfile(profile);
      this._scheduleUpdate();
      return;
    }
    const target = profile.target();
    let dataByTarget = this._lineData.get(target);
    if (!dataByTarget) {
      dataByTarget = new Map();
      this._lineData.set(target, dataByTarget);
    }
    for (let i = 1; i < profile.samples.length; ++i) {
      const line = profile.lines[i];
      if (!line)
        continue;
      const node = profile.nodeByIndex(i);
      const scriptIdOrUrl = node.scriptId || node.url;
      if (!scriptIdOrUrl)
        continue;
      let dataByScript = dataByTarget.get(scriptIdOrUrl);
      if (!dataByScript) {
        dataByScript = new Map();
        dataByTarget.set(scriptIdOrUrl, dataByScript);
      }
      const time = profile.timestamps[i] - profile.timestamps[i - 1];
      dataByScript.set(line, (dataByScript.get(line) || 0) + time);
    }
    this._scheduleUpdate();
  }

  _scheduleUpdate() {
    if (this._updateTimer)
      return;
    this._updateTimer = setTimeout(() => {
      this._updateTimer = null;
      this._doUpdate();
    }, 0);
  }

  _doUpdate() {
    this._locationPool.disposeAll();
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(PerfUI.LineLevelProfile.LineDecorator.type));
    for (const targetToScript of this._lineData) {
      const target = /** @type {?SDK.Target} */ (targetToScript[0]);
      const debuggerModel = target ? target.model(SDK.DebuggerModel) : null;
      const scriptToLineMap = /** @type {!Map<string|number, !Map<number, number>>} */ (targetToScript[1]);
      for (const scriptToLine of scriptToLineMap) {
        const scriptIdOrUrl = /** @type {string|number} */ (scriptToLine[0]);
        const lineToDataMap = /** @type {!Map<number, number>} */ (scriptToLine[1]);
        // debuggerModel is null when the profile is loaded from file.
        // Try to get UISourceCode by the URL in this case.
        const uiSourceCode = !debuggerModel && typeof scriptIdOrUrl === 'string' ?
            Workspace.workspace.uiSourceCodeForURL(scriptIdOrUrl) :
            null;
        if (!debuggerModel && !uiSourceCode)
          continue;
        for (const lineToData of lineToDataMap) {
          const line = /** @type {number} */ (lineToData[0]) - 1;
          const data = /** @type {number} */ (lineToData[1]);
          if (uiSourceCode) {
            uiSourceCode.addLineDecoration(line, PerfUI.LineLevelProfile.LineDecorator.type, data);
            continue;
          }
          const rawLocation = typeof scriptIdOrUrl === 'string' ?
              debuggerModel.createRawLocationByURL(scriptIdOrUrl, line, 0) :
              debuggerModel.createRawLocationByScriptId(String(scriptIdOrUrl), line, 0);
          if (rawLocation)
            new PerfUI.LineLevelProfile.Presentation(rawLocation, data, this._locationPool);
        }
      }
    }
  }
};

/**
 * @unrestricted
 */
PerfUI.LineLevelProfile.Presentation = class {
  /**
   * @param {!SDK.DebuggerModel.Location} rawLocation
   * @param {number} time
   * @param {!Bindings.LiveLocationPool} locationPool
   */
  constructor(rawLocation, time, locationPool) {
    this._time = time;
    Bindings.debuggerWorkspaceBinding.createLiveLocation(rawLocation, this.updateLocation.bind(this), locationPool);
  }

  /**
   * @param {!Bindings.LiveLocation} liveLocation
   */
  updateLocation(liveLocation) {
    if (this._uiLocation)
      this._uiLocation.uiSourceCode.removeDecorationsForType(PerfUI.LineLevelProfile.LineDecorator.type);
    this._uiLocation = liveLocation.uiLocation();
    if (this._uiLocation) {
      this._uiLocation.uiSourceCode.addLineDecoration(
          this._uiLocation.lineNumber, PerfUI.LineLevelProfile.LineDecorator.type, this._time);
    }
  }
};

/**
 * @implements {SourceFrame.LineDecorator}
 * @unrestricted
 */
PerfUI.LineLevelProfile.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    const gutterType = 'CodeMirror-gutter-performance';
    const decorations = uiSourceCode.decorationsForType(PerfUI.LineLevelProfile.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations || !decorations.size)
      return;
    textEditor.installGutter(gutterType, false);
    for (const decoration of decorations) {
      const time = /** @type {number} */ (decoration.data());
      const text = Common.UIString('%.1f\xa0ms', time);
      const intensity = Number.constrain(Math.log10(1 + 2 * time) / 5, 0.02, 1);
      const element = createElementWithClass('div', 'text-editor-line-marker-performance');
      element.textContent = text;
      element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
      textEditor.setGutterDecoration(decoration.range().startLine, gutterType, element);
    }
  }
};

PerfUI.LineLevelProfile.LineDecorator.type = 'performance';
