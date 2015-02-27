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
WebInspector.ComputedStyleSidebarPane = function()
{
    WebInspector.ElementsSidebarPane.call(this, WebInspector.UIString("Computed Style"));
    WebInspector.settings.showInheritedComputedStyleProperties.addChangeListener(this._showInheritedComputedStyleChanged.bind(this));
    this._linkifier = new WebInspector.Linkifier(new WebInspector.Linkifier.DefaultCSSFormatter());
}

WebInspector.ComputedStyleSidebarPane.prototype = {
    _showInheritedComputedStyleChanged: function()
    {
        this._computedStyleSection.update();
        this._computedStyleSection._rebuildComputedTrace();
    },

    /**
     * @override
     * @param {?WebInspector.DOMNode} node
     */
    setNode: function(node)
    {
        if (node)
            this._target = node.target();
        WebInspector.ElementsSidebarPane.prototype.setNode.call(this, node);
    },

    /**
     * @override
     * @param {!WebInspector.Throttler.FinishCallback} finishedCallback
     */
    doUpdate: function(finishedCallback)
    {
        var promises = [
            this._stylesSidebarPane._fetchComputedCascade(),
            this._stylesSidebarPane._fetchMatchedCascade(),
            this._stylesSidebarPane._fetchAnimationProperties()
        ];
        Promise.all(promises)
            .spread(this._innerRebuildUpdate.bind(this))
            .then(finishedCallback);
    },

    /**
     * @param {?WebInspector.SectionCascade} computedCascade
       @param {?{matched: !WebInspector.SectionCascade, pseudo: !Map.<number, !WebInspector.SectionCascade>}} cascades
     * @param {!Map.<string, string>} animationProperties
     */
    _innerRebuildUpdate: function(computedCascade, cascades, animationProperties)
    {
        this._linkifier.reset();
        this.bodyElement.removeChildren();
        if (!computedCascade || !cascades)
            return;
        var computedStyleRule = computedCascade.sectionModels()[0];
        this._computedStyleSection = new WebInspector.ComputedStylePropertiesSection(this, computedStyleRule, cascades.matched, animationProperties);
        this._computedStyleSection.expand();
        this._computedStyleSection._rebuildComputedTrace();
        this.bodyElement.appendChild(this._computedStyleSection.element);
    },

    _updateFilter: function()
    {
        this._computedStyleSection._updateFilter();
    },

    /**
     * @param {!WebInspector.StylesSidebarPane} pane
     */
    setHostingPane: function(pane)
    {
        this._stylesSidebarPane = pane;
    },

    /**
     * @param {!Element} element
     */
    setFilterBoxContainer: function(element)
    {
        element.appendChild(WebInspector.StylesSidebarPane.createPropertyFilterElement(WebInspector.UIString("Filter"), filterCallback.bind(this)));

        /**
         * @param {?RegExp} regex
         * @this {WebInspector.ComputedStyleSidebarPane}
         */
        function filterCallback(regex)
        {
            this._filterRegex = regex;
            this._updateFilter();
        }
    },

    /**
     * @return {?RegExp}
     */
    filterRegex: function()
    {
        return this._filterRegex;
    },

    __proto__: WebInspector.ElementsSidebarPane.prototype
}

/**
 * @constructor
 * @extends {WebInspector.PropertiesSection}
 * @param {!WebInspector.ComputedStyleSidebarPane} stylesPane
 * @param {!WebInspector.StylesSectionModel} styleRule
 * @param {!WebInspector.SectionCascade} matchedRuleCascade
 * @param {!Map.<string, string>} animationProperties
 */
WebInspector.ComputedStylePropertiesSection = function(stylesPane, styleRule, matchedRuleCascade, animationProperties)
{
    WebInspector.PropertiesSection.call(this, "");
    this.element.className = "styles-section monospace read-only computed-style";
    this.propertiesElement.classList.add("style-properties");

    this.headerElement.appendChild(WebInspector.ComputedStylePropertiesSection._showInheritedCheckbox());

    this._stylesPane = stylesPane;
    this.styleRule = styleRule;
    this._matchedRuleCascade = matchedRuleCascade;
    this._animationProperties = animationProperties;
    this._alwaysShowComputedProperties = { "display": true, "height": true, "width": true };
    this._propertyTreeElements = {};
    this._expandedPropertyNames = {};
}

/**
 * @return {!Element}
 */
WebInspector.ComputedStylePropertiesSection._showInheritedCheckbox = function()
{
    if (!WebInspector.ComputedStylePropertiesSection._showInheritedCheckboxElement) {
        WebInspector.ComputedStylePropertiesSection._showInheritedCheckboxElement = WebInspector.SettingsUI.createSettingCheckbox(WebInspector.UIString("Show inherited properties"), WebInspector.settings.showInheritedComputedStyleProperties, true);
        WebInspector.ComputedStylePropertiesSection._showInheritedCheckboxElement.classList.add("checkbox-with-label");
    }
    return WebInspector.ComputedStylePropertiesSection._showInheritedCheckboxElement;
}

