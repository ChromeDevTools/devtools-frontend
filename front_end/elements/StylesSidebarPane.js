/*
 * Copyright (C) 2007 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.ElementsSidebarPane}
 * @param {!WebInspector.ComputedStyleSidebarPane} computedStylePane
 * @param {function()} requestShowCallback
 */
WebInspector.StylesSidebarPane = function(computedStylePane, requestShowCallback)
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Styles"));

    if (!Runtime.experiments.isEnabled("animationInspection")) {
        this._animationsControlButton = createElement("button");
        this._animationsControlButton.className = "pane-title-button animations-controls";
        this._animationsControlButton.title = WebInspector.UIString("Animations Controls");
        this._animationsControlButton.addEventListener("click", this._toggleAnimationsControlPane.bind(this), false);
        this.titleElement.appendChild(this._animationsControlButton);
    }

    this._elementStateButton = createElement("button");
    this._elementStateButton.className = "pane-title-button element-state";
    this._elementStateButton.title = WebInspector.UIString("Toggle Element State");
    this._elementStateButton.addEventListener("click", this._toggleElementStatePane.bind(this), false);
    this.titleElement.appendChild(this._elementStateButton);

    var addButton = createElement("button");
    addButton.className = "pane-title-button add";
    addButton.id = "add-style-button-test-id";
    addButton.title = WebInspector.UIString("New Style Rule");
    addButton.addEventListener("click", this._createNewRuleInViaInspectorStyleSheet.bind(this), false);
    this.titleElement.appendChild(addButton);
    addButton.createChild("div", "long-click-glyph fill");

    this._addButtonLongClickController = new WebInspector.LongClickController(addButton);
    this._addButtonLongClickController.addEventListener(WebInspector.LongClickController.Events.LongClick, this._onAddButtonLongClick.bind(this));
    this._addButtonLongClickController.enable();

    this._computedStylePane = computedStylePane;
    computedStylePane.setHostingPane(this);
    this.element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), true);
    WebInspector.settings.colorFormat.addChangeListener(this._colorFormatSettingChanged.bind(this));

    this._requestShowCallback = requestShowCallback;

    this._createElementStatePane();
    this.bodyElement.appendChild(this._elementStatePane);
    this._animationsControlPane = new WebInspector.AnimationControlPane();
    this.bodyElement.appendChild(this._animationsControlPane.element);
    this._sectionsContainer = createElement("div");
    this.bodyElement.appendChild(this._sectionsContainer);

    this._stylesPopoverHelper = new WebInspector.StylesPopoverHelper();

    this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());

    this.element.classList.add("styles-pane");
    this.element.addEventListener("mousemove", this._mouseMovedOverElement.bind(this), false);
    this._keyDownBound = this._keyDown.bind(this);
    this._keyUpBound = this._keyUp.bind(this);
}

// Keep in sync with ComputedStyleConstants.h PseudoId enum. Array below contains pseudo id names for corresponding enum indexes.
// First item is empty due to its artificial NOPSEUDO nature in the enum.
// FIXME: find a way of generating this mapping or getting it from combination of ComputedStyleConstants and CSSSelector.cpp at
// runtime.
WebInspector.StylesSidebarPane.PseudoIdNames = [
    "", "first-line", "first-letter", "before", "after", "backdrop", "selection", "", "-webkit-scrollbar",
    "-webkit-scrollbar-thumb", "-webkit-scrollbar-button", "-webkit-scrollbar-track", "-webkit-scrollbar-track-piece",
    "-webkit-scrollbar-corner", "-webkit-resizer"
];

/**
 * @enum {string}
 */
WebInspector.StylesSidebarPane.Events = {
    SelectorEditingStarted: "SelectorEditingStarted",
    SelectorEditingEnded: "SelectorEditingEnded"
};

/**
 * @param {!WebInspector.CSSProperty} property
 * @return {!Element}
 */
WebInspector.StylesSidebarPane.createExclamationMark = function(property)
{
    var exclamationElement = createElement("label", "dt-icon-label");
    exclamationElement.className = "exclamation-mark";
    if (!WebInspector.StylesSidebarPane.ignoreErrorsForProperty(property))
        exclamationElement.type = "warning-icon";
    exclamationElement.title = WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet()[property.name.toLowerCase()] ? WebInspector.UIString("Invalid property value.") : WebInspector.UIString("Unknown property name.");
    return exclamationElement;
}

/**
 * @param {!WebInspector.CSSProperty} property
 * @return {boolean}
 */
WebInspector.StylesSidebarPane.ignoreErrorsForProperty = function(property) {
    /**
     * @param {string} string
     */
    function hasUnknownVendorPrefix(string)
    {
        return !string.startsWith("-webkit-") && /^[-_][\w\d]+-\w/.test(string);
    }

    var name = property.name.toLowerCase();

    // IE hack.
    if (name.charAt(0) === "_")
        return true;

    // IE has a different format for this.
    if (name === "filter")
        return true;

    // Common IE-specific property prefix.
    if (name.startsWith("scrollbar-"))
        return true;
    if (hasUnknownVendorPrefix(name))
        return true;

    var value = property.value.toLowerCase();

    // IE hack.
    if (value.endsWith("\9"))
        return true;
    if (hasUnknownVendorPrefix(value))
        return true;

    return false;
}

