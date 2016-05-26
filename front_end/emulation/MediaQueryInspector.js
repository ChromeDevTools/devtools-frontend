// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.Widget}
 * @implements {WebInspector.TargetManager.Observer}
 * @param {function():number} getWidthCallback
 * @param {function(number)} setWidthCallback
 */
WebInspector.MediaQueryInspector = function(getWidthCallback, setWidthCallback)
{
    WebInspector.Widget.call(this, true);
    this.registerRequiredCSS("emulation/mediaQueryInspector.css");
    this.contentElement.classList.add("media-inspector-view");
    this.contentElement.addEventListener("click", this._onMediaQueryClicked.bind(this), false);
    this.contentElement.addEventListener("contextmenu", this._onContextMenu.bind(this), false);
    this._mediaThrottler = new WebInspector.Throttler(0);

    this._getWidthCallback = getWidthCallback;
    this._setWidthCallback = setWidthCallback;
    this._scale = 1;

    WebInspector.targetManager.observeTargets(this);
    WebInspector.zoomManager.addEventListener(WebInspector.ZoomManager.Events.ZoomChanged, this._renderMediaQueries.bind(this), this);
}

/**
 * @enum {number}
 */
WebInspector.MediaQueryInspector.Section = {
    Max: 0,
    MinMax: 1,
    Min: 2
}

