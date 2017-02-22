// Copyright (c) 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

CSSTracker.CSSTrackerListView = class extends UI.VBox {
  constructor() {
    super(true);
    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('css_tracker/unusedRulesTree.css');
    this.contentElement.appendChild(this._treeOutline.element);
  }

  /**
   * @param {!Array<!CSSTracker.StyleSheetUsage>} styleSheetUsages
   */
  update(styleSheetUsages) {
    this._treeOutline.removeChildren();

    for (var sheet of styleSheetUsages) {
      var unusedRuleCount = sheet.rules.reduce((count, rule) => rule.wasUsed ? count : count + 1, 0);
      if (sheet.styleSheetHeader) {
        var url = sheet.styleSheetHeader.sourceURL;
        if (!url)
          continue;

        var styleSheetTreeElement = new CSSTracker.CSSTrackerListView.StyleSheetTreeElement(url, sheet.rules);
        this._treeOutline.appendChild(styleSheetTreeElement);
        continue;
      }
      if (!unusedRuleCount)
        continue;
      var removedStyleSheetStats = unusedRuleCount === 1 ?
          Common.UIString('1 unused rule in a removed style sheet.') :
          Common.UIString('%d unused rules in removed style sheets.', unusedRuleCount);

      var treeElement = new UI.TreeElement(Common.UIString('Unknown style sheets'), true);
      treeElement.toggleOnClick = true;
      treeElement.selectable = false;

      var stats = new UI.TreeElement(removedStyleSheetStats, false);
      stats.selectable = false;
      treeElement.appendChild(stats);
      this._treeOutline.appendChild(treeElement);
    }
  }
};

CSSTracker.CSSTrackerListView._rulesShownAtOnce = 20;

CSSTracker.CSSTrackerListView.StyleSheetTreeElement = class extends UI.TreeElement {
  /**
   * @param {string} url
   * @param {!Array<!CSSTracker.RuleUsage>} ruleList
   */
  constructor(url, ruleList) {
    super('', true);

    this._uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);

    /** @type {!Array<!CSSTracker.RuleUsage>} */
    this._unusedRules = ruleList.filter(rule => !rule.wasUsed);

    var lastLineNumber = 0;
    for (var i = this._unusedRules.length - 1; i >= 0; --i) {
      if (this._unusedRules[i].range) {
        lastLineNumber = this._unusedRules[i].range.startLine;
        break;
      }
    }
    this._numberOfSpaces = lastLineNumber.toString().length + 1;

    this._percentUnused = Math.round(100 * this._unusedRules.length / ruleList.length);

    this.toggleOnClick = true;
    this.selectable = false;

    /** @type {?UI.TreeElement} */
    this._showAllRulesTreeElement = null;

    var title = createElementWithClass('div', 'rule-result');
    var titleText;
    if (this._uiSourceCode)
      titleText = this._uiSourceCode.fullDisplayName();
    else
      titleText = Common.UIString('Style Sheet was removed');
    title.createChild('span', 'rule-result-file-name').textContent = titleText;

    var rulesCountSpan = title.createChild('span', 'rule-result-matches-count');

    if (this._unusedRules.length === 1) {
      rulesCountSpan.textContent =
          Common.UIString('(%d unused rule : %d%%)', this._unusedRules.length, this._percentUnused);
    } else {
      rulesCountSpan.textContent =
          Common.UIString('(%d unused rules : %d%%)', this._unusedRules.length, this._percentUnused);
    }
    this.title = title;
  }

  /**
   * @override
   */
  onpopulate() {
    var toIndex = Math.min(this._unusedRules.length, CSSTracker.CSSTrackerListView._rulesShownAtOnce);
    this._appendRules(0, toIndex);
    if (toIndex < this._unusedRules.length)
      this._appendShowAllRulesButton(toIndex);
  }

  /**
   * @param {number} fromIndex
   * @param {number} toIndex
   */
  _appendRules(fromIndex, toIndex) {
    for (var i = fromIndex; i < toIndex; ++i) {
      if (!this._uiSourceCode) {
        var rule = this._unusedRules[i];
        var contentSpan = createElementWithClass('span', 'rule-match-content');
        contentSpan.textContent = rule.selector;
        ruleElement.listItemElement.appendChild(contentSpan);
        continue;
      }

      var rule = this._unusedRules[i];
      var lineNumber = rule.range.startLine;
      var columnNumber = rule.range.startColumn;

      var anchor = Components.Linkifier.linkifyRevealable(this._uiSourceCode.uiLocation(lineNumber, columnNumber), '');

      var lineNumberSpan = createElement('span');
      lineNumberSpan.classList.add('rule-match-line-number');
      lineNumberSpan.textContent = numberToStringWithSpacesPadding(lineNumber + 1, this._numberOfSpaces);
      anchor.appendChild(lineNumberSpan);

      var contentSpan = anchor.createChild('span', 'rule-match-content');
      contentSpan.textContent = rule.selector;

      var ruleElement = new UI.TreeElement();
      ruleElement.selectable = true;
      this.appendChild(ruleElement);
      ruleElement.listItemElement.className = 'rule-match source-code';
      ruleElement.listItemElement.appendChild(anchor);
    }
  }

  /**
   * @param {number} startMatchIndex
   */
  _appendShowAllRulesButton(startMatchIndex) {
    var rulesLeftCount = this._unusedRules.length - startMatchIndex;
    var button = UI.createTextButton('', this._showMoreRulesElementSelected.bind(this, startMatchIndex));
    button.textContent = Common.UIString('Show all rules (%d more).', rulesLeftCount);
    this._showAllRulesTreeElement = new UI.TreeElement(button);
    this._showAllRulesTreeElement.selectable = false;
    this.appendChild(this._showAllRulesTreeElement);
  }

  /**
   * @param {number} startMatchIndex
   */
  _showMoreRulesElementSelected(startMatchIndex) {
    if (!this._showAllRulesTreeElement)
      return;
    this.removeChild(this._showAllRulesTreeElement);
    this._appendRules(startMatchIndex, this._unusedRules.length);
  }
};