WebInspector.ComputedStylePropertiesSection.prototype = {
    /**
     * @override
     */
    collapse: function()
    {
        // Overriding with empty body.
    },

    /**
     * @param {string} propertyName
     */
    _isPropertyInherited: function(propertyName)
    {
        var canonicalName = WebInspector.CSSMetadata.canonicalPropertyName(propertyName);
        return !(this._matchedRuleCascade.allUsedProperties().has(canonicalName)) && !(canonicalName in this._alwaysShowComputedProperties) && !this._animationProperties.has(canonicalName);
    },

    update: function()
    {
        this._expandedPropertyNames = {};
        for (var name in this._propertyTreeElements) {
            if (this._propertyTreeElements[name].expanded)
                this._expandedPropertyNames[name] = true;
        }
        this._propertyTreeElements = {};
        this.propertiesTreeOutline.removeChildren();
        this.repopulate();
    },

    _updateFilter: function()
    {
        for (var child of this.propertiesTreeOutline.rootElement().children())
            child._updateFilter();
    },

    onpopulate: function()
    {
        var style = this.styleRule.style();
        if (!style)
            return;

        var uniqueProperties = [];
        var allProperties = style.allProperties;
        for (var i = 0; i < allProperties.length; ++i)
            uniqueProperties.push(allProperties[i]);
        uniqueProperties.sort(propertySorter);

        this._propertyTreeElements = {};
        var showInherited = WebInspector.settings.showInheritedComputedStyleProperties.get();
        for (var i = 0; i < uniqueProperties.length; ++i) {
            var property = uniqueProperties[i];
            var inherited = this._isPropertyInherited(property.name);
            if (!showInherited && inherited)
                continue;
            var item = new WebInspector.ComputedStylePropertyTreeElement(this._stylesPane, this.styleRule, property, inherited);
            this.propertiesTreeOutline.appendChild(item);
            this._propertyTreeElements[property.name] = item;
        }

        /**
         * @param {!WebInspector.CSSProperty} a
         * @param {!WebInspector.CSSProperty} b
         */
        function propertySorter(a, b)
        {
            return a.name.compareTo(b.name);
        }
    },

    _rebuildComputedTrace: function()
    {
        // Trace animation related properties
        for (var property of this._animationProperties.keys()) {
            var treeElement = this._propertyTreeElements[property.toLowerCase()];
            if (treeElement) {
                var fragment = createDocumentFragment();
                var name = fragment.createChild("span");
                name.textContent = WebInspector.UIString("Animation") + " " + this._animationProperties.get(property);
                treeElement.appendChild(new TreeElement(fragment));
            }
        }

        for (var model of this._matchedRuleCascade.sectionModels()) {
            var properties = model.style().allProperties;
            for (var j = 0; j < properties.length; ++j) {
                var property = properties[j];
                if (property.disabled)
                    continue;
                if (model.inherited() && !WebInspector.CSSMetadata.isPropertyInherited(property.name))
                    continue;

                var treeElement = this._propertyTreeElements[property.name.toLowerCase()];
                if (treeElement) {
                    var fragment = createDocumentFragment();
                    var selector = fragment.createChild("span");
                    selector.style.color = "gray";
                    selector.textContent = model.selectorText();
                    fragment.createTextChild(" - " + property.value + " ");
                    var subtitle = fragment.createChild("span");
                    subtitle.style.float = "right";
                    subtitle.appendChild(WebInspector.StylePropertiesSection.createRuleOriginNode(this._stylesPane._target, this._stylesPane._linkifier, model.rule()));
                    var childElement = new TreeElement(fragment);
                    treeElement.appendChild(childElement);
                    if (property.inactive || model.isPropertyOverloaded(property.name))
                        childElement.listItemElement.classList.add("overloaded");
                    if (!property.parsedOk) {
                        childElement.listItemElement.classList.add("not-parsed-ok");
                        childElement.listItemElement.insertBefore(WebInspector.StylesSidebarPane.createExclamationMark(property), childElement.listItemElement.firstChild);
                        if (WebInspector.StylesSidebarPane.ignoreErrorsForProperty(property))
                            childElement.listItemElement.classList.add("has-ignorable-error");
                    }
                }
            }
        }

        // Restore expanded state after update.
        for (var name in this._expandedPropertyNames) {
            if (name in this._propertyTreeElements)
                this._propertyTreeElements[name].expand();
        }
    },

    __proto__: WebInspector.PropertiesSection.prototype
}

/**
 * @constructor
 * @extends {WebInspector.StylePropertyTreeElementBase}
 * @param {!WebInspector.ComputedStyleSidebarPane} stylesPane
 * @param {!WebInspector.StylesSectionModel} styleRule
 * @param {!WebInspector.CSSProperty} property
 * @param {boolean} inherited
 */
WebInspector.ComputedStylePropertyTreeElement = function(stylesPane, styleRule, property, inherited)
{
    WebInspector.StylePropertyTreeElementBase.call(this, styleRule, property, inherited, false, false);
    this._stylesPane = stylesPane;
}

WebInspector.ComputedStylePropertyTreeElement.prototype = {
    /**
     * @override
     * @return {?WebInspector.StylesSidebarPane}
     */
    editablePane: function()
    {
        return null;
    },

    /**
     * @override
     * @return {!WebInspector.ComputedStyleSidebarPane}
     */
    parentPane: function()
    {
        return this._stylesPane;
    },

    _updateFilter: function()
    {
        var regEx = this.parentPane().filterRegex();
        var matched = !!regEx && (!regEx.test(this.property.name) && !regEx.test(this.property.value));
        this.listItemElement.classList.toggle("hidden", matched);
        if (this.childrenListElement)
            this.childrenListElement.classList.toggle("hidden", matched);
    },

    __proto__: WebInspector.StylePropertyTreeElementBase.prototype
}