WebInspector.MediaQueryInspector.prototype = {
    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        // FIXME: adapt this to multiple targets.
        if (this._cssModel)
            return;
        this._cssModel = WebInspector.CSSModel.fromTarget(target);
        if (!this._cssModel)
            return;
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetChanged, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.addEventListener(WebInspector.CSSModel.Events.MediaQueryResultChanged, this._scheduleMediaQueriesUpdate, this);
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (WebInspector.CSSModel.fromTarget(target) !== this._cssModel)
            return;
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.StyleSheetChanged, this._scheduleMediaQueriesUpdate, this);
        this._cssModel.removeEventListener(WebInspector.CSSModel.Events.MediaQueryResultChanged, this._scheduleMediaQueriesUpdate, this);
        delete this._cssModel;
    },

    /**
     * @param {number} scale
     */
    setAxisTransform: function(scale)
    {
        if (Math.abs(this._scale - scale) < 1e-8)
            return;
        this._scale = scale;
        this._renderMediaQueries();
    },

    /**
     * @param {!Event} event
     */
    _onMediaQueryClicked: function(event)
    {
        var mediaQueryMarker = event.target.enclosingNodeOrSelfWithClass("media-inspector-bar");
        if (!mediaQueryMarker)
            return;

        var model = mediaQueryMarker._model;
        if (model.section() === WebInspector.MediaQueryInspector.Section.Max) {
            this._setWidthCallback(model.maxWidthExpression().computedLength());
            return;
        }
        if (model.section() === WebInspector.MediaQueryInspector.Section.Min) {
            this._setWidthCallback(model.minWidthExpression().computedLength());
            return;
        }
        var currentWidth = this._getWidthCallback();
        if (currentWidth !== model.minWidthExpression().computedLength())
            this._setWidthCallback(model.minWidthExpression().computedLength());
        else
            this._setWidthCallback(model.maxWidthExpression().computedLength());
    },

    /**
     * @param {!Event} event
     */
    _onContextMenu: function(event)
    {
        if (!this._cssModel || !this._cssModel.isEnabled())
            return;

        var mediaQueryMarker = event.target.enclosingNodeOrSelfWithClass("media-inspector-bar");
        if (!mediaQueryMarker)
            return;

        var locations = mediaQueryMarker._locations;
        var uiLocations = new Map();
        for (var i = 0; i < locations.length; ++i) {
            var uiLocation = WebInspector.cssWorkspaceBinding.rawLocationToUILocation(locations[i]);
            if (!uiLocation)
                continue;
            var descriptor = String.sprintf("%s:%d:%d", uiLocation.uiSourceCode.url(), uiLocation.lineNumber + 1, uiLocation.columnNumber + 1);
            uiLocations.set(descriptor, uiLocation);
        }

        var contextMenuItems = uiLocations.keysArray().sort();
        var contextMenu = new WebInspector.ContextMenu(event);
        var subMenuItem = contextMenu.appendSubMenuItem(WebInspector.UIString.capitalize("Reveal in ^source ^code"));
        for (var i = 0; i < contextMenuItems.length; ++i) {
            var title = contextMenuItems[i];
            subMenuItem.appendItem(title, this._revealSourceLocation.bind(this, /** @type {!WebInspector.UILocation} */(uiLocations.get(title))));
        }
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.UILocation} location
     */
    _revealSourceLocation: function(location)
    {
        WebInspector.Revealer.reveal(location);
    },

    _scheduleMediaQueriesUpdate: function()
    {
        if (!this.isShowing())
            return;
        this._mediaThrottler.schedule(this._refetchMediaQueries.bind(this));
    },

    _refetchMediaQueries: function()
    {
        if (!this.isShowing() || !this._cssModel)
            return Promise.resolve();

        return this._cssModel.mediaQueriesPromise()
            .then(this._rebuildMediaQueries.bind(this))
    },

    /**
     * @param {!Array.<!WebInspector.MediaQueryInspector.MediaQueryUIModel>} models
     * @return {!Array.<!WebInspector.MediaQueryInspector.MediaQueryUIModel>}
     */
    _squashAdjacentEqual: function(models)
    {
        var filtered = [];
        for (var i = 0; i < models.length; ++i) {
            var last = filtered.peekLast();
            if (!last || !last.equals(models[i]))
                filtered.push(models[i]);
        }
        return filtered;
    },

    /**
     * @param {!Array.<!WebInspector.CSSMedia>} cssMedias
     */
    _rebuildMediaQueries: function(cssMedias)
    {
        var queryModels = [];
        for (var i = 0; i < cssMedias.length; ++i) {
            var cssMedia = cssMedias[i];
            if (!cssMedia.mediaList)
                continue;
            for (var j = 0; j < cssMedia.mediaList.length; ++j) {
                var mediaQuery = cssMedia.mediaList[j];
                var queryModel = WebInspector.MediaQueryInspector.MediaQueryUIModel.createFromMediaQuery(cssMedia, mediaQuery);
                if (queryModel && queryModel.rawLocation())
                    queryModels.push(queryModel);
            }
        }
        queryModels.sort(compareModels);
        queryModels = this._squashAdjacentEqual(queryModels);

        var allEqual = this._cachedQueryModels && this._cachedQueryModels.length === queryModels.length;
        for (var i = 0; allEqual && i < queryModels.length; ++i)
            allEqual = allEqual && this._cachedQueryModels[i].equals(queryModels[i]);
        if (allEqual)
            return;
        this._cachedQueryModels = queryModels;
        this._renderMediaQueries();

        /**
         * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model1
         * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model2
         * @return {number}
         */
        function compareModels(model1, model2)
        {
            return model1.compareTo(model2);
        }
    },

    _renderMediaQueries: function()
    {
        if (!this._cachedQueryModels || !this.isShowing())
            return;

        var markers = [];
        var lastMarker = null;
        for (var i = 0; i < this._cachedQueryModels.length; ++i) {
            var model = this._cachedQueryModels[i];
            if (lastMarker && lastMarker.model.dimensionsEqual(model)) {
                lastMarker.locations.push(model.rawLocation());
                lastMarker.active = lastMarker.active || model.active();
            } else {
                lastMarker = {
                    active: model.active(),
                    model: model,
                    locations: [ model.rawLocation() ]
                };
                markers.push(lastMarker);
            }
        }

        this.contentElement.removeChildren();

        var container = null;
        for (var i = 0; i < markers.length; ++i) {
            if (!i || markers[i].model.section() !== markers[i - 1].model.section())
                container = this.contentElement.createChild("div", "media-inspector-marker-container");
            var marker = markers[i];
            var bar = this._createElementFromMediaQueryModel(marker.model);
            bar._model = marker.model;
            bar._locations = marker.locations;
            bar.classList.toggle("media-inspector-marker-inactive", !marker.active);
            container.appendChild(bar);
        }
    },

    /**
     * @return {number}
     */
    _zoomFactor: function()
    {
        return WebInspector.zoomManager.zoomFactor() / this._scale;
    },

    wasShown: function()
    {
        this._scheduleMediaQueriesUpdate();
    },

    /**
     * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} model
     * @return {!Element}
     */
    _createElementFromMediaQueryModel: function(model)
    {
        var zoomFactor = this._zoomFactor();
        var minWidthValue = model.minWidthExpression() ? model.minWidthExpression().computedLength() / zoomFactor : 0;
        var maxWidthValue = model.maxWidthExpression() ? model.maxWidthExpression().computedLength() / zoomFactor : 0;
        var result = createElementWithClass("div", "media-inspector-bar");

        if (model.section() === WebInspector.MediaQueryInspector.Section.Max) {
            result.createChild("div", "media-inspector-marker-spacer");
            var markerElement = result.createChild("div", "media-inspector-marker media-inspector-marker-max-width");
            markerElement.style.width = maxWidthValue + "px";
            markerElement.title = model.mediaText();
            appendLabel(markerElement, model.maxWidthExpression(), false, false);
            appendLabel(markerElement, model.maxWidthExpression(), true, true);
            result.createChild("div", "media-inspector-marker-spacer");
        }

        if (model.section() === WebInspector.MediaQueryInspector.Section.MinMax) {
            result.createChild("div", "media-inspector-marker-spacer");
            var leftElement = result.createChild("div", "media-inspector-marker media-inspector-marker-min-max-width");
            leftElement.style.width = (maxWidthValue - minWidthValue) * 0.5 + "px";
            leftElement.title = model.mediaText();
            appendLabel(leftElement, model.minWidthExpression(), true, false);
            appendLabel(leftElement, model.maxWidthExpression(), false, true);
            result.createChild("div", "media-inspector-marker-spacer").style.flex = "0 0 " + minWidthValue + "px";
            var rightElement = result.createChild("div", "media-inspector-marker media-inspector-marker-min-max-width");
            rightElement.style.width = (maxWidthValue - minWidthValue) * 0.5  + "px";
            rightElement.title = model.mediaText();
            appendLabel(rightElement, model.minWidthExpression(), true, false);
            appendLabel(rightElement, model.maxWidthExpression(), false, true);
            result.createChild("div", "media-inspector-marker-spacer");
        }

        if (model.section() === WebInspector.MediaQueryInspector.Section.Min) {
            var leftElement = result.createChild("div", "media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-left");
            leftElement.title = model.mediaText();
            appendLabel(leftElement, model.minWidthExpression(), false, false);
            result.createChild("div", "media-inspector-marker-spacer").style.flex = "0 0 " + minWidthValue + "px";
            var rightElement = result.createChild("div", "media-inspector-marker media-inspector-marker-min-width media-inspector-marker-min-width-right");
            rightElement.title = model.mediaText();
            appendLabel(rightElement, model.minWidthExpression(), true, true);
        }

        function appendLabel(marker, expression, atLeft, leftAlign)
        {
            marker.createChild("div", "media-inspector-marker-label-container " + (atLeft ? "media-inspector-marker-label-container-left" : "media-inspector-marker-label-container-right"))
                .createChild("span", "media-inspector-marker-label " + (leftAlign ? "media-inspector-label-left" : "media-inspector-label-right"))
                .textContent = expression.value() + expression.unit();
        }

        return result;
    },

    __proto__: WebInspector.Widget.prototype
};

