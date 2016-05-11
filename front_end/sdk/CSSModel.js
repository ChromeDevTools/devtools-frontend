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
WebInspector.CSSModel = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.CSSModel, target);
    this._domModel = WebInspector.DOMModel.fromTarget(target);
    this._agent = target.cssAgent();
    this._styleLoader = new WebInspector.CSSModel.ComputedStyleLoader(this);
    target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.MainFrameNavigated, this._mainFrameNavigated, this);
    target.registerCSSDispatcher(new WebInspector.CSSDispatcher(this));
    this._agent.enable().then(this._wasEnabled.bind(this));
    /** @type {!Map.<string, !WebInspector.CSSStyleSheetHeader>} */
    this._styleSheetIdToHeader = new Map();
    /** @type {!Map.<string, !Object.<!PageAgent.FrameId, !Array.<!CSSAgent.StyleSheetId>>>} */
    this._styleSheetIdsForURL = new Map();

    /** @type {!Map.<!WebInspector.CSSStyleSheetHeader, !Promise<string>>} */
    this._originalStyleSheetText = new Map();

    /** @type {!Multimap<string, !CSSAgent.StyleSheetId>} */
    this._sourceMapLoadingStyleSheetsIds = new Multimap();

    /** @type {!Map<string, !WebInspector.SourceMap>} */
    this._sourceMapByURL = new Map();
    /** @type {!Multimap<string, !WebInspector.CSSStyleSheetHeader>} */
    this._sourceMapURLToHeaders = new Multimap();
    WebInspector.moduleSetting("cssSourceMapsEnabled").addChangeListener(this._toggleSourceMapSupport, this);
}

WebInspector.CSSModel.Events = {
    LayoutEditorChange: "LayoutEditorChange",
    MediaQueryResultChanged: "MediaQueryResultChanged",
    ModelWasEnabled: "ModelWasEnabled",
    PseudoStateForced: "PseudoStateForced",
    StyleSheetAdded: "StyleSheetAdded",
    StyleSheetChanged: "StyleSheetChanged",
    StyleSheetRemoved: "StyleSheetRemoved",
    SourceMapAttached: "SourceMapAttached",
    SourceMapDetached: "SourceMapDetached",
    SourceMapChanged: "SourceMapChanged"
}

WebInspector.CSSModel.MediaTypes = ["all", "braille", "embossed", "handheld", "print", "projection", "screen", "speech", "tty", "tv"];

WebInspector.CSSModel.PseudoStateMarker = "pseudo-state-marker";

/**
 * @constructor
 * @param {!CSSAgent.StyleSheetId} styleSheetId
 * @param {!WebInspector.TextRange} oldRange
 * @param {string} newText
 * @param {?Object} payload
 */
WebInspector.CSSModel.Edit = function(styleSheetId, oldRange, newText, payload)
{
    this.styleSheetId = styleSheetId;
    this.oldRange = oldRange;
    this.newRange = WebInspector.TextRange.fromEdit(oldRange, newText);
    this.payload = payload;
}

