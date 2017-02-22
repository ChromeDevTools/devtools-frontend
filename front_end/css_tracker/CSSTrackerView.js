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
    this._listView = new CSSTracker.CSSTrackerListView();

    this._statusToolbarElement = this.contentElement.createChild('div', 'css-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'css-message');

    this._isRecording = false;
  }

  _reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(CSSTracker.CSSTrackerView.LineDecorator.type));

    this._listView.detach();
    this._cssResultsElement.removeChildren();
    this._progressElement.textContent = '';
    this._cssResultsElement.appendChild(this._progressElement);

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
      this._cssResultsElement.removeChildren();
      this._listView.update(styleSheetUsages);
      this._listView.show(this._cssResultsElement);
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
};

/** @typedef {{range: !Protocol.CSS.SourceRange,
 *              selector: (string|undefined),
 *              wasUsed: boolean}}
 */
CSSTracker.RuleUsage;

/** @typedef {{styleSheetHeader: ?SDK.CSSStyleSheetHeader, rules: !Array<!CSSTracker.RuleUsage>}} */
CSSTracker.StyleSheetUsage;

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