WebInspector.StylesSidebarPane.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onAddButtonLongClick: function(event)
    {
        this._addButtonLongClickController.reset();
        var cssModel = this._target.cssModel;
        var headers = cssModel.styleSheetHeaders().filter(styleSheetResourceHeader);

        /** @type {!Array.<{text: string, handler: function()}>} */
        var contextMenuDescriptors = [];
        for (var i = 0; i < headers.length; ++i) {
            var header = headers[i];
            var handler = this._createNewRuleInStyleSheet.bind(this, header);
            contextMenuDescriptors.push({
                text: WebInspector.displayNameForURL(header.resourceURL()),
                handler: handler
            });
        }

        contextMenuDescriptors.sort(compareDescriptors);

        var contextMenu = new WebInspector.ContextMenu(/** @type {!Event} */(event.data));
        for (var i = 0; i < contextMenuDescriptors.length; ++i) {
            var descriptor = contextMenuDescriptors[i];
            contextMenu.appendItem(descriptor.text, descriptor.handler);
        }
        if (!contextMenu.isEmpty())
            contextMenu.appendSeparator();
        contextMenu.appendItem("inspector-stylesheet", this._createNewRuleInViaInspectorStyleSheet.bind(this));
        contextMenu.show();

        /**
         * @param {!{text: string, handler: function()}} descriptor1
         * @param {!{text: string, handler: function()}} descriptor2
         * @return {number}
         */
        function compareDescriptors(descriptor1, descriptor2)
        {
            return String.naturalOrderComparator(descriptor1.text, descriptor2.text);
        }

        /**
         * @param {!WebInspector.CSSStyleSheetHeader} header
         * @return {boolean}
         */
        function styleSheetResourceHeader(header)
        {
            return !header.isViaInspector() && !header.isInline && !!header.resourceURL();
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     */
    updateEditingSelectorForNode: function(node)
    {
        var selectorText = WebInspector.DOMPresentationUtils.simpleSelector(node);
        if (!selectorText)
            return;
        this._editingSelectorSection.setSelectorText(selectorText);
    },

    /**
     * @return {boolean}
     */
    isEditingSelector: function()
    {
        return !!this._editingSelectorSection;
    },

    /**
     * @param {!WebInspector.StylePropertiesSection} section
     */
    _startEditingSelector: function(section)
    {
        this._editingSelectorSection = section;
        this.dispatchEventToListeners(WebInspector.StylesSidebarPane.Events.SelectorEditingStarted);
    },

    _finishEditingSelector: function()
    {
        delete this._editingSelectorSection;
        this.dispatchEventToListeners(WebInspector.StylesSidebarPane.Events.SelectorEditingEnded);
    },

    /**
     * @param {!WebInspector.CSSRule} editedRule
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    _styleSheetRuleEdited: function(editedRule, oldRange, newRange)
    {
        if (!editedRule.styleSheetId)
            return;
        for (var block of this._sectionBlocks) {
            for (var section of block.sections)
                section._styleSheetRuleEdited(editedRule, oldRange, newRange);
        }
    },

    /**
     * @param {!WebInspector.CSSMedia} oldMedia
     * @param {!WebInspector.CSSMedia}  newMedia
     */
    _styleSheetMediaEdited: function(oldMedia, newMedia)
    {
        if (!oldMedia.parentStyleSheetId)
            return;
        for (var block of this._sectionBlocks) {
            for (var section of block.sections)
                section._styleSheetMediaEdited(oldMedia, newMedia);
        }
    },

    /**
     * @param {!Event} event
     */
    _contextMenuEventFired: function(event)
    {
        // We start editing upon click -> default navigation to resources panel is not available
        // Hence we add a soft context menu for hrefs.
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(/** @type {!Node} */ (event.target));
        contextMenu.show();
    },

    /**
     * @param {!Element} matchedStylesElement
     */
    setFilterBoxContainer: function(matchedStylesElement)
    {
        this._filterInput = WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Find in Styles"), this._onFilterChanged.bind(this));
        matchedStylesElement.appendChild(this._filterInput);
    },

    /**
     * @param {string} propertyName
     */
    tracePropertyName: function(propertyName)
    {
        this._requestShowCallback();
        this._filterInput.setFilterValue(WebInspector.CSSMetadata.canonicalPropertyName(propertyName));
    },

    /**
     * @param {?RegExp} regex
     */
    _onFilterChanged: function(regex)
    {
        this._filterRegex = regex;
        this._updateFilter();
    },

    /**
     * @return {?T}
     * @template T
     */
    _forcedPseudoClasses: function()
    {
        return this.node() ? (this.node().getUserProperty(WebInspector.CSSStyleModel.PseudoStatePropertyName) || undefined) : undefined;
    },

    _updateForcedPseudoStateInputs: function()
    {
        var node = this.node();
        if (!node)
            return;

        var hasPseudoType = !!node.pseudoType();
        this._elementStateButton.classList.toggle("hidden", hasPseudoType);
        this._elementStatePane.classList.toggle("expanded", !hasPseudoType && this._elementStateButton.classList.contains("toggled"));

        var nodePseudoState = this._forcedPseudoClasses();
        if (!nodePseudoState)
            nodePseudoState = [];

        var inputs = this._elementStatePane.inputs;
        for (var i = 0; i < inputs.length; ++i)
            inputs[i].checked = nodePseudoState.indexOf(inputs[i].state) >= 0;
    },

    /**
     * @override
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        // We should update SSP on main frame navigation only.
        var mainFrameNavigated = node && this.node() && node.ownerDocument !== this.node().ownerDocument;
        if (!mainFrameNavigated && node !== this.node()) {
            this.element.classList.toggle("no-affect", this._isEditingStyle);
            if (this._isEditingStyle) {
                this._pendingNode = node;
                return;
            }
        }

        if (node && node.nodeType() === Node.TEXT_NODE && node.parentNode)
            node = node.parentNode;

        if (node && node.nodeType() !== Node.ELEMENT_NODE)
            node = null;

        if (node)
            this._updateTarget(node.target());

        this._resetCache();
        this._computedStylePane.setNode(node);
        this._animationsControlPane.setNode(node);
        WebInspector.ElementsSidebarPane.prototype.setNode.call(this, node);
    },

    /**
     * @param {!WebInspector.Target} target
     */
    _updateTarget: function(target)
    {
        if (this._target === target)
            return;
        if (this._target) {
            this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded, this._styleSheetOrMediaQueryResultChanged, this);
            this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, this._styleSheetOrMediaQueryResultChanged, this);
            this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetOrMediaQueryResultChanged, this);
            this._target.cssModel.removeEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged, this._styleSheetOrMediaQueryResultChanged, this);
            this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributeChanged, this);
            this._target.domModel.removeEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributeChanged, this);
            this._target.resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized, this._frameResized, this);
        }
        this._target = target;
        this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetAdded, this._styleSheetOrMediaQueryResultChanged, this);
        this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetRemoved, this._styleSheetOrMediaQueryResultChanged, this);
        this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.StyleSheetChanged, this._styleSheetOrMediaQueryResultChanged, this);
        this._target.cssModel.addEventListener(WebInspector.CSSStyleModel.Events.MediaQueryResultChanged, this._styleSheetOrMediaQueryResultChanged, this);
        this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrModified, this._attributeChanged, this);
        this._target.domModel.addEventListener(WebInspector.DOMModel.Events.AttrRemoved, this._attributeChanged, this);
        this._target.resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.EventTypes.FrameResized, this._frameResized, this);
    },

    /**
     * @param {!WebInspector.StylePropertiesSection=} editedSection
     */
    _refreshUpdate: function(editedSection)
    {
        var node = this.node();
        if (!node)
            return;

        for (var block of this._sectionBlocks) {
            for (var section of block.sections) {
                if (section.isBlank)
                    continue;
                section.update(section === editedSection);
            }
        }

        this._computedStylePane.update();
        if (this._filterRegex)
            this._updateFilter();
        this._nodeStylesUpdatedForTest(node, false);
    },

    /**
     * @override
     * @param {!WebInspector.Throttler.FinishCallback} finishedCallback
     */
    doUpdate: function(finishedCallback)
    {
        this._updateForcedPseudoStateInputs();
        this._discardElementUnderMouse();

        this._fetchMatchedCascade()
            .then(this._innerRebuildUpdate.bind(this))
            .then(finishedCallback);
    },

    _resetCache: function()
    {
        delete this._matchedCascadePromise;
        this._resetComputedCache();
    },

    _resetComputedCache: function()
    {
        delete this._computedStylePromise;
    },

    /**
     * @return {!Promise.<?{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}>}
     */
    _fetchMatchedCascade: function()
    {
        var node = this.node();
        if (!node)
            return Promise.resolve(/** @type {?{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}} */(null));
        if (!this._matchedCascadePromise)
            this._matchedCascadePromise = new Promise(this._getMatchedStylesForNode.bind(this, node)).then(buildMatchedCascades.bind(this, node));
        return this._matchedCascadePromise;

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {!WebInspector.StylesSidebarPane.MatchedRulesPayload} payload
         * @return {?{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}}
         * @this {WebInspector.StylesSidebarPane}
         */
        function buildMatchedCascades(node, payload)
        {
            if (node !== this.node() || !payload.fulfilled())
                return null;

            return {
                matched: this._buildMatchedRulesSectionCascade(node, payload),
                pseudo: this._buildPseudoCascades(node, payload)
            };
        }
    },

    /**
     * @return {!Promise.<?WebInspector.CSSStyleDeclaration>}
     */
    _fetchComputedStyle: function()
    {
        var node = this.node();
        if (!node)
            return Promise.resolve(/** @type {?WebInspector.CSSStyleDeclaration} */(null));
        if (!this._computedStylePromise)
            this._computedStylePromise = new Promise(getComputedStyle.bind(null, node)).then(verifyOutdated.bind(this, node));

        return this._computedStylePromise;

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {function(?WebInspector.CSSStyleDeclaration)} resolve
         */
        function getComputedStyle(node, resolve)
        {
            node.target().cssModel.getComputedStyleAsync(node.id, resolve);
        }

        /**
         * @param {!WebInspector.DOMNode} node
         * @param {?WebInspector.CSSStyleDeclaration} style
         * @return {?WebInspector.CSSStyleDeclaration}
         * @this {WebInspector.StylesSidebarPane}
         */
        function verifyOutdated(node, style)
        {
            return node !== this.node() ? null : style;
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {function(!WebInspector.StylesSidebarPane.MatchedRulesPayload)} callback
     */
    _getMatchedStylesForNode: function(node, callback)
    {
        var target = node.target();
        target.cssModel.getInlineStylesAsync(node.id, inlineCallback);
        target.cssModel.getMatchedStylesAsync(node.id, false, false, matchedCallback);

        var payload = new WebInspector.StylesSidebarPane.MatchedRulesPayload();

        /**
         * @param {?WebInspector.CSSStyleDeclaration} inlineStyle
         * @param {?WebInspector.CSSStyleDeclaration} attributesStyle
         */
        function inlineCallback(inlineStyle, attributesStyle)
        {
            payload.inlineStyle = /** @type {?WebInspector.CSSStyleDeclaration} */(inlineStyle);
            payload.attributesStyle = /** @type {?WebInspector.CSSStyleDeclaration} */(attributesStyle);
        }

        /**
         * @param {?*} matchedResult
         */
        function matchedCallback(matchedResult)
        {
            if (matchedResult) {
                payload.matchedCSSRules = /** @type {?Array.<!WebInspector.CSSRule>} */(matchedResult.matchedCSSRules);
                payload.pseudoElements = /** @type {?Array.<{pseudoId: number, rules: !Array.<!WebInspector.CSSRule>}>} */(matchedResult.pseudoElements);
                payload.inherited = /** @type {?Array.<{matchedCSSRules: !Array.<!WebInspector.CSSRule>}>} */(matchedResult.inherited);
            }
            callback(payload);
        }
    },

    /**
     * @param {boolean} editing
     */
    setEditingStyle: function(editing)
    {
        if (this._isEditingStyle === editing)
            return;
        this._isEditingStyle = editing;
        if (!editing && this._pendingNode) {
            this.setNode(this._pendingNode);
            delete this._pendingNode;
        }
    },

    _styleSheetOrMediaQueryResultChanged: function()
    {
        if (this._userOperation || this._isEditingStyle) {
            this._resetComputedCache();
            return;
        }

        this._resetCache();
        this.update();
    },

    _frameResized: function()
    {
        /**
         * @this {WebInspector.StylesSidebarPane}
         */
        function refreshContents()
        {
            this._styleSheetOrMediaQueryResultChanged();
            delete this._activeTimer;
        }

        if (this._activeTimer)
            clearTimeout(this._activeTimer);

        this._activeTimer = setTimeout(refreshContents.bind(this), 100);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _attributeChanged: function(event)
    {
        // Any attribute removal or modification can affect the styles of "related" nodes.
        // Do not touch the styles if they are being edited.
        if (this._isEditingStyle || this._userOperation) {
            this._resetComputedCache();
            return;
        }

        if (!this._canAffectCurrentStyles(event.data.node))
            return;

        this._resetCache();
        this.update();
    },

    /**
     * @param {?WebInspector.DOMNode} node
     */
    _canAffectCurrentStyles: function(node)
    {
        var currentNode = this.node();
        return currentNode && (currentNode === node || node.parentNode === currentNode.parentNode || node.isAncestor(currentNode));
    },

    /**
     * @param {?{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}} cascades
     */
    _innerRebuildUpdate: function(cascades)
    {
        this._linkifier.reset();
        this._sectionsContainer.removeChildren();
        this._sectionBlocks = [];

        var node = this.node();
        if (!cascades || !node)
            return;

        this._sectionBlocks = this._rebuildSectionsForMatchedStyleRules(cascades.matched);
        var pseudoIds = cascades.pseudo.keysArray().sort();
        for (var pseudoId of pseudoIds) {
            var block = WebInspector.SectionBlock.createPseudoIdBlock(pseudoId);
            var cascade = cascades.pseudo.get(pseudoId);
            for (var sectionModel of cascade.sectionModels()) {
                var section = new WebInspector.StylePropertiesSection(this, sectionModel);
                block.sections.push(section);
            }
            this._sectionBlocks.push(block);
        }

        if (!!node.pseudoType())
            this._appendTopPadding();

        for (var block of this._sectionBlocks) {
            var titleElement = block.titleElement();
            if (titleElement)
                this._sectionsContainer.appendChild(titleElement);
            for (var section of block.sections)
                this._sectionsContainer.appendChild(section.element);
        }

        if (this._filterRegex)
            this._updateFilter();

        this._nodeStylesUpdatedForTest(node, true);
        this._computedStylePane.update();
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.StylesSidebarPane.MatchedRulesPayload} styles
     * @return {!Map<number, !WebInspector.SectionCascade>}
     */
    _buildPseudoCascades: function(node, styles)
    {
        var pseudoCascades = new Map();
        for (var i = 0; i < styles.pseudoElements.length; ++i) {
            var pseudoElementCSSRules = styles.pseudoElements[i];
            var pseudoId = pseudoElementCSSRules.pseudoId;

            // Add rules in reverse order to match the cascade order.
            var pseudoElementCascade = new WebInspector.SectionCascade();
            for (var j = pseudoElementCSSRules.rules.length - 1; j >= 0; --j) {
                var rule = pseudoElementCSSRules.rules[j];
                pseudoElementCascade.appendModelFromRule(rule);
            }
            pseudoCascades.set(pseudoId, pseudoElementCascade);
        }
        return pseudoCascades;
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {boolean} rebuild
     */
    _nodeStylesUpdatedForTest: function(node, rebuild)
    {
        // For sniffing in tests.
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @param {!WebInspector.StylesSidebarPane.MatchedRulesPayload} styles
     * @return {!WebInspector.SectionCascade}
     */
    _buildMatchedRulesSectionCascade: function(node, styles)
    {
        var cascade = new WebInspector.SectionCascade();

        function addAttributesStyle()
        {
            if (!styles.attributesStyle)
                return;
            var selectorText = node.nodeNameInCorrectCase() + "[" + WebInspector.UIString("Attributes Style") + "]";
            cascade.appendModelFromStyle(styles.attributesStyle, selectorText);
        }

        // Inline style has the greatest specificity.
        if (styles.inlineStyle && node.nodeType() === Node.ELEMENT_NODE) {
            var model = cascade.appendModelFromStyle(styles.inlineStyle, "element.style");
            model.setIsAttribute(true);
        }

        // Add rules in reverse order to match the cascade order.
        var addedAttributesStyle;
        for (var i = styles.matchedCSSRules.length - 1; i >= 0; --i) {
            var rule = styles.matchedCSSRules[i];
            if ((rule.isInjected || rule.isUserAgent) && !addedAttributesStyle) {
                // Show element's Style Attributes after all author rules.
                addedAttributesStyle = true;
                addAttributesStyle();
            }
            cascade.appendModelFromRule(rule);
        }

        if (!addedAttributesStyle)
            addAttributesStyle();

        // Walk the node structure and identify styles with inherited properties.
        var parentNode = node.parentNode;

        for (var parentOrdinal = 0; parentOrdinal < styles.inherited.length; ++parentOrdinal) {
            var parentStyles = styles.inherited[parentOrdinal];
            if (parentStyles.inlineStyle) {
                if (this._containsInherited(parentStyles.inlineStyle)) {
                    var model = cascade.appendModelFromStyle(parentStyles.inlineStyle, WebInspector.UIString("Style Attribute"), parentNode);
                    model.setIsAttribute(true);
                }
            }

            for (var i = parentStyles.matchedCSSRules.length - 1; i >= 0; --i) {
                var rulePayload = parentStyles.matchedCSSRules[i];
                if (!this._containsInherited(rulePayload.style))
                    continue;
                cascade.appendModelFromRule(rulePayload, parentNode);
            }
            parentNode = parentNode.parentNode;
        }
        return cascade;
    },

    _appendTopPadding: function()
    {
        var separatorElement = createElement("div");
        separatorElement.className = "styles-sidebar-placeholder";
        this._sectionsContainer.appendChild(separatorElement);
    },

    /**
     * @param {!WebInspector.SectionCascade} matchedCascade
     * @return {!Array.<!WebInspector.SectionBlock>}
     */
    _rebuildSectionsForMatchedStyleRules: function(matchedCascade)
    {
        var blocks = [new WebInspector.SectionBlock(null)];
        var lastParentNode = null;
        for (var sectionModel of matchedCascade.sectionModels()) {
            var parentNode = sectionModel.parentNode();
            if (parentNode && parentNode !== lastParentNode) {
                lastParentNode = parentNode;
                var block = WebInspector.SectionBlock.createInheritedNodeBlock(lastParentNode);
                blocks.push(block);
            }

            var section = new WebInspector.StylePropertiesSection(this, sectionModel);
            blocks.peekLast().sections.push(section);
        }
        return blocks;
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
            if (property.isLive && WebInspector.CSSMetadata.isPropertyInherited(property.name))
                return true;
        }
        return false;
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _colorFormatSettingChanged: function(event)
    {
        for (var block of this._sectionBlocks) {
            for (var section of block.sections)
                section.update(true);
        }
    },

    /**
     * @param {?Event} event
     */
    _createNewRuleInViaInspectorStyleSheet: function(event)
    {
        var cssModel = this._target.cssModel;
        this._userOperation = true;
        cssModel.requestViaInspectorStylesheet(this.node(), onViaInspectorStyleSheet.bind(this));

        /**
         * @param {?WebInspector.CSSStyleSheetHeader} styleSheetHeader
         * @this {WebInspector.StylesSidebarPane}
         */
        function onViaInspectorStyleSheet(styleSheetHeader)
        {
            delete this._userOperation;
            this._createNewRuleInStyleSheet(styleSheetHeader);
        }
    },

    /**
     * @param {?WebInspector.CSSStyleSheetHeader} styleSheetHeader
     */
    _createNewRuleInStyleSheet: function(styleSheetHeader)
    {
        if (!styleSheetHeader)
            return;
        styleSheetHeader.requestContent(onStyleSheetContent.bind(this, styleSheetHeader.id));

        /**
         * @param {string} styleSheetId
         * @param {string} text
         * @this {WebInspector.StylesSidebarPane}
         */
        function onStyleSheetContent(styleSheetId, text)
        {
            var lines = text.split("\n");
            var range = WebInspector.TextRange.createFromLocation(lines.length - 1, lines[lines.length - 1].length);
            this._addBlankSection(this._sectionBlocks[0].sections[0], styleSheetId, range);
        }
    },

    /**
     * @param {!WebInspector.StylePropertiesSection} insertAfterSection
     * @param {string} styleSheetId
     * @param {!WebInspector.TextRange} ruleLocation
     */
    _addBlankSection: function(insertAfterSection, styleSheetId, ruleLocation)
    {
        this.expand();
        var node = this.node();
        var blankSection = new WebInspector.BlankStylePropertiesSection(this, node ? WebInspector.DOMPresentationUtils.simpleSelector(node) : "", styleSheetId, ruleLocation, insertAfterSection.styleRule);

        this._sectionsContainer.insertBefore(blankSection.element, insertAfterSection.element.nextSibling);

        for (var block of this._sectionBlocks) {
            var index = block.sections.indexOf(insertAfterSection);
            if (index === -1)
                continue;
            block.sections.splice(index + 1, 0, blankSection);
            blankSection.startEditingSelector();
        }
    },

    /**
     * @param {!WebInspector.StylePropertiesSection} section
     */
    removeSection: function(section)
    {
        for (var block of this._sectionBlocks) {
            var index = block.sections.indexOf(section);
            if (index === -1)
                continue;
            block.sections.splice(index, 1);
            section.element.remove();
        }
    },

    /**
     * @param {!Event} event
     */
    _toggleElementStatePane: function(event)
    {
        event.consume();

        var buttonToggled = !this._elementStateButton.classList.contains("toggled");
        if (buttonToggled)
            this.expand();
        this._elementStateButton.classList.toggle("toggled", buttonToggled);
        this._elementStatePane.classList.toggle("expanded", buttonToggled);
        this._animationsControlButton.classList.remove("toggled");
        this._animationsControlPane.element.classList.remove("expanded");
    },

    _createElementStatePane: function()
    {
        this._elementStatePane = createElement("div");
        this._elementStatePane.className = "styles-element-state-pane source-code";
        var table = createElement("table");

        var inputs = [];
        this._elementStatePane.inputs = inputs;

        /**
         * @param {!Event} event
         * @this {WebInspector.StylesSidebarPane}
         */
        function clickListener(event)
        {
            var node = this.node();
            if (!node)
                return;
            node.target().cssModel.forcePseudoState(node, event.target.state, event.target.checked);
        }

        /**
         * @param {string} state
         * @return {!Element}
         * @this {WebInspector.StylesSidebarPane}
         */
        function createCheckbox(state)
        {
            var td = createElement("td");
            var label = createCheckboxLabel(":" + state);
            var input = label.checkboxElement;
            input.state = state;
            input.addEventListener("click", clickListener.bind(this), false);
            inputs.push(input);
            td.appendChild(label);
            return td;
        }

        var tr = table.createChild("tr");
        tr.appendChild(createCheckbox.call(this, "active"));
        tr.appendChild(createCheckbox.call(this, "hover"));

        tr = table.createChild("tr");
        tr.appendChild(createCheckbox.call(this, "focus"));
        tr.appendChild(createCheckbox.call(this, "visited"));

        this._elementStatePane.appendChild(table);
    },

        /**
     * @param {!Event} event
     */
    _toggleAnimationsControlPane: function(event)
    {
        event.consume();

        var buttonToggled = !this._animationsControlButton.classList.contains("toggled");
        if (buttonToggled)
            this.expand();
        this._animationsControlButton.classList.toggle("toggled", buttonToggled);
        this._animationsControlPane.element.classList.toggle("expanded", buttonToggled);
        this._elementStateButton.classList.remove("toggled");
        this._elementStatePane.classList.remove("expanded");
    },

    /**
     * @return {?RegExp}
     */
    filterRegex: function()
    {
        return this._filterRegex;
    },

    _updateFilter: function()
    {
        for (var block of this._sectionBlocks)
            block.updateFilter();
    },

    /**
     * @override
     */
    wasShown: function()
    {
        WebInspector.ElementsSidebarPane.prototype.wasShown.call(this);
        this.element.ownerDocument.body.addEventListener("keydown", this._keyDownBound, false);
        this.element.ownerDocument.body.addEventListener("keyup", this._keyUpBound, false);
    },

    /**
     * @override
     */
    willHide: function()
    {
        this.element.ownerDocument.body.removeEventListener("keydown", this._keyDownBound, false);
        this.element.ownerDocument.body.removeEventListener("keyup", this._keyUpBound, false);
        this._stylesPopoverHelper.hide();
        this._discardElementUnderMouse();
        WebInspector.ElementsSidebarPane.prototype.willHide.call(this);
    },

    _discardElementUnderMouse: function()
    {
        if (this._elementUnderMouse)
            this._elementUnderMouse.classList.remove("styles-panel-hovered");
        delete this._elementUnderMouse;
    },

    /**
     * @param {!Event} event
     */
    _mouseMovedOverElement: function(event)
    {
        if (this._elementUnderMouse && event.target !== this._elementUnderMouse)
            this._discardElementUnderMouse();
        this._elementUnderMouse = event.target;
        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */(event)))
            this._elementUnderMouse.classList.add("styles-panel-hovered");
    },

    /**
     * @param {!Event} event
     */
    _keyDown: function(event)
    {
        if ((!WebInspector.isMac() && event.keyCode === WebInspector.KeyboardShortcut.Keys.Ctrl.code) ||
            (WebInspector.isMac() && event.keyCode === WebInspector.KeyboardShortcut.Keys.Meta.code)) {
            if (this._elementUnderMouse)
                this._elementUnderMouse.classList.add("styles-panel-hovered");
        }
    },

    /**
     * @param {!Event} event
     */
    _keyUp: function(event)
    {
        if ((!WebInspector.isMac() && event.keyCode === WebInspector.KeyboardShortcut.Keys.Ctrl.code) ||
            (WebInspector.isMac() && event.keyCode === WebInspector.KeyboardShortcut.Keys.Meta.code)) {
            this._discardElementUnderMouse();
        }
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
}

/**
 * @param {string} placeholder
 * @return {!Element}
 * @param {function(?RegExp)} filterCallback
 */
WebInspector.StylesSidebarPane.createPropertyFilterElement = function(placeholder, filterCallback)
{
    var input = createElement("input");
    input.type = "search";
    input.placeholder = placeholder;

    function searchHandler()
    {
        var regex = input.value ? new RegExp(input.value.escapeForRegExp(), "i") : null;
        filterCallback(regex);
        input.parentNode.classList.toggle("styles-filter-engaged", !!input.value);
    }
    input.addEventListener("input", searchHandler, false);

    /**
     * @param {!Event} event
     */
    function keydownHandler(event)
    {
        var Esc = "U+001B";
        if (event.keyIdentifier !== Esc || !input.value)
            return;
        event.consume(true);
        input.value = "";
        searchHandler();
    }
    input.addEventListener("keydown", keydownHandler, false);

    input.setFilterValue = setFilterValue;

    /**
     * @param {string} value
     */
    function setFilterValue(value)
    {
        input.value = value;
        input.focus();
        searchHandler();
    }

    return input;
}

/**
 * @constructor
 * @param {?Element} titleElement
 */
WebInspector.SectionBlock = function(titleElement)
{
    this._titleElement = titleElement;
    this.sections = [];
}

/**
 * @param {number} pseudoId
 * @return {!WebInspector.SectionBlock}
 */
WebInspector.SectionBlock.createPseudoIdBlock = function(pseudoId)
{
    var separatorElement = createElement("div");
    separatorElement.className = "sidebar-separator";
    var pseudoName = WebInspector.StylesSidebarPane.PseudoIdNames[pseudoId];
    if (pseudoName)
        separatorElement.textContent = WebInspector.UIString("Pseudo ::%s element", pseudoName);
    else
        separatorElement.textContent = WebInspector.UIString("Pseudo element");
    return new WebInspector.SectionBlock(separatorElement);
}

/**
 * @param {!WebInspector.DOMNode} node
 * @return {!WebInspector.SectionBlock}
 */
WebInspector.SectionBlock.createInheritedNodeBlock = function(node)
{
    var separatorElement = createElement("div");
    separatorElement.className = "sidebar-separator";
    var link = WebInspector.DOMPresentationUtils.linkifyNodeReference(node);
    separatorElement.createTextChild(WebInspector.UIString("Inherited from") + " ");
    separatorElement.appendChild(link);
    return new WebInspector.SectionBlock(separatorElement);
}

WebInspector.SectionBlock.prototype = {
    updateFilter: function()
    {
        var hasAnyVisibleSection = false;
        for (var section of this.sections)
            hasAnyVisibleSection |= section._updateFilter();
        if (this._titleElement)
            this._titleElement.classList.toggle("hidden", !hasAnyVisibleSection);
    },

    /**
     * @return {?Element}
     */
    titleElement: function()
    {
        return this._titleElement;
    }
}

/**
 * @constructor
 * @param {!WebInspector.StylesSidebarPane} parentPane
 * @param {!WebInspector.StylesSectionModel} styleRule
 */
WebInspector.StylePropertiesSection = function(parentPane, styleRule)
{
    this._parentPane = parentPane;
    this.styleRule = styleRule;
    this.editable = styleRule.editable();

    var rule = styleRule.rule();
    this.element = createElementWithClass("div", "styles-section matched-styles monospace");
    this.element._section = this;

    this.titleElement = this.element.createChild("div", "styles-section-title " + (rule ? "styles-selector" : ""));

    this.propertiesTreeOutline = new TreeOutline();
    this.propertiesTreeOutline.element.classList.add("style-properties", "monospace");
    this.propertiesTreeOutline.section = this;
    this.element.appendChild(this.propertiesTreeOutline.element);

    var selectorContainer = createElement("div");
    this._selectorElement = createElementWithClass("span", "selector");
    this._selectorElement.textContent = styleRule.selectorText();
    selectorContainer.appendChild(this._selectorElement);

    var openBrace = createElement("span");
    openBrace.textContent = " {";
    selectorContainer.appendChild(openBrace);
    selectorContainer.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
    selectorContainer.addEventListener("click", this._handleSelectorContainerClick.bind(this), false);

    var closeBrace = createElement("div");
    closeBrace.textContent = "}";
    this.element.appendChild(closeBrace);

    if (this.editable && rule) {
        var newRuleButton = closeBrace.createChild("div", "sidebar-pane-button-new-rule");
        newRuleButton.title = WebInspector.UIString("Insert Style Rule");
        newRuleButton.addEventListener("click", this._onNewRuleClick.bind(this), false);
    }

    this._selectorElement.addEventListener("click", this._handleSelectorClick.bind(this), false);
    this.element.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
    this.element.addEventListener("click", this._handleEmptySpaceClick.bind(this), false);

    if (rule) {
        // Prevent editing the user agent and user rules.
        if (rule.isUserAgent || rule.isInjected) {
            this.editable = false;
        } else {
            // Check this is a real CSSRule, not a bogus object coming from WebInspector.BlankStylePropertiesSection.
            if (rule.styleSheetId)
                this.navigable = !!rule.resourceURL();
        }
    }

    this._selectorRefElement = createElementWithClass("div", "styles-section-subtitle");
    this._mediaListElement = this.titleElement.createChild("div", "media-list media-matches");
    this._updateMediaList();
    this._updateRuleOrigin();
    selectorContainer.insertBefore(this._selectorRefElement, selectorContainer.firstChild);
    this.titleElement.appendChild(selectorContainer);
    this._selectorContainer = selectorContainer;

    if (this.navigable)
        this.element.classList.add("navigable");

    if (!this.editable)
        this.element.classList.add("read-only");

    this._markSelectorMatches();
    this.onpopulate();
}

WebInspector.StylePropertiesSection.prototype = {
    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    firstSibling: function()
    {
        var parent = this.element.parentElement;
        if (!parent)
            return null;

        var childElement = parent.firstChild;
        while (childElement) {
            if (childElement._section)
                return childElement._section;
            childElement = childElement.nextSibling;
        }

        return null;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    lastSibling: function()
    {
        var parent = this.element.parentElement;
        if (!parent)
            return null;

        var childElement = parent.lastChild;
        while (childElement) {
            if (childElement._section)
                return childElement._section;
            childElement = childElement.previousSibling;
        }

        return null;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    nextSibling: function()
    {
        var curElement = this.element;
        do {
            curElement = curElement.nextSibling;
        } while (curElement && !curElement._section);

        return curElement ? curElement._section : null;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    previousSibling: function()
    {
        var curElement = this.element;
        do {
            curElement = curElement.previousSibling;
        } while (curElement && !curElement._section);

        return curElement ? curElement._section : null;
    },

    /**
     * @return {boolean}
     */
    inherited: function()
    {
        return this.styleRule.inherited();
    },

    /**
     * @return {?WebInspector.CSSRule}
     */
    rule: function()
    {
        return this.styleRule.rule();
    },

    /**
     * @param {?Event} event
     */
    _onNewRuleClick: function(event)
    {
        event.consume();
        var rule = this.rule();
        var range = WebInspector.TextRange.createFromLocation(rule.style.range.endLine, rule.style.range.endColumn + 1);
        this._parentPane._addBlankSection(this, /** @type {string} */(rule.styleSheetId), range);
    },

    /**
     * @param {!WebInspector.CSSRule} editedRule
     * @param {!WebInspector.TextRange} oldRange
     * @param {!WebInspector.TextRange} newRange
     */
    _styleSheetRuleEdited: function(editedRule, oldRange, newRange)
    {
        var rule = this.rule();
        if (!rule || !rule.styleSheetId)
            return;
        if (rule !== editedRule)
            rule.sourceStyleSheetEdited(/** @type {string} */(editedRule.styleSheetId), oldRange, newRange);
        this._updateMediaList();
        this._updateRuleOrigin();
    },

    /**
     * @param {!WebInspector.CSSMedia} oldMedia
     * @param {!WebInspector.CSSMedia} newMedia
     */
    _styleSheetMediaEdited: function(oldMedia, newMedia)
    {
        var rule = this.rule();
        if (!rule || !rule.styleSheetId)
            return;
        rule.mediaEdited(oldMedia, newMedia);
        this._updateMediaList();
    },

    /**
     * @param {?Array.<!WebInspector.CSSMedia>} mediaRules
     */
    _createMediaList: function(mediaRules)
    {
        if (!mediaRules)
            return;
        for (var i = mediaRules.length - 1; i >= 0; --i) {
            var media = mediaRules[i];
            var mediaDataElement = this._mediaListElement.createChild("div", "media");
            if (media.sourceURL) {
                var refElement = mediaDataElement.createChild("div", "subtitle");
                var anchor = this._parentPane._linkifier.linkifyMedia(media);
                refElement.appendChild(anchor);
            }

            var mediaContainerElement = mediaDataElement.createChild("span");
            var mediaTextElement = mediaContainerElement.createChild("span", "media-text");
            mediaTextElement.title = media.text;
            switch (media.source) {
            case WebInspector.CSSMedia.Source.LINKED_SHEET:
            case WebInspector.CSSMedia.Source.INLINE_SHEET:
                mediaTextElement.textContent = "media=\"" + media.text + "\"";
                break;
            case WebInspector.CSSMedia.Source.MEDIA_RULE:
                var decoration = mediaContainerElement.createChild("span");
                mediaContainerElement.insertBefore(decoration, mediaTextElement);
                decoration.textContent = "@media ";
                decoration.title = media.text;
                mediaTextElement.textContent = media.text;
                if (media.parentStyleSheetId) {
                    mediaDataElement.classList.add("editable-media");
                    mediaTextElement.addEventListener("click", this._handleMediaRuleClick.bind(this, media, mediaTextElement), false);
                }
                break;
            case WebInspector.CSSMedia.Source.IMPORT_RULE:
                mediaTextElement.textContent = "@import " + media.text;
                break;
            }
        }
    },

    _updateMediaList: function()
    {
        this._mediaListElement.removeChildren();
        this._createMediaList(this.styleRule.media());
    },

    /**
     * @param {string} propertyName
     * @return {boolean}
     */
    isPropertyInherited: function(propertyName)
    {
        if (this.inherited()) {
            // While rendering inherited stylesheet, reverse meaning of this property.
            // Render truly inherited properties with black, i.e. return them as non-inherited.
            return !WebInspector.CSSMetadata.isPropertyInherited(propertyName);
        }
        return false;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    nextEditableSibling: function()
    {
        var curSection = this;
        do {
            curSection = curSection.nextSibling();
        } while (curSection && !curSection.editable);

        if (!curSection) {
            curSection = this.firstSibling();
            while (curSection && !curSection.editable)
                curSection = curSection.nextSibling();
        }

        return (curSection && curSection.editable) ? curSection : null;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    previousEditableSibling: function()
    {
        var curSection = this;
        do {
            curSection = curSection.previousSibling();
        } while (curSection && !curSection.editable);

        if (!curSection) {
            curSection = this.lastSibling();
            while (curSection && !curSection.editable)
                curSection = curSection.previousSibling();
        }

        return (curSection && curSection.editable) ? curSection : null;
    },

    /**
     * @param {boolean} full
     */
    update: function(full)
    {
        if (this.styleRule.selectorText())
            this._selectorElement.textContent = this.styleRule.selectorText();
        this._markSelectorMatches();
        if (full) {
            this.propertiesTreeOutline.removeChildren();
            this.onpopulate();
        } else {
            var child = this.propertiesTreeOutline.firstChild();
            while (child) {
                child.overloaded = this.styleRule.isPropertyOverloaded(child.name, child.isShorthand);
                child = child.traverseNextTreeElement(false, null, true);
            }
        }
        this.afterUpdate();
    },

    afterUpdate: function()
    {
        if (this._afterUpdate) {
            this._afterUpdate(this);
            delete this._afterUpdate;
            this._afterUpdateFinishedForTest();
        }
    },

    _afterUpdateFinishedForTest: function()
    {
    },

    onpopulate: function()
    {
        var style = this.styleRule.style();
        var allProperties = style.allProperties;

        var styleHasEditableSource = this.editable && !!style.range;
        if (styleHasEditableSource) {
            for (var i = 0; i < allProperties.length; ++i) {
                var property = allProperties[i];
                if (property.styleBased)
                    continue;

                var isShorthand = !!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);
                var inherited = this.isPropertyInherited(property.name);
                var overloaded = property.inactive || this.styleRule.isPropertyOverloaded(property.name);
                var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, property, isShorthand, inherited, overloaded);
                this.propertiesTreeOutline.appendChild(item);
            }
            return;
        }

        var generatedShorthands = {};
        // For style-based properties, generate shorthands with values when possible.
        for (var i = 0; i < allProperties.length; ++i) {
            var property = allProperties[i];
            var isShorthand = !!WebInspector.CSSMetadata.cssPropertiesMetainfo.longhands(property.name);

            // For style-based properties, try generating shorthands.
            var shorthands = isShorthand ? null : WebInspector.CSSMetadata.cssPropertiesMetainfo.shorthands(property.name);
            var shorthandPropertyAvailable = false;
            for (var j = 0; shorthands && !shorthandPropertyAvailable && j < shorthands.length; ++j) {
                var shorthand = shorthands[j];
                if (shorthand in generatedShorthands) {
                    shorthandPropertyAvailable = true;
                    continue;  // There already is a shorthand this longhands falls under.
                }
                if (style.getLiveProperty(shorthand)) {
                    shorthandPropertyAvailable = true;
                    continue;  // There is an explict shorthand property this longhands falls under.
                }
                if (!style.shorthandValue(shorthand)) {
                    shorthandPropertyAvailable = false;
                    continue;  // Never generate synthetic shorthands when no value is available.
                }

                // Generate synthetic shorthand we have a value for.
                var shorthandProperty = new WebInspector.CSSProperty(style, style.allProperties.length, shorthand, style.shorthandValue(shorthand), false, false, true, true);
                var overloaded = property.inactive || this.styleRule.isPropertyOverloaded(property.name, true);
                var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, shorthandProperty,  /* isShorthand */ true, /* inherited */ false, overloaded);
                this.propertiesTreeOutline.appendChild(item);
                generatedShorthands[shorthand] = shorthandProperty;
                shorthandPropertyAvailable = true;
            }
            if (shorthandPropertyAvailable)
                continue;  // Shorthand for the property found.

            var inherited = this.isPropertyInherited(property.name);
            var overloaded = property.inactive || this.styleRule.isPropertyOverloaded(property.name, isShorthand);
            var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, property, isShorthand, inherited, overloaded);
            this.propertiesTreeOutline.appendChild(item);
        }
    },

    /**
     * @return {boolean}
     */
    _updateFilter: function()
    {
        var hasMatchingChild = false;
        for (var child of this.propertiesTreeOutline.rootElement().children())
            hasMatchingChild |= child._updateFilter();

        if (this.styleRule.isAttribute())
            return true;

        var regex = this._parentPane.filterRegex();
        var hideRule = !hasMatchingChild && regex && !regex.test(this.element.textContent);
        this.element.classList.toggle("hidden", hideRule);
        if (!hideRule && this.styleRule.rule())
            this._markSelectorHighlights();
        return !hideRule;
    },

    _markSelectorMatches: function()
    {
        var rule = this.styleRule.rule();
        if (!rule)
            return;

        this._mediaListElement.classList.toggle("media-matches", this.styleRule.mediaMatches());

        if (!this.styleRule.hasMatchingSelectors())
            return;

        var selectors = rule.selectors;
        var fragment = createDocumentFragment();
        var currentMatch = 0;
        var matchingSelectors = rule.matchingSelectors;
        for (var i = 0; i < selectors.length ; ++i) {
            if (i)
                fragment.createTextChild(", ");
            var isSelectorMatching = matchingSelectors[currentMatch] === i;
            if (isSelectorMatching)
                ++currentMatch;
            var matchingSelectorClass = isSelectorMatching ? " selector-matches" : "";
            var selectorElement = createElement("span");
            selectorElement.className = "simple-selector" + matchingSelectorClass;
            if (rule.styleSheetId)
                selectorElement._selectorIndex = i;
            selectorElement.textContent = selectors[i].value;

            fragment.appendChild(selectorElement);
        }

        this._selectorElement.removeChildren();
        this._selectorElement.appendChild(fragment);
        this._markSelectorHighlights();
    },

    _markSelectorHighlights: function()
    {
        var selectors = this._selectorElement.getElementsByClassName("simple-selector");
        var regex = this._parentPane.filterRegex();
        for (var i = 0; i < selectors.length; ++i) {
            var selectorMatchesFilter = regex && regex.test(selectors[i].textContent);
            selectors[i].classList.toggle("filter-match", selectorMatchesFilter);
        }
    },

    /**
     * @return {boolean}
     */
    _checkWillCancelEditing: function()
    {
        var willCauseCancelEditing = this._willCauseCancelEditing;
        delete this._willCauseCancelEditing;
        return willCauseCancelEditing;
    },

    /**
     * @param {!Event} event
     */
    _handleSelectorContainerClick: function(event)
    {
        if (this._checkWillCancelEditing() || !this.editable)
            return;
        if (event.target === this._selectorContainer) {
            this.addNewBlankProperty(0).startEditing();
            event.consume(true);
        }
    },

    /**
     * @param {number=} index
     * @return {!WebInspector.StylePropertyTreeElement}
     */
    addNewBlankProperty: function(index)
    {
        var property = this.styleRule.style().newBlankProperty(index);
        var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this.styleRule, property, false, false, false);
        index = property.index;
        this.propertiesTreeOutline.insertChild(item, index);
        item.listItemElement.textContent = "";
        item._newProperty = true;
        item.updateTitle();
        return item;
    },

    _handleEmptySpaceMouseDown: function()
    {
        this._willCauseCancelEditing = this._parentPane._isEditingStyle;
    },

    /**
     * @param {!Event} event
     */
    _handleEmptySpaceClick: function(event)
    {
        if (!this.editable)
            return;

        if (!event.target.isComponentSelectionCollapsed())
            return;

        if (this._checkWillCancelEditing())
            return;

        if (event.target.enclosingNodeOrSelfWithNodeName("a"))
            return;

        if (event.target.classList.contains("header") || this.element.classList.contains("read-only") || event.target.enclosingNodeOrSelfWithClass("media")) {
            event.consume();
            return;
        }
        this.addNewBlankProperty().startEditing();
        event.consume(true);
    },

    /**
     * @param {!WebInspector.CSSMedia} media
     * @param {!Element} element
     * @param {!Event} event
     */
    _handleMediaRuleClick: function(media, element, event)
    {
        if (WebInspector.isBeingEdited(element))
            return;

        var config = new WebInspector.InplaceEditor.Config(this._editingMediaCommitted.bind(this, media), this._editingMediaCancelled.bind(this, element), undefined, this._editingMediaBlurHandler.bind(this));
        WebInspector.InplaceEditor.startEditing(element, config);

        element.getComponentSelection().setBaseAndExtent(element, 0, element, 1);
        this._parentPane.setEditingStyle(true);
        var parentMediaElement = element.enclosingNodeOrSelfWithClass("media");
        parentMediaElement.classList.add("editing-media");

        event.consume(true);
    },

    /**
     * @param {!Element} element
     */
    _editingMediaFinished: function(element)
    {
        this._parentPane.setEditingStyle(false);
        var parentMediaElement = element.enclosingNodeOrSelfWithClass("media");
        parentMediaElement.classList.remove("editing-media");
    },

    /**
     * @param {!Element} element
     */
    _editingMediaCancelled: function(element)
    {
        this._editingMediaFinished(element);
        // Mark the selectors in group if necessary.
        // This is overridden by BlankStylePropertiesSection.
        this._markSelectorMatches();
        element.getComponentSelection().collapse(element, 0);
    },

    /**
     * @param {!Element} editor
     * @param {!Event} blurEvent
     * @return {boolean}
     */
    _editingMediaBlurHandler: function(editor, blurEvent)
    {
        return true;
    },

    /**
     * @param {!WebInspector.CSSMedia} media
     * @param {!Element} element
     * @param {string} newContent
     * @param {string} oldContent
     * @param {(!WebInspector.StylePropertyTreeElement.Context|undefined)} context
     * @param {string} moveDirection
     */
    _editingMediaCommitted: function(media, element, newContent, oldContent, context, moveDirection)
    {
        this._parentPane.setEditingStyle(false);
        this._editingMediaFinished(element);

        if (newContent)
            newContent = newContent.trim();

        /**
         * @param {!WebInspector.CSSMedia} newMedia
         * @this {WebInspector.StylePropertiesSection}
         */
        function successCallback(newMedia)
        {
            this._parentPane._styleSheetMediaEdited(media, newMedia);
            this._parentPane._refreshUpdate(this);
            finishOperation.call(this);
        }

        /**
         * @this {WebInspector.StylePropertiesSection}
         */
        function finishOperation()
        {
            delete this._parentPane._userOperation;
            this._editingMediaTextCommittedForTest();
        }

        // This gets deleted in finishOperation(), which is called both on success and failure.
        this._parentPane._userOperation = true;
        this._parentPane._target.cssModel.setMediaText(media, newContent, successCallback.bind(this), finishOperation.bind(this));
    },

    _editingMediaTextCommittedForTest: function() { },

    /**
     * @param {!Event} event
     */
    _handleSelectorClick: function(event)
    {
        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */(event)) && this.navigable && event.target.classList.contains("simple-selector")) {
            var index = event.target._selectorIndex;
            var target = this._parentPane._target;
            var rule = this.rule();
            var rawLocation = new WebInspector.CSSLocation(target, /** @type {string} */(rule.styleSheetId), rule.sourceURL, rule.lineNumberInSource(index), rule.columnNumberInSource(index));
            var uiLocation = WebInspector.cssWorkspaceBinding.rawLocationToUILocation(rawLocation);
            if (uiLocation)
                WebInspector.Revealer.reveal(uiLocation);
            event.consume(true);
            return;
        }
        this._startEditingOnMouseEvent();
        event.consume(true);
    },

    _startEditingOnMouseEvent: function()
    {
        if (!this.editable)
            return;

        if (!this.rule() && !this.propertiesTreeOutline.rootElement().childCount()) {
            this.addNewBlankProperty().startEditing();
            return;
        }

        if (!this.rule())
            return;

        this.startEditingSelector();
    },

    startEditingSelector: function()
    {
        var element = this._selectorElement;
        if (WebInspector.isBeingEdited(element))
            return;

        element.scrollIntoViewIfNeeded(false);
        element.textContent = element.textContent; // Reset selector marks in group.

        var config = new WebInspector.InplaceEditor.Config(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this), undefined, this._editingSelectorBlurHandler.bind(this));
        WebInspector.InplaceEditor.startEditing(this._selectorElement, config);

        element.getComponentSelection().setBaseAndExtent(element, 0, element, 1);
        this._parentPane.setEditingStyle(true);
        this._parentPane._startEditingSelector(this);
    },

    /**
     * @param {string} text
     */
    setSelectorText: function(text)
    {
        this._selectorElement.textContent = text;
        this._selectorElement.getComponentSelection().setBaseAndExtent(this._selectorElement, 0, this._selectorElement, 1);
    },

    /**
     * @param {!Element} editor
     * @param {!Event} blurEvent
     * @return {boolean}
     */
    _editingSelectorBlurHandler: function(editor, blurEvent)
    {
        if (!blurEvent.relatedTarget)
            return true;
        var elementTreeOutline = blurEvent.relatedTarget.enclosingNodeOrSelfWithClass("elements-tree-outline");
        if (!elementTreeOutline)
            return true;
        editor.focus();
        return false;
    },

    /**
     * @param {string} moveDirection
     */
    _moveEditorFromSelector: function(moveDirection)
    {
        this._markSelectorMatches();

        if (!moveDirection)
            return;

        if (moveDirection === "forward") {
            var firstChild = this.propertiesTreeOutline.firstChild();
            while (firstChild && firstChild.inherited)
                firstChild = firstChild.nextSibling;
            if (!firstChild)
                this.addNewBlankProperty().startEditing();
            else
                firstChild.startEditing(firstChild.nameElement);
        } else {
            var previousSection = this.previousEditableSibling();
            if (!previousSection)
                return;

            previousSection.addNewBlankProperty().startEditing();
        }
    },

    /**
     * @param {!Element} element
     * @param {string} newContent
     * @param {string} oldContent
     * @param {(!WebInspector.StylePropertyTreeElement.Context|undefined)} context
     * @param {string} moveDirection
     */
    editingSelectorCommitted: function(element, newContent, oldContent, context, moveDirection)
    {
        this._editingSelectorEnded();
        if (newContent)
            newContent = newContent.trim();
        if (newContent === oldContent) {
            // Revert to a trimmed version of the selector if need be.
            this._selectorElement.textContent = newContent;
            this._moveEditorFromSelector(moveDirection);
            return;
        }

        /**
         * @param {!WebInspector.CSSRule} newRule
         * @this {WebInspector.StylePropertiesSection}
         */
        function successCallback(newRule)
        {
            var doesAffectSelectedNode = newRule.matchingSelectors.length > 0;
            this.element.classList.toggle("no-affect", !doesAffectSelectedNode);

            var oldSelectorRange = this.rule().selectorRange;
            this.styleRule.updateRule(newRule);

            this._parentPane._refreshUpdate(this);
            this._parentPane._styleSheetRuleEdited(newRule, oldSelectorRange, newRule.selectorRange);

            finishOperationAndMoveEditor.call(this, moveDirection);
        }

        /**
         * @param {string} direction
         * @this {WebInspector.StylePropertiesSection}
         */
        function finishOperationAndMoveEditor(direction)
        {
            delete this._parentPane._userOperation;
            this._moveEditorFromSelector(direction);
            this._editingSelectorCommittedForTest();
        }

        // This gets deleted in finishOperationAndMoveEditor(), which is called both on success and failure.
        this._parentPane._userOperation = true;
        var selectedNode = this._parentPane.node();
        this._parentPane._target.cssModel.setRuleSelector(this.rule(), selectedNode ? selectedNode.id : 0, newContent, successCallback.bind(this), finishOperationAndMoveEditor.bind(this, moveDirection));
    },

    _editingSelectorCommittedForTest: function() { },

    _updateRuleOrigin: function()
    {
        this._selectorRefElement.removeChildren();
        this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection.createRuleOriginNode(this._parentPane._target, this._parentPane._linkifier, this.rule()));
    },

    _editingSelectorEnded: function()
    {
        this._parentPane.setEditingStyle(false);
        this._parentPane._finishEditingSelector();
    },

    editingSelectorCancelled: function()
    {
        this._editingSelectorEnded();

        // Mark the selectors in group if necessary.
        // This is overridden by BlankStylePropertiesSection.
        this._markSelectorMatches();
    }
}

