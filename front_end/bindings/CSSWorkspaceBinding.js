// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.TargetManager} targetManager
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 */
WebInspector.CSSWorkspaceBinding = function(targetManager, workspace, networkMapping)
{
    this._workspace = workspace;
    this._networkMapping = networkMapping;

    /** @type {!Map.<!WebInspector.CSSModel, !WebInspector.CSSWorkspaceBinding.TargetInfo>} */
    this._modelToTargetInfo = new Map();
    targetManager.observeTargets(this);
}

WebInspector.CSSWorkspaceBinding.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        var cssModel = WebInspector.CSSModel.fromTarget(target);
        if (cssModel)
            this._modelToTargetInfo.set(cssModel, new WebInspector.CSSWorkspaceBinding.TargetInfo(cssModel, this._workspace, this._networkMapping));
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        var cssModel = WebInspector.CSSModel.fromTarget(target);
        if (cssModel)
            this._modelToTargetInfo.remove(cssModel)._dispose();
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {?WebInspector.CSSWorkspaceBinding.TargetInfo}
     */
    _targetInfo: function(header)
    {
        return this._modelToTargetInfo.get(header.cssModel()) || null;
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {!WebInspector.CSSWorkspaceBinding.TargetInfo}
     */
    _ensureTargetInfo: function(header)
    {
        var targetInfo = this._modelToTargetInfo.get(header.cssModel());
        if (!targetInfo) {
            targetInfo = new WebInspector.CSSWorkspaceBinding.TargetInfo(header.cssModel(), this._workspace, this._networkMapping);
            this._modelToTargetInfo.set(header.cssModel(), targetInfo);
        }
        return targetInfo;
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    updateLocations: function(header)
    {
        var targetInfo = this._targetInfo(header);
        if (targetInfo)
            targetInfo._updateLocations(header);
    },

    /**
     * @param {!WebInspector.CSSLocation} rawLocation
     * @param {function(!WebInspector.LiveLocation)} updateDelegate
     * @param {!WebInspector.LiveLocationPool} locationPool
     * @return {!WebInspector.CSSWorkspaceBinding.LiveLocation}
     */
    createLiveLocation: function(rawLocation, updateDelegate, locationPool)
    {
        var header = rawLocation.styleSheetId ? rawLocation.cssModel().styleSheetHeaderForId(rawLocation.styleSheetId) : null;
        return new WebInspector.CSSWorkspaceBinding.LiveLocation(rawLocation.cssModel(), header, rawLocation, this, updateDelegate, locationPool);
    },

    /**
     * @param {!WebInspector.CSSWorkspaceBinding.LiveLocation} location
     */
    _addLiveLocation: function(location)
    {
        this._ensureTargetInfo(location._header)._addLocation(location);
    },

    /**
     * @param {!WebInspector.CSSWorkspaceBinding.LiveLocation} location
     */
    _removeLiveLocation: function(location)
    {
        var targetInfo = this._targetInfo(location._header);
        if (targetInfo)
            targetInfo._removeLocation(location);
    },

    /**
     * @param {!WebInspector.CSSProperty} cssProperty
     * @param {boolean} forName
     * @return {?WebInspector.UILocation}
     */
    propertyUILocation: function(cssProperty, forName)
    {
        var style = cssProperty.ownerStyle;
        if (!style || style.type !== WebInspector.CSSStyleDeclaration.Type.Regular || !style.styleSheetId)
            return null;
        var header = style.cssModel().styleSheetHeaderForId(style.styleSheetId);
        if (!header)
            return null;

        var range = forName ? cssProperty.nameRange() : cssProperty.valueRange();
        if (!range)
            return null;

        var lineNumber = range.startLine;
        var columnNumber = range.startColumn;
        var rawLocation = new WebInspector.CSSLocation(header, header.lineNumberInSource(lineNumber), header.columnNumberInSource(lineNumber, columnNumber));
        return this.rawLocationToUILocation(rawLocation);
    },

    /**
     * @param {?WebInspector.CSSLocation} rawLocation
     * @return {?WebInspector.UILocation}
     */
    rawLocationToUILocation: function(rawLocation)
    {
        if (!rawLocation)
            return null;
        var header = rawLocation.cssModel().styleSheetHeaderForId(rawLocation.styleSheetId);
        if (!header)
            return null;
        var targetInfo = this._targetInfo(header);
        return targetInfo ? targetInfo._rawLocationToUILocation(header, rawLocation.lineNumber, rawLocation.columnNumber) : null;
    }
}

/**
 * @constructor
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!WebInspector.Workspace} workspace
 * @param {!WebInspector.NetworkMapping} networkMapping
 */
WebInspector.CSSWorkspaceBinding.TargetInfo = function(cssModel, workspace, networkMapping)
{
    this._cssModel = cssModel;
    this._stylesSourceMapping = new WebInspector.StylesSourceMapping(cssModel, workspace, networkMapping);
    this._sassSourceMapping = new WebInspector.SASSSourceMapping(cssModel, networkMapping, WebInspector.NetworkProject.forTarget(cssModel.target()));

    /** @type {!Multimap<!WebInspector.CSSStyleSheetHeader, !WebInspector.LiveLocation>} */
    this._locations = new Multimap();
}

WebInspector.CSSWorkspaceBinding.TargetInfo.prototype = {
    /**
     * @param {!WebInspector.CSSWorkspaceBinding.LiveLocation} location
     */
    _addLocation: function(location)
    {
        var header = location._header;
        this._locations.set(header, location);
        location.update();
    },

    /**
     * @param {!WebInspector.CSSWorkspaceBinding.LiveLocation} location
     */
    _removeLocation: function(location)
    {
        this._locations.remove(location._header, location);
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    _updateLocations: function(header)
    {
        for (var location of this._locations.get(header))
            location.update();
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @param {number} lineNumber
     * @param {number=} columnNumber
     * @return {?WebInspector.UILocation}
     */
    _rawLocationToUILocation: function(header, lineNumber, columnNumber)
    {
        var rawLocation = new WebInspector.CSSLocation(header, lineNumber, columnNumber);
        var uiLocation = null;
        uiLocation = uiLocation || this._sassSourceMapping.rawLocationToUILocation(rawLocation);
        uiLocation = uiLocation || this._stylesSourceMapping.rawLocationToUILocation(rawLocation);
        return uiLocation;
    },

    _dispose: function()
    {
        this._stylesSourceMapping.dispose();
        this._sassSourceMapping.dispose();
    }
}

/**
 * @constructor
 * @extends {WebInspector.LiveLocationWithPool}
 * @param {!WebInspector.CSSModel} cssModel
 * @param {?WebInspector.CSSStyleSheetHeader} header
 * @param {!WebInspector.CSSLocation} rawLocation
 * @param {!WebInspector.CSSWorkspaceBinding} binding
 * @param {function(!WebInspector.LiveLocation)} updateDelegate
 * @param {!WebInspector.LiveLocationPool} locationPool
 */
WebInspector.CSSWorkspaceBinding.LiveLocation = function(cssModel, header, rawLocation, binding, updateDelegate, locationPool)
{
    WebInspector.LiveLocationWithPool.call(this, updateDelegate, locationPool);
    this._cssModel = cssModel;
    this._rawLocation = rawLocation;
    this._binding = binding;
    if (!header)
        this._clearStyleSheet();
    else
        this._setStyleSheet(header);
}

WebInspector.CSSWorkspaceBinding.LiveLocation.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetAdded: function(event)
    {
        console.assert(!this._header);
        var header = /** @type {!WebInspector.CSSStyleSheetHeader} */ (event.data);
        if (header.sourceURL && header.sourceURL === this._rawLocation.url)
            this._setStyleSheet(header);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _styleSheetRemoved: function(event)
    {
        console.assert(this._header);
        var header = /** @type {!WebInspector.CSSStyleSheetHeader} */ (event.data);
        if (this._header !== header)
            return;
        this._binding._removeLiveLocation(this);
        this._clearStyleSheet();
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    _setStyleSheet: function(header)
    {
        this._header = header;
        this._binding._addLiveLocation(this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
    },

    _clearStyleSheet: function()
    {
        delete this._header;
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
    },

    /**
     * @override
     * @return {?WebInspector.UILocation}
     */
    uiLocation: function()
    {
        var cssLocation = this._rawLocation;
        if (this._header) {
            var targetInfo = this._binding._targetInfo(this._header);
            return targetInfo._rawLocationToUILocation(this._header, cssLocation.lineNumber, cssLocation.columnNumber);
        }
        var uiSourceCode = this._binding._networkMapping.uiSourceCodeForStyleURL(cssLocation.url, cssLocation.header());
        if (!uiSourceCode)
            return null;
        return uiSourceCode.uiLocation(cssLocation.lineNumber, cssLocation.columnNumber);
    },

    /**
     * @override
     */
    dispose: function()
    {
        WebInspector.LiveLocationWithPool.prototype.dispose.call(this);
        if (this._header)
            this._binding._removeLiveLocation(this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this);
    },

    /**
     * @override
     * @return {boolean}
     */
    isBlackboxed: function()
    {
        return false;
    },

    __proto__: WebInspector.LiveLocationWithPool.prototype
}

/**
 * @type {!WebInspector.CSSWorkspaceBinding}
 */
WebInspector.cssWorkspaceBinding;
