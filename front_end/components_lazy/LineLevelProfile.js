// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Components.LineLevelProfile = class {
  constructor() {
    this._locationPool = new Bindings.LiveLocationPool();
    this.reset();
  }

  /**
   * @return {!Components.LineLevelProfile}
   */
  static instance() {
    if (!Components.LineLevelProfile._instance)
      Components.LineLevelProfile._instance = new Components.LineLevelProfile();
    return Components.LineLevelProfile._instance;
  }

  /**
   * @param {!SDK.CPUProfileDataModel} profile
   */
  appendCPUProfile(profile) {
    var nodesToGo = [profile.profileHead];
    var sampleDuration = (profile.profileEndTime - profile.profileStartTime) / profile.totalHitCount;
    while (nodesToGo.length) {
      var nodes = nodesToGo.pop().children;
      for (var i = 0; i < nodes.length; ++i) {
        var node = nodes[i];
        nodesToGo.push(node);
        if (!node.url || !node.positionTicks)
          continue;
        var fileInfo = this._files.get(node.url);
        if (!fileInfo) {
          fileInfo = new Map();
          this._files.set(node.url, fileInfo);
        }
        for (var j = 0; j < node.positionTicks.length; ++j) {
          var lineInfo = node.positionTicks[j];
          var line = lineInfo.line;
          var time = lineInfo.ticks * sampleDuration;
          fileInfo.set(line, (fileInfo.get(line) || 0) + time);
        }
      }
    }
    this._scheduleUpdate();
  }

  reset() {
    /** @type {!Map<string, !Map<number, number>>} */
    this._files = new Map();
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
    // TODO(alph): use scriptId instead of urls for the target.
    this._locationPool.disposeAll();
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeAllLineDecorations(Components.LineLevelProfile.LineDecorator.type));
    for (var fileInfo of this._files) {
      var url = /** @type {string} */ (fileInfo[0]);
      var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
      if (!uiSourceCode)
        continue;
      var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode) || SDK.targetManager.mainTarget();
      var debuggerModel = target ? SDK.DebuggerModel.fromTarget(target) : null;
      if (!debuggerModel)
        continue;
      for (var lineInfo of fileInfo[1]) {
        var line = lineInfo[0] - 1;
        var time = lineInfo[1];
        var rawLocation = debuggerModel.createRawLocationByURL(url, line, 0);
        if (rawLocation)
          new Components.LineLevelProfile.Presentation(rawLocation, time, this._locationPool);
        else if (uiSourceCode)
          uiSourceCode.addLineDecoration(line, Components.LineLevelProfile.LineDecorator.type, time);
      }
    }
  }
};


/**
 * @unrestricted
 */
Components.LineLevelProfile.Presentation = class {
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
    if (this._uiLocation) {
      this._uiLocation.uiSourceCode.removeLineDecoration(
          this._uiLocation.lineNumber, Components.LineLevelProfile.LineDecorator.type);
    }
    this._uiLocation = liveLocation.uiLocation();
    if (this._uiLocation) {
      this._uiLocation.uiSourceCode.addLineDecoration(
          this._uiLocation.lineNumber, Components.LineLevelProfile.LineDecorator.type, this._time);
    }
  }
};

/**
 * @implements {Sources.UISourceCodeFrame.LineDecorator}
 * @unrestricted
 */
Components.LineLevelProfile.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var gutterType = 'CodeMirror-gutter-performance';
    var decorations = uiSourceCode.lineDecorations(Components.LineLevelProfile.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations)
      return;
    textEditor.installGutter(gutterType, false);
    for (var decoration of decorations.values()) {
      var time = /** @type {number} */ (decoration.data());
      var text = Common.UIString('%.1f\xa0ms', time);
      var intensity = Number.constrain(Math.log10(1 + 2 * time) / 5, 0.02, 1);
      var element = createElementWithClass('div', 'text-editor-line-marker-performance');
      element.textContent = text;
      element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
      textEditor.setGutterDecoration(decoration.line(), gutterType, element);
    }
  }
};

Components.LineLevelProfile.LineDecorator.type = 'performance';