/**
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?WebInspector.CSSRule} rule
 * @return {!Node}
 */
WebInspector.StylePropertiesSection.createRuleOriginNode = function(target, linkifier, rule)
{
    if (!rule)
        return createTextNode("");

    var firstMatchingIndex = rule.matchingSelectors && rule.matchingSelectors.length ? rule.matchingSelectors[0] : 0;
    var ruleLocation = rule.selectors[firstMatchingIndex].range;

    var header = rule.styleSheetId ? target.cssModel.styleSheetHeaderForId(rule.styleSheetId) : null;
    if (ruleLocation && rule.styleSheetId && header && header.resourceURL())
        return WebInspector.StylePropertiesSection._linkifyRuleLocation(target, linkifier, rule.styleSheetId, ruleLocation);

    if (rule.isUserAgent)
        return createTextNode(WebInspector.UIString("user agent stylesheet"));
    if (rule.isInjected)
        return createTextNode(WebInspector.UIString("injected stylesheet"));
    if (rule.isViaInspector)
        return createTextNode(WebInspector.UIString("via inspector"));

    if (header && header.ownerNode) {
        var link = WebInspector.DOMPresentationUtils.linkifyDeferredNodeReference(header.ownerNode);
        link.textContent = "<style>…</style>";
        return link;
    }

    return createTextNode("");
}

