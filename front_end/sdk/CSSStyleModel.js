/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.CSSStyleModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.CSSStyleModel, target);
    this._domModel = WebInspector.DOMModel.fromTarget(target);
    this._agent = target.cssAgent();
    this._styleLoader = new WebInspector.CSSStyleModel.ComputedStyleLoader(this);
    target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._mainFrameNavigated, this);
    target.registerCSSDispatcher(new WebInspector.CSSDispatcher(this));
    this._agent.enable().then(this._wasEnabled.bind(this));
    /** @type {!Map.<string, !WebInspector.CSSStyleSheetHeader>} */
    this._styleSheetIdToHeader = new Map();
    /** @type {!Map.<string, !Object.<!PageAgent.FrameId, !Array.<!CSSAgent.StyleSheetId>>>} */
    this._styleSheetIdsForURL = new Map();
}

WebInspector.CSSStyleModel.Events = {
    LayoutEditorChange: "LayoutEditorChange",
    MediaQueryResultChanged: "MediaQueryResultChanged",
    ModelWasEnabled: "ModelWasEnabled",
    PseudoStateForced: "PseudoStateForced",
    StyleSheetAdded: "StyleSheetAdded",
    StyleSheetChanged: "StyleSheetChanged",
    StyleSheetRemoved: "StyleSheetRemoved"
}

WebInspector.CSSStyleModel.MediaTypes = ["all", "braille", "embossed", "handheld", "print", "projection", "screen", "speech", "tty", "tv"];

WebInspector.CSSStyleModel.PseudoStateMarker = "pseudo-state-marker";

/**
 * @constructor
 * @param {!CSSAgent.StyleSheetId} styleSheetId
 * @param {!WebInspector.TextRange} oldRange
 * @param {string} newText
 * @param {?Object} payload
 */
WebInspector.CSSStyleModel.Edit = function(styleSheetId, oldRange, newText, payload)
{
    this.styleSheetId = styleSheetId;
    this.oldRange = oldRange;
    this.newRange = WebInspector.TextRange.fromEdit(oldRange, newText);
    this.payload = payload;
}

