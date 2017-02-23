// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{range: !Protocol.CSS.SourceRange, wasUsed: boolean}} */
Coverage.RangeUsage;

/** @typedef {{styleSheetHeader: !SDK.CSSStyleSheetHeader, ranges: !Array<!Coverage.RangeUsage>}} */
Coverage.StyleSheetUsage;

/** @typedef {{url: string, totalSize: number, unusedSize: number, usedSize: number,
 *      ranges: !Array<!Coverage.RangeUsage>}} */
Coverage.CoverageInfo;

Coverage.CoverageView = class extends UI.VBox {
  constructor() {
    super(true);

    this.registerRequiredCSS('coverage/coverageView.css');

    var toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    var topToolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer);

    this._recordButton =
        new UI.ToolbarToggle(Common.UIString('Start recording'), 'largeicon-resume', 'largeicon-pause');
    this._recordButton.addEventListener(UI.ToolbarButton.Events.Click, () => this._toggleRecording(!this._isRecording));
    topToolbar.appendToolbarItem(this._recordButton);

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(clearButton);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._progressElement = this._coverageResultsElement.createChild('div', 'progress-view');
    this._listView = new Coverage.CoverageListView();

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');

    this._isRecording = false;
  }

  _reset() {
    Workspace.workspace.uiSourceCodes().forEach(
        uiSourceCode => uiSourceCode.removeDecorationsForType(Coverage.CoverageView.LineDecorator.type));

    this._listView.detach();
    this._coverageResultsElement.removeChildren();
    this._progressElement.textContent = '';
    this._coverageResultsElement.appendChild(this._progressElement);

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
     * @this {!Coverage.CoverageView}
     * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
     */
    function processRuleList(ruleUsageList) {
      /** @type {!Map<?SDK.CSSStyleSheetHeader, !Array<!Coverage.RangeUsage>>} */
      var rulesByStyleSheet = new Map();
      for (var rule of ruleUsageList) {
        var styleSheetHeader = cssModel.styleSheetHeaderForId(rule.styleSheetId);
        var ranges = rulesByStyleSheet.get(styleSheetHeader);
        if (!ranges) {
          ranges = [];
          rulesByStyleSheet.set(styleSheetHeader, ranges);
        }
        ranges.push({range: rule.range, wasUsed: rule.wasUsed});
      }
      return Promise.all(
          Array.from(rulesByStyleSheet.entries(), entry => this._convertToCoverageInfo(entry[0], entry[1])));
    }

    /**
     * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
     * @this {!Coverage.CoverageView}
     */
    function updateViews(coverageInfo) {
      coverageInfo = coalesceByURL(coverageInfo);
      this._updateStats(coverageInfo);
      this._updateGutter(coverageInfo);
      this._coverageResultsElement.removeChildren();
      this._listView.update(coverageInfo);
      this._listView.show(this._coverageResultsElement);
    }

    /**
     * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
     * @return {!Array<!Coverage.CoverageInfo>}
     */
    function coalesceByURL(coverageInfo) {
      coverageInfo.sort((a, b) => (a.url || '').localeCompare(b.url));
      var result = [];
      for (var entry of coverageInfo) {
        if (!entry.url)
          continue;
        if (result.length && result.peekLast().url === entry.url) {
          var lastEntry = result.peekLast();
          lastEntry.size += entry.size;
          lastEntry.usedSize += entry.usedSize;
          lastEntry.unusedSize += entry.unusedSize;
        } else {
          result.push(entry);
        }
      }
      return result;
    }
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} styleSheetHeader
   * @param {!Array<!Coverage.RangeUsage>} ranges
   * @return {!Promise<!Coverage.CoverageInfo>}
   */
  _convertToCoverageInfo(styleSheetHeader, ranges) {
    var coverageInfo = {
      url: styleSheetHeader.sourceURL,
      ranges: ranges,
    };
    return styleSheetHeader.requestContent().then(content => {
      if (!content)
        return coverageInfo;
      var text = new Common.Text(content);
      var usedSize = 0;
      var unusedSize = 0;
      for (var entry of ranges) {
        var range = entry.range;
        var size = text.offsetFromPosition(range.endLine, range.endColumn) -
            text.offsetFromPosition(range.startLine, range.startColumn);
        if (entry.wasUsed)
          usedSize += size;
        else
          unusedSize += size;
      }
      coverageInfo.size = content.length;
      coverageInfo.usedSize = usedSize;
      coverageInfo.unusedSize = unusedSize;

      return coverageInfo;
    });
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
   */
  _updateStats(coverageInfo) {
    var total = 0;
    var unused = 0;
    for (var info of coverageInfo) {
      total += info.size || 0;
      unused += info.unusedSize || 0;
    }
    var percentUnused = total ? Math.round(100 * unused / total) : 0;
    this._statusMessageElement.textContent = Common.UIString(
        '%s of %s bytes are not used. (%d%%)', Number.bytesToString(unused), Number.bytesToString(total),
        percentUnused);
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
   */
  _updateGutter(coverageInfo) {
    for (var info of coverageInfo) {
      var uiSourceCode = info.url && Workspace.workspace.uiSourceCodeForURL(info.url);
      if (!uiSourceCode)
        continue;
      for (var range of info.ranges) {
        var gutterRange = Common.TextRange.fromObject(range.range);
        if (gutterRange.startColumn)
          gutterRange.startColumn--;
        uiSourceCode.addDecoration(gutterRange, Coverage.CoverageView.LineDecorator.type, range.wasUsed);
      }
    }
  }
};

/**
 * @implements {SourceFrame.UISourceCodeFrame.LineDecorator}
 */
Coverage.CoverageView.LineDecorator = class {
  /**
   * @override
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!TextEditor.CodeMirrorTextEditor} textEditor
   */
  decorate(uiSourceCode, textEditor) {
    var gutterType = 'CodeMirror-gutter-coverage';

    var decorations = uiSourceCode.decorationsForType(Coverage.CoverageView.LineDecorator.type);
    textEditor.uninstallGutter(gutterType);
    if (!decorations || !decorations.size)
      return;

    textEditor.installGutter(gutterType, false);

    for (var decoration of decorations) {
      for (var line = decoration.range().startLine; line <= decoration.range().endLine; ++line) {
        var element = createElementWithClass('div');
        if (decoration.data())
          element.className = 'text-editor-coverage-used-marker';
        else
          element.className = 'text-editor-coverage-unused-marker';

        textEditor.setGutterDecoration(line, gutterType, element);
      }
    }
  }
};

Coverage.CoverageView.LineDecorator.type = 'coverage';