/**
 * @param {!WebInspector.Target} target
 * @param {!WebInspector.Linkifier} linkifier
 * @param {string} styleSheetId
 * @param {!WebInspector.TextRange} ruleLocation
 * @return {!Node}
 */
WebInspector.StylePropertiesSection._linkifyRuleLocation = function(target, linkifier, styleSheetId, ruleLocation)
{
    var styleSheetHeader = target.cssModel.styleSheetHeaderForId(styleSheetId);
    var sourceURL = styleSheetHeader.resourceURL();
    var lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    var columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    var matchingSelectorLocation = new WebInspector.CSSLocation(target, styleSheetId, sourceURL, lineNumber, columnNumber);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
}

/**
 * @constructor
 * @extends {WebInspector.StylePropertiesSection}
 * @param {!WebInspector.StylesSidebarPane} stylesPane
 * @param {string} defaultSelectorText
 * @param {string} styleSheetId
 * @param {!WebInspector.TextRange} ruleLocation
 * @param {!WebInspector.StylesSectionModel} insertAfterStyleRule
 */
WebInspector.BlankStylePropertiesSection = function(stylesPane, defaultSelectorText, styleSheetId, ruleLocation, insertAfterStyleRule)
{
    var dummyCascade = new WebInspector.SectionCascade();
    var blankSectionModel = dummyCascade.appendModelFromStyle(WebInspector.CSSStyleDeclaration.createDummyStyle(stylesPane._target), defaultSelectorText);
    blankSectionModel.setEditable(true);
    WebInspector.StylePropertiesSection.call(this, stylesPane, blankSectionModel);
    this._ruleLocation = ruleLocation;
    this._styleSheetId = styleSheetId;
    this._selectorRefElement.removeChildren();
    this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection._linkifyRuleLocation(this._parentPane._target, this._parentPane._linkifier, styleSheetId, this._actualRuleLocation()));
    if (insertAfterStyleRule)
        this._createMediaList(insertAfterStyleRule.media());
    this._insertAfterStyleRule = insertAfterStyleRule;
    this.element.classList.add("blank-section");
}