WebInspector.CSSStyleModel.prototype = {
    /**
     * @return {!WebInspector.DOMModel}
     */
    domModel: function()
    {
        return /** @type {!WebInspector.DOMModel} */(this._domModel);
    },

    /**
     * @param {!Array<!CSSAgent.StyleSheetId>} styleSheetIds
     * @param {!Array<!WebInspector.TextRange>} ranges
     * @param {!Array<string>} texts
     * @param {boolean} majorChange
     * @return {!Promise<?Array<!CSSAgent.CSSStyle>>}
     */
    setStyleTexts: function(styleSheetIds, ranges, texts, majorChange)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array<!CSSAgent.CSSStyle>} stylePayloads
         * @return {?Array<!CSSAgent.CSSStyle>}
         * @this {WebInspector.CSSStyleModel}
         */
        function parsePayload(error, stylePayloads)
        {
            if (error || !stylePayloads || stylePayloads.length !== ranges.length)
                return null;

            if (majorChange)
                this._domModel.markUndoableState();
            for (var i = 0; i < ranges.length; ++i) {
                var edit = new WebInspector.CSSStyleModel.Edit(styleSheetIds[i], ranges[i], texts[i], stylePayloads[i]);
                this._fireStyleSheetChanged(styleSheetIds[i], edit);
            }
            return stylePayloads;
        }

        console.assert(styleSheetIds.length === ranges.length && ranges.length === texts.length, "Array lengths must be equal");
        var edits = [];
        for (var i = 0; i < styleSheetIds.length; ++i) {
            edits.push({
                styleSheetId: styleSheetIds[i],
                range: ranges[i].serializeToObject(),
                text: texts[i]
            });
        }

        return this._agent.setStyleTexts(edits, parsePayload.bind(this))
            .catchException(/** @type {?Array<!CSSAgent.CSSStyle>} */(null));
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.TextRange} range
     * @param {string} text
     * @return {!Promise<boolean>}
     */
    setSelectorText: function(styleSheetId, range, text)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.SelectorList} selectorPayload
         * @return {boolean}
         * @this {WebInspector.CSSStyleModel}
         */
        function callback(error, selectorPayload)
        {
            if (error || !selectorPayload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSStyleModel.Edit(styleSheetId, range, text, selectorPayload);
            this._fireStyleSheetChanged(styleSheetId, edit);
            return true;
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        return this._agent.setRuleSelector(styleSheetId, range, text, callback.bind(this))
            .catchException(false);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.TextRange} range
     * @param {string} text
     * @return {!Promise<boolean>}
     */
    setKeyframeKey: function(styleSheetId, range, text)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!CSSAgent.Value} payload
         * @return {boolean}
         * @this {WebInspector.CSSStyleModel}
         */
        function callback(error, payload)
        {
            if (error || !payload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSStyleModel.Edit(styleSheetId, range, text, payload);
            this._fireStyleSheetChanged(styleSheetId, edit);
            return true;
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        return this._agent.setKeyframeKey(styleSheetId, range, text, callback.bind(this))
            .catchException(false);
    },

    /**
     * @return {!Promise.<!Array.<!WebInspector.CSSMedia>>}
     */
    mediaQueriesPromise: function()
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array.<!CSSAgent.CSSMedia>} payload
         * @return {!Array.<!WebInspector.CSSMedia>}
         * @this {!WebInspector.CSSStyleModel}
         */
        function parsePayload(error, payload)
        {
            return !error && payload ? WebInspector.CSSMedia.parseMediaArrayPayload(this, payload) : [];
        }

        return this._agent.getMediaQueries(parsePayload.bind(this));
    },

    /**
     * @return {boolean}
     */
    isEnabled: function()
    {
        return this._isEnabled;
    },

    /**
     * @param {?Protocol.Error} error
     */
    _wasEnabled: function(error)
    {
        if (error) {
            console.error("Failed to enabled CSS agent: " + error);
            return;
        }
        this._isEnabled = true;
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.ModelWasEnabled);
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise.<?WebInspector.CSSStyleModel.MatchedStyleResult>}
     */
    matchedStylesPromise: function(nodeId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.CSSStyle=} inlinePayload
         * @param {?CSSAgent.CSSStyle=} attributesPayload
         * @param {!Array.<!CSSAgent.RuleMatch>=} matchedPayload
         * @param {!Array.<!CSSAgent.PseudoElementMatches>=} pseudoPayload
         * @param {!Array.<!CSSAgent.InheritedStyleEntry>=} inheritedPayload
         * @param {!Array.<!CSSAgent.CSSKeyframesRule>=} animationsPayload
         * @return {?WebInspector.CSSStyleModel.MatchedStyleResult}
         * @this {WebInspector.CSSStyleModel}
         */
        function callback(error, inlinePayload, attributesPayload, matchedPayload, pseudoPayload, inheritedPayload, animationsPayload)
        {
            if (error)
                return null;

            var node = this._domModel.nodeForId(nodeId);
            if (!node)
                return null;

            return new WebInspector.CSSStyleModel.MatchedStyleResult(this, node, inlinePayload || null, attributesPayload || null, matchedPayload || [], pseudoPayload || [], inheritedPayload || [], animationsPayload || []);
        }

        return this._agent.getMatchedStylesForNode(nodeId, callback.bind(this));
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise.<?Map.<string, string>>}
     */
    computedStylePromise: function(nodeId)
    {
        return this._styleLoader.computedStylePromise(nodeId);
    },

    /**
     * @param {number} nodeId
     * @return {!Promise<?Array<string>>}
     */
    backgroundColorsPromise: function(nodeId)
    {
        /**
         * @param {?string} error
         * @param {!Array<string>=} backgroundColors
         * @return {?Array<string>}
         */
        function backgroundColorsCallback(error, backgroundColors) {
            return !error && backgroundColors ? backgroundColors : null;
        }
        return this._agent.getBackgroundColors(nodeId, backgroundColorsCallback);
    },

    /**
     * @param {number} nodeId
     * @return {!Promise.<?Array.<!CSSAgent.PlatformFontUsage>>}
     */
    platformFontsPromise: function(nodeId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array.<!CSSAgent.PlatformFontUsage>} fonts
         * @return {?Array.<!CSSAgent.PlatformFontUsage>}
         */
        function platformFontsCallback(error, fonts)
        {
            return !error && fonts ? fonts : null;
        }

        return this._agent.getPlatformFontsForNode(nodeId, platformFontsCallback);
    },

    /**
     * @return {!Array.<!WebInspector.CSSStyleSheetHeader>}
     */
    allStyleSheets: function()
    {
        var values = this._styleSheetIdToHeader.valuesArray();
        /**
         * @param {!WebInspector.CSSStyleSheetHeader} a
         * @param {!WebInspector.CSSStyleSheetHeader} b
         * @return {number}
         */
        function styleSheetComparator(a, b)
        {
            if (a.sourceURL < b.sourceURL)
                return -1;
            else if (a.sourceURL > b.sourceURL)
                return 1;
            return a.startLine - b.startLine || a.startColumn - b.startColumn;
        }
        values.sort(styleSheetComparator);

        return values;
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise.<?WebInspector.CSSStyleModel.InlineStyleResult>}
     */
    inlineStylesPromise: function(nodeId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.CSSStyle=} inlinePayload
         * @param {?CSSAgent.CSSStyle=} attributesStylePayload
         * @return {?WebInspector.CSSStyleModel.InlineStyleResult}
         * @this {WebInspector.CSSStyleModel}
         */
        function callback(error, inlinePayload, attributesStylePayload)
        {
            if (error || !inlinePayload)
                return null;
            var inlineStyle = inlinePayload ? new WebInspector.CSSStyleDeclaration(this, null, inlinePayload, WebInspector.CSSStyleDeclaration.Type.Inline) : null;
            var attributesStyle = attributesStylePayload ? new WebInspector.CSSStyleDeclaration(this, null, attributesStylePayload, WebInspector.CSSStyleDeclaration.Type.Attributes) : null;
            return new WebInspector.CSSStyleModel.InlineStyleResult(inlineStyle, attributesStyle);
        }

        return this._agent.getInlineStylesForNode(nodeId, callback.bind(this));
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {string} pseudoClass
     * @param {boolean} enable
     * @return {boolean}
     */
    forcePseudoState: function(node, pseudoClass, enable)
    {
        var pseudoClasses = node.marker(WebInspector.CSSStyleModel.PseudoStateMarker) || [];
        if (enable) {
            if (pseudoClasses.indexOf(pseudoClass) >= 0)
                return false;
            pseudoClasses.push(pseudoClass);
            node.setMarker(WebInspector.CSSStyleModel.PseudoStateMarker, pseudoClasses);
        } else {
            if (pseudoClasses.indexOf(pseudoClass) < 0)
                return false;
            pseudoClasses.remove(pseudoClass);
            if (!pseudoClasses.length)
                node.setMarker(WebInspector.CSSStyleModel.PseudoStateMarker, null);
        }

        this._agent.forcePseudoState(node.id, pseudoClasses);
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.PseudoStateForced, { node: node, pseudoClass: pseudoClass, enable: enable });
        return true;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?Array<string>} state
     */
    pseudoState: function(node)
    {
        return node.marker(WebInspector.CSSStyleModel.PseudoStateMarker) || [];
    },

    /**
     * @param {!WebInspector.CSSMedia} media
     * @param {string} newMediaText
     * @param {function(?WebInspector.CSSMedia)} userCallback
     */
    setMediaText: function(media, newMediaText, userCallback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!CSSAgent.CSSMedia} mediaPayload
         * @return {boolean}
         * @this {WebInspector.CSSStyleModel}
         */
        function parsePayload(error, mediaPayload)
        {
            if (!mediaPayload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSStyleModel.Edit(media.parentStyleSheetId, media.range, newMediaText, mediaPayload);
            this._fireStyleSheetChanged(media.parentStyleSheetId, edit);
            return true;
        }

        console.assert(!!media.parentStyleSheetId);
        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        this._agent.setMediaText(media.parentStyleSheetId, media.range, newMediaText, parsePayload.bind(this))
            .catchException(null)
            .then(userCallback);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {string} ruleText
     * @param {!WebInspector.TextRange} ruleLocation
     * @return {!Promise<?WebInspector.CSSStyleRule>}
     */
    addRule: function(styleSheetId, ruleText, ruleLocation)
    {
        return this._agent.addRule(styleSheetId, ruleText, ruleLocation, parsePayload.bind(this))
            .catchException(/** @type {?WebInspector.CSSStyleRule} */(null))

        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.CSSRule} rulePayload
         * @return {?WebInspector.CSSStyleRule}
         * @this {WebInspector.CSSStyleModel}
         */
        function parsePayload(error, rulePayload)
        {
            if (error || !rulePayload)
                return null;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSStyleModel.Edit(styleSheetId, ruleLocation, ruleText, rulePayload);
            this._fireStyleSheetChanged(styleSheetId, edit);
            return new WebInspector.CSSStyleRule(this, rulePayload);
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {function(?WebInspector.CSSStyleSheetHeader)} userCallback
     */
    requestViaInspectorStylesheet: function(node, userCallback)
    {
        var frameId = node.frameId() || this.target().resourceTreeModel.mainFrame.id;
        var headers = this._styleSheetIdToHeader.valuesArray();
        for (var i = 0; i < headers.length; ++i) {
            var styleSheetHeader = headers[i];
            if (styleSheetHeader.frameId === frameId && styleSheetHeader.isViaInspector()) {
                userCallback(styleSheetHeader);
                return;
            }
        }

        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.StyleSheetId} styleSheetId
         * @return {?WebInspector.CSSStyleSheetHeader}
         * @this {WebInspector.CSSStyleModel}
         */
        function innerCallback(error, styleSheetId)
        {
            return !error && styleSheetId ? this._styleSheetIdToHeader.get(styleSheetId) || null : null;
        }

        this._agent.createStyleSheet(frameId, innerCallback.bind(this))
            .catchException(null)
            .then(userCallback)
    },

    mediaQueryResultChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} id
     * @return {?WebInspector.CSSStyleSheetHeader}
     */
    styleSheetHeaderForId: function(id)
    {
        return this._styleSheetIdToHeader.get(id) || null;
    },

    /**
     * @return {!Array.<!WebInspector.CSSStyleSheetHeader>}
     */
    styleSheetHeaders: function()
    {
        return this._styleSheetIdToHeader.valuesArray();
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.CSSStyleModel.Edit=} edit
     */
    _fireStyleSheetChanged: function(styleSheetId, edit)
    {
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.StyleSheetChanged, { styleSheetId: styleSheetId, edit: edit });
    },

    /**
     * @param {!CSSAgent.CSSStyleSheetHeader} header
     */
    _styleSheetAdded: function(header)
    {
        console.assert(!this._styleSheetIdToHeader.get(header.styleSheetId));
        var styleSheetHeader = new WebInspector.CSSStyleSheetHeader(this, header);
        this._styleSheetIdToHeader.set(header.styleSheetId, styleSheetHeader);
        var url = styleSheetHeader.resourceURL();
        if (!this._styleSheetIdsForURL.get(url))
            this._styleSheetIdsForURL.set(url, {});
        var frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
        var styleSheetIds = frameIdToStyleSheetIds[styleSheetHeader.frameId];
        if (!styleSheetIds) {
            styleSheetIds = [];
            frameIdToStyleSheetIds[styleSheetHeader.frameId] = styleSheetIds;
        }
        styleSheetIds.push(styleSheetHeader.id);
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.StyleSheetAdded, styleSheetHeader);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} id
     */
    _styleSheetRemoved: function(id)
    {
        var header = this._styleSheetIdToHeader.get(id);
        console.assert(header);
        if (!header)
            return;
        this._styleSheetIdToHeader.remove(id);
        var url = header.resourceURL();
        var frameIdToStyleSheetIds = /** @type {!Object.<!PageAgent.FrameId, !Array.<!CSSAgent.StyleSheetId>>} */ (this._styleSheetIdsForURL.get(url));
        console.assert(frameIdToStyleSheetIds, "No frameId to styleSheetId map is available for given style sheet URL.");
        frameIdToStyleSheetIds[header.frameId].remove(id);
        if (!frameIdToStyleSheetIds[header.frameId].length) {
            delete frameIdToStyleSheetIds[header.frameId];
            if (!Object.keys(frameIdToStyleSheetIds).length)
                this._styleSheetIdsForURL.remove(url);
        }
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, header);
    },

    /**
     * @param {string} url
     * @return {!Array.<!CSSAgent.StyleSheetId>}
     */
    styleSheetIdsForURL: function(url)
    {
        var frameIdToStyleSheetIds = this._styleSheetIdsForURL.get(url);
        if (!frameIdToStyleSheetIds)
            return [];

        var result = [];
        for (var frameId in frameIdToStyleSheetIds)
            result = result.concat(frameIdToStyleSheetIds[frameId]);
        return result;
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {string} newText
     * @param {boolean} majorChange
     * @return {!Promise.<?Protocol.Error>}
     */
    setStyleSheetText: function(styleSheetId, newText, majorChange)
    {
        var header = this._styleSheetIdToHeader.get(styleSheetId);
        console.assert(header);
        newText = WebInspector.CSSStyleModel.trimSourceURL(newText);
        if (header.hasSourceURL)
            newText += "\n/*# sourceURL=" + header.sourceURL + " */";
        return this._agent.setStyleSheetText(header.id, newText, callback.bind(this));

        /**
         * @param {?Protocol.Error} error
         * @param {string=} sourceMapURL
         * @return {?Protocol.Error}
         * @this {WebInspector.CSSStyleModel}
         */
        function callback(error, sourceMapURL)
        {
            header.setSourceMapURL(sourceMapURL);
            if (error)
                return error;
            if (majorChange)
                this._domModel.markUndoableState();
            this._fireStyleSheetChanged(styleSheetId);
            return null;
        }
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @return {!Promise<string>}
     */
    getStyleSheetText: function(styleSheetId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?string} text
         * @return {string}
         */
        function textCallback(error, text)
        {
            if (error || text === null) {
                WebInspector.console.error("Failed to get text for stylesheet " + styleSheetId + ": " + error)
                text = "";
                // Fall through.
            }
            return WebInspector.CSSStyleModel.trimSourceURL(text);
        }

        return this._agent.getStyleSheetText(styleSheetId, textCallback)
            .catchException(/** @type {string} */(""));
    },

    _mainFrameNavigated: function()
    {
        this._resetStyleSheets();
    },

    _resetStyleSheets: function()
    {
        var headers = this._styleSheetIdToHeader.valuesArray();
        this._styleSheetIdsForURL.clear();
        this._styleSheetIdToHeader.clear();
        for (var i = 0; i < headers.length; ++i)
            this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, headers[i]);
    },

    /**
     * @override
     * @return {!Promise}
     */
    suspendModel: function()
    {
        this._isEnabled = false;
        return this._agent.disable().then(this._resetStyleSheets.bind(this));
    },

    /**
     * @override
     * @return {!Promise}
     */
    resumeModel: function()
    {
        return this._agent.enable().then(this._wasEnabled.bind(this));
    },

    /**
     * @param {!CSSAgent.StyleSheetId} id
     * @param {!CSSAgent.SourceRange} range
     */
    _layoutEditorChange: function(id, range)
    {
        this.dispatchEventToListeners(WebInspector.CSSStyleModel.Events.LayoutEditorChange, {id: id, range: range});
    },

    /**
     * @param {number} nodeId
     * @param {string} name
     * @param {string} value
     */
    setEffectivePropertyValueForNode: function(nodeId, name, value)
    {
        this._agent.setEffectivePropertyValueForNode(nodeId, name, value);
    },

    __proto__: WebInspector.SDKModel.prototype
}

