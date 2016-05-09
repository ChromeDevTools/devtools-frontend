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
 */
WebInspector.StylesSidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Styles"));
    this.setMinimumSize(96, 26);

    WebInspector.moduleSetting("colorFormat").addChangeListener(this.update.bind(this));
    WebInspector.moduleSetting("textEditorIndent").addChangeListener(this.update.bind(this));

    this._sectionsContainer = this.element.createChild("div");
    this._stylesPopoverHelper = new WebInspector.StylesPopoverHelper();
    this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());

    this.element.classList.add("styles-pane");
    this.element.addEventListener("mousemove", this._mouseMovedOverElement.bind(this), false);
    this._keyDownBound = this._keyDown.bind(this);
    this._keyUpBound = this._keyUp.bind(this);

    WebInspector.targetManager.addModelListener(WebInspector.CSSModel, WebInspector.CSSModel.Events.LayoutEditorChange, this._onLayoutEditorChange, this);
}

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
    exclamationElement.title = WebInspector.CSSMetadata.cssPropertiesMetainfo.keySet()[property.name.toLowerCase()] ? WebInspector.UIString("Invalid property value") : WebInspector.UIString("Unknown property name");
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
    _onLayoutEditorChange: function(event)
    {
        var cssModel = /** @type {!WebInspector.CSSModel} */(event.target);
        var styleSheetId = event.data["id"];
        var sourceRange = /** @type {!CSSAgent.SourceRange} */(event.data["range"]);
        var range = WebInspector.TextRange.fromObject(sourceRange);
        this._decorator = new WebInspector.PropertyChangeHighlighter(this, cssModel, styleSheetId, range);
        this.update();
    },

    /**
     * @param {!WebInspector.CSSProperty} cssProperty
     */
    revealProperty: function(cssProperty)
    {
        this._decorator = new WebInspector.PropertyRevealHighlighter(this, cssProperty);
        this._decorator.perform();
        this.update();
    },

    onUndoOrRedoHappened: function()
    {
        this.setNode(this.node());
    },

    /**
     * @param {!Event} event
     */
    _onAddButtonLongClick: function(event)
    {
        var cssModel = this.cssModel();
        if (!cssModel)
            return;
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

        var contextMenu = new WebInspector.ContextMenu(event);
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
     * @param {?RegExp} regex
     */
    onFilterChanged: function(regex)
    {
        this._filterRegex = regex;
        this._updateFilter();
    },

    /**
     * @override
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        this._stylesPopoverHelper.hide();
        node = WebInspector.SharedSidebarModel.elementNode(node);

        this._resetCache();
        WebInspector.ElementsSidebarPane.prototype.setNode.call(this, node);
    },

    /**
     * @param {!WebInspector.StylePropertiesSection=} editedSection
     */
    _refreshUpdate: function(editedSection)
    {
        var node = this.node();
        if (!node)
            return;

        var fullRefresh = Runtime.experiments.isEnabled("liveSASS");
        for (var section of this.allSections()) {
            if (section.isBlank)
                continue;
            section.update(fullRefresh || section === editedSection);
        }

        if (this._filterRegex)
            this._updateFilter();
        this._nodeStylesUpdatedForTest(node, false);
    },

    /**
     * @override
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        this._discardElementUnderMouse();

        return this.fetchMatchedCascade()
            .then(this._innerRebuildUpdate.bind(this));
    },

    _resetCache: function()
    {
        delete this._matchedCascadePromise;
    },

    /**
     * @return {!Promise.<?WebInspector.CSSMatchedStyles>}
     */
    fetchMatchedCascade: function()
    {
        var node = this.node();
        if (!node)
            return Promise.resolve(/** @type {?WebInspector.CSSMatchedStyles} */(null));
        if (!this._matchedCascadePromise)
            this._matchedCascadePromise = this._matchedStylesForNode(node).then(validateStyles.bind(this));
        return this._matchedCascadePromise;

        /**
         * @param {?WebInspector.CSSMatchedStyles} matchedStyles
         * @return {?WebInspector.CSSMatchedStyles}
         * @this {WebInspector.StylesSidebarPane}
         */
        function validateStyles(matchedStyles)
        {
            return matchedStyles && matchedStyles.node() === this.node() ? matchedStyles : null;
        }
    },

    /**
     * @param {!WebInspector.DOMNode} node
     * @return {!Promise.<?WebInspector.CSSMatchedStyles>}
     */
    _matchedStylesForNode: function(node)
    {
        var cssModel = this.cssModel();
        if (!cssModel)
            return Promise.resolve(/** @type {?WebInspector.CSSMatchedStyles} */(null));
        return cssModel.matchedStylesPromise(node.id)
    },

    /**
     * @param {boolean} editing
     */
    setEditingStyle: function(editing)
    {
        if (this._isEditingStyle === editing)
            return;
        this.element.classList.toggle("is-editing-style", editing);
        this._isEditingStyle = editing;
    },

    /**
     * @override
     * @param {!WebInspector.Event=} event
     */
    onCSSModelChanged: function(event)
    {
        var edit = event && event.data ? /** @type {?WebInspector.CSSModel.Edit} */(event.data.edit) : null;
        if (edit) {
            for (var section of this.allSections())
                section._styleSheetEdited(edit);
            return;
        }

        if (this._userOperation || this._isEditingStyle)
            return;

        this._resetCache();
        this.update();
    },

    /**
     * @override
     */
    onFrameResizedThrottled: function()
    {
        this.onCSSModelChanged();
    },

    /**
     * @override
     * @param {!WebInspector.DOMNode} node
     */
    onDOMModelChanged: function(node)
    {
        // Any attribute removal or modification can affect the styles of "related" nodes.
        // Do not touch the styles if they are being edited.
        if (this._isEditingStyle || this._userOperation)
            return;

        if (!this._canAffectCurrentStyles(node))
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
     * @param {?WebInspector.CSSMatchedStyles} matchedStyles
     */
    _innerRebuildUpdate: function(matchedStyles)
    {
        this._linkifier.reset();
        this._sectionsContainer.removeChildren();
        this._sectionBlocks = [];

        var node = this.node();
        if (!matchedStyles || !node)
            return;

        this._sectionBlocks = this._rebuildSectionsForMatchedStyleRules(matchedStyles);
        var pseudoTypes = [];
        var keys = new Set(matchedStyles.pseudoStyles().keys());
        if (keys.delete(DOMAgent.PseudoType.Before))
            pseudoTypes.push(DOMAgent.PseudoType.Before);
        pseudoTypes = pseudoTypes.concat(keys.valuesArray().sort());
        for (var pseudoType of pseudoTypes) {
            var block = WebInspector.SectionBlock.createPseudoTypeBlock(pseudoType);
            var styles = /** @type {!Array<!WebInspector.CSSStyleDeclaration>} */(matchedStyles.pseudoStyles().get(pseudoType));
            for (var style of styles) {
                var section = new WebInspector.StylePropertiesSection(this, matchedStyles, style);
                block.sections.push(section);
            }
            this._sectionBlocks.push(block);
        }

        for (var keyframesRule of matchedStyles.keyframes()) {
            var block = WebInspector.SectionBlock.createKeyframesBlock(keyframesRule.name().text);
            for (var keyframe of keyframesRule.keyframes())
                block.sections.push(new WebInspector.KeyframePropertiesSection(this, matchedStyles, keyframe.style));
            this._sectionBlocks.push(block);
        }

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
        if (this._decorator) {
            this._decorator.perform();
            delete this._decorator;
        }
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
     * @param {!WebInspector.CSSMatchedStyles} matchedStyles
     * @return {!Array.<!WebInspector.SectionBlock>}
     */
    _rebuildSectionsForMatchedStyleRules: function(matchedStyles)
    {
        var blocks = [new WebInspector.SectionBlock(null)];
        var lastParentNode = null;
        for (var style of matchedStyles.nodeStyles()) {
            var parentNode = matchedStyles.isInherited(style) ? matchedStyles.nodeForStyle(style) : null;
            if (parentNode && parentNode !== lastParentNode) {
                lastParentNode = parentNode;
                var block = WebInspector.SectionBlock.createInheritedNodeBlock(lastParentNode);
                blocks.push(block);
            }

            var section = new WebInspector.StylePropertiesSection(this, matchedStyles, style);
            blocks.peekLast().sections.push(section);
        }
        return blocks;
    },

    _createNewRuleInViaInspectorStyleSheet: function()
    {
        var cssModel = this.cssModel();
        var node = this.node();
        if (!cssModel || !node)
            return;
        this._userOperation = true;
        cssModel.requestViaInspectorStylesheet(node, onViaInspectorStyleSheet.bind(this));

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
        styleSheetHeader.requestContent().then(onStyleSheetContent.bind(this, styleSheetHeader.id));

        /**
         * @param {string} styleSheetId
         * @param {?string} text
         * @this {WebInspector.StylesSidebarPane}
         */
        function onStyleSheetContent(styleSheetId, text)
        {
            text = text || "";
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
        var blankSection = new WebInspector.BlankStylePropertiesSection(this, insertAfterSection._matchedStyles, node ? WebInspector.DOMPresentationUtils.simpleSelector(node) : "", styleSheetId, ruleLocation, insertAfterSection._style);

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

    /**
     * @return {!Array<!WebInspector.StylePropertiesSection>}
     */
    allSections: function()
    {
        var sections = [];
        for (var block of this._sectionBlocks)
            sections = sections.concat(block.sections);
        return sections;
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
}

/**
 * @param {string} placeholder
 * @param {!Element} container
 * @param {function(?RegExp)} filterCallback
 * @return {!Element}
 */
WebInspector.StylesSidebarPane.createPropertyFilterElement = function(placeholder, container, filterCallback)
{
    var input = createElement("input");
    input.placeholder = placeholder;

    function searchHandler()
    {
        var regex = input.value ? new RegExp(input.value.escapeForRegExp(), "i") : null;
        filterCallback(regex);
        container.classList.toggle("styles-filter-engaged", !!input.value);
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
 * @param {!DOMAgent.PseudoType} pseudoType
 * @return {!WebInspector.SectionBlock}
 */
WebInspector.SectionBlock.createPseudoTypeBlock = function(pseudoType)
{
    var separatorElement = createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.textContent = WebInspector.UIString("Pseudo ::%s element", pseudoType);
    return new WebInspector.SectionBlock(separatorElement);
}

/**
 * @param {string} keyframesName
 * @return {!WebInspector.SectionBlock}
 */
WebInspector.SectionBlock.createKeyframesBlock = function(keyframesName)
{
    var separatorElement = createElement("div");
    separatorElement.className = "sidebar-separator";
    separatorElement.textContent = WebInspector.UIString("@keyframes " + keyframesName);
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
 * @param {!WebInspector.CSSMatchedStyles} matchedStyles
 * @param {!WebInspector.CSSStyleDeclaration} style
 */
WebInspector.StylePropertiesSection = function(parentPane, matchedStyles, style)
{
    this._parentPane = parentPane;
    this._style = style;
    this._matchedStyles = matchedStyles;
    this.editable = !!(style.styleSheetId && style.range);

    var rule = style.parentRule;
    this.element = createElementWithClass("div", "styles-section matched-styles monospace");
    this.element._section = this;

    this._titleElement = this.element.createChild("div", "styles-section-title " + (rule ? "styles-selector" : ""));

    this.propertiesTreeOutline = new TreeOutline();
    this.propertiesTreeOutline.element.classList.add("style-properties", "monospace");
    this.propertiesTreeOutline.section = this;
    this.element.appendChild(this.propertiesTreeOutline.element);

    var selectorContainer = createElement("div");
    this._selectorElement = createElementWithClass("span", "selector");
    this._selectorElement.textContent = this._headerText();
    selectorContainer.appendChild(this._selectorElement);
    this._selectorElement.addEventListener("mouseenter", this._onMouseEnterSelector.bind(this), false);
    this._selectorElement.addEventListener("mouseleave", this._onMouseOutSelector.bind(this), false);

    var openBrace = createElement("span");
    openBrace.textContent = " {";
    selectorContainer.appendChild(openBrace);
    selectorContainer.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
    selectorContainer.addEventListener("click", this._handleSelectorContainerClick.bind(this), false);

    var closeBrace = this.element.createChild("div", "sidebar-pane-closing-brace");
    closeBrace.textContent = "}";

    this._createHoverMenuToolbar(closeBrace);

    this._selectorElement.addEventListener("click", this._handleSelectorClick.bind(this), false);
    this.element.addEventListener("mousedown", this._handleEmptySpaceMouseDown.bind(this), false);
    this.element.addEventListener("click", this._handleEmptySpaceClick.bind(this), false);

    if (rule) {
        // Prevent editing the user agent and user rules.
        if (rule.isUserAgent() || rule.isInjected()) {
            this.editable = false;
        } else {
            // Check this is a real CSSRule, not a bogus object coming from WebInspector.BlankStylePropertiesSection.
            if (rule.styleSheetId)
                this.navigable = !!rule.resourceURL();
        }
    }

    this._mediaListElement = this._titleElement.createChild("div", "media-list media-matches");
    this._selectorRefElement = this._titleElement.createChild("div", "styles-section-subtitle");
    this._updateMediaList();
    this._updateRuleOrigin();
    this._titleElement.appendChild(selectorContainer);
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
     * @param {!Element} container
     */
    _createHoverMenuToolbar: function(container)
    {
        if (!this.editable)
            return;
        var items = [];
        var colorButton = new WebInspector.ToolbarButton(WebInspector.UIString("Add color"), "foreground-color-toolbar-item");
        colorButton.addEventListener("click", this._onInsertColorPropertyClick.bind(this));
        items.push(colorButton);

        var backgroundButton = new WebInspector.ToolbarButton(WebInspector.UIString("Add background-color"), "background-color-toolbar-item");
        backgroundButton.addEventListener("click", this._onInsertBackgroundColorPropertyClick.bind(this));
        items.push(backgroundButton);

        var newRuleButton = null;
        if (this._style.parentRule) {
            newRuleButton = new WebInspector.ToolbarButton(WebInspector.UIString("Insert Style Rule Below"), "add-toolbar-item");
            newRuleButton.addEventListener("click", this._onNewRuleClick.bind(this));
            items.push(newRuleButton);
        }

        var sectionToolbar = new WebInspector.Toolbar("sidebar-pane-section-toolbar", container);
        for (var i = 0; i < items.length; ++i)
            sectionToolbar.appendToolbarItem(items[i]);

        var menuButton = new WebInspector.ToolbarButton(WebInspector.UIString("More tools\u2026"), "menu-toolbar-item");
        sectionToolbar.appendToolbarItem(menuButton);
        setItemsVisibility.call(this, items, false);
        sectionToolbar.element.addEventListener("mouseenter", setItemsVisibility.bind(this, items, true));
        sectionToolbar.element.addEventListener("mouseleave", setItemsVisibility.bind(this, items, false));

        /**
         * @param {!Array<!WebInspector.ToolbarButton>} items
         * @param {boolean} value
         * @this {WebInspector.StylePropertiesSection}
         */
        function setItemsVisibility(items, value)
        {
            for (var i = 0; i < items.length; ++i)
                items[i].setVisible(value);
            menuButton.setVisible(!value);
            if (this._isSASSStyle())
                newRuleButton.setVisible(false);
        }
    },

    /**
     * @return {boolean}
     */
    _isSASSStyle: function()
    {
        var header = this._style.styleSheetId ? this._style.cssModel().styleSheetHeaderForId(this._style.styleSheetId) : null;
        if (!header)
            return false;
        var sourceMap = header.cssModel().sourceMapForHeader(header);
        return sourceMap ? sourceMap.editable() : false;
    },

    /**
     * @return {!WebInspector.CSSStyleDeclaration}
     */
    style: function()
    {
        return this._style;
    },

    /**
     * @return {string}
     */
    _headerText: function()
    {
        var node = this._matchedStyles.nodeForStyle(this._style);
        if (this._style.type === WebInspector.CSSStyleDeclaration.Type.Inline)
            return this._matchedStyles.isInherited(this._style) ? WebInspector.UIString("Style Attribute") : "element.style";
        if (this._style.type === WebInspector.CSSStyleDeclaration.Type.Attributes)
            return node.nodeNameInCorrectCase() + "[" + WebInspector.UIString("Attributes Style") + "]";
        return this._style.parentRule.selectorText();
    },

    _onMouseOutSelector: function()
    {
        if (this._hoverTimer)
            clearTimeout(this._hoverTimer);
        WebInspector.DOMModel.hideDOMNodeHighlight()
    },

    _onMouseEnterSelector: function()
    {
        if (this._hoverTimer)
            clearTimeout(this._hoverTimer);
        this._hoverTimer = setTimeout(this._highlight.bind(this), 300);
    },

    _highlight: function()
    {
        WebInspector.DOMModel.hideDOMNodeHighlight();
        var node = this._parentPane.node();
        var domModel = node.domModel();
        var selectors = this._style.parentRule ? this._style.parentRule.selectorText() : undefined;
        domModel.highlightDOMNodeWithConfig(node.id, { mode: "all", showInfo: undefined, selectors: selectors });
    },

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
     * @param {!WebInspector.Event} event
     */
    _onNewRuleClick: function(event)
    {
        event.consume();
        var rule = this._style.parentRule;
        var range = WebInspector.TextRange.createFromLocation(rule.style.range.endLine, rule.style.range.endColumn + 1);
        this._parentPane._addBlankSection(this, /** @type {string} */(rule.styleSheetId), range);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onInsertColorPropertyClick: function(event)
    {
        event.consume(true);
        var treeElement = this.addNewBlankProperty();
        treeElement.property.name = "color";
        treeElement.property.value = "black";
        treeElement.updateTitle();
        var colorSwatch = WebInspector.ColorSwatchPopoverIcon.forTreeElement(treeElement);
        if (colorSwatch)
            colorSwatch.showPopover();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onInsertBackgroundColorPropertyClick: function(event)
    {
        event.consume(true);
        var treeElement = this.addNewBlankProperty();
        treeElement.property.name = "background-color";
        treeElement.property.value = "white";
        treeElement.updateTitle();
        var colorSwatch = WebInspector.ColorSwatchPopoverIcon.forTreeElement(treeElement);
        if (colorSwatch)
            colorSwatch.showPopover();
    },

    /**
     * @param {!WebInspector.CSSModel.Edit} edit
     */
    _styleSheetEdited: function(edit)
    {
        var rule = this._style.parentRule;
        if (rule)
            rule.rebase(edit);
        else
            this._style.rebase(edit);

        this._updateMediaList();
        this._updateRuleOrigin();
    },

    /**
     * @param {!Array.<!WebInspector.CSSMedia>} mediaRules
     */
    _createMediaList: function(mediaRules)
    {
        for (var i = mediaRules.length - 1; i >= 0; --i) {
            var media = mediaRules[i];
            // Don't display trivial non-print media types.
            if (!media.text.includes("(") && media.text !== "print")
                continue;
            var mediaDataElement = this._mediaListElement.createChild("div", "media");
            var mediaContainerElement = mediaDataElement.createChild("span");
            var mediaTextElement = mediaContainerElement.createChild("span", "media-text");
            switch (media.source) {
            case WebInspector.CSSMedia.Source.LINKED_SHEET:
            case WebInspector.CSSMedia.Source.INLINE_SHEET:
                mediaTextElement.textContent = "media=\"" + media.text + "\"";
                break;
            case WebInspector.CSSMedia.Source.MEDIA_RULE:
                var decoration = mediaContainerElement.createChild("span");
                mediaContainerElement.insertBefore(decoration, mediaTextElement);
                decoration.textContent = "@media ";
                mediaTextElement.textContent = media.text;
                if (media.styleSheetId) {
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
        if (this._style.parentRule && this._style.parentRule instanceof WebInspector.CSSStyleRule)
            this._createMediaList(this._style.parentRule.media);
    },

    /**
     * @param {string} propertyName
     * @return {boolean}
     */
    isPropertyInherited: function(propertyName)
    {
        if (this._matchedStyles.isInherited(this._style)) {
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
        this._selectorElement.textContent = this._headerText();
        this._markSelectorMatches();
        if (full) {
            this.propertiesTreeOutline.removeChildren();
            this.onpopulate();
        } else {
            var child = this.propertiesTreeOutline.firstChild();
            while (child) {
                child.setOverloaded(this._isPropertyOverloaded(child.property));
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
        var style = this._style;
        for (var property of style.leadingProperties()) {
            var isShorthand = !!style.longhandProperties(property.name).length;
            var inherited = this.isPropertyInherited(property.name);
            var overloaded = this._isPropertyOverloaded(property);
            var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._matchedStyles, property, isShorthand, inherited, overloaded);
            this.propertiesTreeOutline.appendChild(item);
        }
    },

    /**
     * @param {!WebInspector.CSSProperty} property
     * @return {boolean}
     */
    _isPropertyOverloaded: function(property)
    {
        return this._matchedStyles.propertyState(property) === WebInspector.CSSMatchedStyles.PropertyState.Overloaded;
    },

    /**
     * @return {boolean}
     */
    _updateFilter: function()
    {
        var hasMatchingChild = false;
        for (var child of this.propertiesTreeOutline.rootElement().children())
            hasMatchingChild |= child._updateFilter();

        var regex = this._parentPane.filterRegex();
        var hideRule = !hasMatchingChild && !!regex && !regex.test(this.element.textContent);
        this.element.classList.toggle("hidden", hideRule);
        if (!hideRule && this._style.parentRule)
            this._markSelectorHighlights();
        return !hideRule;
    },

    _markSelectorMatches: function()
    {
        var rule = this._style.parentRule;
        if (!rule)
            return;

        this._mediaListElement.classList.toggle("media-matches", this._matchedStyles.mediaMatches(this._style));

        if (!this._matchedStyles.hasMatchingSelectors(/** @type {!WebInspector.CSSStyleRule} */(rule)))
            return;

        var selectors = rule.selectors;
        var fragment = createDocumentFragment();
        var currentMatch = 0;
        var matchingSelectors = this._matchedStyles.matchingSelectors(/** @type {!WebInspector.CSSStyleRule} */(rule));
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
            selectorElement.textContent = selectors[i].text;

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
            var selectorMatchesFilter = !!regex && regex.test(selectors[i].textContent);
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
        var property = this._style.newBlankProperty(index);
        var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._matchedStyles, property, false, false, false);
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

        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */(event)) && this.navigable) {
            var location = media.rawLocation();
            if (!location) {
                event.consume(true);
                return;
            }
            var uiLocation = WebInspector.cssWorkspaceBinding.rawLocationToUILocation(location);
            if (uiLocation)
                WebInspector.Revealer.reveal(uiLocation);
            event.consume(true);
            return;
        }

        if (!this.editable || this._isSASSStyle())
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
         * @param {boolean} success
         * @this {WebInspector.StylePropertiesSection}
         */
        function userCallback(success)
        {
            if (success) {
                this._matchedStyles.resetActiveProperties();
                this._parentPane._refreshUpdate(this);
            }
            delete this._parentPane._userOperation;
            this._editingMediaTextCommittedForTest();
        }

        // This gets deleted in finishOperation(), which is called both on success and failure.
        this._parentPane._userOperation = true;
        this._parentPane._cssModel.setMediaText(media.styleSheetId, media.range, newContent)
            .then(userCallback.bind(this));
    },

    _editingMediaTextCommittedForTest: function() { },

    /**
     * @param {!Event} event
     */
    _handleSelectorClick: function(event)
    {
        if (WebInspector.KeyboardShortcut.eventHasCtrlOrMeta(/** @type {!MouseEvent} */(event)) && this.navigable && event.target.classList.contains("simple-selector")) {
            var index = event.target._selectorIndex;
            var cssModel = this._parentPane._cssModel;
            var rule = this._style.parentRule;
            var header = cssModel.styleSheetHeaderForId(/** @type {string} */(rule.styleSheetId));
            if (!header) {
                event.consume(true);
                return;
            }
            var rawLocation = new WebInspector.CSSLocation(header, rule.lineNumberInSource(index), rule.columnNumberInSource(index));
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
        if (!this.editable || this._isSASSStyle())
            return;

        var rule = this._style.parentRule;
        if (!rule && !this.propertiesTreeOutline.rootElement().childCount()) {
            this.addNewBlankProperty().startEditing();
            return;
        }

        if (!rule)
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

        var config = new WebInspector.InplaceEditor.Config(this.editingSelectorCommitted.bind(this), this.editingSelectorCancelled.bind(this));
        WebInspector.InplaceEditor.startEditing(this._selectorElement, config);

        element.getComponentSelection().setBaseAndExtent(element, 0, element, 1);
        this._parentPane.setEditingStyle(true);
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
            while (firstChild && firstChild.inherited())
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
        var rule = this._style.parentRule;
        if (!rule)
            return;

        /**
         * @this {WebInspector.StylePropertiesSection}
         */
        function headerTextCommitted()
        {
            delete this._parentPane._userOperation;
            this._moveEditorFromSelector(moveDirection);
            this._editingSelectorCommittedForTest();
        }

        // This gets deleted in finishOperationAndMoveEditor(), which is called both on success and failure.
        this._parentPane._userOperation = true;
        this._setHeaderText(rule, newContent).then(headerTextCommitted.bind(this));
    },

    /**
     * @param {!WebInspector.CSSRule} rule
     * @param {string} newContent
     * @return {!Promise}
     */
    _setHeaderText: function(rule, newContent)
    {
        /**
         * @param {!WebInspector.CSSStyleRule} rule
         * @param {boolean} success
         * @return {!Promise}
         * @this {WebInspector.StylePropertiesSection}
         */
        function onSelectorsUpdated(rule, success)
        {
            if (!success)
                return Promise.resolve();
            return this._matchedStyles.recomputeMatchingSelectors(rule)
                .then(updateSourceRanges.bind(this, rule));
        }

        /**
         * @param {!WebInspector.CSSStyleRule} rule
         * @this {WebInspector.StylePropertiesSection}
         */
        function updateSourceRanges(rule)
        {
            var doesAffectSelectedNode = this._matchedStyles.matchingSelectors(rule).length > 0;
            this.element.classList.toggle("no-affect", !doesAffectSelectedNode);
            this._matchedStyles.resetActiveProperties();
            this._parentPane._refreshUpdate(this);
        }

        console.assert(rule instanceof WebInspector.CSSStyleRule);
        var oldSelectorRange = rule.selectorRange();
        if (!oldSelectorRange)
            return Promise.resolve();
        var selectedNode = this._parentPane.node();
        return rule.setSelectorText(newContent)
            .then(onSelectorsUpdated.bind(this, /** @type {!WebInspector.CSSStyleRule} */(rule), oldSelectorRange));
    },

    _editingSelectorCommittedForTest: function() { },

    _updateRuleOrigin: function()
    {
        this._selectorRefElement.removeChildren();
        this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection.createRuleOriginNode(this._matchedStyles, this._parentPane._linkifier, this._style.parentRule));
    },

    _editingSelectorEnded: function()
    {
        this._parentPane.setEditingStyle(false);
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
 * @param {!WebInspector.CSSMatchedStyles} matchedStyles
 * @param {!WebInspector.Linkifier} linkifier
 * @param {?WebInspector.CSSRule} rule
 * @return {!Node}
 */
WebInspector.StylePropertiesSection.createRuleOriginNode = function(matchedStyles, linkifier, rule)
{
    if (!rule)
        return createTextNode("");

    var ruleLocation;
    if (rule instanceof WebInspector.CSSStyleRule) {
        var matchingSelectors = matchedStyles.matchingSelectors(rule);
        var firstMatchingIndex = matchingSelectors.length ? matchingSelectors[0] : 0;
        ruleLocation = rule.selectors[firstMatchingIndex].range;
    } else if (rule instanceof WebInspector.CSSKeyframeRule) {
        ruleLocation = rule.key().range;
    }

    var header = rule.styleSheetId ? matchedStyles.cssModel().styleSheetHeaderForId(rule.styleSheetId) : null;
    if (ruleLocation && rule.styleSheetId && header && header.resourceURL())
        return WebInspector.StylePropertiesSection._linkifyRuleLocation(matchedStyles.cssModel(), linkifier, rule.styleSheetId, ruleLocation);

    if (rule.isUserAgent())
        return createTextNode(WebInspector.UIString("user agent stylesheet"));
    if (rule.isInjected())
        return createTextNode(WebInspector.UIString("injected stylesheet"));
    if (rule.isViaInspector())
        return createTextNode(WebInspector.UIString("via inspector"));

    if (header && header.ownerNode) {
        var link = WebInspector.DOMPresentationUtils.linkifyDeferredNodeReference(header.ownerNode);
        link.textContent = "<style>…</style>";
        return link;
    }

    return createTextNode("");
}

/**
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!WebInspector.Linkifier} linkifier
 * @param {string} styleSheetId
 * @param {!WebInspector.TextRange} ruleLocation
 * @return {!Node}
 */
WebInspector.StylePropertiesSection._linkifyRuleLocation = function(cssModel, linkifier, styleSheetId, ruleLocation)
{
    var styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    var lineNumber = styleSheetHeader.lineNumberInSource(ruleLocation.startLine);
    var columnNumber = styleSheetHeader.columnNumberInSource(ruleLocation.startLine, ruleLocation.startColumn);
    var matchingSelectorLocation = new WebInspector.CSSLocation(styleSheetHeader, lineNumber, columnNumber);
    return linkifier.linkifyCSSLocation(matchingSelectorLocation);
}

/**
 * @constructor
 * @extends {WebInspector.StylePropertiesSection}
 * @param {!WebInspector.StylesSidebarPane} stylesPane
 * @param {!WebInspector.CSSMatchedStyles} matchedStyles
 * @param {string} defaultSelectorText
 * @param {string} styleSheetId
 * @param {!WebInspector.TextRange} ruleLocation
 * @param {!WebInspector.CSSStyleDeclaration} insertAfterStyle
 */
WebInspector.BlankStylePropertiesSection = function(stylesPane, matchedStyles, defaultSelectorText, styleSheetId, ruleLocation, insertAfterStyle)
{
    var rule = WebInspector.CSSStyleRule.createDummyRule(stylesPane._cssModel, defaultSelectorText);
    WebInspector.StylePropertiesSection.call(this, stylesPane, matchedStyles, rule.style);
    this._ruleLocation = ruleLocation;
    this._styleSheetId = styleSheetId;
    this._selectorRefElement.removeChildren();
    this._selectorRefElement.appendChild(WebInspector.StylePropertiesSection._linkifyRuleLocation(this._parentPane._cssModel, this._parentPane._linkifier, styleSheetId, this._actualRuleLocation()));
    if (insertAfterStyle && insertAfterStyle.parentRule)
        this._createMediaList(insertAfterStyle.parentRule.media);
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
         * @param {?WebInspector.CSSStyleRule} newRule
         * @return {!Promise}
         * @this {WebInspector.StylePropertiesSection}
         */
        function onRuleAdded(newRule)
        {
            if (!newRule) {
                this.editingSelectorCancelled();
                this._editingSelectorCommittedForTest();
                return Promise.resolve();
            }
            return this._matchedStyles.addNewRule(newRule, this._matchedStyles.node())
                .then(onAddedToCascade.bind(this, newRule));
        }

        /**
         * @param {!WebInspector.CSSStyleRule} newRule
         * @this {WebInspector.StylePropertiesSection}
         */
        function onAddedToCascade(newRule)
        {
            var doesSelectorAffectSelectedNode = this._matchedStyles.matchingSelectors(newRule).length > 0;
            this._makeNormal(newRule);

            if (!doesSelectorAffectSelectedNode)
                this.element.classList.add("no-affect");

            this._updateRuleOrigin();
            if (this.element.parentElement) // Might have been detached already.
                this._moveEditorFromSelector(moveDirection);

            delete this._parentPane._userOperation;
            this._editingSelectorEnded();
            this._markSelectorMatches();

            this._editingSelectorCommittedForTest();
        }

        if (newContent)
            newContent = newContent.trim();
        this._parentPane._userOperation = true;

        var cssModel = this._parentPane._cssModel;
        var ruleText = this._rulePrefix() + newContent + " {}";
        cssModel.addRule(this._styleSheetId, ruleText, this._ruleLocation)
            .then(onRuleAdded.bind(this));
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
        this._style = newRule.style;
        // FIXME: replace this instance by a normal WebInspector.StylePropertiesSection.
        this._normal = true;
    },

    __proto__: WebInspector.StylePropertiesSection.prototype
}

/**
 * @constructor
 * @extends {WebInspector.StylePropertiesSection}
 * @param {!WebInspector.StylesSidebarPane} stylesPane
 * @param {!WebInspector.CSSMatchedStyles} matchedStyles
 * @param {!WebInspector.CSSStyleDeclaration} style
 */
WebInspector.KeyframePropertiesSection = function(stylesPane, matchedStyles, style)
{
    WebInspector.StylePropertiesSection.call(this, stylesPane, matchedStyles, style);
    this._selectorElement.className = "keyframe-key";
}

WebInspector.KeyframePropertiesSection.prototype = {
    /**
     * @override
     * @return {string}
     */
    _headerText: function()
    {
        return this._style.parentRule.key().text;
    },

    /**
     * @override
     * @param {!WebInspector.CSSRule} rule
     * @param {string} newContent
     * @return {!Promise}
     */
    _setHeaderText: function(rule, newContent)
    {
        /**
         * @param {boolean} success
         * @this {WebInspector.KeyframePropertiesSection}
         */
        function updateSourceRanges(success)
        {
            if (!success)
                return;
            this._parentPane._refreshUpdate(this);
        }

        console.assert(rule instanceof WebInspector.CSSKeyframeRule);
        var oldRange = rule.key().range;
        if (!oldRange)
            return Promise.resolve();
        var selectedNode = this._parentPane.node();
        return rule.setKeyText(newContent).then(updateSourceRanges.bind(this));
    },

    /**
     * @override
     * @param {string} propertyName
     * @return {boolean}
     */
    isPropertyInherited: function(propertyName)
    {
        return false;
    },

    /**
     * @override
     * @param {!WebInspector.CSSProperty} property
     * @return {boolean}
     */
    _isPropertyOverloaded: function(property)
    {
        return false;
    },

    /**
     * @override
     */
    _markSelectorHighlights: function()
    {
    },

    /**
     * @override
     */
    _markSelectorMatches: function()
    {
        this._selectorElement.textContent = this._style.parentRule.key().text;
    },

    /**
     * @override
     */
    _highlight: function()
    {
    },

    __proto__: WebInspector.StylePropertiesSection.prototype
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.StylesSidebarPane} stylesPane
 * @param {!WebInspector.CSSMatchedStyles} matchedStyles
 * @param {!WebInspector.CSSProperty} property
 * @param {boolean} isShorthand
 * @param {boolean} inherited
 * @param {boolean} overloaded
 */
WebInspector.StylePropertyTreeElement = function(stylesPane, matchedStyles, property, isShorthand, inherited, overloaded)
{
    // Pass an empty title, the title gets made later in onattach.
    TreeElement.call(this, "", isShorthand);
    this._style = property.ownerStyle;
    this._matchedStyles = matchedStyles;
    this.property = property;
    this._inherited = inherited;
    this._overloaded = overloaded;
    this.selectable = false;
    this._parentPane = stylesPane;
    this.isShorthand = isShorthand;
    this._applyStyleThrottler = new WebInspector.Throttler(0);
}

/** @typedef {{expanded: boolean, hasChildren: boolean, isEditingName: boolean, previousContent: string}} */
WebInspector.StylePropertyTreeElement.Context;

WebInspector.StylePropertyTreeElement.prototype = {
    /**
     * @return {boolean}
     */
    _editable: function()
    {
        return this._style.styleSheetId && this._style.range;
    },

    /**
     * @return {boolean}
     */
    inherited: function()
    {
        return this._inherited;
    },

    /**
     * @return {boolean}
     */
    overloaded: function()
    {
        return this._overloaded;
    },

    /**
     * @param {boolean} x
     */
    setOverloaded: function(x)
    {
        if (x === this._overloaded)
            return;
        this._overloaded = x;
        this._updateState();
    },

    get name()
    {
        return this.property.name;
    },

    get value()
    {
        return this.property.value;
    },

    /**
     * @return {boolean}
     */
    _updateFilter: function()
    {
        var regex = this._parentPane.filterRegex();
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

        if (!this._editable()) {
            var swatch = WebInspector.ColorSwatch.create();
            swatch.setColorText(text);
            return swatch;
        }

        var stylesPopoverHelper = this._parentPane._stylesPopoverHelper;
        var swatchIcon = new WebInspector.ColorSwatchPopoverIcon(this, stylesPopoverHelper, text);

        /**
         * @param {?Array<string>} backgroundColors
         */
        function computedCallback(backgroundColors)
        {
            // TODO(aboxhall): distinguish between !backgroundColors (no text) and
            // !backgroundColors.length (no computed bg color)
            if (!backgroundColors || !backgroundColors.length)
                return;
            // TODO(samli): figure out what to do in the case of multiple background colors (i.e. gradients)
            var bgColorText = backgroundColors[0];
            var bgColor = WebInspector.Color.parse(bgColorText);
            if (!bgColor)
                return;

            // If we have a semi-transparent background color over an unknown
            // background, draw the line for the "worst case" scenario: where
            // the unknown background is the same color as the text.
            if (bgColor.hasAlpha) {
                var blendedRGBA = [];
                WebInspector.Color.blendColors(bgColor.rgba(), color.rgba(), blendedRGBA);
                bgColor = new WebInspector.Color(blendedRGBA, WebInspector.Color.Format.RGBA);
            }

            swatchIcon.setContrastColor(bgColor);
        }

        if (this.property.name === "color" && this._parentPane.cssModel() && this.node()) {
            var cssModel = this._parentPane.cssModel();
            cssModel.backgroundColorsPromise(this.node().id).then(computedCallback);
        }

        return swatchIcon.element();
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
        if (!geometry || !this._editable())
            return createTextNode(text);
        var stylesPopoverHelper = this._parentPane._stylesPopoverHelper;
        return new WebInspector.BezierPopoverIcon(this, stylesPopoverHelper, text).element();
    },

    _updateState: function()
    {
        if (!this.listItemElement)
            return;

        if (this._style.isPropertyImplicit(this.name))
            this.listItemElement.classList.add("implicit");
        else
            this.listItemElement.classList.remove("implicit");

        var hasIgnorableError = !this.property.parsedOk && WebInspector.StylesSidebarPane.ignoreErrorsForProperty(this.property);
        if (hasIgnorableError)
            this.listItemElement.classList.add("has-ignorable-error");
        else
            this.listItemElement.classList.remove("has-ignorable-error");

        if (this.inherited())
            this.listItemElement.classList.add("inherited");
        else
            this.listItemElement.classList.remove("inherited");

        if (this.overloaded())
            this.listItemElement.classList.add("overloaded");
        else
            this.listItemElement.classList.remove("overloaded");

        if (this.property.disabled)
            this.listItemElement.classList.add("disabled");
        else
            this.listItemElement.classList.remove("disabled");
    },

    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._parentPane.node();
    },

    /**
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
     * @param {!Event} event
     */
    _toggleEnabled: function(event)
    {
        var disabled = !event.target.checked;
        var oldStyleRange = this._style.range;
        if (!oldStyleRange)
            return;

        /**
         * @param {boolean} success
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function callback(success)
        {
            delete this._parentPane._userOperation;

            if (!success)
                return;
            this._matchedStyles.resetActiveProperties();
            this._updatePane();
            this.styleTextAppliedForTest();
        }

        event.consume();
        this._parentPane._userOperation = true;
        this.property.setDisabled(disabled)
            .then(callback.bind(this));
    },

    /**
     * @override
     */
    onpopulate: function()
    {
        // Only populate once and if this property is a shorthand.
        if (this.childCount() || !this.isShorthand)
            return;

        var longhandProperties = this._style.longhandProperties(this.name);
        for (var i = 0; i < longhandProperties.length; ++i) {
            var name = longhandProperties[i].name;
            var inherited = false;
            var overloaded = false;

            var section = this.section();
            if (section) {
                inherited = section.isPropertyInherited(name);
                overloaded = this._matchedStyles.propertyState(longhandProperties[i]) === WebInspector.CSSMatchedStyles.PropertyState.Overloaded;
            }

            var item = new WebInspector.StylePropertyTreeElement(this._parentPane, this._matchedStyles, longhandProperties[i], false, inherited, overloaded);
            this.appendChild(item);
        }
    },

    /**
     * @override
     */
    onattach: function()
    {
        this.updateTitle();

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
            this._parentPane._mouseDownTreeElementIsName = this.nameElement && this.nameElement.isSelfOrAncestor(event.target);
            this._parentPane._mouseDownTreeElementIsValue = this.valueElement && this.valueElement.isSelfOrAncestor(event.target);
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
        this._updateState();
        this._expandElement = createElement("span");
        this._expandElement.className = "expand-element";

        var propertyRenderer = new WebInspector.StylesSidebarPropertyRenderer(this._style.parentRule, this.node(), this.name, this.value);
        if (this.property.parsedOk) {
            propertyRenderer.setColorHandler(this._processColor.bind(this));
            propertyRenderer.setBezierHandler(this._processBezier.bind(this));
        }

        this.listItemElement.removeChildren();
        this.nameElement = propertyRenderer.renderName();
        this.valueElement = propertyRenderer.renderValue();
        if (!this.treeOutline)
            return;

        var indent = WebInspector.moduleSetting("textEditorIndent").get();
        this.listItemElement.createChild("span", "styles-clipboard-only").createTextChild(indent + (this.property.disabled ? "/* " : ""));
        this.listItemElement.appendChild(this.nameElement);
        this.listItemElement.createTextChild(": ");
        this.listItemElement.appendChild(this._expandElement);
        this.listItemElement.appendChild(this.valueElement);
        this.listItemElement.createTextChild(";");
        if (this.property.disabled)
            this.listItemElement.createChild("span", "styles-clipboard-only").createTextChild(" */");

        if (!this.property.parsedOk) {
            // Avoid having longhands under an invalid shorthand.
            this.listItemElement.classList.add("not-parsed-ok");

            // Add a separate exclamation mark IMG element with a tooltip.
            this.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(this.property), this.listItemElement.firstChild);
        }
        if (!this.property.activeInStyle())
            this.listItemElement.classList.add("inactive");
        this._updateFilter();

        if (this.property.parsedOk && this.section() && this.parent.root) {
            var enabledCheckboxElement = createElement("input");
            enabledCheckboxElement.className = "enabled-button";
            enabledCheckboxElement.type = "checkbox";
            enabledCheckboxElement.checked = !this.property.disabled;
            enabledCheckboxElement.addEventListener("click", this._toggleEnabled.bind(this), false);
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
            var text = event.target.textContent;
            if (!context.isEditingName)
                text = this.value || text;
            this.editingCommitted(text, context, moveDirection);
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
        if (this._propertyHasBeenEditedIncrementally) {
            this.applyStyleText(this._originalPropertyText, false);
            delete this._originalPropertyText;
        } else if (this._newProperty) {
            this.treeOutline.removeChild(this);
        } else {
            this.updateTitle();
        }
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
        } while (target && target.inherited());

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
        var blankInput = userInput.isWhitespace();
        var shouldCommitNewProperty = this._newProperty && (isPropertySplitPaste || moveToOther || (!moveDirection && !isEditingName) || (isEditingName && blankInput));
        var section = /** @type {!WebInspector.StylePropertiesSection} */(this.section());
        if (((userInput !== context.previousContent || isDirtyViaPaste) && !this._newProperty) || shouldCommitNewProperty) {
            section._afterUpdate = moveToNextCallback.bind(this, this._newProperty, !blankInput, section);
            var propertyText;
            if (blankInput || (this._newProperty && this.valueElement.textContent.isWhitespace()))
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
                    if (sectionToEdit.style().parentRule)
                        sectionToEdit.startEditingSelector();
                    else
                        sectionToEdit._moveEditorFromSelector(moveDirection);
                }
                return;
            }

            if (moveToSelector) {
                if (section.style().parentRule)
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
     * @return {!Promise.<undefined>}
     */
    _innerApplyStyleText: function(styleText, majorChange)
    {
        if (!this.treeOutline)
            return Promise.resolve();

        var oldStyleRange = this._style.range;
        if (!oldStyleRange)
            return Promise.resolve();

        styleText = styleText.replace(/\s/g, " ").trim(); // Replace &nbsp; with whitespace.
        if (!styleText.length && majorChange && this._newProperty && !this._propertyHasBeenEditedIncrementally) {
            // The user deleted everything and never applied a new property value via Up/Down scrolling/live editing, so remove the tree element and update.
            var section = this.section();
            this.parent.removeChild(this);
            section.afterUpdate();
            return Promise.resolve();
        }

        var currentNode = this._parentPane.node();
        this._parentPane._userOperation = true;

        /**
         * @param {boolean} success
         * @this {WebInspector.StylePropertyTreeElement}
         */
        function callback(success)
        {
            delete this._parentPane._userOperation;

            if (!success) {
                if (majorChange) {
                    // It did not apply, cancel editing.
                    this._revertStyleUponEditingCanceled();
                }
                this.styleTextAppliedForTest();
                return;
            }

            this._matchedStyles.resetActiveProperties();
            this._propertyHasBeenEditedIncrementally = true;
            this.property = this._style.propertyAt(this.property.index);

            // We are happy to update UI if user is not editing.
            if (!this._parentPane._isEditingStyle && currentNode === this.node())
                this._updatePane();

            this.styleTextAppliedForTest();
        }

        // Append a ";" if the new text does not end in ";".
        // FIXME: this does not handle trailing comments.
        if (styleText.length && !/;\s*$/.test(styleText))
            styleText += ";";
        var overwriteProperty = !this._newProperty || this._propertyHasBeenEditedIncrementally;
        return this.property.setText(styleText, majorChange, overwriteProperty)
            .then(callback.bind(this));
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

    __proto__: TreeElement.prototype
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

    if (!isEditingName) {
        this.disableDefaultSuggestionForEmptyInput();

        // If a CSS value is being edited that has a numeric or hex substring, hint that precision modifier shortcuts are available.
        if (treeElement && treeElement.valueElement) {
            var cssValueText = treeElement.valueElement.textContent;
            if (cssValueText.match(/#[\da-f]{3,6}$/i))
                this.setTitle(WebInspector.UIString("Increment/decrement with mousewheel or up/down keys. %s: R ±1, Shift: G ±1, Alt: B ±1", WebInspector.isMac() ? "Cmd" : "Ctrl"));
            else if (cssValueText.match(/\d+/))
                this.setTitle(WebInspector.UIString("Increment/decrement with mousewheel or up/down keys. %s: ±100, Shift: ±10, Alt: ±0.1", WebInspector.isMac() ? "Cmd" : "Ctrl"));
        }

    }
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
            // Accept any available autocompletions and advance to the next field.
            if (this.autoCompleteElement && this.autoCompleteElement.textContent.length) {
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
     * @param {string} text
     * @param {number} cursorOffset
     * @param {!Range} wordRange
     * @param {boolean} force
     * @param {function(!Array.<string>, number=)} completionsReadyCallback
     */
    _buildPropertyCompletions: function(proxyElement, text, cursorOffset, wordRange, force, completionsReadyCallback)
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

WebInspector.StylesSidebarPropertyRenderer._variableRegex = /(var\(--.*?\))/g;
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
        return /url\(\s*('.+?')\s*\)/g;
    if (/url\(\s*".*\s*"\s*\)/.test(value))
        return /url\(\s*(".+?")\s*\)/g;
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
        formatter.addProcessor(WebInspector.StylesSidebarPropertyRenderer._variableRegex, createTextNode);
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
 * @return {!WebInspector.ToolbarItem}
 */
WebInspector.StylesSidebarPane.createAddNewRuleButton = function(stylesSidebarPane)
{
    var button = new WebInspector.ToolbarButton(WebInspector.UIString("New Style Rule"), "add-toolbar-item");
    button.addEventListener("click", stylesSidebarPane._createNewRuleInViaInspectorStyleSheet, stylesSidebarPane);
    button.element.createChild("div", "long-click-glyph toolbar-button-theme");
    new WebInspector.LongClickController(button.element, stylesSidebarPane._onAddButtonLongClick.bind(stylesSidebarPane));
    WebInspector.context.addFlavorChangeListener(WebInspector.DOMNode, onNodeChanged);
    onNodeChanged();
    return button;

    function onNodeChanged()
    {
        var node = WebInspector.context.flavor(WebInspector.DOMNode);
        button.setEnabled(!!node);
    }
}