WebInspector.BlankStylePropertiesSection.prototype = {
    /**
     * @return {!WebInspector.TextRange}
     */
    _actualRuleLocation: function()
    {
        var prefix = this._rulePrefix();
        var lines = prefix.split("\n");
        var editRange = new WebInspector.TextRange(0, 0, lines.length - 1, lines.peekLast().length);
        return this._ruleLocation.rebaseAfterTextEdit(WebInspector.TextRange.createFromLocation(0, 0), editRange);
    },

    /**
     * @return {string}
     */
    _rulePrefix: function()
    {
        return this._ruleLocation.startLine === 0 && this._ruleLocation.startColumn === 0 ? "" : "\n\n";
    },

    /**
     * @return {boolean}
     */
    get isBlank()
    {
        return !this._normal;
    },

    /**
     * @override
     * @param {!Element} element
     * @param {string} newContent
     * @param {string} oldContent
     * @param {!WebInspector.StylePropertyTreeElement.Context|undefined} context
     * @param {string} moveDirection
     */
    editingSelectorCommitted: function(element, newContent, oldContent, context, moveDirection)
    {
        if (!this.isBlank) {
            WebInspector.StylePropertiesSection.prototype.editingSelectorCommitted.call(this, element, newContent, oldContent, context, moveDirection);
            return;
        }

        /**
         * @param {!WebInspector.CSSRule} newRule
         * @this {WebInspector.StylePropertiesSection}
         */
        function successCallback(newRule)
        {
            var doesSelectorAffectSelectedNode = newRule.matchingSelectors.length > 0;
            this._makeNormal(newRule);

            if (!doesSelectorAffectSelectedNode)
                this.element.classList.add("no-affect");

            var ruleTextLines = ruleText.split("\n");
            var startLine = this._ruleLocation.startLine;
            var startColumn = this._ruleLocation.startColumn;
            var newRange = new WebInspector.TextRange(startLine, startColumn, startLine + ruleTextLines.length - 1, startColumn + ruleTextLines[ruleTextLines.length - 1].length);
            this._parentPane._styleSheetRuleEdited(newRule, this._ruleLocation, newRange);

            this._updateRuleOrigin();
            if (this.element.parentElement) // Might have been detached already.
                this._moveEditorFromSelector(moveDirection);

            delete this._parentPane._userOperation;
            this._editingSelectorEnded();
            this._markSelectorMatches();

            this._editingSelectorCommittedForTest();
        }

        /**
         * @this {WebInspector.StylePropertiesSection}
         */
        function failureCallback()
        {
            this.editingSelectorCancelled();
            this._editingSelectorCommittedForTest();
        }

        if (newContent)
            newContent = newContent.trim();
        this._parentPane._userOperation = true;

        var cssModel = this._parentPane._target.cssModel;
        var ruleText = this._rulePrefix() + newContent + " {}";
        cssModel.addRule(this._styleSheetId, this._parentPane.node(), ruleText, this._ruleLocation, successCallback.bind(this), failureCallback.bind(this));
    },

    editingSelectorCancelled: function()
    {
        delete this._parentPane._userOperation;
        if (!this.isBlank) {
            WebInspector.StylePropertiesSection.prototype.editingSelectorCancelled.call(this);
            return;
        }

        this._editingSelectorEnded();
        this._parentPane.removeSection(this);
    },

    /**
     * @param {!WebInspector.CSSRule} newRule
     */
    _makeNormal: function(newRule)
    {
        this.element.classList.remove("blank-section");
        var model = this._insertAfterStyleRule.cascade().insertModelFromRule(newRule, this._insertAfterStyleRule);
        this.styleRule = model;

        // FIXME: replace this instance by a normal WebInspector.StylePropertiesSection.
        this._normal = true;
    },

    __proto__: WebInspector.StylePropertiesSection.prototype
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.StylesSectionModel} styleRule
 * @param {!WebInspector.CSSProperty} property
 * @param {boolean} inherited
 * @param {boolean} overloaded
 * @param {boolean} expandable
 */
