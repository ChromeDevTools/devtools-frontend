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
    var cssModel = mainTarget.model(SDK.CSSModel);
    if (!cssModel)
      return;
    this._recordButton.setTitle(Common.UIString('Stop recording'));
    cssModel.startRuleUsageTracking();

    this._progressElement.textContent = Common.UIString('Recording...');
  }

  _stopRecording() {
    var mainTarget = SDK.targetManager.mainTarget();
    if (!mainTarget)
      return;

    this._recordButton.setTitle(Common.UIString('Start recording'));
    this._progressElement.textContent = Common.UIString('Fetching results...');

    var cssModel = mainTarget.model(SDK.CSSModel);
    if (!cssModel)
      return;

    cssModel.ruleListPromise().then(processRuleList.bind(this)).then(updateViews.bind(this));

    /**
     * @param {!Array<!SDK.CSSModel.RuleUsage>} ruleUsageList
     * @this {!CSSTracker.CSSTrackerView}
     * @return {!Promise<!Array<!CSSTracker.StyleSheetUsage>>}
     */
    function processRuleList(ruleUsageList) {
      /** @type {!Map<?SDK.CSSStyleSheetHeader, !CSSTracker.StyleSheetUsage>} */
      var rulesByStyleSheet = new Map();
      for (var rule of ruleUsageList) {
        var styleSheetHeader = cssModel.styleSheetHeaderForId(rule.styleSheetId);
        var entry = rulesByStyleSheet.get(styleSheetHeader);
        if (!entry) {
          entry = {styleSheetHeader: styleSheetHeader, rules: []};
          rulesByStyleSheet.set(styleSheetHeader, entry);
        }
        entry.rules.push(rule);
      }
      return Promise.all(Array.from(
          rulesByStyleSheet.values(),
          entry => this._populateSourceInfo(/** @type {!CSSTracker.StyleSheetUsage} */ (entry))));
    }

    /**
     * @param {!Array<!CSSTracker.StyleSheetUsage>} styleSheetUsages
     * @this {!CSSTracker.CSSTrackerView}
     */
    function updateViews(styleSheetUsages) {
      this._updateStats(styleSheetUsages);
      this._updateGutter(styleSheetUsages);
      this._updateTree(styleSheetUsages);
    }
  }

  /**
   * @param {!CSSTracker.StyleSheetUsage} styleSheetUsage
   * @return {!Promise<!CSSTracker.StyleSheetUsage>}
   */
  _populateSourceInfo(styleSheetUsage) {
    if (!styleSheetUsage.styleSheetHeader)
      return Promise.resolve(styleSheetUsage);
    var ruleIndex =
        new Map(styleSheetUsage.rules.map(rule => [`${rule.range.startLine}.${rule.range.startColumn}`, rule]));

    return new Promise(fulfill => {
      styleSheetUsage.styleSheetHeader.requestContent().then(
          content => Common.formatterWorkerPool.parseCSS(content || '', onRules));

      /**
       * @param {boolean} isLastChunk
       * @param {!Array<!Common.FormatterWorkerPool.CSSStyleRule>} rules
       */
      function onRules(isLastChunk, rules) {
        for (var rule of rules) {
          if (!rule.styleRange)
            continue;
          var entry = ruleIndex.get(`${rule.styleRange.startLine}.${rule.styleRange.startColumn}`);
          if (entry)
            entry.selector = rule.selectorText;
        }
        if (isLastChunk)
          fulfill(styleSheetUsage);
      }
    });
  }

  /**
   * @param {!Array<!CSSTracker.StyleSheetUsage>} styleSheetUsage
   */
  _updateStats(styleSheetUsage) {
    var total = 0;
    var unused = 0;
    for (var styleSheet of styleSheetUsage) {
      total += styleSheet.rules.length;
      unused += styleSheet.rules.reduce((count, rule) => rule.wasUsed ? count : count + 1, 0);
    }
    var percentUnused = total ? Math.round(100 * unused / total) : 0;
    if (unused === 1) {
      this._statusMessageElement.textContent =
          Common.UIString('%d CSS rule is not used. (%d%%)', unused, percentUnused);
    } else {
      this._statusMessageElement.textContent =
          Common.UIString('%d CSS rules are not used. (%d%%)', unused, percentUnused);
    }
  }

  /**
   * @param {!Array<!CSSTracker.StyleSheetUsage>} styleSheetUsages
   */
  _updateGutter(styleSheetUsages) {
    for (var styleSheet of styleSheetUsages) {
      if (!styleSheet.styleSheetHeader)
        continue;
      var url = styleSheet.styleSheetHeader.sourceURL;
      var uiSourceCode = url && Workspace.workspace.uiSourceCodeForURL(url);
      if (!uiSourceCode)
        continue;
      for (var rule of styleSheet.rules) {
        var gutterRange = Common.TextRange.fromObject(rule.range);
        if (gutterRange.startColumn)
          gutterRange.startColumn--;
        uiSourceCode.addDecoration(gutterRange, CSSTracker.CSSTrackerView.LineDecorator.type, rule.wasUsed);
      }
    }
  }

  /**
   * @param {!Array<!CSSTracker.StyleSheetUsage>} styleSheetUsages
   */
  _updateTree(styleSheetUsages) {
    this._cssResultsElement.removeChildren();
    this._cssResultsElement.appendChild(this._treeOutline.element);

    for (var sheet of styleSheetUsages) {
      var unusedRuleCount = sheet.rules.reduce((count, rule) => rule.wasUsed ? count : count + 1, 0);
      if (sheet.styleSheetHeader) {
        var url = sheet.styleSheetHeader.sourceURL;
        if (!url)
          continue;

        var styleSheetTreeElement = new CSSTracker.CSSTrackerView.StyleSheetTreeElement(url, sheet.rules);
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

/** @typedef {{range: !Protocol.CSS.SourceRange,
 *              selector: (string|undefined),
 *              wasUsed: boolean}}
 */
CSSTracker.RuleUsage;

/** @typedef {{styleSheetHeader: ?SDK.CSSStyleSheetHeader, rules: !Array<!CSSTracker.RuleUsage>}} */
CSSTracker.StyleSheetUsage;

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
 * @implements {SourceFrame.UISourceCodeFrame.LineDecorator}
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