/**
 * @param {string} text
 * @return {string}
 */
WebInspector.CSSStyleModel.trimSourceURL = function(text)
{
    var sourceURLIndex = text.lastIndexOf("/*# sourceURL=");
    if (sourceURLIndex === -1) {
        sourceURLIndex = text.lastIndexOf("/*@ sourceURL=");
        if (sourceURLIndex === -1)
            return text;
    }
    var sourceURLLineIndex = text.lastIndexOf("\n", sourceURLIndex);
    if (sourceURLLineIndex === -1)
        return text;
    var sourceURLLine = text.substr(sourceURLLineIndex + 1).split("\n", 1)[0];
    var sourceURLRegex = /[\040\t]*\/\*[#@] sourceURL=[\040\t]*([^\s]*)[\040\t]*\*\/[\040\t]*$/;
    if (sourceURLLine.search(sourceURLRegex) === -1)
        return text;
    return text.substr(0, sourceURLLineIndex) + text.substr(sourceURLLineIndex + sourceURLLine.length + 1);
}


/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.CSSStyleSheetHeader} header
 * @param {number} lineNumber
 * @param {number=} columnNumber
 */
WebInspector.CSSLocation = function(header, lineNumber, columnNumber)
{
    WebInspector.SDKObject.call(this, header.target());
    this._header = header;
    this.styleSheetId = header.id;
    this.url = header.resourceURL();
    this.lineNumber = lineNumber;
    this.columnNumber = columnNumber || 0;
}