WebInspector.StylePropertyTreeElementBase = function(styleRule, property, inherited, overloaded, expandable)
{
    this._styleRule = styleRule;
    this.property = property;
    this._inherited = inherited;
    this._overloaded = overloaded;

    // Pass an empty title, the title gets made later in onattach.
    TreeElement.call(this, "", expandable);

    this.selectable = false;
}

WebInspector.StylePropertyTreeElementBase.prototype = {
    /**
     * @return {!WebInspector.CSSStyleDeclaration}
     */
    style: function()
    {
        return this._styleRule.style();
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return null;  // Overridden by ancestors.
    },

    /**
     * @return {!WebInspector.StylesSidebarPane|!WebInspector.ComputedStyleSidebarPane}
     */
    parentPane: function()
    {
        throw "Not implemented";
    },

    get inherited()
    {
        return this._inherited;
    },

    /**
     * @return {boolean}
     */
    hasIgnorableError: function()
    {
        return !this.parsedOk && WebInspector.StylesSidebarPane.ignoreErrorsForProperty(this.property);
    },

    get overloaded()
    {
        return this._overloaded;
    },

    set overloaded(x)
    {
        if (x === this._overloaded)
            return;
        this._overloaded = x;
        this._updateState();
    },

    get disabled()
    {
        return this.property.disabled;
    },

    get name()
    {
        if (!this.disabled || !this.property.text)
            return this.property.name;

        var text = this.property.text;
        var index = text.indexOf(":");
        if (index < 1)
            return this.property.name;

        text = text.substring(0, index).trim();
        if (text.startsWith("/*"))
            text = text.substring(2).trim();
        return text;
    },

    get value()
    {
        if (!this.disabled || !this.property.text)
            return this.property.value;

        var match = this.property.text.match(/(.*);\s*/);
        if (!match || !match[1])
            return this.property.value;

        var text = match[1];
        var index = text.indexOf(":");
        if (index < 1)
            return this.property.value;

        return text.substring(index + 1).trim();
    },

    get parsedOk()
    {
        return this.property.parsedOk;
    },

    /**
     * @override
     */
    onattach: function()
    {
        this.updateTitle();
    },

    updateTitle: function()
    {
        this._updateState();
        this._expandElement = createElement("span");
        this._expandElement.className = "expand-element";

        var propertyRenderer = new WebInspector.StylesSidebarPropertyRenderer(this._styleRule.rule(), this.node(), this.name, this.value);
        if (this.parsedOk) {
            propertyRenderer.setColorHandler(this._processColor.bind(this));
            propertyRenderer.setBezierHandler(this._processBezier.bind(this));
        }

        this.listItemElement.removeChildren();
        this.nameElement = propertyRenderer.renderName();
        this.nameElement.title = this.property.propertyText;
        this.valueElement = propertyRenderer.renderValue();
        if (!this.treeOutline)
            return;

        this.listItemElement.createChild("span", "styles-clipboard-only").createTextChild(this.disabled ? "  /* " : "  ");
        this.listItemElement.appendChild(this.nameElement);
        this.listItemElement.createTextChild(": ");
        this.listItemElement.appendChild(this._expandElement);
        this.listItemElement.appendChild(this.valueElement);
        this.listItemElement.createTextChild(";");
        if (this.disabled)
            this.listItemElement.createChild("span", "styles-clipboard-only").createTextChild(" */");

        if (!this.parsedOk) {
            // Avoid having longhands under an invalid shorthand.
            this.listItemElement.classList.add("not-parsed-ok");

            // Add a separate exclamation mark IMG element with a tooltip.
            this.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(this.property), this.listItemElement.firstChild);
        }
        if (this.property.inactive)
            this.listItemElement.classList.add("inactive");
        this._updateFilter();
    },

    /**
     * @return {boolean}
     */
    _updateFilter: function()
    {
        var regex = this.parentPane().filterRegex();
        var matches = !!regex && (regex.test(this.property.name) || regex.test(this.property.value));
        this.listItemElement.classList.toggle("filter-match", matches);

        this.onpopulate();
        var hasMatchingChildren = false;
        for (var i = 0; i < this.childCount(); ++i)
            hasMatchingChildren |= this.childAt(i)._updateFilter();

        if (!regex) {
            if (this._expandedDueToFilter)
                this.collapse();
            this._expandedDueToFilter = false;
        } else if (hasMatchingChildren && !this.expanded) {
            this.expand();
            this._expandedDueToFilter = true;
        } else if (!hasMatchingChildren && this.expanded && this._expandedDueToFilter) {
            this.collapse();
            this._expandedDueToFilter = false;
        }
        return matches;
    },

    /**
     * @param {string} text
     * @return {!Node}
     */
    _processColor: function(text)
    {
        // We can be called with valid non-color values of |text| (like 'none' from border style)
        var color = WebInspector.Color.parse(text);
        if (!color)
            return createTextNode(text);

        if (!this._styleRule.editable()) {
            var swatch = WebInspector.ColorSwatch.create();
            swatch.setColorText(text);
            return swatch;
        }

        var stylesPopoverHelper = this.parentPane()._stylesPopoverHelper;
        return new WebInspector.ColowSwatchPopoverIcon(this, stylesPopoverHelper, text).element();
    },

    /**
     * @return {string}
     */
    renderedPropertyText: function()
    {
        return this.nameElement.textContent + ": " + this.valueElement.textContent;
    },

    /**
     * @param {string} text
     * @return {!Node}
     */
    _processBezier: function(text)
    {
        var geometry = WebInspector.Geometry.CubicBezier.parse(text);
        if (!geometry || !this._styleRule.editable())
            return createTextNode(text);
        var stylesPopoverHelper = this.parentPane()._stylesPopoverHelper;
        return new WebInspector.BezierPopoverIcon(this, stylesPopoverHelper, text).element();
    },

    _updateState: function()
    {
        if (!this.listItemElement)
            return;

        if (this.style().isPropertyImplicit(this.name))
            this.listItemElement.classList.add("implicit");
        else
            this.listItemElement.classList.remove("implicit");

        if (this.hasIgnorableError())
            this.listItemElement.classList.add("has-ignorable-error");
        else
            this.listItemElement.classList.remove("has-ignorable-error");

        if (this.inherited)
            this.listItemElement.classList.add("inherited");
        else
            this.listItemElement.classList.remove("inherited");

        if (this.overloaded)
            this.listItemElement.classList.add("overloaded");
        else
            this.listItemElement.classList.remove("overloaded");

        if (this.disabled)
            this.listItemElement.classList.add("disabled");
        else
            this.listItemElement.classList.remove("disabled");
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.StylePropertyTreeElementBase}
 * @param {!WebInspector.StylesSidebarPane} stylesPane
 * @param {!WebInspector.StylesSectionModel} styleRule
 * @param {!WebInspector.CSSProperty} property
 * @param {boolean} isShorthand
 * @param {boolean} inherited
 * @param {boolean} overloaded
 */
WebInspector.StylePropertyTreeElement = function(stylesPane, styleRule, property, isShorthand, inherited, overloaded)
{
    WebInspector.StylePropertyTreeElementBase.call(this, styleRule, property, inherited, overloaded, isShorthand);
    this._parentPane = stylesPane;
    this.isShorthand = isShorthand;
    this._applyStyleThrottler = new WebInspector.Throttler(0);
}

/** @typedef {{expanded: boolean, hasChildren: boolean, isEditingName: boolean, previousContent: string}} */
WebInspector.StylePropertyTreeElement.Context;

