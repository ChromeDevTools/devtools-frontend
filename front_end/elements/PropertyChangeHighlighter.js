// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.StylesSidebarPane} ssp
 */
WebInspector.PropertyChangeHighlighter = function(ssp)
{
    this._styleSidebarPane = ssp;
    WebInspector.targetManager.addModelListener(WebInspector.CSSStyleModel, WebInspector.CSSStyleModel.Events.LayoutEditorChange, this._onLayoutEditorChange, this);
}

WebInspector.PropertyChangeHighlighter.prototype = {
    /**
     * @param {!WebInspector.Event} event
     */
    _onLayoutEditorChange: function(event)
    {
        this._styleSidebarPane.runDecoratorAfterUpdate(this._updateHighlight.bind(this, event));
        this._styleSidebarPane.update();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateHighlight: function(event)
    {
        var cssModel = /** @type {!WebInspector.CSSStyleModel} */(event.target);
        var styleSheetId = event.data["id"];
        var changeRange = /** @type {!CSSAgent.SourceRange} */(event.data["range"]);
        var changeRangeObject = WebInspector.TextRange.fromObject(changeRange);

        var node = this._styleSidebarPane.node();
        if (!node || cssModel.target() !== node.target())
            return;

        var sectionBlocks = this._styleSidebarPane.sectionBlocks();
        var foundSection = null;
        for (var block of sectionBlocks) {
            for (var section of block.sections) {
                var declaration = section.style();
                if (declaration.styleSheetId !== styleSheetId)
                    continue;

                var parentRule = declaration.parentRule;
                var isInlineSelector = changeRangeObject.isEmpty();
                var isMatchingRule = parentRule && parentRule.selectorRange() && changeRangeObject.compareTo(parentRule.selectorRange()) === 0;
                if (isInlineSelector || isMatchingRule) {
                    section.element.animate([
                        { offset: 0, backgroundColor: "rgba(255, 227, 199, 1)" },
                        { offset: 0.5, backgroundColor: "rgba(255, 227, 199, 1)" },
                        { offset: 0.9, backgroundColor: "rgba(255, 227, 199, 0)" },
                        { offset: 1, backgroundColor: "white" }
                    ], { duration : 400, easing: "cubic-bezier(0, 0, 0.2, 1)" });
                    return;
                }

                if (this._checkRanges(declaration.range, changeRange)) {
                    foundSection = section;
                    break;
                }
            }
            if (foundSection)
                break;
        }

        if (!foundSection)
            return;

        var highlightElement;
        var treeElement = foundSection.propertiesTreeOutline.firstChild();
        var foundTreeElement = null;
        while (!highlightElement && treeElement) {
            if (treeElement.property.range  && this._checkRanges(treeElement.property.range, changeRange)) {
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
     * @param {!CSSAgent.SourceRange} outterRange
     * @param {!CSSAgent.SourceRange} innerRange
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