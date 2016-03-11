// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.StylesSidebarPane} ssp
 * @param {!WebInspector.CSSModel} cssModel
 * @param {!CSSAgent.StyleSheetId} styleSheetId
 * @param {!WebInspector.TextRange} range
 */
WebInspector.PropertyChangeHighlighter = function(ssp, cssModel, styleSheetId, range)
{
    this._styleSidebarPane = ssp;
    this._target = cssModel.target();
    this._styleSheetId = styleSheetId;
    this._range = range;
}

WebInspector.PropertyChangeHighlighter.prototype = {
    /**
     */
    perform: function()
    {
        var node = this._styleSidebarPane.node();
        if (!node || this._target !== node.target())
            return;

        var foundSection = null;
        for (var section of this._styleSidebarPane.allSections()) {
            var declaration = section.style();
            if (declaration.styleSheetId !== this._styleSheetId)
                continue;

            var parentRule = declaration.parentRule;
            var isInlineSelector = this._range.isEmpty();
            var isMatchingRule = parentRule && parentRule.selectorRange() && this._range.compareTo(parentRule.selectorRange()) === 0;
            if (isInlineSelector || isMatchingRule) {
                section.element.animate([
                    { offset: 0, backgroundColor: "rgba(255, 227, 199, 1)" },
                    { offset: 0.5, backgroundColor: "rgba(255, 227, 199, 1)" },
                    { offset: 0.9, backgroundColor: "rgba(255, 227, 199, 0)" },
                    { offset: 1, backgroundColor: "white" }
                ], { duration : 400, easing: "cubic-bezier(0, 0, 0.2, 1)" });
                return;
            }

            if (this._checkRanges(declaration.range, this._range)) {
                foundSection = section;
                break;
            }
        }

        if (!foundSection)
            return;

        var highlightElement;
        var treeElement = foundSection.propertiesTreeOutline.firstChild();
        var foundTreeElement = null;
        while (!highlightElement && treeElement) {
            if (treeElement.property.range  && this._checkRanges(treeElement.property.range, this._range)) {
                highlightElement = treeElement.valueElement;
                break;
            }
            treeElement = treeElement.traverseNextTreeElement(false, null, true);
        }

        if (highlightElement) {
            highlightElement.animate([
                    { offset: 0, backgroundColor: "rgba(158, 54, 153, 1)", color: "white" },
                    { offset: 0.5, backgroundColor: "rgba(158, 54, 153, 1)", color: "white" },
                    { offset: 0.9, backgroundColor: "rgba(158, 54, 153, 0)", color: "initial" },
                    { offset: 1, backgroundColor: "white", color: "initial" }
                ], { duration : 400, easing: "cubic-bezier(0, 0, 0.2, 1)" });
        }
    },

    /**
     *
     * @param {!WebInspector.TextRange} outterRange
     * @param {!WebInspector.TextRange} innerRange
     * @return {boolean}
     */
    _checkRanges: function(outterRange, innerRange)
    {
        var startsBefore = outterRange.startLine < innerRange.startLine || (outterRange.startLine === innerRange.startLine && outterRange.startColumn <= innerRange.startColumn);
        // SSP might be outdated, so inner range will a bit bigger than outter. E.g.; "padding-left: 9px" -> "padding-left: 10px"
        var eps = 5;
        var endsAfter = outterRange.endLine > innerRange.endLine || (outterRange.endLine === innerRange.endLine && outterRange.endColumn + eps >= innerRange.endColumn);
        return startsBefore && endsAfter;
    }
}

/**
 * @constructor
 * @param {!WebInspector.StylesSidebarPane} ssp
 * @param {!WebInspector.CSSProperty} cssProperty
 */
WebInspector.PropertyRevealHighlighter = function(ssp, cssProperty)
{
    this._styleSidebarPane = ssp;
    this._cssProperty = cssProperty;
}

WebInspector.PropertyRevealHighlighter.prototype = {
    perform: function()
    {
        // Expand all shorthands.
        for (var section of this._styleSidebarPane.allSections()) {
            for (var treeElement = section.propertiesTreeOutline.firstChild(); treeElement; treeElement = treeElement.nextSibling)
                treeElement.onpopulate();
        }
        var highlightTreeElement = null;
        for (var section of this._styleSidebarPane.allSections()) {
            var treeElement = section.propertiesTreeOutline.firstChild();
            while (treeElement && !highlightTreeElement) {
                if (treeElement.property === this._cssProperty) {
                    highlightTreeElement = treeElement;
                    break;
                }
                treeElement = treeElement.traverseNextTreeElement(false, null, true);
            }
            if (highlightTreeElement)
                break;
        }

        if (!highlightTreeElement)
            return;

        highlightTreeElement.parent.expand();
        highlightTreeElement.listItemElement.scrollIntoViewIfNeeded();
        highlightTreeElement.listItemElement.animate([
                { offset: 0, backgroundColor: "rgba(255, 255, 0, 0.2)"},
                { offset: 0.1, backgroundColor: "rgba(255, 255, 0, 0.7)"},
                { offset: 1, backgroundColor: "transparent"}
            ], { duration : 2000, easing: "cubic-bezier(0, 0, 0.2, 1)" });
    },
}