WebInspector.StylePropertyTreeElement.prototype = {
    /**
     * @override
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._parentPane.node();
    },

    /**
     * @override
     * @return {!WebInspector.StylesSidebarPane}
     */
    parentPane: function()
    {
        return this._parentPane;
    },

    /**
     * @return {?WebInspector.StylePropertiesSection}
     */
    section: function()
    {
        return this.treeOutline && this.treeOutline.section;
    },

    _updatePane: function()
    {
        var section = this.section();
        if (section && section._parentPane)
            section._parentPane._refreshUpdate(section);
    },

    /**
     * @param {!WebInspector.CSSStyleDeclaration} newStyle
     */
    _applyNewStyle: function(newStyle)
    {
        var oldStyleRange = /** @type {!WebInspector.TextRange} */ (this.style().range);
        var newStyleRange = /** @type {!WebInspector.TextRange} */ (newStyle.range);
        this._styleRule.updateStyleDeclaration(newStyle);
        if (this._styleRule.rule())
            this._parentPane._styleSheetRuleEdited(/** @type {!WebInspector.CSSRule} */(this._styleRule.rule()), oldStyleRange, newStyleRange);
    },

    /**
     * @param {!Event} event
     */
    toggleEnabled: function(event)
    {
        var disabled = !event.target.checked;

        /**
         * @param {?WebInspector.CSSStyleDeclaration} newStyle
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function callback(newStyle)
        {
            delete this._parentPane._userOperation;

            if (!newStyle)
                return;
            this._applyNewStyle(newStyle);

            this._updatePane();
            this.styleTextAppliedForTest();
        }

        this._parentPane._userOperation = true;
        this.property.setDisabled(disabled, callback.bind(this));
        event.consume();
    },

    onpopulate: function()
    {
        // Only populate once and if this property is a shorthand.
        if (this.childCount() || !this.isShorthand)
            return;

        var longhandProperties = this.style().longhandProperties(this.name);
        for (var i = 0; i < longhandProperties.length; ++i) {
            var name = longhandProperties[i].name;
            var inherited = false;
            var overloaded = false;

            var section = this.section();
            if (section) {
                inherited = section.isPropertyInherited(name);
                overloaded = section.styleRule.isPropertyOverloaded(name);
            }

            var liveProperty = this.style().getLiveProperty(name);
            if (!liveProperty)
                continue;

            var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._styleRule, liveProperty, false, inherited, overloaded);
            this.appendChild(item);
        }
    },

    onattach: function()
    {
        WebInspector.StylePropertyTreeElementBase.prototype.onattach.call(this);

        this.listItemElement.addEventListener("mousedown", this._mouseDown.bind(this));
        this.listItemElement.addEventListener("mouseup", this._resetMouseDownElement.bind(this));
        this.listItemElement.addEventListener("click", this._mouseClick.bind(this));
    },

    /**
     * @param {!Event} event
     */
    _mouseDown: function(event)
    {
        if (this._parentPane) {
            this._parentPane._mouseDownTreeElement = this;
            this._parentPane._mouseDownTreeElementIsName = this._isNameElement(/** @type {!Element} */(event.target));
            this._parentPane._mouseDownTreeElementIsValue = this._isValueElement(/** @type {!Element} */(event.target));
        }
    },

    _resetMouseDownElement: function()
    {
        if (this._parentPane) {
            delete this._parentPane._mouseDownTreeElement;
            delete this._parentPane._mouseDownTreeElementIsName;
            delete this._parentPane._mouseDownTreeElementIsValue;
        }
    },

    updateTitle: function()
    {
        WebInspector.StylePropertyTreeElementBase.prototype.updateTitle.call(this);

        if (this.parsedOk && this.section() && this.parent.root) {
            var enabledCheckboxElement = createElement("input");
            enabledCheckboxElement.className = "enabled-button";
            enabledCheckboxElement.type = "checkbox";
            enabledCheckboxElement.checked = !this.disabled;
            enabledCheckboxElement.addEventListener("click", this.toggleEnabled.bind(this), false);
            this.listItemElement.insertBefore(enabledCheckboxElement, this.listItemElement.firstChild);
        }
    },

    /**
     * @param {!Event} event
     */
    _mouseClick: function(event)
    {
        if (!event.target.isComponentSelectionCollapsed())
            return;

        event.consume(true);

        if (event.target === this.listItemElement) {
            var section = this.section();
            if (!section || !section.editable)
                return;

            if (section._checkWillCancelEditing())
                return;
            section.addNewBlankProperty(this.property.index + 1).startEditing();
            return;
        }

        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */(event)) && this.section().navigable) {
            this._navigateToSource(/** @type {!Element} */(event.target));
            return;
        }

        this.startEditing(/** @type {!Element} */(event.target));
    },

    /**
     * @param {!Element} element
     */
    _navigateToSource: function(element)
    {
        console.assert(this.section().navigable);
        var propertyNameClicked = element === this.nameElement;
        var uiLocation = WebInspector.cssWorkspaceBinding.propertyUILocation(this.property, propertyNameClicked);
        if (uiLocation)
            WebInspector.Revealer.reveal(uiLocation);
    },

    /**
     * @param {!Element} element
     * @return {boolean}
     */
    _isNameElement: function(element)
    {
        return element.enclosingNodeOrSelfWithClass("webkit-css-property") === this.nameElement;
    },

    /**
     * @param {!Element} element
     * @return {boolean}
     */
    _isValueElement: function(element)
    {
        return !!element.enclosingNodeOrSelfWithClass("value");
    },

    /**
     * @param {?Element=} selectElement
     */
    startEditing: function(selectElement)
    {
        // FIXME: we don't allow editing of longhand properties under a shorthand right now.
        if (this.parent.isShorthand)
            return;

        if (selectElement === this._expandElement)
            return;

        var section = this.section();
        if (section && !section.editable)
            return;

        if (!selectElement)
            selectElement = this.nameElement; // No arguments passed in - edit the name element by default.
        else
            selectElement = selectElement.enclosingNodeOrSelfWithClass("webkit-css-property") || selectElement.enclosingNodeOrSelfWithClass("value");

        if (WebInspector.isBeingEdited(selectElement))
            return;

        var isEditingName = selectElement === this.nameElement;
        if (!isEditingName)
            this.valueElement.textContent = restoreURLs(this.valueElement.textContent, this.value);

        /**
         * @param {string} fieldValue
         * @param {string} modelValue
         * @return {string}
         */
        function restoreURLs(fieldValue, modelValue)
        {
            const urlRegex = /\b(url\([^)]*\))/g;
            var splitFieldValue = fieldValue.split(urlRegex);
            if (splitFieldValue.length === 1)
                return fieldValue;
            var modelUrlRegex = new RegExp(urlRegex);
            for (var i = 1; i < splitFieldValue.length; i += 2) {
                var match = modelUrlRegex.exec(modelValue);
                if (match)
                    splitFieldValue[i] = match[0];
            }
            return splitFieldValue.join("");
        }

        /** @type {!WebInspector.StylePropertyTreeElement.Context} */
        var context = {
            expanded: this.expanded,
            hasChildren: this.isExpandable(),
            isEditingName: isEditingName,
            previousContent: selectElement.textContent
        };

        // Lie about our children to prevent expanding on double click and to collapse shorthands.
        this.setExpandable(false);

        if (selectElement.parentElement)
            selectElement.parentElement.classList.add("child-editing");
        selectElement.textContent = selectElement.textContent; // remove color swatch and the like

        /**
         * @param {!WebInspector.StylePropertyTreeElement.Context} context
         * @param {!Event} event
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function pasteHandler(context, event)
        {
            var data = event.clipboardData.getData("Text");
            if (!data)
                return;
            var colonIdx = data.indexOf(":");
            if (colonIdx < 0)
                return;
            var name = data.substring(0, colonIdx).trim();
            var value = data.substring(colonIdx + 1).trim();

            event.preventDefault();

            if (!("originalName" in context)) {
                context.originalName = this.nameElement.textContent;
                context.originalValue = this.valueElement.textContent;
            }
            this.property.name = name;
            this.property.value = value;
            this.nameElement.textContent = name;
            this.valueElement.textContent = value;
            this.nameElement.normalize();
            this.valueElement.normalize();

            this.editingCommitted(event.target.textContent, context, "forward");
        }

        /**
         * @param {!WebInspector.StylePropertyTreeElement.Context} context
         * @param {!Event} event
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function blurListener(context, event)
        {
            var treeElement = this._parentPane._mouseDownTreeElement;
            var moveDirection = "";
            if (treeElement === this) {
                if (isEditingName && this._parentPane._mouseDownTreeElementIsValue)
                    moveDirection = "forward";
                if (!isEditingName && this._parentPane._mouseDownTreeElementIsName)
                    moveDirection = "backward";
            }
            this.editingCommitted(event.target.textContent, context, moveDirection);
        }

        this._originalPropertyText = this.property.propertyText;

        this._parentPane.setEditingStyle(true);
        if (selectElement.parentElement)
            selectElement.parentElement.scrollIntoViewIfNeeded(false);

        var applyItemCallback = !isEditingName ? this._applyFreeFlowStyleTextEdit.bind(this) : undefined;
        this._prompt = new WebInspector.StylesSidebarPane.CSSPropertyPrompt(isEditingName ? WebInspector.CSSMetadata.cssPropertiesMetainfo : WebInspector.CSSMetadata.keywordsForProperty(this.nameElement.textContent), this, isEditingName);
        this._prompt.setAutocompletionTimeout(0);
        if (applyItemCallback) {
            this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemApplied, applyItemCallback, this);
            this._prompt.addEventListener(WebInspector.TextPrompt.Events.ItemAccepted, applyItemCallback, this);
        }
        var proxyElement = this._prompt.attachAndStartEditing(selectElement, blurListener.bind(this, context));

        proxyElement.addEventListener("keydown", this._editingNameValueKeyDown.bind(this, context), false);
        proxyElement.addEventListener("keypress", this._editingNameValueKeyPress.bind(this, context), false);
        proxyElement.addEventListener("input", this._editingNameValueInput.bind(this, context), false);
        if (isEditingName)
            proxyElement.addEventListener("paste", pasteHandler.bind(this, context), false);

        selectElement.getComponentSelection().setBaseAndExtent(selectElement, 0, selectElement, 1);
    },

    /**
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     * @param {!Event} event
     */
    _editingNameValueKeyDown: function(context, event)
    {
        if (event.handled)
            return;

        var result;

        if (isEnterKey(event)) {
            event.preventDefault();
            result = "forward";
        } else if (event.keyCode === WebInspector.KeyboardShortcut.Keys.Esc.code || event.keyIdentifier === "U+001B")
            result = "cancel";
        else if (!context.isEditingName && this._newProperty && event.keyCode === WebInspector.KeyboardShortcut.Keys.Backspace.code) {
            // For a new property, when Backspace is pressed at the beginning of new property value, move back to the property name.
            var selection = event.target.getComponentSelection();
            if (selection.isCollapsed && !selection.focusOffset) {
                event.preventDefault();
                result = "backward";
            }
        } else if (event.keyIdentifier === "U+0009") { // Tab key.
            result = event.shiftKey ? "backward" : "forward";
            event.preventDefault();
        }

        if (result) {
            switch (result) {
            case "cancel":
                this.editingCancelled(null, context);
                break;
            case "forward":
            case "backward":
                this.editingCommitted(event.target.textContent, context, result);
                break;
            }

            event.consume();
            return;
        }
    },

    /**
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     * @param {!Event} event
     */
    _editingNameValueKeyPress: function(context, event)
    {
        /**
         * @param {string} text
         * @param {number} cursorPosition
         * @return {boolean}
         */
        function shouldCommitValueSemicolon(text, cursorPosition)
        {
            // FIXME: should this account for semicolons inside comments?
            var openQuote = "";
            for (var i = 0; i < cursorPosition; ++i) {
                var ch = text[i];
                if (ch === "\\" && openQuote !== "")
                    ++i; // skip next character inside string
                else if (!openQuote && (ch === "\"" || ch === "'"))
                    openQuote = ch;
                else if (openQuote === ch)
                    openQuote = "";
            }
            return !openQuote;
        }

        var keyChar = String.fromCharCode(event.charCode);
        var isFieldInputTerminated = (context.isEditingName ? keyChar === ":" : keyChar === ";" && shouldCommitValueSemicolon(event.target.textContent, event.target.selectionLeftOffset()));
        if (isFieldInputTerminated) {
            // Enter or colon (for name)/semicolon outside of string (for value).
            event.consume(true);
            this.editingCommitted(event.target.textContent, context, "forward");
            return;
        }
    },

    /**
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     * @param {!Event} event
     */
    _editingNameValueInput: function(context, event)
    {
        // Do not live-edit "content" property of pseudo elements. crbug.com/433889
        if (!context.isEditingName && (!this._parentPane.node().pseudoType() || this.name !== "content"))
            this._applyFreeFlowStyleTextEdit();
    },

    _applyFreeFlowStyleTextEdit: function()
    {
        var valueText = this.valueElement.textContent;
        if (valueText.indexOf(";") === -1)
            this.applyStyleText(this.nameElement.textContent + ": " + valueText, false);
    },

    kickFreeFlowStyleEditForTest: function()
    {
        this._applyFreeFlowStyleTextEdit();
    },

    /**
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     */
    editingEnded: function(context)
    {
        delete this._originalPropertyText;
        this._resetMouseDownElement();

        this.setExpandable(context.hasChildren);
        if (context.expanded)
            this.expand();
        var editedElement = context.isEditingName ? this.nameElement : this.valueElement;
        // The proxyElement has been deleted, no need to remove listener.
        if (editedElement.parentElement)
            editedElement.parentElement.classList.remove("child-editing");

        this._parentPane.setEditingStyle(false);
    },

    /**
     * @param {?Element} element
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     */
    editingCancelled: function(element, context)
    {
        this._removePrompt();
        this._revertStyleUponEditingCanceled();
        // This should happen last, as it clears the info necessary to restore the property value after [Page]Up/Down changes.
        this.editingEnded(context);
    },

    _revertStyleUponEditingCanceled: function()
    {
        if (this._propertyHasBeenEditedIncrementally)
            this.applyStyleText(this._originalPropertyText, false);
        else if (this._newProperty)
            this.treeOutline.removeChild(this);
        else
            this.updateTitle();
    },

    /**
     * @param {string} moveDirection
     * @return {?WebInspector.StylePropertyTreeElement}
     */
    _findSibling: function(moveDirection)
    {
        var target = this;
        do {
            target = (moveDirection === "forward" ? target.nextSibling : target.previousSibling);
        } while(target && target.inherited);

        return target;
    },

    /**
     * @param {string} userInput
     * @param {!WebInspector.StylePropertyTreeElement.Context} context
     * @param {string} moveDirection
     */
    editingCommitted: function(userInput, context, moveDirection)
    {
        this._removePrompt();
        this.editingEnded(context);
        var isEditingName = context.isEditingName;

        // Determine where to move to before making changes
        var createNewProperty, moveToPropertyName, moveToSelector;
        var isDataPasted = "originalName" in context;
        var isDirtyViaPaste = isDataPasted && (this.nameElement.textContent !== context.originalName || this.valueElement.textContent !== context.originalValue);
        var isPropertySplitPaste = isDataPasted && isEditingName && this.valueElement.textContent !== context.originalValue;
        var moveTo = this;
        var moveToOther = (isEditingName ^ (moveDirection === "forward"));
        var abandonNewProperty = this._newProperty && !userInput && (moveToOther || isEditingName);
        if (moveDirection === "forward" && (!isEditingName || isPropertySplitPaste) || moveDirection === "backward" && isEditingName) {
            moveTo = moveTo._findSibling(moveDirection);
            if (moveTo)
                moveToPropertyName = moveTo.name;
            else if (moveDirection === "forward" && (!this._newProperty || userInput))
                createNewProperty = true;
            else if (moveDirection === "backward")
                moveToSelector = true;
        }

        // Make the Changes and trigger the moveToNextCallback after updating.
        var moveToIndex = moveTo && this.treeOutline ? this.treeOutline.rootElement().indexOfChild(moveTo) : -1;
        var blankInput = /^\s*$/.test(userInput);
        var shouldCommitNewProperty = this._newProperty && (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput));
        var section = /** @type {!WebInspector.StylePropertiesSection} */(this.section());
        if (((userInput !== context.previousContent || isDirtyViaPaste) && !this._newProperty) || shouldCommitNewProperty) {
            section._afterUpdate = moveToNextCallback.bind(this, this._newProperty, !blankInput, section);
            var propertyText;
            if (blankInput || (this._newProperty && /^\s*$/.test(this.valueElement.textContent)))
                propertyText = "";
            else {
                if (isEditingName)
                    propertyText = userInput + ": " + this.property.value;
                else
                    propertyText = this.property.name + ": " + userInput;
            }
            this.applyStyleText(propertyText, true);
        } else {
            if (isEditingName)
                this.property.name = userInput;
            else
                this.property.value = userInput;
            if (!isDataPasted && !this._newProperty)
                this.updateTitle();
            moveToNextCallback.call(this, this._newProperty, false, section);
        }

        /**
         * The Callback to start editing the next/previous property/selector.
         * @param {boolean} alreadyNew
         * @param {boolean} valueChanged
         * @param {!WebInspector.StylePropertiesSection} section
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function moveToNextCallback(alreadyNew, valueChanged, section)
        {
            if (!moveDirection)
                return;

            // User just tabbed through without changes.
            if (moveTo && moveTo.parent) {
                moveTo.startEditing(!isEditingName ? moveTo.nameElement : moveTo.valueElement);
                return;
            }

            // User has made a change then tabbed, wiping all the original treeElements.
            // Recalculate the new treeElement for the same property we were going to edit next.
            if (moveTo && !moveTo.parent) {
                var rootElement = section.propertiesTreeOutline.rootElement();
                if (moveDirection === "forward" && blankInput && !isEditingName)
                    --moveToIndex;
                if (moveToIndex >= rootElement.childCount() && !this._newProperty)
                    createNewProperty = true;
                else {
                    var treeElement = moveToIndex >= 0 ? rootElement.childAt(moveToIndex) : null;
                    if (treeElement) {
                        var elementToEdit = !isEditingName || isPropertySplitPaste ? treeElement.nameElement : treeElement.valueElement;
                        if (alreadyNew && blankInput)
                            elementToEdit = moveDirection === "forward" ? treeElement.nameElement : treeElement.valueElement;
                        treeElement.startEditing(elementToEdit);
                        return;
                    } else if (!alreadyNew)
                        moveToSelector = true;
                }
            }

            // Create a new attribute in this section (or move to next editable selector if possible).
            if (createNewProperty) {
                if (alreadyNew && !valueChanged && (isEditingName ^ (moveDirection === "backward")))
                    return;

                section.addNewBlankProperty().startEditing();
                return;
            }

            if (abandonNewProperty) {
                moveTo = this._findSibling(moveDirection);
                var sectionToEdit = (moveTo || moveDirection === "backward") ? section : section.nextEditableSibling();
                if (sectionToEdit) {
                    if (sectionToEdit.rule())
                        sectionToEdit.startEditingSelector();
                    else
                        sectionToEdit._moveEditorFromSelector(moveDirection);
                }
                return;
            }

            if (moveToSelector) {
                if (section.rule())
                    section.startEditingSelector();
                else
                    section._moveEditorFromSelector(moveDirection);
            }
        }
    },

    _removePrompt: function()
    {
        // BUG 53242. This cannot go into editingEnded(), as it should always happen first for any editing outcome.
        if (this._prompt) {
            this._prompt.detach();
            delete this._prompt;
        }
    },

    styleTextAppliedForTest: function() { },

    /**
     * @param {string} styleText
     * @param {boolean} majorChange
     */
    applyStyleText: function(styleText, majorChange)
    {
        this._applyStyleThrottler.schedule(this._innerApplyStyleText.bind(this, styleText, majorChange));
    },

    /**
     * @param {string} styleText
     * @param {boolean} majorChange
     * @param {!WebInspector.Throttler.FinishCallback} finishedCallback
     */
    _innerApplyStyleText: function(styleText, majorChange, finishedCallback)
    {
        if (!this.treeOutline) {
            finishedCallback();
            return;
        }

        styleText = styleText.replace(/\s/g, " ").trim(); // Replace &nbsp; with whitespace.
        if (!styleText.length && majorChange && this._newProperty && !this._propertyHasBeenEditedIncrementally) {
            // The user deleted everything and never applied a new property value via Up/Down scrolling/live editing, so remove the tree element and update.
            var section = this.section();
            this.parent.removeChild(this);
            section.afterUpdate();
            return;
        }

        var currentNode = this._parentPane.node();
        this._parentPane._userOperation = true;

        /**
         * @param {?WebInspector.CSSStyleDeclaration} newStyle
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function callback(newStyle)
        {
            delete this._parentPane._userOperation;

            if (!newStyle) {
                if (majorChange) {
                    // It did not apply, cancel editing.
                    this._revertStyleUponEditingCanceled();
                }
                finishedCallback();
                this.styleTextAppliedForTest();
                return;
            }
            this._applyNewStyle(newStyle);

            this._propertyHasBeenEditedIncrementally = true;
            this.property = newStyle.propertyAt(this.property.index);

            // We are happy to update UI if user is not editing.
            if (!this._parentPane._isEditingStyle && currentNode === this.node())
                this._updatePane();

            finishedCallback();
            this.styleTextAppliedForTest();
        }

        // Append a ";" if the new text does not end in ";".
        // FIXME: this does not handle trailing comments.
        if (styleText.length && !/;\s*$/.test(styleText))
            styleText += ";";
        var overwriteProperty = !this._newProperty || this._propertyHasBeenEditedIncrementally;
        this.property.setText(styleText, majorChange, overwriteProperty, callback.bind(this));
    },

    /**
     * @override
     * @return {boolean}
     */
    ondblclick: function()
    {
        return true; // handled
    },

    /**
     * @override
     * @param {!Event} event
     * @return {boolean}
     */
    isEventWithinDisclosureTriangle: function(event)
    {
        return event.target === this._expandElement;
    },

    __proto__: WebInspector.StylePropertyTreeElementBase.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TextPrompt}
 * @param {!WebInspector.CSSMetadata} cssCompletions
 * @param {!WebInspector.StylePropertyTreeElement} treeElement
 * @param {boolean} isEditingName
 */