WebInspector.CSSLocation.prototype = {
    /**
     * @return {!WebInspector.CSSStyleModel}
     */
    cssModel: function()
    {
        return this._header.cssModel();
    },

    /**
     * @return {!WebInspector.CSSStyleSheetHeader}
     */
    header: function()
    {
        return this._header;
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @implements {CSSAgent.Dispatcher}
 * @param {!WebInspector.CSSStyleModel} cssModel
 */
WebInspector.CSSDispatcher = function(cssModel)
{
    this._cssModel = cssModel;
}

WebInspector.CSSDispatcher.prototype = {
    /**
     * @override
     */
    mediaQueryResultChanged: function()
    {
        this._cssModel.mediaQueryResultChanged();
    },

    /**
     * @override
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     */
    styleSheetChanged: function(styleSheetId)
    {
        this._cssModel._fireStyleSheetChanged(styleSheetId);
    },

    /**
     * @override
     * @param {!CSSAgent.CSSStyleSheetHeader} header
     */
    styleSheetAdded: function(header)
    {
        this._cssModel._styleSheetAdded(header);
    },

    /**
     * @override
     * @param {!CSSAgent.StyleSheetId} id
     */
    styleSheetRemoved: function(id)
    {
        this._cssModel._styleSheetRemoved(id);
    },

    /**
     * @override
     * @param {!CSSAgent.StyleSheetId} id
     * @param {!CSSAgent.SourceRange} range
     */
    layoutEditorChange: function(id, range)
    {
        this._cssModel._layoutEditorChange(id, range);
    },
}

/**
 * @constructor
 * @param {!WebInspector.CSSStyleModel} cssModel
 */
WebInspector.CSSStyleModel.ComputedStyleLoader = function(cssModel)
{
    this._cssModel = cssModel;
    /** @type {!Map.<!DOMAgent.NodeId, !Promise.<?WebInspector.CSSStyleDeclaration>>} */
    this._nodeIdToPromise = new Map();
}

WebInspector.CSSStyleModel.ComputedStyleLoader.prototype = {
    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise.<?Map.<string, string>>}
     */
    computedStylePromise: function(nodeId)
    {
        if (!this._nodeIdToPromise[nodeId])
            this._nodeIdToPromise[nodeId] = this._cssModel._agent.getComputedStyleForNode(nodeId, parsePayload).then(cleanUp.bind(this));

        return this._nodeIdToPromise[nodeId];

        /**
         * @param {?Protocol.Error} error
         * @param {!Array.<!CSSAgent.CSSComputedStyleProperty>} computedPayload
         * @return {?Map.<string, string>}
         */
        function parsePayload(error, computedPayload)
        {
            if (error || !computedPayload || !computedPayload.length)
                return null;
            var result = new Map();
            for (var property of computedPayload)
                result.set(property.name, property.value);
            return result;
        }

        /**
         * @param {?Map.<string, string>} computedStyle
         * @return {?Map.<string, string>}
         * @this {WebInspector.CSSStyleModel.ComputedStyleLoader}
         */
        function cleanUp(computedStyle)
        {
            delete this._nodeIdToPromise[nodeId];
            return computedStyle;
        }
    }
}

/**
 * @param {!WebInspector.Target} target
 * @return {?WebInspector.CSSStyleModel}
 */
WebInspector.CSSStyleModel.fromTarget = function(target)
{
    if (!target.isPage())
        return null;
    return /** @type {?WebInspector.CSSStyleModel} */ (target.model(WebInspector.CSSStyleModel));
}

/**
 * @param {!WebInspector.DOMNode} node
 * @return {!WebInspector.CSSStyleModel}
 */
WebInspector.CSSStyleModel.fromNode = function(node)
{
    return /** @type {!WebInspector.CSSStyleModel} */ (WebInspector.CSSStyleModel.fromTarget(node.target()));
}

/**
 * @constructor
 * @param {!WebInspector.CSSStyleModel} cssModel
 * @param {!WebInspector.DOMNode} node
 * @param {?CSSAgent.CSSStyle} inlinePayload
 * @param {?CSSAgent.CSSStyle} attributesPayload
 * @param {!Array.<!CSSAgent.RuleMatch>} matchedPayload
 * @param {!Array.<!CSSAgent.PseudoElementMatches>} pseudoPayload
 * @param {!Array.<!CSSAgent.InheritedStyleEntry>} inheritedPayload
 * @param {!Array.<!CSSAgent.CSSKeyframesRule>} animationsPayload
 */
WebInspector.CSSStyleModel.MatchedStyleResult = function(cssModel, node, inlinePayload, attributesPayload, matchedPayload, pseudoPayload, inheritedPayload, animationsPayload)
{
    this._cssModel = cssModel;
    this._node = node;
    this._nodeStyles = [];
    this._nodeForStyle = new Map();
    this._inheritedStyles = new Set();
    this._keyframes = [];
    /** @type {!Map<!DOMAgent.NodeId, !Map<string, boolean>>} */
    this._matchingSelectors = new Map();

    /**
     * @this {WebInspector.CSSStyleModel.MatchedStyleResult}
     */
    function addAttributesStyle()
    {
        if (!attributesPayload)
            return;
        var style = new WebInspector.CSSStyleDeclaration(cssModel, null, attributesPayload, WebInspector.CSSStyleDeclaration.Type.Attributes);
        this._nodeForStyle.set(style, this._node);
        this._nodeStyles.push(style);
    }

    // Inline style has the greatest specificity.
    if (inlinePayload && this._node.nodeType() === Node.ELEMENT_NODE) {
        var style = new WebInspector.CSSStyleDeclaration(cssModel, null, inlinePayload, WebInspector.CSSStyleDeclaration.Type.Inline);
        this._nodeForStyle.set(style, this._node);
        this._nodeStyles.push(style);
    }

    // Add rules in reverse order to match the cascade order.
    var addedAttributesStyle;
    for (var i = matchedPayload.length - 1; i >= 0; --i) {
        var rule = new WebInspector.CSSStyleRule(cssModel, matchedPayload[i].rule);
        if ((rule.isInjected() || rule.isUserAgent()) && !addedAttributesStyle) {
            // Show element's Style Attributes after all author rules.
            addedAttributesStyle = true;
            addAttributesStyle.call(this);
        }
        this._nodeForStyle.set(rule.style, this._node);
        this._nodeStyles.push(rule.style);
        addMatchingSelectors.call(this, this._node, rule, matchedPayload[i].matchingSelectors);
    }

    if (!addedAttributesStyle)
        addAttributesStyle.call(this);

    // Walk the node structure and identify styles with inherited properties.
    var parentNode = this._node.parentNode;
    for (var i = 0; parentNode && inheritedPayload && i < inheritedPayload.length; ++i) {
        var entryPayload = inheritedPayload[i];
        var inheritedInlineStyle = entryPayload.inlineStyle ? new WebInspector.CSSStyleDeclaration(cssModel, null, entryPayload.inlineStyle, WebInspector.CSSStyleDeclaration.Type.Inline) : null;
        if (inheritedInlineStyle && this._containsInherited(inheritedInlineStyle)) {
            this._nodeForStyle.set(inheritedInlineStyle, parentNode);
            this._nodeStyles.push(inheritedInlineStyle);
            this._inheritedStyles.add(inheritedInlineStyle);
        }

        var inheritedMatchedCSSRules = entryPayload.matchedCSSRules || [];
        for (var j = inheritedMatchedCSSRules.length - 1; j >= 0; --j) {
            var inheritedRule = new WebInspector.CSSStyleRule(cssModel, inheritedMatchedCSSRules[j].rule);
            addMatchingSelectors.call(this, parentNode, inheritedRule, inheritedMatchedCSSRules[j].matchingSelectors);
            if (!this._containsInherited(inheritedRule.style))
                continue;
            this._nodeForStyle.set(inheritedRule.style, parentNode);
            this._nodeStyles.push(inheritedRule.style);
            this._inheritedStyles.add(inheritedRule.style);
        }
        parentNode = parentNode.parentNode;
    }

    // Set up pseudo styles map.
    this._pseudoStyles = new Map();
    if (pseudoPayload) {
        for (var i = 0; i < pseudoPayload.length; ++i) {
            var entryPayload = pseudoPayload[i];
            // PseudoElement nodes are not created unless "content" css property is set.
            var pseudoElement = this._node.pseudoElements().get(entryPayload.pseudoType) || null;
            var pseudoStyles = [];
            var rules = entryPayload.matches || [];
            for (var j = rules.length - 1; j >= 0; --j) {
                var pseudoRule = new WebInspector.CSSStyleRule(cssModel, rules[j].rule);
                pseudoStyles.push(pseudoRule.style);
                this._nodeForStyle.set(pseudoRule.style, pseudoElement);
                if (pseudoElement)
                    addMatchingSelectors.call(this, pseudoElement, pseudoRule, rules[j].matchingSelectors);
            }
            this._pseudoStyles.set(entryPayload.pseudoType, pseudoStyles);
        }
    }

    if (animationsPayload)
        this._keyframes = animationsPayload.map(rule => new WebInspector.CSSKeyframesRule(cssModel, rule));

    this.resetActiveProperties();

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.CSSStyleRule} rule
     * @param {!Array<number>} matchingSelectorIndices
     * @this {WebInspector.CSSStyleModel.MatchedStyleResult}
     */
    function addMatchingSelectors(node, rule, matchingSelectorIndices)
    {
        for (var matchingSelectorIndex of matchingSelectorIndices) {
            var selector = rule.selectors[matchingSelectorIndex];
            this._setSelectorMatches(node, selector.text, true);
        }
    }
}