/**
 * @constructor
 * @param {!WebInspector.CSSMedia} cssMedia
 * @param {?WebInspector.CSSMediaQueryExpression} minWidthExpression
 * @param {?WebInspector.CSSMediaQueryExpression} maxWidthExpression
 * @param {boolean} active
 */
WebInspector.MediaQueryInspector.MediaQueryUIModel = function(cssMedia, minWidthExpression, maxWidthExpression, active)
{
    this._cssMedia = cssMedia;
    this._minWidthExpression = minWidthExpression;
    this._maxWidthExpression = maxWidthExpression;
    this._active = active;
    if (maxWidthExpression && !minWidthExpression)
        this._section = WebInspector.MediaQueryInspector.Section.Max;
    else if (minWidthExpression && maxWidthExpression)
        this._section = WebInspector.MediaQueryInspector.Section.MinMax;
    else
        this._section = WebInspector.MediaQueryInspector.Section.Min;
}

/**
 * @param {!WebInspector.CSSMedia} cssMedia
 * @param {!WebInspector.CSSMediaQuery} mediaQuery
 * @return {?WebInspector.MediaQueryInspector.MediaQueryUIModel}
 */
WebInspector.MediaQueryInspector.MediaQueryUIModel.createFromMediaQuery = function(cssMedia, mediaQuery)
{
    var maxWidthExpression = null;
    var maxWidthPixels = Number.MAX_VALUE;
    var minWidthExpression = null;
    var minWidthPixels = Number.MIN_VALUE;
    var expressions = mediaQuery.expressions();
    for (var i = 0; i < expressions.length; ++i) {
        var expression = expressions[i];
        var feature = expression.feature();
        if (feature.indexOf("width") === -1)
            continue;
        var pixels = expression.computedLength();
        if (feature.startsWith("max-") && pixels < maxWidthPixels) {
            maxWidthExpression = expression;
            maxWidthPixels = pixels;
        } else if (feature.startsWith("min-") && pixels > minWidthPixels) {
            minWidthExpression = expression;
            minWidthPixels = pixels;
        }
    }
    if (minWidthPixels > maxWidthPixels || (!maxWidthExpression && !minWidthExpression))
        return null;

    return new WebInspector.MediaQueryInspector.MediaQueryUIModel(cssMedia, minWidthExpression, maxWidthExpression, mediaQuery.active());
}