WebInspector.StylesSidebarPane.CSSPropertyPrompt = function(cssCompletions, treeElement, isEditingName)
{
    // Use the same callback both for applyItemCallback and acceptItemCallback.
    WebInspector.TextPrompt.call(this, this._buildPropertyCompletions.bind(this), WebInspector.StyleValueDelimiters);
    this.setSuggestBoxEnabled(true);
    this._cssCompletions = cssCompletions;
    this._treeElement = treeElement;
    this._isEditingName = isEditingName;

    if (!isEditingName)
        this.disableDefaultSuggestionForEmptyInput();
}

WebInspector.StylesSidebarPane.CSSPropertyPrompt.prototype = {
    /**
     * @override
     * @param {!Event} event
     */
    onKeyDown: function(event)
    {
        switch (event.keyIdentifier) {
        case "Up":
        case "Down":
        case "PageUp":
        case "PageDown":
            if (this._handleNameOrValueUpDown(event)) {
                event.preventDefault();
                return;
            }
            break;
        case "Enter":
            if (this.autoCompleteElement && !this.autoCompleteElement.textContent.length) {
                this.tabKeyPressed();
                return;
            }
            break;
        }

        WebInspector.TextPrompt.prototype.onKeyDown.call(this, event);
    },

    /**
     * @override
     * @param {!Event} event
     */
    onMouseWheel: function(event)
    {
        if (this._handleNameOrValueUpDown(event)) {
            event.consume(true);
            return;
        }
        WebInspector.TextPrompt.prototype.onMouseWheel.call(this, event);
    },

    /**
     * @override
     * @return {boolean}
     */
    tabKeyPressed: function()
    {
        this.acceptAutoComplete();

        // Always tab to the next field.
        return false;
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    _handleNameOrValueUpDown: function(event)
    {
        /**
         * @param {string} originalValue
         * @param {string} replacementString
         * @this {WebInspector.StylesSidebarPane.CSSPropertyPrompt}
         */
        function finishHandler(originalValue, replacementString)
        {
            // Synthesize property text disregarding any comments, custom whitespace etc.
            this._treeElement.applyStyleText(this._treeElement.nameElement.textContent + ": " + this._treeElement.valueElement.textContent, false);
        }

        /**
         * @param {string} prefix
         * @param {number} number
         * @param {string} suffix
         * @return {string}
         * @this {WebInspector.StylesSidebarPane.CSSPropertyPrompt}
         */
        function customNumberHandler(prefix, number, suffix)
        {
            if (number !== 0 && !suffix.length && WebInspector.CSSMetadata.isLengthProperty(this._treeElement.property.name))
                suffix = "px";
            return prefix + number + suffix;
        }

        // Handle numeric value increment/decrement only at this point.
        if (!this._isEditingName && WebInspector.handleElementValueModifications(event, this._treeElement.valueElement, finishHandler.bind(this), this._isValueSuggestion.bind(this), customNumberHandler.bind(this)))
            return true;

        return false;
    },

    /**
     * @param {string} word
     * @return {boolean}
     */
    _isValueSuggestion: function(word)
    {
        if (!word)
            return false;
        word = word.toLowerCase();
        return this._cssCompletions.keySet().hasOwnProperty(word);
    },

    /**
     * @param {!Element} proxyElement
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    _buildPropertyCompletions: function(proxyElement, wordRange, force, completionsReadyCallback)
    {
        var prefix = wordRange.toString().toLowerCase();
        if (!prefix && !force && (this._isEditingName || proxyElement.textContent.length)) {
            completionsReadyCallback([]);
            return;
        }

        var results = this._cssCompletions.startsWith(prefix);
        if (!this._isEditingName && !results.length && prefix.length > 1 && "!important".startsWith(prefix))
            results.push("!important");
        var userEnteredText = wordRange.toString().replace("-", "");
        if (userEnteredText && (userEnteredText === userEnteredText.toUpperCase())) {
            for (var i = 0; i < results.length; ++i)
                results[i] = results[i].toUpperCase();
        }
        var selectedIndex = this._cssCompletions.mostUsedOf(results);
        completionsReadyCallback(results, selectedIndex);
    },

    __proto__: WebInspector.TextPrompt.prototype
}

/**
 * @constructor
 * @param {?WebInspector.CSSRule} rule
 * @param {?WebInspector.DOMNode} node
 * @param {string} name
 * @param {string} value
 */
WebInspector.StylesSidebarPropertyRenderer = function(rule, node, name, value)
{
    this._rule = rule;
    this._node = node;
    this._propertyName = name;
    this._propertyValue = value;
}

WebInspector.StylesSidebarPropertyRenderer._colorRegex = /((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|\b\w+\b(?!-))/g;
WebInspector.StylesSidebarPropertyRenderer._bezierRegex = /((cubic-bezier\([^)]+\))|\b(linear|ease-in-out|ease-in|ease-out|ease)\b)/g;

/**
 * @param {string} value
 * @return {!RegExp}
 */
WebInspector.StylesSidebarPropertyRenderer._urlRegex = function(value)
{
    // Heuristically choose between single-quoted, double-quoted or plain URL regex.
    if (/url\(\s*'.*\s*'\s*\)/.test(value))
        return /url\(\s*('.+')\s*\)/g;
    if (/url\(\s*".*\s*"\s*\)/.test(value))
        return /url\(\s*(".+")\s*\)/g;
    return /url\(\s*([^)]+)\s*\)/g;
}

WebInspector.StylesSidebarPropertyRenderer.prototype = {
    /**
     * @param {function(string):!Node} handler
     */
    setColorHandler: function(handler)
    {
        this._colorHandler = handler;
    },

    /**
     * @param {function(string):!Node} handler
     */
    setBezierHandler: function(handler)
    {
        this._bezierHandler = handler;
    },

    /**
     * @return {!Element}
     */
    renderName: function()
    {
        var nameElement = createElement("span");
        nameElement.className = "webkit-css-property";
        nameElement.textContent = this._propertyName;
        nameElement.normalize();
        return nameElement;
    },

    /**
     * @return {!Element}
     */
    renderValue: function()
    {
        var valueElement = createElement("span");
        valueElement.className = "value";

        if (!this._propertyValue)
            return valueElement;

        var formatter = new WebInspector.StringFormatter();
        formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._urlRegex(this._propertyValue), this._processURL.bind(this));
        if (this._bezierHandler && WebInspector.CSSMetadata.isBezierAwareProperty(this._propertyName))
            formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._bezierRegex, this._bezierHandler);
        if (this._colorHandler && WebInspector.CSSMetadata.isColorAwareProperty(this._propertyName))
            formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._colorRegex, this._colorHandler);

        valueElement.appendChild(formatter.formatText(this._propertyValue));
        valueElement.normalize();
        return valueElement;
    },

    /**
     * @param {string} url
     * @return {!Node}
     */
    _processURL: function(url)
    {
        var hrefUrl = url;
        var match = hrefUrl.match(/['"]?([^'"]+)/);
        if (match)
            hrefUrl = match[1];
        var container = createDocumentFragment();
        container.createTextChild("url(");
        if (this._rule && this._rule.resourceURL())
            hrefUrl = WebInspector.ParsedURL.completeURL(this._rule.resourceURL(), hrefUrl);
        else if (this._node)
            hrefUrl = this._node.resolveURL(hrefUrl);
        var hasResource = hrefUrl && !!WebInspector.resourceForURL(hrefUrl);
        // FIXME: WebInspector.linkifyURLAsNode() should really use baseURI.
        container.appendChild(WebInspector.linkifyURLAsNode(hrefUrl || url, url, undefined, !hasResource));
        container.createTextChild(")");
        return container;
    }
}

/**
 * @constructor
 */
WebInspector.StylesSidebarPane.MatchedRulesPayload = function()
{
    /** @type {?WebInspector.CSSStyleDeclaration} */
    this.inlineStyle = null;
    /** @type {?WebInspector.CSSStyleDeclaration} */
    this.attributesStyle = null;
    /** @type {?Array.<!WebInspector.CSSRule>} */
    this.matchedCSSRules = null;
    /** @type {?Array.<{pseudoId: number, rules: !Array.<!WebInspector.CSSRule>}>} */
    this.pseudoElements = null;
    /** @type {?Array.<{matchedCSSRules: !Array.<!WebInspector.CSSRule>}>} */
    this.inherited = null;
}

WebInspector.StylesSidebarPane.MatchedRulesPayload.prototype = {
    /**
     * @return {boolean}
     */
    fulfilled: function()
    {
        return !!(this.matchedCSSRules && this.pseudoElements && this.inherited);
    }
}