WebInspector.CSSStyleModel.MatchedStyleResult.prototype = {
    /**
     * @return {!WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @return {!WebInspector.CSSStyleModel}
     */
    cssModel: function()
    {
        return this._cssModel;
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {boolean}
     */
    hasMatchingSelectors: function(rule)
    {
        var matchingSelectors = this.matchingSelectors(rule);
        return matchingSelectors.length > 0 && this.mediaMatches(rule.style);
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {!Array<number>}
     */
    matchingSelectors: function(rule)
    {
        var node = this.nodeForStyle(rule.style);
        if (!node)
            return [];
        var map = this._matchingSelectors.get(node.id);
        if (!map)
            return [];
        var result = [];
        for (var i = 0; i < rule.selectors.length; ++i) {
            if (map.get(rule.selectors[i].text))
                result.push(i);
        }
        return result;
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @return {!Promise}
     */
    recomputeMatchingSelectors: function(rule)
    {
        var node = this.nodeForStyle(rule.style);
        if (!node)
            return Promise.resolve();
        var promises = [];
        for (var selector of rule.selectors)
            promises.push(querySelector.call(this, node, selector.text));
        return Promise.all(promises);

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {string} selectorText
         * @return {!Promise}
         * @this {WebInspector.CSSStyleModel.MatchedStyleResult}
         */
        function querySelector(node, selectorText)
        {
            var ownerDocument = node.ownerDocument || null;
            // We assume that "matching" property does not ever change during the
            // MatchedStyleResult's lifetime.
            var map = this._matchingSelectors.get(node.id);
            if ((map && map.has(selectorText)) || !ownerDocument)
                return Promise.resolve();

            var resolve;
            var promise = new Promise(fulfill => resolve = fulfill);
            this._node.domModel().querySelectorAll(ownerDocument.id, selectorText, onQueryComplete.bind(this, node, selectorText, resolve));
            return promise;
        }

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {string} selectorText
         * @param {function()} callback
         * @param {!Array.<!DOMAgent.NodeId>=} matchingNodeIds
         * @this {WebInspector.CSSStyleModel.MatchedStyleResult}
         */
        function onQueryComplete(node, selectorText, callback, matchingNodeIds)
        {
            if (matchingNodeIds)
                this._setSelectorMatches(node, selectorText, matchingNodeIds.indexOf(node.id) !== -1);
            callback();
        }
    },

    /**
     * @param {!WebInspector.CSSStyleRule} rule
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise}
     */
    addNewRule: function(rule, node)
    {
        this._nodeForStyle.set(rule.style, node);
        return this.recomputeMatchingSelectors(rule);
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {string} selectorText
     * @param {boolean} value
     */
    _setSelectorMatches: function(node, selectorText, value)
    {
        var map = this._matchingSelectors.get(node.id);
        if (!map) {
            map = new Map();
            this._matchingSelectors.set(node.id, map);
        }
        map.set(selectorText, value);
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    mediaMatches: function(style)
    {
        var media = style.parentRule ? style.parentRule.media : [];
        for (var i = 0; media && i < media.length; ++i) {
            if (!media[i].active())
                return false;
        }
        return true;
    },

    /**
     * @return {!Array<!WebInspector.CSSStyleDeclaration>}
     */
    nodeStyles: function()
    {
        return this._nodeStyles;
    },

    /**
     * @return {!Array.<!WebInspector.CSSKeyframesRule>}
     */
    keyframes: function()
    {
        return this._keyframes;
    },

    /**
     * @return {!Map.<!DOMAgent.PseudoType, !Array<!WebInspector.CSSStyleDeclaration>>}
     */
    pseudoStyles: function()
    {
        return this._pseudoStyles;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    _containsInherited: function(style)
    {
        var properties = style.allProperties;
        for (var i = 0; i < properties.length; ++i) {
            var property = properties[i];
            // Does this style contain non-overridden inherited property?
            if (property.activeInStyle() && WebInspector.CSSMetadata.isPropertyInherited(property.name))
                return true;
        }
        return false;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {?WebInspector.DOMNode}
     */
    nodeForStyle: function(style)
    {
        return this._nodeForStyle.get(style) || null;
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} style
     * @return {boolean}
     */
    isInherited: function(style)
    {
        return this._inheritedStyles.has(style);
    },

    /**
     * @param {!WebInspector.CSSProperty} property
     * @return {?WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState}
     */
    propertyState: function(property)
    {
        if (this._propertiesState.size === 0) {
            this._computeActiveProperties(this._nodeStyles, this._propertiesState);
            for (var pseudoElementStyles of this._pseudoStyles.valuesArray())
                this._computeActiveProperties(pseudoElementStyles, this._propertiesState);
        }
        return this._propertiesState.get(property) || null;
    },

    resetActiveProperties: function()
    {
        /** @type {!Map<!WebInspector.CSSProperty, !WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState>} */
        this._propertiesState = new Map();
    },

    /**
     * @param {!Array<!WebInspector.CSSStyleDeclaration>} styles
     * @param {!Map<!WebInspector.CSSProperty, !WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState>} result
     */
    _computeActiveProperties: function(styles, result)
    {
        /** @type {!Set.<string>} */
        var foundImportantProperties = new Set();
        /** @type {!Map.<string, !Map<string, !WebInspector.CSSProperty>>} */
        var propertyToEffectiveRule = new Map();
        /** @type {!Map.<string, !WebInspector.DOMNode>} */
        var inheritedPropertyToNode = new Map();
        /** @type {!Set<string>} */
        var allUsedProperties = new Set();
        for (var i = 0; i < styles.length; ++i) {
            var style = styles[i];
            var rule = style.parentRule;
            // Compute cascade for CSSStyleRules only.
            if (rule && !(rule instanceof WebInspector.CSSStyleRule))
                continue;
            if (rule && !this.hasMatchingSelectors(rule))
                continue;

            /** @type {!Map<string, !WebInspector.CSSProperty>} */
            var styleActiveProperties = new Map();
            var allProperties = style.allProperties;
            for (var j = 0; j < allProperties.length; ++j) {
                var property = allProperties[j];

                // Do not pick non-inherited properties from inherited styles.
                var inherited = this.isInherited(style);
                if (inherited && !WebInspector.CSSMetadata.isPropertyInherited(property.name))
                    continue;

                if (!property.activeInStyle()) {
                    result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
                    continue;
                }

                var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
                if (foundImportantProperties.has(canonicalName)) {
                    result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
                    continue;
                }

                if (!property.important && allUsedProperties.has(canonicalName)) {
                    result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
                    continue;
                }

                var isKnownProperty = propertyToEffectiveRule.has(canonicalName);
                var inheritedFromNode = inherited ? this.nodeForStyle(style) : null;
                if (!isKnownProperty && inheritedFromNode && !inheritedPropertyToNode.has(canonicalName))
                    inheritedPropertyToNode.set(canonicalName, inheritedFromNode);

                if (property.important) {
                    if (inherited && isKnownProperty && inheritedFromNode !== inheritedPropertyToNode.get(canonicalName)) {
                        result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
                        continue;
                    }

                    foundImportantProperties.add(canonicalName);
                    if (isKnownProperty) {
                        var overloaded = /** @type {!WebInspector.CSSProperty} */(propertyToEffectiveRule.get(canonicalName).get(canonicalName));
                        result.set(overloaded, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
                        propertyToEffectiveRule.get(canonicalName).delete(canonicalName);
                    }
                }

                styleActiveProperties.set(canonicalName, property);
                allUsedProperties.add(canonicalName);
                propertyToEffectiveRule.set(canonicalName, styleActiveProperties);
                result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Active);
            }

            // If every longhand of the shorthand is not active, then the shorthand is not active too.
            for (var property of style.leadingProperties()) {
                var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(property.name);
                if (!styleActiveProperties.has(canonicalName))
                    continue;
                var longhands = style.longhandProperties(property.name);
                if (!longhands.length)
                    continue;
                var notUsed = true;
                for (var longhand of longhands) {
                    var longhandCanonicalName = WebInspector.CSSMetadata.canonicalPropertyName(longhand.name);
                    notUsed = notUsed && !styleActiveProperties.has(longhandCanonicalName);
                }
                if (!notUsed)
                    continue;
                styleActiveProperties.delete(canonicalName);
                allUsedProperties.delete(canonicalName);
                result.set(property, WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState.Overloaded);
            }
        }
    }
}

/** @enum {string} */
WebInspector.CSSStyleModel.MatchedStyleResult.PropertyState = {
    Active: "Active",
    Overloaded: "Overloaded"
}

/**
 * @constructor
 * @param {?WebInspector.CSSStyleDeclaration} inlineStyle
 * @param {?WebInspector.CSSStyleDeclaration} attributesStyle
 */
WebInspector.CSSStyleModel.InlineStyleResult = function(inlineStyle, attributesStyle)
{
    this.inlineStyle = inlineStyle;
    this.attributesStyle = attributesStyle;
}

