// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {{range: !Common.TextRange, wasUsed: boolean}} */
Coverage.RangeUsage;

/** @typedef {{styleSheetHeader: !SDK.CSSStyleSheetHeader, ranges: !Array<!Coverage.RangeUsage>}} */
Coverage.StyleSheetUsage;

/** @typedef {{
 *    url: string,
 *    size: (number|undefined),
 *    unusedSize: (number|undefined),
 *    usedSize: (number|undefined),
 *    type: !Coverage.CoverageType,
 *    ranges: !Array<!Coverage.RangeUsage>
 * }}
 */
Coverage.CoverageInfo;

/**
 * @enum {number}
 */
Coverage.CoverageType = {
  CSS: (1 << 0),
  JavaScript: (1 << 1),
};

Coverage.CoverageView = class extends UI.VBox {
  constructor() {
    super(true);

    this.registerRequiredCSS('coverage/coverageView.css');

    var toolbarContainer = this.contentElement.createChild('div', 'coverage-toolbar-container');
    var topToolbar = new UI.Toolbar('coverage-toolbar', toolbarContainer);

    this._toggleRecordAction =
        /** @type {!UI.Action }*/ (UI.actionRegistry.action('coverage.toggle-recording'));
    topToolbar.appendToolbarItem(UI.Toolbar.createActionButton(this._toggleRecordAction));

    var clearButton = new UI.ToolbarButton(Common.UIString('Clear all'), 'largeicon-clear');
    clearButton.addEventListener(UI.ToolbarButton.Events.Click, this._reset.bind(this));
    topToolbar.appendToolbarItem(clearButton);

    this._coverageResultsElement = this.contentElement.createChild('div', 'coverage-results');
    this._progressElement = this._coverageResultsElement.createChild('div', 'progress-view');
    this._listView = new Coverage.CoverageListView();

    this._statusToolbarElement = this.contentElement.createChild('div', 'coverage-toolbar-summary');
    this._statusMessageElement = this._statusToolbarElement.createChild('div', 'coverage-message');
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

  _toggleRecording() {
    var enable = !this._toggleRecordAction.toggled();

    if (enable)
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
    var cpuProfilerModel = mainTarget.model(SDK.CPUProfilerModel);
    if (!cssModel && !cpuProfilerModel)
      return;
    this._toggleRecordAction.setToggled(true);
    if (cssModel)
      cssModel.startRuleUsageTracking();
    if (cpuProfilerModel)
      cpuProfilerModel.startPreciseCoverage();

    this._progressElement.textContent = Common.UIString('Recording...');
  }

  async _stopRecording() {
    this._toggleRecordAction.setToggled(false);
    this._progressElement.textContent = Common.UIString('Fetching results...');

    var cssCoverageInfoPromise = this._stopCSSCoverage();
    var jsCoverageInfoPromise = this._stopJSCoverage();
    var cssCoverageInfo = await cssCoverageInfoPromise;
    var jsCoverageInfo = await jsCoverageInfoPromise;
    this._updateViews(cssCoverageInfo.concat(jsCoverageInfo));
  }

  /**
   * @param {!Array<!Coverage.CoverageInfo>} coverageInfo
   * @this {!Coverage.CoverageView}
   */
  _updateViews(coverageInfo) {
    coverageInfo = Coverage.CoverageView._coalesceByURL(coverageInfo);
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
  static _coalesceByURL(coverageInfo) {
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
        lastEntry.type |= entry.type;
      } else {
        result.push(entry);
      }
    }
    return result;
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _stopJSCoverage() {
    var mainTarget = SDK.targetManager.mainTarget();
    var cpuProfilerModel = mainTarget ? mainTarget.model(SDK.CPUProfilerModel) : null;
    if (!cpuProfilerModel)
      return [];
    var coveragePromise = cpuProfilerModel.takePreciseCoverage();
    cpuProfilerModel.stopPreciseCoverage();
    var rawCoverageData = await coveragePromise;
    return Coverage.CoverageView._processJSCoverage(
        /** @type !SDK.DebuggerModel */ (SDK.DebuggerModel.fromTarget(mainTarget)), rawCoverageData);
  }

  /**
   * @param {!SDK.DebuggerModel} debuggerModel
   * @param {!Array<!Protocol.Profiler.ScriptCoverage>} scriptsCoverage
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  static async _processJSCoverage(debuggerModel, scriptsCoverage) {
    var promises = [];
    for (var entry of scriptsCoverage) {
      var ranges = [];
      var script = debuggerModel.scriptForId(entry.scriptId);
      if (!script)
        continue;
      for (var func of entry.functions) {
        for (var range of func.ranges) {
          var textRange = new Common.TextRange(
              range.startLineNumber, range.startColumnNumber, range.endLineNumber, range.endColumnNumber);
          ranges.push({range: textRange, wasUsed: !!range.count});
        }
      }
      promises.push(Coverage.CoverageView._coverageInfoForText(script, script.lineOffset, script.columnOffset, ranges));
    }
    return Promise.all(promises);
  }

  /**
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  async _stopCSSCoverage() {
    var mainTarget = SDK.targetManager.mainTarget();
    const cssModel = mainTarget && mainTarget.model(SDK.CSSModel);
    if (!cssModel)
      return Promise.resolve([]);

    var rawCoverageData = await cssModel.ruleListPromise();
    return Coverage.CoverageView._processCSSCoverage(
        /** @type !SDK.CSSModel */ (cssModel), rawCoverageData);
  }

  /**
   * @param {!SDK.CSSModel} cssModel
   * @param {!Array<!SDK.CSSModel.RuleUsage>} ruleUsageList
   * @return {!Promise<!Array<!Coverage.CoverageInfo>>}
   */
  static async _processCSSCoverage(cssModel, ruleUsageList) {
    /** @type {!Map<?SDK.CSSStyleSheetHeader, !Array<!Coverage.RangeUsage>>} */
    var rulesByStyleSheet = new Map();
    for (var rule of ruleUsageList) {
      var styleSheetHeader = cssModel.styleSheetHeaderForId(rule.styleSheetId);
      var ranges = rulesByStyleSheet.get(styleSheetHeader);
      if (!ranges) {
        ranges = [];
        rulesByStyleSheet.set(styleSheetHeader, ranges);
      }
      var textRange = new Common.TextRange(
          rule.range.startLine + styleSheetHeader.startLine,
          rule.range.startColumn + (rule.range.startLine ? 0 : styleSheetHeader.startColumn),
          rule.range.endLine + styleSheetHeader.startLine,
          rule.range.endColumn + (rule.range.endLine ? 0 : styleSheetHeader.startColumn));
      ranges.push({range: textRange, wasUsed: rule.wasUsed});
    }
    return Promise.all(Array.from(
        rulesByStyleSheet.entries(), entry => Coverage.CoverageView._coverageInfoForText(
                                         entry[0], entry[0].startLine, entry[0].startColumn, entry[1])));
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {number} startLine
   * @param {number} startColumn
   * @param {!Array<!Coverage.RangeUsage>} ranges
   * @return {!Promise<!Coverage.CoverageInfo>}
   */
  static async _coverageInfoForText(contentProvider, startLine, startColumn, ranges) {
    var url = contentProvider.contentURL();
    var coverageType;
    if (contentProvider.contentType().isScript())
      coverageType = Coverage.CoverageType.JavaScript;
    else if (contentProvider.contentType().isStyleSheet())
      coverageType = Coverage.CoverageType.CSS;
    else
      console.assert(false, `Unexpected resource type ${contentProvider.contentType().name} for ${url}`);

    var coverageInfo = {url: url, ranges: ranges, type: coverageType};
    var content = await contentProvider.requestContent();
    if (!content)
      return coverageInfo;

    var text = new Common.Text(content);
    var offsetRanges = ranges.map(r => {
      var range = r.range.relativeTo(startLine, startColumn);
      return {
        start: text.offsetFromPosition(range.startLine, range.startColumn),
        end: text.offsetFromPosition(range.endLine, range.endColumn),
        wasUsed: r.wasUsed
      };
    });

    var stack = [];
    offsetRanges.sort((a, b) => a.start - b.start);
    for (var entry of offsetRanges) {
      while (stack.length && stack.peekLast().end <= entry.start)
        stack.pop();

      entry.ownSize = entry.end - entry.start;
      var top = stack.peekLast();
      if (top) {
        if (top.end < entry.end) {
          console.assert(
              false, `Overlapping coverage entries in ${url}: ${top.start}-${top.end} vs. ${entry.start}-${entry.end}`);
        }
        top.ownSize -= entry.ownSize;
      }
      stack.push(entry);
    }

    var usedSize = 0;
    var unusedSize = 0;
    for (var entry of offsetRanges) {
      if (entry.wasUsed)
        usedSize += entry.ownSize;
      else
        unusedSize += entry.ownSize;
    }

    coverageInfo.size = content.length;
    coverageInfo.usedSize = usedSize;
    coverageInfo.unusedSize = unusedSize;

    return coverageInfo;
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
      for (var range of info.ranges)
        uiSourceCode.addDecoration(range.range, Coverage.CoverageView.LineDecorator.type, range.wasUsed);
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

/**
 * @implements {UI.ActionDelegate}
 */
Coverage.CoverageView.RecordActionDelegate = class {
  /**
   * @override
   * @param {!UI.Context} context
   * @param {string} actionId
   * @return {boolean}
   */
  handleAction(context, actionId) {
    var coverageViewId = 'coverage';
    UI.viewManager.showView(coverageViewId)
        .then(() => UI.viewManager.view(coverageViewId).widget())
        .then(widget => /** @type !Coverage.CoverageView} */ (widget)._toggleRecording());

    return true;
  }
};
