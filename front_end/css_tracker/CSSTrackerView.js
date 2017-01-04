// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

CSSTracker.CSSTrackerView = class extends UI.VBox {
  constructor() {
    super(true);

    this.registerRequiredCSS('css_tracker/cssTrackerView.css');

    var toolbarContainer = this.contentElement.createChild('div', 'css-tracker-toolbar-container');
    var topToolbar = new UI.Toolbar('css-tracker-toolbar', toolbarContainer);

    this._recordButton =
        new UI.ToolbarToggle(Common.UIString('Start recording'), 'largeicon-resume', 'largeicon-pause');
    this._recordButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._toggleRecording(!this._isRecording));
    topToolbar.appendToolbarItem(this._recordButton);

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(clearButton);

    this._cssResultsElement = this.contentElement.createChild('div', 'css-results');
    this._progressElement = this._cssResultsElement.createChild('div', 'progress-view');
    this._treeOutline = new UI.TreeOutlineInShadow();
    this._treeOutline.registerRequiredCSS('css_tracker/unusedRulesTree.css');

    this._statusToolbarElement = this.contentElement.createChild('div', 'css-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'css-message');

    this._isRecording = false;
  }

  _reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(CSSTracker.CSSTrackerView.LineDecorator.type));

    this._cssResultsElement.removeChildren();
    this._progressElement.textContent = '';
    this._cssResultsElement.appendChild(this._progressElement);

    this._treeOutline.removeChildren();
    this._statusMessageElement.textContent = '';
  }

  /**
   * @param {boolean} enable
   */
  _toggleRecording(enable) {
    if (enable === this._isRecording)
      return;

    this._isRecording = enable;
    this._recordButton.setToggled(this._isRecording);

    if (this._isRecording)
      this._startRecording();
    else
      this._stopRecording();
  }

  _startRecording() {
    this._reset();
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;
    this._recordButton.setTitle(Common.UIString('Stop recording'));
    SDK.CSSModel.fromTarget(mainTarget).startRuleUsageTracking();

    this._progressElement.textContent = Common.UIString('Recording...');
  }

  _stopRecording() {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;

    this._recordButton.setTitle(Common.UIString('Start recording'));
    this._progressElement.textContent = Common.UIString('Fetching results...');

    var cssModel = SDK.CSSModel.fromTarget(mainTarget);
    if (!cssModel)
      return;
    cssModel.ruleListPromise().then(ruleListReceived.bind(this, cssModel));

    /**
     * @param {!SDK.CSSModel} cssModel
     * @param {!Array<!CSSTracker.RuleUsage>} ruleUsageList
     * @this {!CSSTracker.CSSTrackerView}
     */
    function ruleListReceived(cssModel, ruleUsageList) {
      var unusedRulesCount = 0;
      for (var rule of ruleUsageList) {
        if (!rule.wasUsed)
          unusedRulesCount++;

        var url = this._urlForStyleSheetId(cssModel, rule.styleSheetId);
        if (!url)
          continue;
        var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(url);
        if (!uiSourceCode)
          continue;

        var gutterRange = Common.TextRange.fromObject(rule.range);
        if (gutterRange.startColumn)
          gutterRange.startColumn--;
        uiSourceCode.addDecoration(gutterRange, CSSTracker.CSSTrackerView.LineDecorator.type, rule.wasUsed);
      }
      var percentUnused = Math.round(100 * unusedRulesCount / ruleUsageList.length);
      if (unusedRulesCount === 1) {
        this._statusMessageElement.textContent =
            Common.UIString('%d CSS rule is not used. (%d%%)', unusedRulesCount, percentUnused);
      } else {
        this._statusMessageElement.textContent =
            Common.UIString('%d CSS rules are not used. (%d%%)', unusedRulesCount, percentUnused);
      }

      this._renderRuleUsage(cssModel, ruleUsageList);
    }
  }

  /**
   * @param {!Array<!SDK.CSSStyleSheetHeader>} styleSheetHeaders
   * @return {!Promise<!Array<!CSSTracker.ParsedStyleSheet>>}
   */
  _parseStyleSheets(styleSheetHeaders) {
    var promises = styleSheetHeaders.map(header => parseStyleSheet(header));
    return Promise.all(promises);

    /**
     * @param {!SDK.CSSStyleSheetHeader} styleSheet
     * @return {!Promise<!CSSTracker.ParsedStyleSheet>}
     */
    function parseStyleSheet(styleSheet) {
      return new Promise(fulfill => {
        /** @type {!Array<!Common.FormatterWorkerPool.CSSStyleRule>} */
        var allRules = [];
        styleSheet.requestContent().then(content => Common.formatterWorkerPool.parseCSS(content || '', onRules));

        /**
         * @param {boolean} isLastChunk
         * @param {!Array<!Common.FormatterWorkerPool.CSSStyleRule>} rules
         */
        function onRules(isLastChunk, rules) {
          allRules.pushAll(rules);
          if (isLastChunk)
            fulfill({sourceURL: styleSheet.sourceURL, rules: allRules});
        }
      });
    }
  }

  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Array<!CSSTracker.RuleUsage>} ruleList
   */
  _renderRuleUsage(cssModel, ruleList) {
    var headers = cssModel.allStyleSheets();
    if (!headers.length)
      return;

    this._parseStyleSheets(headers).then(this._onGotStyleSheets.bind(this, cssModel, ruleList));
  }

  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Array<!CSSTracker.RuleUsage>} ruleList
   * @param {!Array<!CSSTracker.ParsedStyleSheet>} styleSheets
   * @this {CSSTracker.CSSTrackerView}
   */
  _onGotStyleSheets(cssModel, ruleList, styleSheets) {
    /** @type {!Map<string, string>} */
    var rangeToSelector = new Map();

    for (var styleSheet of styleSheets) {
      for (var rule of styleSheet.rules) {
        if (!rule.styleRange)
          continue;

        rangeToSelector.set(
            rule.styleRange.startLine + ',' + rule.styleRange.startColumn + ',' + styleSheet.sourceURL,
            rule.selectorText);
      }
    }

    var unattributedRulesCount = 0;

    for (var rule of ruleList) {
      var url = this._urlForStyleSheetId(cssModel, rule.styleSheetId);
      if (url === '')
        continue;
      var range = rule.range.startLine + ',' + rule.range.startColumn + ',' + url;
      rule.selector = rangeToSelector.get(range);
      if (!rule.selector && !rule.wasUsed)
        ++unattributedRulesCount;
    }
    ruleList = ruleList.filter(rule => rule.selector);

    this._cssResultsElement.removeChildren();

    if (unattributedRulesCount) {
      if (unattributedRulesCount === 1) {
        var removedStyleSheetStats = Common.UIString('1 unused rule in a removed style sheet.');
      } else {
        var removedStyleSheetStats =
            Common.UIString('%d unused rules in removed style sheets.', unattributedRulesCount);
      }
      var treeElement = new UI.TreeElement(Common.UIString('Unknown style sheets'), true);
      treeElement.toggleOnClick = true;
      treeElement.selectable = false;

      var stats = new UI.TreeElement(removedStyleSheetStats, false);
      stats.selectable = false;
      treeElement.appendChild(stats);
      this._treeOutline.appendChild(treeElement);
    }

    if (!ruleList.length)
      return;

    this._cssResultsElement.appendChild(this._treeOutline.element);

    var startPosition = 0;
    for (var i = 1; i < ruleList.length; ++i) {
      if (ruleList[i].styleSheetId === ruleList[i - 1].styleSheetId)
        continue;

      var url = this._urlForStyleSheetId(cssModel, ruleList[startPosition].styleSheetId);
      var styleSheetTreeElement =
          new CSSTracker.CSSTrackerView.StyleSheetTreeElement(url, ruleList.slice(startPosition, i));
      this._treeOutline.appendChild(styleSheetTreeElement);

      startPosition = i;
    }
    var url = this._urlForStyleSheetId(cssModel, ruleList[startPosition].styleSheetId);
    var styleSheetTreeElement = new CSSTracker.CSSTrackerView.StyleSheetTreeElement(url, ruleList.slice(startPosition));
    this._treeOutline.appendChild(styleSheetTreeElement);
  }

  /**
   * @param {string} styleSheetId
   * @param {!SDK.CSSModel} cssModel
   * @return {string}
   */
  _urlForStyleSheetId(cssModel, styleSheetId) {
    var styleSheetHeader = cssModel.styleSheetHeaderForId(styleSheetId);
    if (!styleSheetHeader)
      return '';
    return styleSheetHeader.sourceURL;
  }
};