WebInspector.CSSModel.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _toggleSourceMapSupport: function(event)
    {
        var enabled = /** @type {boolean} */ (event.data);
        var headers = this.styleSheetHeaders();
        for (var header of headers) {
            if (enabled)
                this._attachSourceMap(header);
            else
                this._detachSourceMap(header);
        }
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {?WebInspector.SourceMap}
     */
    sourceMapForHeader: function(header)
    {
        return this._sourceMapByURL.get(header.sourceMapURL) || null;
    },

    _sourceMapLoadedForTest: function() { },

    /**
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {!Array<!WebInspector.CSSStyleSheetHeader>}
     */
    headersForSourceMap: function(sourceMap)
    {
        return this._sourceMapURLToHeaders.get(sourceMap.url()).valuesArray();
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    _attachSourceMap: function(header)
    {
        var sourceMapURL = header.sourceMapURL;
        if (!sourceMapURL || !WebInspector.moduleSetting("cssSourceMapsEnabled").get())
            return;
        if (this._sourceMapByURL.has(sourceMapURL)) {
            attach.call(this, sourceMapURL, header);
            return;
        }
        if (!this._sourceMapLoadingStyleSheetsIds.has(sourceMapURL)) {
            WebInspector.TextSourceMap.load(sourceMapURL, header.sourceURL)
                .then(onTextSourceMapLoaded.bind(this, sourceMapURL))
                .then(onSourceMap.bind(this, sourceMapURL));
        }
        this._sourceMapLoadingStyleSheetsIds.set(sourceMapURL, header.id);

        /**
         * @param {string} sourceMapURL
         * @param {?WebInspector.TextSourceMap} sourceMap
         * @return {!Promise<?WebInspector.SourceMap>}
         * @this {WebInspector.CSSModel}
         */
        function onTextSourceMapLoaded(sourceMapURL, sourceMap)
        {
            if (!sourceMap)
                return Promise.resolve(/** @type {?WebInspector.SourceMap} */(null));
            var factoryExtension = this._factoryForSourceMap(sourceMap);
            if (!factoryExtension)
                return Promise.resolve(/** @type {?WebInspector.SourceMap} */(sourceMap));
            return factoryExtension.instancePromise()
                .then(factory => factory.editableSourceMap(this.target(), sourceMap))
                .then(map => map || sourceMap)
                .catchException(/** @type {?WebInspector.SourceMap} */(null));
        }

        /**
         * @param {string} sourceMapURL
         * @param {?WebInspector.SourceMap} sourceMap
         * @this {WebInspector.CSSModel}
         */
        function onSourceMap(sourceMapURL, sourceMap)
        {
            this._sourceMapLoadedForTest();
            var styleSheetIds = this._sourceMapLoadingStyleSheetsIds.get(sourceMapURL);
            this._sourceMapLoadingStyleSheetsIds.removeAll(sourceMapURL);
            if (!sourceMap)
                return;
            var headers = new Set();
            for (var styleSheetId of styleSheetIds) {
                var header = this.styleSheetHeaderForId(styleSheetId);
                if (header)
                    headers.add(header);
            }
            if (!headers.size)
                return;
            if (sourceMap.editable())
                WebInspector.console.log(WebInspector.UIString("LiveSASS started: %s", sourceMapURL));
            this._sourceMapByURL.set(sourceMapURL, sourceMap);
            for (var header of headers)
                attach.call(this, sourceMapURL, header);
        }

        /**
         * @param {string} sourceMapURL
         * @param {!WebInspector.CSSStyleSheetHeader} header
         * @this {WebInspector.CSSModel}
         */
        function attach(sourceMapURL, header)
        {
            this._sourceMapURLToHeaders.set(sourceMapURL, header);
            this.dispatchEventToListeners(WebInspector.CSSModel.Events.SourceMapAttached, header);
        }
    },

    /**
     * @param {!WebInspector.SourceMap} sourceMap
     * @return {?Runtime.Extension}
     */
    _factoryForSourceMap: function(sourceMap)
    {
        var sourceExtensions = new Set(sourceMap.sourceURLs().map(url => WebInspector.TextUtils.extension(url)));
        for (var runtimeExtension of self.runtime.extensions(WebInspector.SourceMapFactory)) {
            var supportedExtensions = new Set(runtimeExtension.descriptor()["extensions"]);
            if (supportedExtensions.containsAll(sourceExtensions))
                return runtimeExtension;
        }
        return null;
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     */
    _detachSourceMap: function(header)
    {
        if (!header.sourceMapURL || !this._sourceMapURLToHeaders.hasValue(header.sourceMapURL, header))
            return;
        this._sourceMapURLToHeaders.remove(header.sourceMapURL, header);
        if (!this._sourceMapURLToHeaders.has(header.sourceMapURL))
            var sourceMap = this._sourceMapByURL.get(header.sourceMapURL);
            if (sourceMap.editable())
                WebInspector.console.log(WebInspector.UIString("LiveSASS stopped: %s", header.sourceMapURL));
            this._sourceMapByURL.delete(header.sourceMapURL);
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.SourceMapDetached, header);
    },

    /**
     * @return {!WebInspector.DOMModel}
     */
    domModel: function()
    {
        return /** @type {!WebInspector.DOMModel} */(this._domModel);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.TextRange} range
     * @param {string} text
     * @param {boolean} majorChange
     * @return {!Promise<boolean>}
     */
    setStyleText: function(styleSheetId, range, text, majorChange)
    {
        var original = this._innerSetStyleTexts.bind(this, [styleSheetId], [range], [text], majorChange);
        var header = this.styleSheetHeaderForId(styleSheetId);
        if (!header)
            return original();

        var sourceMap = this.sourceMapForHeader(header);
        if (!sourceMap)
            return original();

        var originalAndDetach = originalAndDetachIfSuccess.bind(this, header);

        if (!sourceMap.editable())
            return originalAndDetach();

        return /** @type {!Promise<boolean>} */(sourceMap.editCompiled([range], [text])
            .then(onEditingDone.bind(this))
            .catch(onError.bind(this, header)));

        /**
         * @param {?WebInspector.SourceMap.EditResult} editResult
         * @return {!Promise<boolean>}
         * @this {WebInspector.CSSModel}
         */
        function onEditingDone(editResult)
        {
            if (!editResult)
                return Promise.resolve(false);

            var edits = editResult.compiledEdits;
            if (!edits.length)
                return onCSSPatched.call(this, editResult, true);

            edits.sort(WebInspector.SourceEdit.comparator);
            edits = edits.reverse();

            var styleSheetIds = [];
            var ranges = [];
            var texts = [];
            for (var edit of edits) {
                styleSheetIds.push(header.id);
                ranges.push(edit.oldRange);
                texts.push(edit.newText);
            }
            return this._innerSetStyleTexts(styleSheetIds, ranges, texts, majorChange)
                .then(onCSSPatched.bind(this, editResult));
        }

        /**
         * @param {!WebInspector.SourceMap.EditResult} editResult
         * @param {boolean} success
         * @return {!Promise<boolean>}
         * @this {WebInspector.CSSModel}
         */
        function onCSSPatched(editResult, success)
        {
            if (!success)
                return originalAndDetach();

            this._sourceMapByURL.set(header.sourceMapURL, editResult.map);
            this.dispatchEventToListeners(WebInspector.CSSModel.Events.SourceMapChanged, {
                sourceMap: editResult.map,
                newSources: editResult.newSources
            });
            return Promise.resolve(true);
        }

        /**
         * @param {!WebInspector.CSSStyleSheetHeader} header
         * @param {*} error
         * @return {!Promise<boolean>}
         * @this {WebInspector.CSSModel}
         */
        function onError(header, error)
        {
            WebInspector.console.error(WebInspector.UIString("LiveSASS failed: %s", sourceMap.compiledURL()));
            console.error(error);
            this._detachSourceMap(header);
            return original();
        }

        /**
         * @param {!WebInspector.CSSStyleSheetHeader} header
         * @return {!Promise<boolean>}
         * @this {WebInspector.CSSModel}
         */
        function originalAndDetachIfSuccess(header)
        {
            return this._innerSetStyleTexts([styleSheetId], [range], [text], majorChange)
                .then(detachIfSuccess.bind(this));

            /**
             * @param {boolean} success
             * @return {boolean}
             * @this {WebInspector.CSSModel}
             */
            function detachIfSuccess(success)
            {
                if (success)
                    this._detachSourceMap(header);
                return success;
            }
        }
    },

    /**
     * @param {!Array<!CSSAgent.StyleSheetId>} styleSheetIds
     * @param {!Array<!WebInspector.TextRange>} ranges
     * @param {!Array<string>} texts
     * @param {boolean} majorChange
     * @return {!Promise<boolean>}
     */
    _innerSetStyleTexts: function(styleSheetIds, ranges, texts, majorChange)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?Array<!CSSAgent.CSSStyle>} stylePayloads
         * @return {boolean}
         * @this {WebInspector.CSSModel}
         */
        function parsePayload(error, stylePayloads)
        {
            if (error || !stylePayloads || stylePayloads.length !== ranges.length)
                return false;

            if (majorChange)
                this._domModel.markUndoableState();
            for (var i = 0; i < ranges.length; ++i) {
                var edit = new WebInspector.CSSModel.Edit(styleSheetIds[i], ranges[i], texts[i], stylePayloads[i]);
                this._fireStyleSheetChanged(styleSheetIds[i], edit);
            }
            return true;
        }

        console.assert(styleSheetIds.length === ranges.length && ranges.length === texts.length, "Array lengths must be equal");
        var edits = [];
        var ensureContentPromises = [];
        for (var i = 0; i < styleSheetIds.length; ++i) {
            edits.push({
                styleSheetId: styleSheetIds[i],
                range: ranges[i].serializeToObject(),
                text: texts[i]
            });
            ensureContentPromises.push(this._ensureOriginalStyleSheetText(styleSheetIds[i]));
        }

        return Promise.all(ensureContentPromises)
            .then(() => this._agent.setStyleTexts(edits, parsePayload.bind(this)))
            .catchException(false);
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
         * @this {WebInspector.CSSModel}
         */
        function callback(error, selectorPayload)
        {
            if (error || !selectorPayload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSModel.Edit(styleSheetId, range, text, selectorPayload);
            this._fireStyleSheetChangedAndDetach(styleSheetId, edit);
            return true;
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        return this._ensureOriginalStyleSheetText(styleSheetId)
            .then(() => this._agent.setRuleSelector(styleSheetId, range, text, callback.bind(this)))
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
         * @this {WebInspector.CSSModel}
         */
        function callback(error, payload)
        {
            if (error || !payload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSModel.Edit(styleSheetId, range, text, payload);
            this._fireStyleSheetChangedAndDetach(styleSheetId, edit);
            return true;
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        return this._ensureOriginalStyleSheetText(styleSheetId)
            .then(() => this._agent.setKeyframeKey(styleSheetId, range, text, callback.bind(this)))
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
         * @this {!WebInspector.CSSModel}
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
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.ModelWasEnabled);
    },

    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise.<?WebInspector.CSSMatchedStyles>}
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
         * @return {?WebInspector.CSSMatchedStyles}
         * @this {WebInspector.CSSModel}
         */
        function callback(error, inlinePayload, attributesPayload, matchedPayload, pseudoPayload, inheritedPayload, animationsPayload)
        {
            if (error)
                return null;

            var node = this._domModel.nodeForId(nodeId);
            if (!node)
                return null;

            return new WebInspector.CSSMatchedStyles(this, node, inlinePayload || null, attributesPayload || null, matchedPayload || [], pseudoPayload || [], inheritedPayload || [], animationsPayload || []);
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
     * @return {!Promise.<?WebInspector.CSSModel.InlineStyleResult>}
     */
    inlineStylesPromise: function(nodeId)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.CSSStyle=} inlinePayload
         * @param {?CSSAgent.CSSStyle=} attributesStylePayload
         * @return {?WebInspector.CSSModel.InlineStyleResult}
         * @this {WebInspector.CSSModel}
         */
        function callback(error, inlinePayload, attributesStylePayload)
        {
            if (error || !inlinePayload)
                return null;
            var inlineStyle = inlinePayload ? new WebInspector.CSSStyleDeclaration(this, null, inlinePayload, WebInspector.CSSStyleDeclaration.Type.Inline) : null;
            var attributesStyle = attributesStylePayload ? new WebInspector.CSSStyleDeclaration(this, null, attributesStylePayload, WebInspector.CSSStyleDeclaration.Type.Attributes) : null;
            return new WebInspector.CSSModel.InlineStyleResult(inlineStyle, attributesStyle);
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
        var pseudoClasses = node.marker(WebInspector.CSSModel.PseudoStateMarker) || [];
        if (enable) {
            if (pseudoClasses.indexOf(pseudoClass) >= 0)
                return false;
            pseudoClasses.push(pseudoClass);
            node.setMarker(WebInspector.CSSModel.PseudoStateMarker, pseudoClasses);
        } else {
            if (pseudoClasses.indexOf(pseudoClass) < 0)
                return false;
            pseudoClasses.remove(pseudoClass);
            if (pseudoClasses.length)
                node.setMarker(WebInspector.CSSModel.PseudoStateMarker, pseudoClasses);
            else
                node.setMarker(WebInspector.CSSModel.PseudoStateMarker, null);
        }

        this._agent.forcePseudoState(node.id, pseudoClasses);
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.PseudoStateForced, { node: node, pseudoClass: pseudoClass, enable: enable });
        return true;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {?Array<string>} state
     */
    pseudoState: function(node)
    {
        return node.marker(WebInspector.CSSModel.PseudoStateMarker) || [];
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.TextRange} range
     * @param {string} newMediaText
     * @return {!Promise<boolean>}
     */
    setMediaText: function(styleSheetId, range, newMediaText)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {!CSSAgent.CSSMedia} mediaPayload
         * @return {boolean}
         * @this {WebInspector.CSSModel}
         */
        function parsePayload(error, mediaPayload)
        {
            if (!mediaPayload)
                return false;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSModel.Edit(styleSheetId, range, newMediaText, mediaPayload);
            this._fireStyleSheetChangedAndDetach(styleSheetId, edit);
            return true;
        }

        WebInspector.userMetrics.actionTaken(WebInspector.UserMetrics.Action.StyleRuleEdited);
        return this._ensureOriginalStyleSheetText(styleSheetId)
            .then(() => this._agent.setMediaText(styleSheetId, range, newMediaText, parsePayload.bind(this)))
            .catchException(false);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {string} ruleText
     * @param {!WebInspector.TextRange} ruleLocation
     * @return {!Promise<?WebInspector.CSSStyleRule>}
     */
    addRule: function(styleSheetId, ruleText, ruleLocation)
    {
        return this._ensureOriginalStyleSheetText(styleSheetId)
            .then(() => this._agent.addRule(styleSheetId, ruleText, ruleLocation, parsePayload.bind(this)))
            .catchException(/** @type {?WebInspector.CSSStyleRule} */(null))

        /**
         * @param {?Protocol.Error} error
         * @param {?CSSAgent.CSSRule} rulePayload
         * @return {?WebInspector.CSSStyleRule}
         * @this {WebInspector.CSSModel}
         */
        function parsePayload(error, rulePayload)
        {
            if (error || !rulePayload)
                return null;
            this._domModel.markUndoableState();
            var edit = new WebInspector.CSSModel.Edit(styleSheetId, ruleLocation, ruleText, rulePayload);
            this._fireStyleSheetChangedAndDetach(styleSheetId, edit);
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
         * @this {WebInspector.CSSModel}
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
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.MediaQueryResultChanged);
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
     * @param {!WebInspector.CSSModel.Edit=} edit
     */
    _fireStyleSheetChanged: function(styleSheetId, edit)
    {
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.StyleSheetChanged, { styleSheetId: styleSheetId, edit: edit });
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @param {!WebInspector.CSSModel.Edit=} edit
     */
    _fireStyleSheetChangedAndDetach: function(styleSheetId, edit)
    {
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.StyleSheetChanged, { styleSheetId: styleSheetId, edit: edit });
        var header = this.styleSheetHeaderForId(styleSheetId);
        if (header)
            this._detachSourceMap(header);
    },

    /**
     * @param {!CSSAgent.StyleSheetId} styleSheetId
     * @return {!Promise<string>}
     */
    _ensureOriginalStyleSheetText: function(styleSheetId)
    {
        var header = this.styleSheetHeaderForId(styleSheetId);
        if (!header)
            return Promise.resolve("");
        var promise = this._originalStyleSheetText.get(header);
        if (!promise) {
            promise = this.getStyleSheetText(header.id);
            this._originalStyleSheetText.set(header, promise);
        }
        return promise;
    },

    /**
     * @param {!WebInspector.CSSStyleSheetHeader} header
     * @return {!Promise<string>}
     */
    originalStyleSheetText: function(header)
    {
        return this._ensureOriginalStyleSheetText(header.id);
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
        this._attachSourceMap(styleSheetHeader);
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.StyleSheetAdded, styleSheetHeader);
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
        this._originalStyleSheetText.remove(header);
        this._detachSourceMap(header);
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.StyleSheetRemoved, header);
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
        var header = /** @type {!WebInspector.CSSStyleSheetHeader} */(this._styleSheetIdToHeader.get(styleSheetId));
        console.assert(header);
        newText = WebInspector.CSSModel.trimSourceURL(newText);
        if (header.hasSourceURL)
            newText += "\n/*# sourceURL=" + header.sourceURL + " */";
        return this._ensureOriginalStyleSheetText(styleSheetId)
            .then(() => this._agent.setStyleSheetText(header.id, newText, callback.bind(this)));

        /**
         * @param {?Protocol.Error} error
         * @param {string=} sourceMapURL
         * @return {?Protocol.Error}
         * @this {WebInspector.CSSModel}
         */
        function callback(error, sourceMapURL)
        {
            this._detachSourceMap(header);
            header.setSourceMapURL(sourceMapURL);
            this._attachSourceMap(header);
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
            return WebInspector.CSSModel.trimSourceURL(text);
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
        for (var i = 0; i < headers.length; ++i) {
            this._detachSourceMap(headers[i]);
            this.dispatchEventToListeners(WebInspector.CSSModel.Events.StyleSheetRemoved, headers[i]);
        }
        this._sourceMapByURL.clear();
        this._sourceMapURLToHeaders.clear();
        this._sourceMapLoadingStyleSheetsIds.clear();
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
        this.dispatchEventToListeners(WebInspector.CSSModel.Events.LayoutEditorChange, {id: id, range: range});
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
WebInspector.CSSModel.trimSourceURL = function(text)
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
     * @return {!WebInspector.CSSModel}
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
 * @param {!WebInspector.CSSModel} cssModel
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
        this._cssModel._fireStyleSheetChangedAndDetach(styleSheetId);
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
 * @param {!WebInspector.CSSModel} cssModel
 */
WebInspector.CSSModel.ComputedStyleLoader = function(cssModel)
{
    this._cssModel = cssModel;
    /** @type {!Map<!DOMAgent.NodeId, !Promise<?Map<string, string>>>} */
    this._nodeIdToPromise = new Map();
}

WebInspector.CSSModel.ComputedStyleLoader.prototype = {
    /**
     * @param {!DOMAgent.NodeId} nodeId
     * @return {!Promise<?Map<string, string>>}
     */
    computedStylePromise: function(nodeId)
    {
        if (!this._nodeIdToPromise.has(nodeId))
            this._nodeIdToPromise.set(nodeId, this._cssModel._agent.getComputedStyleForNode(nodeId, parsePayload).then(cleanUp.bind(this)));

        return /** @type {!Promise.<?Map.<string, string>>} */(this._nodeIdToPromise.get(nodeId));

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
         * @this {WebInspector.CSSModel.ComputedStyleLoader}
         */
        function cleanUp(computedStyle)
        {
            this._nodeIdToPromise.delete(nodeId);
            return computedStyle;
        }
    }
}

/**
 * @param {!WebInspector.Target} target
 * @return {?WebInspector.CSSModel}
 */
WebInspector.CSSModel.fromTarget = function(target)
{
    if (!target.isPage())
        return null;
    return /** @type {?WebInspector.CSSModel} */ (target.model(WebInspector.CSSModel));
}

/**
 * @param {!WebInspector.DOMNode} node
 * @return {!WebInspector.CSSModel}
 */
WebInspector.CSSModel.fromNode = function(node)
{
    return /** @type {!WebInspector.CSSModel} */ (WebInspector.CSSModel.fromTarget(node.target()));
}

/**
 * @constructor
 * @param {?WebInspector.CSSStyleDeclaration} inlineStyle
 * @param {?WebInspector.CSSStyleDeclaration} attributesStyle
 */
WebInspector.CSSModel.InlineStyleResult = function(inlineStyle, attributesStyle)
{
    this.inlineStyle = inlineStyle;
    this.attributesStyle = attributesStyle;
}
