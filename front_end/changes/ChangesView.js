// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

Changes.ChangesView = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('changes/changesView.css');
    var splitWidget = new UI.SplitWidget(true /* vertical */, false /* sidebar on left */);
    var mainWidget = new UI.Widget();
    splitWidget.setMainWidget(mainWidget);
    splitWidget.show(this.contentElement);

    this._emptyWidget = new UI.EmptyWidget('');
    this._emptyWidget.show(mainWidget.element);

    this._workspaceDiff = WorkspaceDiff.workspaceDiff();
    this._changesSidebar = new Changes.ChangesSidebar(this._workspaceDiff);
    this._changesSidebar.addEventListener(
        Changes.ChangesSidebar.Events.SelectedUISourceCodeChanged, this._selectedUISourceCodeChanged, this);
    splitWidget.setSidebarWidget(this._changesSidebar);

    /** @type {?Workspace.UISourceCode} */
    this._selectedUISourceCode = null;

    /** @type {!Array<!Changes.ChangesView.Row>} */
    this._diffRows = [];

    this._maxLineDigits = 1;

    this._editor = new TextEditor.CodeMirrorTextEditor({
      lineNumbers: true,
      lineWrapping: false,
      maxHighlightLength: Infinity  // This is to avoid CodeMirror bailing out of highlighting big diffs.
    });
    this._editor.setReadOnly(true);
    this._editor.show(mainWidget.element.createChild('div', 'editor-container'));
    this._editor.hideWidget();

    this._editor.element.addEventListener('click', this._click.bind(this), false);

    this._toolbar = new UI.Toolbar('changes-toolbar', mainWidget.element);
    var revertButton = new UI.ToolbarButton(Common.UIString('Revert all changes'), 'largeicon-undo');
    revertButton.addEventListener(UI.ToolbarButton.Events.Click, this._revert.bind(this));
    this._toolbar.appendToolbarItem(revertButton);
    this._diffStats = new UI.ToolbarText('');
    this._toolbar.appendToolbarItem(this._diffStats);
    this._toolbar.setEnabled(false);

    this._hideDiff(ls`No changes`);
    this._selectedUISourceCodeChanged();
  }

  _selectedUISourceCodeChanged() {
    this._revealUISourceCode(this._changesSidebar.selectedUISourceCode());
  }

  _revert() {
    var uiSourceCode = this._selectedUISourceCode;
    if (!uiSourceCode)
      return;
    this._workspaceDiff.revertToOriginal(uiSourceCode);
  }

  /**
   * @param {!Event} event
   */
  _click(event) {
    var selection = this._editor.selection();
    if (!selection.isEmpty())
      return;
    var row = this._diffRows[selection.startLine];
    Common.Revealer.reveal(
        this._selectedUISourceCode.uiLocation(row.currentLineNumber - 1, selection.startColumn), false);
    event.consume(true);
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   */
  _revealUISourceCode(uiSourceCode) {
    if (this._selectedUISourceCode === uiSourceCode)
      return;

    if (this._selectedUISourceCode)
      this._workspaceDiff.unsubscribeFromDiffChange(this._selectedUISourceCode, this._refreshDiff, this);
    if (uiSourceCode && this.isShowing())
      this._workspaceDiff.subscribeToDiffChange(uiSourceCode, this._refreshDiff, this);

    this._selectedUISourceCode = uiSourceCode;
    this._refreshDiff();
  }

  /**
   * @override
   */
  wasShown() {
    this._refreshDiff();
  }

  _refreshDiff() {
    if (!this.isShowing())
      return;

    if (!this._selectedUISourceCode) {
      this._renderDiffRows(null);
      return;
    }
    var uiSourceCode = this._selectedUISourceCode;
    if (!uiSourceCode.contentType().isTextType()) {
      this._hideDiff(ls`Binary data`);
      return;
    }
    this._workspaceDiff.requestDiff(uiSourceCode).then(diff => {
      if (this._selectedUISourceCode !== uiSourceCode)
        return;
      this._renderDiffRows(diff);
    });
  }

  /**
   * @param {string} message
   */
  _hideDiff(message) {
    this._diffStats.setText('');
    this._toolbar.setEnabled(false);
    this._editor.hideWidget();
    this._emptyWidget.text = message;
    this._emptyWidget.showWidget();
  }

  /**
   * @param {?Diff.Diff.DiffArray} diff
   */
  _renderDiffRows(diff) {
    this._diffRows = [];

    if (!diff || (diff.length === 1 && diff[0][0] === Diff.Diff.Operation.Equal)) {
      this._hideDiff(ls`No changes`);
      return;
    }

    var insertions = 0;
    var deletions = 0;
    var currentLineNumber = 0;
    var baselineLineNumber = 0;
    var paddingLines = 3;
    var originalLines = [];
    var currentLines = [];

    for (var i = 0; i < diff.length; ++i) {
      var token = diff[i];
      switch (token[0]) {
        case Diff.Diff.Operation.Equal:
          this._diffRows.pushAll(createEqualRows(token[1], i === 0, i === diff.length - 1));
          originalLines.pushAll(token[1]);
          currentLines.pushAll(token[1]);
          break;
        case Diff.Diff.Operation.Insert:
          for (var line of token[1])
            this._diffRows.push(createRow(line, Changes.ChangesView.RowType.Addition));
          insertions += token[1].length;
          currentLines.pushAll(token[1]);
          break;
        case Diff.Diff.Operation.Delete:
          deletions += token[1].length;
          originalLines.pushAll(token[1]);
          if (diff[i + 1] && diff[i + 1][0] === Diff.Diff.Operation.Insert) {
            i++;
            this._diffRows.pushAll(createModifyRows(token[1].join('\n'), diff[i][1].join('\n')));
            insertions += diff[i][1].length;
            currentLines.pushAll(diff[i][1]);
          } else {
            for (var line of token[1])
              this._diffRows.push(createRow(line, Changes.ChangesView.RowType.Deletion));
          }
          break;
      }
    }

    this._maxLineDigits = Math.ceil(Math.log10(Math.max(currentLineNumber, baselineLineNumber)));

    this._diffStats.setText(Common.UIString(
        '%d insertion%s (+), %d deletion%s (-)', insertions, insertions !== 1 ? 's' : '', deletions,
        deletions !== 1 ? 's' : ''));
    this._toolbar.setEnabled(true);
    this._emptyWidget.hideWidget();

    this._editor.operation(() => {
      this._editor.showWidget();
      this._editor.setHighlightMode({
        name: 'devtools-diff',
        diffRows: this._diffRows,
        mimeType: /** @type {!Workspace.UISourceCode} */ (this._selectedUISourceCode).mimeType(),
        baselineLines: originalLines,
        currentLines: currentLines
      });
      this._editor.setText(this._diffRows.map(row => row.tokens.map(t => t.text).join('')).join('\n'));
      this._editor.setLineNumberFormatter(this._lineFormatter.bind(this));
    });

    /**
     * @param {!Array<string>} lines
     * @param {boolean} atStart
     * @param {boolean} atEnd
     * @return {!Array<!Changes.ChangesView.Row>}}
     */
    function createEqualRows(lines, atStart, atEnd) {
      var equalRows = [];
      if (!atStart) {
        for (var i = 0; i < paddingLines && i < lines.length; i++)
          equalRows.push(createRow(lines[i], Changes.ChangesView.RowType.Equal));
        if (lines.length > paddingLines * 2 + 1 && !atEnd) {
          equalRows.push(createRow(
              Common.UIString('( \u2026 Skipping ') + (lines.length - paddingLines * 2) +
                  Common.UIString(' matching lines \u2026 )'),
              Changes.ChangesView.RowType.Spacer));
        }
      }
      if (!atEnd) {
        var start = Math.max(lines.length - paddingLines - 1, atStart ? 0 : paddingLines);
        var skip = lines.length - paddingLines - 1;
        if (!atStart)
          skip -= paddingLines;
        if (skip > 0) {
          baselineLineNumber += skip;
          currentLineNumber += skip;
        }

        for (var i = start; i < lines.length; i++)
          equalRows.push(createRow(lines[i], Changes.ChangesView.RowType.Equal));
      }
      return equalRows;
    }

    /**
     * @param {string} before
     * @param {string} after
     * @return {!Array<!Changes.ChangesView.Row>}}
     */
    function createModifyRows(before, after) {
      var internalDiff = Diff.Diff.charDiff(before, after, true /* cleanup diff */);
      var deletionRows = [createRow('', Changes.ChangesView.RowType.Deletion)];
      var insertionRows = [createRow('', Changes.ChangesView.RowType.Addition)];

      for (var token of internalDiff) {
        var text = token[1];
        var type = token[0];
        var className = type === Diff.Diff.Operation.Equal ? '' : 'inner-diff';
        var lines = text.split('\n');
        for (var i = 0; i < lines.length; i++) {
          if (i > 0 && type !== Diff.Diff.Operation.Insert)
            deletionRows.push(createRow('', Changes.ChangesView.RowType.Deletion));
          if (i > 0 && type !== Diff.Diff.Operation.Delete)
            insertionRows.push(createRow('', Changes.ChangesView.RowType.Addition));
          if (!lines[i])
            continue;
          if (type !== Diff.Diff.Operation.Insert)
            deletionRows[deletionRows.length - 1].tokens.push({text: lines[i], className});
          if (type !== Diff.Diff.Operation.Delete)
            insertionRows[insertionRows.length - 1].tokens.push({text: lines[i], className});
        }
      }
      return deletionRows.concat(insertionRows);
    }

    /**
     * @param {string} text
     * @param {!Changes.ChangesView.RowType} type
     * @return {!Changes.ChangesView.Row}
     */
    function createRow(text, type) {
      if (type === Changes.ChangesView.RowType.Addition)
        currentLineNumber++;
      if (type === Changes.ChangesView.RowType.Deletion)
        baselineLineNumber++;
      if (type === Changes.ChangesView.RowType.Equal) {
        baselineLineNumber++;
        currentLineNumber++;
      }

      return {baselineLineNumber, currentLineNumber, tokens: text ? [{text, className: 'inner-diff'}] : [], type};
    }
  }

  /**
   * @param {number} lineNumber
   * @return {string}
   */
  _lineFormatter(lineNumber) {
    var row = this._diffRows[lineNumber - 1];
    var showBaseNumber = row.type === Changes.ChangesView.RowType.Deletion;
    var showCurrentNumber = row.type === Changes.ChangesView.RowType.Addition;
    if (row.type === Changes.ChangesView.RowType.Equal) {
      showBaseNumber = true;
      showCurrentNumber = true;
    }
    var base = showBaseNumber ? numberToStringWithSpacesPadding(row.baselineLineNumber, this._maxLineDigits) :
                                spacesPadding(this._maxLineDigits);
    var current = showCurrentNumber ? numberToStringWithSpacesPadding(row.currentLineNumber, this._maxLineDigits) :
                                      spacesPadding(this._maxLineDigits);
    return base + spacesPadding(1) + current;
  }
};

/**
 * @typedef {!{
 *  baselineLineNumber: number,
 *  currentLineNumber: number,
 *  tokens: !Array<!{text: string, className: string}>,
 *  type: !Changes.ChangesView.RowType
 * }}
 */
Changes.ChangesView.Row;

/** @enum {string} */
Changes.ChangesView.RowType = {
  Deletion: 'deletion',
  Addition: 'addition',
  Equal: 'equal',
  Spacer: 'spacer'
};