/** @typedef {{range: !Protocol.CSS.SourceRange,
 *              selector: (string|undefined),
 *              styleSheetId: !Protocol.CSS.StyleSheetId,
 *              wasUsed: boolean}}
 */
CSSTracker.RuleUsage;

/** @typedef {{sourceURL: string, rules: !Array<!Common.FormatterWorkerPool.CSSStyleRule>}} */
CSSTracker.ParsedStyleSheet;

CSSTracker.CSSTrackerView._rulesShownAtOnce = 20;

CSSTracker.CSSTrackerView.StyleSheetTreeElement = class extends UI.TreeElement {
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
    var toIndex = Math.min(this._unusedRules.length, CSSTracker.CSSTrackerView._rulesShownAtOnce);
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

/**
 * @implements {Sources.UISourceCodeFrame.LineDecorator}
 */
CSSTracker.CSSTrackerView.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var gutterType = 'CodeMirror-gutter-coverage';

    var decorations = uiSourceCode.decorationsForType(CSSTracker.CSSTrackerView.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations || !decorations.size)
      return;

    textEditor.installGutter(gutterType, false);

    for (var decoration of decorations) {
      for (var line = decoration.range().startLine; line <= decoration.range().endLine; ++line) {
        var element = createElementWithClass('div');
        if (decoration.data())
          element.className = 'text-editor-css-rule-used-marker';
        else
          element.className = 'text-editor-css-rule-unused-marker';

        textEditor.setGutterDecoration(line, gutterType, element);
      }
    }
  }
};

CSSTracker.CSSTrackerView.LineDecorator.type = 'coverage';
