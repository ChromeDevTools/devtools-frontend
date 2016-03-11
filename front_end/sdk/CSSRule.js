// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!CSSAgent.Value} payload
 */
WebInspector.CSSValue = function(payload)
{
    this.text = payload.text;
    if (payload.range)
        this.range = WebInspector.TextRange.fromObject(payload.range);
}

WebInspector.CSSValue.prototype = {
    /**
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (!this.range)
            return;
        this.range = this.range.rebaseAfterTextEdit(edit.oldRange, edit.newRange);
    }
}

/**
 * @constructor
 * @param {!WebInspector.CSSModel} cssModel
 * @param {{style: !CSSAgent.CSSStyle, styleSheetId: (string|undefined), origin: !CSSAgent.StyleSheetOrigin}} payload
 */
WebInspector.CSSRule = function(cssModel, payload)
{
    this._cssModel = cssModel;
    this.styleSheetId = payload.styleSheetId;

    if (this.styleSheetId) {
        var styleSheetHeader = cssModel.styleSheetHeaderForId(this.styleSheetId);
        this.sourceURL = styleSheetHeader.sourceURL;
    }
    this.origin = payload.origin;
    this.style = new WebInspector.CSSStyleDeclaration(this._cssModel, this, payload.style, WebInspector.CSSStyleDeclaration.Type.Regular);
}

WebInspector.CSSRule.prototype = {
    /**
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (this.styleSheetId !== edit.styleSheetId)
            return;
        this.style.rebase(edit);
    },

    /**
     * @return {string}
     */
    resourceURL: function()
    {
        if (!this.styleSheetId)
            return "";
        var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
        return styleSheetHeader.resourceURL();
    },

    /**
     * @return {boolean}
     */
    isUserAgent: function()
    {
        return this.origin === CSSAgent.StyleSheetOrigin.UserAgent;
    },

    /**
     * @return {boolean}
     */
    isInjected: function()
    {
        return this.origin === CSSAgent.StyleSheetOrigin.Injected;
    },

    /**
     * @return {boolean}
     */
    isViaInspector: function()
    {
        return this.origin === CSSAgent.StyleSheetOrigin.Inspector;
    },

    /**
     * @return {boolean}
     */
    isRegular: function()
    {
        return this.origin === CSSAgent.StyleSheetOrigin.Regular;
    }
}

/**
 * @constructor
 * @extends {WebInspector.CSSRule}
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!CSSAgent.CSSRule} payload
 */
WebInspector.CSSStyleRule = function(cssModel, payload)
{
    WebInspector.CSSRule.call(this, cssModel, payload);

    this._reinitializeSelectors(payload.selectorList);
    this.media = payload.media ? WebInspector.CSSMedia.parseMediaArrayPayload(cssModel, payload.media) : [];
}

/**
 * @param {!WebInspector.CSSModel} cssModel
 * @param {string} selectorText
 * @return {!WebInspector.CSSStyleRule}
 */
WebInspector.CSSStyleRule.createDummyRule = function(cssModel, selectorText)
{
    var dummyPayload = {
        selectorList: {
            selectors: [{ text: selectorText}],
        },
        style: {
            styleSheetId: "0",
            range: new WebInspector.TextRange(0, 0, 0, 0),
            shorthandEntries: [],
            cssProperties: []
        }
    };
    return new WebInspector.CSSStyleRule(cssModel, /** @type {!CSSAgent.CSSRule} */(dummyPayload));
}

WebInspector.CSSStyleRule.prototype = {
    /**
     * @param {!CSSAgent.SelectorList} selectorList
     */
    _reinitializeSelectors: function(selectorList)
    {
        /** @type {!Array.<!WebInspector.CSSValue>} */
        this.selectors = [];
        for (var i = 0; i < selectorList.selectors.length; ++i)
            this.selectors.push(new WebInspector.CSSValue(selectorList.selectors[i]));
    },

    /**
     * @param {string} newSelector
     * @return {!Promise.<boolean>}
     */
    setSelectorText: function(newSelector)
    {
        var styleSheetId = this.styleSheetId;
        if (!styleSheetId)
            throw "No rule stylesheet id";
        var range = this.selectorRange();
        if (!range)
            throw "Rule selector is not editable";
        return this._cssModel.setSelectorText(styleSheetId, range, newSelector);
    },

    /**
     * @return {string}
     */
    selectorText: function()
    {
        return this.selectors.select("text").join(", ");
    },

    /**
     * @return {?WebInspector.TextRange}
     */
    selectorRange: function()
    {
        var firstRange = this.selectors[0].range;
        if (!firstRange)
            return null;
        var lastRange = this.selectors.peekLast().range;
        return new WebInspector.TextRange(firstRange.startLine, firstRange.startColumn, lastRange.endLine, lastRange.endColumn);
    },

    /**
     * @param {number} selectorIndex
     * @return {number}
     */
    lineNumberInSource: function(selectorIndex)
    {
        var selector = this.selectors[selectorIndex];
        if (!selector || !selector.range || !this.styleSheetId)
            return 0;
        var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
        return styleSheetHeader.lineNumberInSource(selector.range.startLine);
    },

    /**
     * @param {number} selectorIndex
     * @return {number|undefined}
     */
    columnNumberInSource: function(selectorIndex)
    {
        var selector = this.selectors[selectorIndex];
        if (!selector || !selector.range || !this.styleSheetId)
            return undefined;
        var styleSheetHeader = this._cssModel.styleSheetHeaderForId(this.styleSheetId);
        console.assert(styleSheetHeader);
        return styleSheetHeader.columnNumberInSource(selector.range.startLine, selector.range.startColumn);
    },

    /**
     * @override
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (this.styleSheetId !== edit.styleSheetId)
            return;
        if (this.selectorRange().equal(edit.oldRange)) {
            this._reinitializeSelectors(/** @type {!CSSAgent.SelectorList} */(edit.payload));
        } else {
            for (var i = 0; i < this.selectors.length; ++i)
                this.selectors[i].rebase(edit);
        }
        for (var media of this.media)
            media.rebase(edit);

        WebInspector.CSSRule.prototype.rebase.call(this, edit);
    },

    __proto__: WebInspector.CSSRule.prototype
}

