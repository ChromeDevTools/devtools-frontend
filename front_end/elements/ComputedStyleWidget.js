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
 * @extends {WebInspector.ThrottledWidget}
 */
WebInspector.ComputedStyleWidget = function()
{
    WebInspector.ThrottledWidget.call(this);
    this.element.classList.add("computed-style-sidebar-pane");

    this.registerRequiredCSS("elements/computedStyleSidebarPane.css");
    this._alwaysShowComputedProperties = { "display": true, "height": true, "width": true };

    this._computedStyleModel = new WebInspector.ComputedStyleModel();
    this._computedStyleModel.addEventListener(WebInspector.ComputedStyleModel.Events.ComputedStyleChanged, this.update, this);

    this._showInheritedComputedStylePropertiesSetting = WebInspector.settings.createSetting("showInheritedComputedStyleProperties", false);
    this._showInheritedComputedStylePropertiesSetting.addChangeListener(this._showInheritedComputedStyleChanged.bind(this));

    var hbox = this.element.createChild("div", "hbox styles-sidebar-pane-toolbar");
    var filterContainerElement = hbox.createChild("div", "styles-sidebar-pane-filter-box");
    var filterInput = WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Filter"), hbox, filterCallback.bind(this));
    filterContainerElement.appendChild(filterInput);

    var toolbar = new WebInspector.Toolbar("styles-pane-toolbar", hbox);
    toolbar.appendToolbarItem(new WebInspector.ToolbarCheckbox(WebInspector.UIString("Show all"), undefined, this._showInheritedComputedStylePropertiesSetting));

    this._propertiesOutline = new TreeOutlineInShadow();
    this._propertiesOutline.hideOverflow();
    this._propertiesOutline.registerRequiredCSS("elements/computedStyleSidebarPane.css");
    this._propertiesOutline.element.classList.add("monospace", "computed-properties");
    this.element.appendChild(this._propertiesOutline.element);

    this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());

    /**
     * @param {?RegExp} regex
     * @this {WebInspector.ComputedStyleWidget}
     */
    function filterCallback(regex)
    {
        this._filterRegex = regex;
        this._updateFilter(regex);
    }

    var fontsWidget = new WebInspector.PlatformFontsWidget(this._computedStyleModel);
    fontsWidget.show(this.element);
}

WebInspector.ComputedStyleWidget._propertySymbol = Symbol("property");

