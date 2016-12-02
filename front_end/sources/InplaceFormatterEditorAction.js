// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @implements {Sources.SourcesView.EditorAction}
 * @unrestricted
 */
Sources.InplaceFormatterEditorAction = class {
  /**
   * @param {!Common.Event} event
   */
  _editorSelected(event) {
    var uiSourceCode = /** @type {!Workspace.UISourceCode} */ (event.data);
    this._updateButton(uiSourceCode);
  }

  /**
   * @param {!Common.Event} event
   */
  _editorClosed(event) {
    var wasSelected = /** @type {boolean} */ (event.data.wasSelected);
    if (wasSelected)
      this._updateButton(null);
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   */
  _updateButton(uiSourceCode) {
    this._button.element.classList.toggle('hidden', !this._isFormattable(uiSourceCode));
  }

  /**
   * @override
   * @param {!Sources.SourcesView} sourcesView
   * @return {!UI.ToolbarButton}
   */
  button(sourcesView) {
    if (this._button)
      return this._button;

    this._sourcesView = sourcesView;
    this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorSelected, this._editorSelected.bind(this));
    this._sourcesView.addEventListener(Sources.SourcesView.Events.EditorClosed, this._editorClosed.bind(this));

    this._button = new UI.ToolbarButton(Common.UIString('Format'), 'largeicon-pretty-print');
    this._button.addEventListener('click', this._formatSourceInPlace, this);
    this._updateButton(sourcesView.currentUISourceCode());

    return this._button;
  }

  /**
   * @param {?Workspace.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  _isFormattable(uiSourceCode) {
    if (!uiSourceCode)
      return false;
    if (uiSourceCode.project().canSetFileContent())
      return true;
    if (Persistence.persistence.binding(uiSourceCode))
      return true;
    return uiSourceCode.contentType().isStyleSheet();
  }

  _formatSourceInPlace() {
    var uiSourceCode = this._sourcesView.currentUISourceCode();
    if (!this._isFormattable(uiSourceCode))
      return;

    if (uiSourceCode.isDirty())
      contentLoaded.call(this, uiSourceCode.workingCopy());
    else
      uiSourceCode.requestContent().then(contentLoaded.bind(this));

    /**
     * @this {Sources.InplaceFormatterEditorAction}
     * @param {?string} content
     */
    function contentLoaded(content) {
      var highlighterType = Bindings.NetworkProject.uiSourceCodeMimeType(uiSourceCode);
      Sources.Formatter.format(uiSourceCode.contentType(), highlighterType, content || '', innerCallback.bind(this));
    }

    /**
     * @this {Sources.InplaceFormatterEditorAction}
     * @param {string} formattedContent
     * @param {!Sources.FormatterSourceMapping} formatterMapping
     */
    function innerCallback(formattedContent, formatterMapping) {
      if (uiSourceCode.workingCopy() === formattedContent)
        return;
      var sourceFrame = this._sourcesView.viewForFile(uiSourceCode);
      var start = [0, 0];
      if (sourceFrame) {
        var selection = sourceFrame.selection();
        start = formatterMapping.originalToFormatted(selection.startLine, selection.startColumn);
      }
      uiSourceCode.setWorkingCopy(formattedContent);
      this._formatDecorations(uiSourceCode, formatterMapping);

      this._sourcesView.showSourceLocation(uiSourceCode, start[0], start[1]);
    }
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Sources.FormatterSourceMapping} sourceMapping
   */
  _formatDecorations(uiSourceCode, sourceMapping) {
    var decorations = uiSourceCode.allDecorations();
    if (!decorations.length)
      return;

    uiSourceCode.removeAllDecorations();

    for (var decoration of decorations) {
      var range = decoration.range();
      var startLocation = sourceMapping.originalToFormatted(range.startLine, range.startColumn);
      var endLocation = sourceMapping.originalToFormatted(range.endLine, range.endColumn);

      uiSourceCode.addDecoration(
          new Common.TextRange(...startLocation, ...endLocation),
          /** @type {string} */ (decoration.type()), decoration.data());
    }
  }
};