/**
 * @constructor
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!CSSAgent.CSSKeyframesRule} payload
 */
WebInspector.CSSKeyframesRule = function(cssModel, payload)
{
    this._cssModel = cssModel;
    this._animationName = new WebInspector.CSSValue(payload.animationName);
    this._keyframes = payload.keyframes.map(keyframeRule => new WebInspector.CSSKeyframeRule(cssModel, keyframeRule));
}

WebInspector.CSSKeyframesRule.prototype = {
    /**
     * @return {!WebInspector.CSSValue}
     */
    name: function()
    {
        return this._animationName;
    },

    /**
     * @return {!Array.<!WebInspector.CSSKeyframeRule>}
     */
    keyframes: function()
    {
        return this._keyframes;
    }
}

/**
 * @constructor
 * @extends {WebInspector.CSSRule}
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!CSSAgent.CSSKeyframeRule} payload
 */
WebInspector.CSSKeyframeRule = function(cssModel, payload)
{
    WebInspector.CSSRule.call(this, cssModel, payload);
    this._reinitializeKey(payload.keyText);
}

WebInspector.CSSKeyframeRule.prototype = {
    /**
     * @return {!WebInspector.CSSValue}
     */
    key: function()
    {
        return this._keyText;
    },

    /**
     * @param {!CSSAgent.Value} payload
     */
    _reinitializeKey: function(payload)
    {
        this._keyText = new WebInspector.CSSValue(payload);
    },

    /**
     * @override
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    rebase: function(edit)
    {
        if (this.styleSheetId !== edit.styleSheetId || !this._keyText.range)
            return;
        if (edit.oldRange.equal(this._keyText.range))
            this._reinitializeKey(/** @type {!CSSAgent.Value} */(edit.payload));
        else
            this._keyText.rebase(edit);

        WebInspector.CSSRule.prototype.rebase.call(this, edit);
    },

    /**
     * @param {string} newKeyText
     * @return {!Promise.<boolean>}
     */
    setKeyText: function(newKeyText)
    {
        var styleSheetId = this.styleSheetId;
        if (!styleSheetId)
            throw "No rule stylesheet id";
        var range = this._keyText.range;
        if (!range)
            throw "Keyframe key is not editable";
        return this._cssModel.setKeyframeKey(styleSheetId, range, newKeyText);
    },

    __proto__: WebInspector.CSSRule.prototype
}
