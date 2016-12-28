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
 * @unrestricted
 */
Audits.AuditCategoryResultPane = class extends UI.SimpleView {
  /**
   * @param {!Audits.AuditCategoryResult} categoryResult
   */
  constructor(categoryResult) {
    super(categoryResult.title);
    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('audits/auditResultTree.css');
    this._treeOutline.element.classList.add('audit-result-tree');
    this.element.appendChild(this._treeOutline.element);
    this._treeOutline.expandTreeElementsWhenArrowing = true;

    function ruleSorter(a, b) {
      var result = Audits.AuditRule.SeverityOrder[a.severity || 0] - Audits.AuditRule.SeverityOrder[b.severity || 0];
      if (!result)
        result = (a.value || '').localeCompare(b.value || '');
      return result;
    }

    categoryResult.ruleResults.sort(ruleSorter);

    for (var i = 0; i < categoryResult.ruleResults.length; ++i) {
      var ruleResult = categoryResult.ruleResults[i];
      var treeElement = this._appendResult(this._treeOutline.rootElement(), ruleResult, ruleResult.severity);
      treeElement.listItemElement.classList.add('audit-result');
    }
    this.revealView();
  }

  /**
   * @param {!UI.TreeElement} parentTreeNode
   * @param {!Audits.AuditRuleResult} result
   * @param {?Audits.AuditRule.Severity=} severity
   */
  _appendResult(parentTreeNode, result, severity) {
    var title = '';

    if (typeof result.value === 'string') {
      title = result.value;
      if (result.violationCount)
        title = String.sprintf('%s (%d)', title, result.violationCount);
    }

    var titleFragment = createDocumentFragment();
    if (severity) {
      var severityElement = UI.Icon.create();
      if (severity === Audits.AuditRule.Severity.Info)
        severityElement.setIconType('smallicon-green-ball');
      else if (severity === Audits.AuditRule.Severity.Warning)
        severityElement.setIconType('smallicon-orange-ball');
      else if (severity === Audits.AuditRule.Severity.Severe)
        severityElement.setIconType('smallicon-red-ball');
      severityElement.classList.add('severity');
      titleFragment.appendChild(severityElement);
    }
    titleFragment.createTextChild(title);

    var treeElement = new UI.TreeElement(titleFragment, !!result.children);
    treeElement.selectable = false;
    parentTreeNode.appendChild(treeElement);

    if (result.className)
      treeElement.listItemElement.classList.add(result.className);
    if (typeof result.value !== 'string')
      treeElement.listItemElement.appendChild(Audits.auditFormatters.apply(result.value));

    if (result.children) {
      for (var i = 0; i < result.children.length; ++i)
        this._appendResult(treeElement, result.children[i]);
    }
    if (result.expanded) {
      treeElement.listItemElement.classList.remove('parent');
      treeElement.listItemElement.classList.add('parent-expanded');
      treeElement.expand();
    }
    return treeElement;
  }
};