WebInspector.MediaQueryInspector.MediaQueryUIModel.prototype = {
    /**
     * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} other
     * @return {boolean}
     */
    equals: function(other)
    {
        return this.compareTo(other) === 0;
    },

    /**
     * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} other
     * @return {boolean}
     */
    dimensionsEqual: function(other)
    {
        return this.section() === other.section()
            && (!this.minWidthExpression() || (this.minWidthExpression().computedLength() === other.minWidthExpression().computedLength()))
            && (!this.maxWidthExpression() || (this.maxWidthExpression().computedLength() === other.maxWidthExpression().computedLength()));
    },

    /**
     * @param {!WebInspector.MediaQueryInspector.MediaQueryUIModel} other
     * @return {number}
     */
    compareTo: function(other)
    {
        if (this.section() !== other.section())
            return this.section() - other.section();
        if (this.dimensionsEqual(other)) {
            var myLocation = this.rawLocation();
            var otherLocation = other.rawLocation();
            if (!myLocation && !otherLocation)
                return this.mediaText().compareTo(other.mediaText());
            if (myLocation && !otherLocation)
                return 1;
            if (!myLocation && otherLocation)
                return -1;
            if (this.active() !== other.active())
                return this.active() ? -1 : 1;
            return myLocation.url.compareTo(otherLocation.url) || myLocation.lineNumber - otherLocation.lineNumber || myLocation.columnNumber - otherLocation.columnNumber;
        }
        if (this.section() === WebInspector.MediaQueryInspector.Section.Max)
            return other.maxWidthExpression().computedLength() - this.maxWidthExpression().computedLength();
        if (this.section() === WebInspector.MediaQueryInspector.Section.Min)
            return this.minWidthExpression().computedLength() - other.minWidthExpression().computedLength();
        return this.minWidthExpression().computedLength() - other.minWidthExpression().computedLength() || other.maxWidthExpression().computedLength() - this.maxWidthExpression().computedLength();
    },

    /**
     * @return {!WebInspector.MediaQueryInspector.Section}
     */
    section: function()
    {
        return this._section;
    },

    /**
     * @return {string}
     */
    mediaText: function()
    {
        return this._cssMedia.text;
    },

    /**
     * @return {?WebInspector.CSSLocation}
     */
    rawLocation: function()
    {
        if (!this._rawLocation)
            this._rawLocation = this._cssMedia.rawLocation();
        return this._rawLocation;
    },

    /**
     * @return {?WebInspector.CSSMediaQueryExpression}
     */
    minWidthExpression: function()
    {
        return this._minWidthExpression;
    },

    /**
     * @return {?WebInspector.CSSMediaQueryExpression}
     */
    maxWidthExpression: function()
    {
        return this._maxWidthExpression;
    },

    /**
     * @return {boolean}
     */
    active: function()
    {
        return this._active;
    }
}
