// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.LineLevelProfile = function()
{
    this._locationPool = new WebInspector.LiveLocationPool();
    this.reset();
}

/**
 * @return {!WebInspector.LineLevelProfile}
 */
WebInspector.LineLevelProfile.instance = function()
{
    if (!WebInspector.LineLevelProfile._instance)
        WebInspector.LineLevelProfile._instance = new WebInspector.LineLevelProfile();
    return WebInspector.LineLevelProfile._instance;
}

WebInspector.LineLevelProfile.prototype = {
    /**
     * @param {!WebInspector.CPUProfileDataModel} profile
     */
    appendCPUProfile: function(profile)
    {
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
    },

    reset: function()
    {
        /** @type {!Map<string, !Map<number, number>>} */
        this._files = new Map();
        this._scheduleUpdate();
    },

    _scheduleUpdate: function()
    {
        if (this._updateTimer)
            return;
        this._updateTimer = setTimeout(() => {
            this._updateTimer = null;
            this._doUpdate();
        }, 0);
    },

    _doUpdate: function()
    {
        this._locationPool.disposeAll();
        WebInspector.workspace.uiSourceCodes().forEach(uiSourceCode => uiSourceCode.removeAllLineDecorations(WebInspector.LineLevelProfile.LineDecorator.type));
        var debuggerModel = WebInspector.DebuggerModel.fromTarget(WebInspector.targetManager.mainTarget());
        if (!debuggerModel)
            return;
        for (var fileInfo of this._files) {
            var url = /** @type {string} */ (fileInfo[0]);
            var uiSourceCode = WebInspector.workspace.uiSourceCodeForURL(url);
            for (var lineInfo of fileInfo[1]) {
                var line = lineInfo[0] - 1;
                var time = lineInfo[1];
                var rawLocation = debuggerModel.createRawLocationByURL(url, line, 0);
                if (rawLocation)
                    new WebInspector.LineLevelProfile.Presentation(rawLocation, time, this._locationPool);
                else if (uiSourceCode)
                    uiSourceCode.addLineDecoration(line, WebInspector.LineLevelProfile.LineDecorator.type, time);
            }
        }
    }
}

/**
 * @constructor
 * @param {!WebInspector.DebuggerModel.Location} rawLocation
 * @param {number} time
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.LineLevelProfile.Presentation = function(rawLocation, time, locationPool)
{
    this._time = time;
    WebInspector.debuggerWorkspaceBinding.createLiveLocation(rawLocation, this.updateLocation.bind(this), locationPool);
}

WebInspector.LineLevelProfile.Presentation.prototype = {
    /**
     * @param {!WebInspector.LiveLocation} liveLocation
     */
    updateLocation: function(liveLocation)
    {
        if (this._uiLocation)
            this._uiLocation.uiSourceCode.removeLineDecoration(this._uiLocation.lineNumber, WebInspector.LineLevelProfile.LineDecorator.type);
        this._uiLocation = liveLocation.uiLocation();
        if (this._uiLocation)
            this._uiLocation.uiSourceCode.addLineDecoration(this._uiLocation.lineNumber, WebInspector.LineLevelProfile.LineDecorator.type, this._time);
    }
}

/**
 * @constructor
 * @implements {WebInspector.UISourceCodeFrame.LineDecorator}
 */
WebInspector.LineLevelProfile.LineDecorator = function()
{
}

WebInspector.LineLevelProfile.LineDecorator.type = "performance";

WebInspector.LineLevelProfile.LineDecorator.prototype = {
    /**
     * @override
     * @param {!WebInspector.UISourceCode} uiSourceCode
     * @param {!WebInspector.CodeMirrorTextEditor} textEditor
     */
    decorate: function(uiSourceCode, textEditor)
    {
        var gutterType = "CodeMirror-gutter-performance";
        var decorations = uiSourceCode.lineDecorations(WebInspector.LineLevelProfile.LineDecorator.type);
        textEditor.uninstallGutter(gutterType);
        if (!decorations)
            return;
        textEditor.installGutter(gutterType, false);
        for (var decoration of decorations.values()) {
            var time = /** @type {number} */ (decoration.data());
            var text = WebInspector.UIString("%.1f\xa0ms", time);
            var intensity = Number.constrain(Math.log10(1 + 2 * time) / 5, 0.02, 1);
            var element = createElementWithClass("div", "text-editor-line-marker-performance");
            element.textContent = text;
            element.style.backgroundColor = `hsla(44, 100%, 50%, ${intensity.toFixed(3)})`;
            textEditor.setGutterDecoration(decoration.line(), gutterType, element);
        }
    }
}