WebInspector.ComputedStyleWidget.prototype = {
    _showInheritedComputedStyleChanged: function()
    {
        this.update();
    },

    /**
     * @override
     * @return {!Promise.<?>}
     */
    doUpdate: function()
    {
        var promises = [
            this._computedStyleModel.fetchComputedStyle(),
            this._fetchMatchedCascade()
        ];
        return Promise.all(promises)
            .spread(this._innerRebuildUpdate.bind(this));
    },

    /**
     * @return {!Promise.<?WebInspector.CSSMatchedStyles>}
     */
    _fetchMatchedCascade: function()
    {
        var node = this._computedStyleModel.node();
        if (!node || !this._computedStyleModel.cssModel())
            return Promise.resolve(/** @type {?WebInspector.CSSMatchedStyles} */(null));

        return this._computedStyleModel.cssModel().cachedMatchedCascadeForNode(node).then(validateStyles.bind(this));

        /**
         * @param {?WebInspector.CSSMatchedStyles} matchedStyles
         * @return {?WebInspector.CSSMatchedStyles}
         * @this {WebInspector.ComputedStyleWidget}
         */
        function validateStyles(matchedStyles)
        {
            return matchedStyles && matchedStyles.node() === this._computedStyleModel.node() ? matchedStyles : null;
        }
    },

    /**
     * @param {string} text
     * @return {!Node}
     */
    _processColor: function(text)
    {
        var color = WebInspector.Color.parse(text);
        if (!color)
            return createTextNode(text);
        var swatch = WebInspector.ColorSwatch.create();
        swatch.setColor(color);
        swatch.setFormat(WebInspector.Color.detectColorFormat(color));
        return swatch;
    },

    /**
     * @param {?WebInspector.ComputedStyleModel.ComputedStyle} nodeStyle
     * @param {?WebInspector.CSSMatchedStyles} matchedStyles
     */
    _innerRebuildUpdate: function(nodeStyle, matchedStyles)
    {
        /** @type {!Set<string>} */
        var expandedProperties = new Set();
        for (var treeElement of this._propertiesOutline.rootElement().children()) {
            if (!treeElement.expanded)
                continue;
            var propertyName = treeElement[WebInspector.ComputedStyleWidget._propertySymbol].name;
            expandedProperties.add(propertyName);
        }
        this._propertiesOutline.removeChildren();
        this._linkifier.reset();
        var cssModel = this._computedStyleModel.cssModel();
        if (!nodeStyle || !matchedStyles || !cssModel)
            return;

        var uniqueProperties = nodeStyle.computedStyle.keysArray();
        uniqueProperties.sort(propertySorter);

        var propertyTraces = this._computePropertyTraces(matchedStyles);
        var inhertiedProperties = this._computeInheritedProperties(matchedStyles);
        var showInherited = this._showInheritedComputedStylePropertiesSetting.get();
        for (var i = 0; i < uniqueProperties.length; ++i) {
            var propertyName = uniqueProperties[i];
            var propertyValue = nodeStyle.computedStyle.get(propertyName);
            var canonicalName = WebInspector.cssMetadata().canonicalPropertyName(propertyName);
            var inherited = !inhertiedProperties.has(canonicalName);
            if (!showInherited && inherited && !(propertyName in this._alwaysShowComputedProperties))
                continue;
            if (propertyName !== canonicalName && propertyValue === nodeStyle.computedStyle.get(canonicalName))
                continue;

            var propertyElement = createElement("div");
            propertyElement.classList.add("computed-style-property");
            propertyElement.classList.toggle("computed-style-property-inherited", inherited);
            var renderer = new WebInspector.StylesSidebarPropertyRenderer(null, nodeStyle.node, propertyName, /** @type {string} */(propertyValue));
            renderer.setColorHandler(this._processColor.bind(this));
            var propertyNameElement = renderer.renderName();
            propertyNameElement.classList.add("property-name");
            propertyElement.appendChild(propertyNameElement);

            var colon = createElementWithClass("span", "delimeter");
            colon.textContent = ":";
            propertyNameElement.appendChild(colon);

            var propertyValueElement = propertyElement.createChild("span", "property-value");

            var propertyValueText = renderer.renderValue();
            propertyValueText.classList.add("property-value-text");
            propertyValueElement.appendChild(propertyValueText);

            var semicolon = createElementWithClass("span", "delimeter");
            semicolon.textContent = ";";
            propertyValueElement.appendChild(semicolon);

            var treeElement = new TreeElement();
            treeElement.selectable = false;
            treeElement.title = propertyElement;
            treeElement[WebInspector.ComputedStyleWidget._propertySymbol] = {
                name: propertyName,
                value: propertyValue
            };
            var isOdd = this._propertiesOutline.rootElement().children().length % 2 === 0;
            treeElement.listItemElement.classList.toggle("odd-row", isOdd);
            this._propertiesOutline.appendChild(treeElement);

            var trace = propertyTraces.get(propertyName);
            if (trace) {
                var activeProperty = this._renderPropertyTrace(cssModel, matchedStyles, nodeStyle.node, treeElement, trace);
                treeElement.listItemElement.addEventListener("mousedown", consumeEvent, false);
                treeElement.listItemElement.addEventListener("dblclick", consumeEvent, false);
                treeElement.listItemElement.addEventListener("click", handleClick.bind(null, treeElement), false);
                var gotoSourceElement = propertyValueElement.createChild("div", "goto-source-icon");
                gotoSourceElement.addEventListener("click", this._navigateToSource.bind(this, activeProperty));
                if (expandedProperties.has(propertyName))
                    treeElement.expand();
            }
        }

        this._updateFilter(this._filterRegex);

        /**
         * @param {string} a
         * @param {string} b
         * @return {number}
         */
        function propertySorter(a, b)
        {
            if (a.startsWith("-webkit") ^ b.startsWith("-webkit"))
                return a.startsWith("-webkit") ? 1 : -1;
            var canonical1 = WebInspector.cssMetadata().canonicalPropertyName(a);
            var canonical2 = WebInspector.cssMetadata().canonicalPropertyName(b);
            return canonical1.compareTo(canonical2);
        }

        /**
         * @param {!TreeElement} treeElement
         * @param {!Event} event
         */
        function handleClick(treeElement, event)
        {
            if (!treeElement.expanded)
                treeElement.expand();
            else
                treeElement.collapse();
            consumeEvent(event);
        }
    },

    /**
     * @param {!WebInspector.CSSProperty} cssProperty
     * @param {!Event} event
     */
    _navigateToSource: function(cssProperty, event)
    {
        WebInspector.Revealer.reveal(cssProperty);
        event.consume(true);
    },

    /**
     * @param {!WebInspector.CSSModel} cssModel
     * @param {!WebInspector.CSSMatchedStyles} matchedStyles
     * @param {!WebInspector.DOMNode} node
     * @param {!TreeElement} rootTreeElement
     * @param {!Array<!WebInspector.CSSProperty>} tracedProperties
     * @return {!WebInspector.CSSProperty}
     */
    _renderPropertyTrace: function(cssModel, matchedStyles, node, rootTreeElement, tracedProperties)
    {
        var activeProperty = null;
        for (var property of tracedProperties) {
            var trace = createElement("div");
            trace.classList.add("property-trace");
            if (matchedStyles.propertyState(property) === WebInspector.CSSMatchedStyles.PropertyState.Overloaded)
                trace.classList.add("property-trace-inactive");
            else
                activeProperty = property;

            var renderer = new WebInspector.StylesSidebarPropertyRenderer(null, node, property.name, /** @type {string} */(property.value));
            renderer.setColorHandler(this._processColor.bind(this));
            var valueElement = renderer.renderValue();
            valueElement.classList.add("property-trace-value");
            valueElement.addEventListener("click", this._navigateToSource.bind(this, property), false);
            var gotoSourceElement = createElement("div");
            gotoSourceElement.classList.add("goto-source-icon");
            gotoSourceElement.addEventListener("click", this._navigateToSource.bind(this, property));
            valueElement.insertBefore(gotoSourceElement, valueElement.firstChild);

            trace.appendChild(valueElement);

            var rule = property.ownerStyle.parentRule;
            if (rule) {
                var linkSpan = trace.createChild("span", "trace-link");
                linkSpan.appendChild(WebInspector.StylePropertiesSection.createRuleOriginNode(matchedStyles, this._linkifier, rule));
            }

            var selectorElement = trace.createChild("span", "property-trace-selector");
            selectorElement.textContent = rule ? rule.selectorText() : "element.style";
            selectorElement.title = selectorElement.textContent;

            var traceTreeElement = new TreeElement();
            traceTreeElement.title = trace;
            traceTreeElement.selectable = false;
            rootTreeElement.appendChild(traceTreeElement);
        }
        return /** @type {!WebInspector.CSSProperty} */(activeProperty);
    },

    /**
     * @param {!WebInspector.CSSMatchedStyles} matchedStyles
     * @return {!Map<string, !Array<!WebInspector.CSSProperty>>}
     */
    _computePropertyTraces: function(matchedStyles)
    {
        var result = new Map();
        for (var style of matchedStyles.nodeStyles()) {
            var allProperties = style.allProperties;
            for (var property of allProperties) {
                if (!property.activeInStyle() || !matchedStyles.propertyState(property))
                    continue;
                if (!result.has(property.name))
                    result.set(property.name, []);
                result.get(property.name).push(property);
            }
        }
        return result;
    },

    /**
     * @param {!WebInspector.CSSMatchedStyles} matchedStyles
     * @return {!Set<string>}
     */
    _computeInheritedProperties: function(matchedStyles)
    {
        var result = new Set();
        for (var style of matchedStyles.nodeStyles()) {
            for (var property of style.allProperties) {
                if (!matchedStyles.propertyState(property))
                    continue;
                result.add(WebInspector.cssMetadata().canonicalPropertyName(property.name));
            }
        }
        return result;
    },

    /**
     * @param {?RegExp} regex
     */
    _updateFilter: function(regex)
    {
        var children = this._propertiesOutline.rootElement().children();
        for (var child of children) {
            var property = child[WebInspector.ComputedStyleWidget._propertySymbol];
            var matched = !regex || regex.test(property.name) || regex.test(property.value);
            child.hidden = !matched;
        }
    },

    __proto__: WebInspector.ThrottledWidget.prototype
}
