/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
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
 * @extends {WebInspector.SidebarPaneStack}
 * @param {!Array.<!WebInspector.AuditCategoryResult>} categoryResults
 */
WebInspector.AuditResultView = function(categoryResults)
{
    WebInspector.SidebarPaneStack.call(this);
    this.setMinimumSize(100, 25);
    this.element.classList.add("audit-result-view");

    function categorySorter(a, b) {
        return (a.title || "").localeCompare(b.title || "");
    }
    categoryResults.sort(categorySorter);
    for (var i = 0; i < categoryResults.length; ++i)
        this.addPane(new WebInspector.AuditCategoryResultPane(categoryResults[i]));
}

WebInspector.AuditResultView.prototype = {
    __proto__: WebInspector.SidebarPaneStack.prototype
}

/**
 * @constructor
 * @extends {WebInspector.SidebarPane}
 * @param {!WebInspector.AuditCategoryResult} categoryResult
 */
WebInspector.AuditCategoryResultPane = function(categoryResult)
{
    WebInspector.SidebarPane.call(this, categoryResult.title);
    this._treeOutline = new TreeOutlineInShadow();
    this._treeOutline.element.classList.add("audit-result-tree");
    this.bodyElement.appendChild(this._treeOutline.element);
    this._treeOutline.expandTreeElementsWhenArrowing = true;

    function ruleSorter(a, b)
    {
        var result = WebInspector.AuditRule.SeverityOrder[a.severity || 0] - WebInspector.AuditRule.SeverityOrder[b.severity || 0];
        if (!result)
            result = (a.value || "").localeCompare(b.value || "");
        return result;
    }

    categoryResult.ruleResults.sort(ruleSorter);

    for (var i = 0; i < categoryResult.ruleResults.length; ++i) {
        var ruleResult = categoryResult.ruleResults[i];
        var treeElement = this._appendResult(this._treeOutline.rootElement(), ruleResult, ruleResult.severity);
        treeElement.listItemElement.classList.add("audit-result");
    }
    this.expand();
}

WebInspector.AuditCategoryResultPane.prototype = {
    /**
     * @param {!TreeElement} parentTreeNode
     * @param {!WebInspector.AuditRuleResult} result
     * @param {?WebInspector.AuditRule.Severity=} severity
     */
    _appendResult: function(parentTreeNode, result, severity)
    {
        var title = "";

        if (typeof result.value === "string") {
            title = result.value;
            if (result.violationCount)
                title = String.sprintf("%s (%d)", title, result.violationCount);
        }

        var titleFragment = createDocumentFragment();
        if (severity) {
            var severityElement = createElement("div");
            severityElement.classList.add("severity", severity);
            titleFragment.appendChild(severityElement);
        }
        titleFragment.createTextChild(title);

        var treeElement = new TreeElement(titleFragment, !!result.children);
        treeElement.selectable = false;
        parentTreeNode.appendChild(treeElement);

        if (result.className)
            treeElement.listItemElement.classList.add(result.className);
        if (typeof result.value !== "string")
            treeElement.listItemElement.appendChild(WebInspector.auditFormatters.apply(result.value));

        if (result.children) {
            for (var i = 0; i < result.children.length; ++i)
                this._appendResult(treeElement, result.children[i]);
        }
        if (result.expanded) {
            treeElement.listItemElement.classList.remove("parent");
            treeElement.listItemElement.classList.add("parent-expanded");
            treeElement.expand();
        }
        return treeElement;
    },

    __proto__: WebInspector.SidebarPane.prototype
}
