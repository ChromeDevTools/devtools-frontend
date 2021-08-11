// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Formatter from '../../models/formatter/formatter.js';
import * as Persistence from '../../models/persistence/persistence.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import type {EditorAction, SourcesView} from './SourcesView.js';
import {Events, registerEditorAction} from './SourcesView.js';

const UIStrings = {
  /**
  *@description Title of the format button in the Sources panel
  *@example {file name} PH1
  */
  formatS: 'Format {PH1}',
  /**
  *@description Tooltip text that appears when hovering over the largeicon pretty print button in the Inplace Formatter Editor Action of the Sources panel
  */
  format: 'Format',
};
const str_ = i18n.i18n.registerUIStrings('panels/sources/InplaceFormatterEditorAction.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

let inplaceFormatterEditorActionInstance: InplaceFormatterEditorAction;

export class InplaceFormatterEditorAction implements EditorAction {
  _button!: UI.Toolbar.ToolbarButton;
  _sourcesView!: SourcesView;
  constructor() {
  }
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): InplaceFormatterEditorAction {
    const {forceNew} = opts;
    if (!inplaceFormatterEditorActionInstance || forceNew) {
      inplaceFormatterEditorActionInstance = new InplaceFormatterEditorAction();
    }

    return inplaceFormatterEditorActionInstance;
  }

  _editorSelected(event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = (event.data as Workspace.UISourceCode.UISourceCode);
    this._updateButton(uiSourceCode);
  }

  _editorClosed(event: Common.EventTarget.EventTargetEvent): void {
    const wasSelected = (event.data.wasSelected as boolean);
    if (wasSelected) {
      this._updateButton(null);
    }
  }

  _updateButton(uiSourceCode: Workspace.UISourceCode.UISourceCode|null): void {
    const isFormattable = this._isFormattable(uiSourceCode);
    this._button.element.classList.toggle('hidden', !isFormattable);
    if (uiSourceCode && isFormattable) {
      this._button.setTitle(i18nString(UIStrings.formatS, {PH1: uiSourceCode.name()}));
    }
  }

  getOrCreateButton(sourcesView: SourcesView): UI.Toolbar.ToolbarButton {
    if (this._button) {
      return this._button;
    }

    this._sourcesView = sourcesView;
    this._sourcesView.addEventListener(Events.EditorSelected, this._editorSelected.bind(this));
    this._sourcesView.addEventListener(Events.EditorClosed, this._editorClosed.bind(this));

    this._button = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.format), 'largeicon-pretty-print');
    this._button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, this._formatSourceInPlace, this);
    this._updateButton(sourcesView.currentUISourceCode());

    return this._button;
  }

  _isFormattable(uiSourceCode: Workspace.UISourceCode.UISourceCode|null): boolean {
    if (!uiSourceCode) {
      return false;
    }
    if (uiSourceCode.project().canSetFileContent()) {
      return true;
    }
    if (Persistence.Persistence.PersistenceImpl.instance().binding(uiSourceCode)) {
      return true;
    }
    return uiSourceCode.contentType().isStyleSheet();
  }

  _formatSourceInPlace(_event: Common.EventTarget.EventTargetEvent): void {
    const uiSourceCode = this._sourcesView.currentUISourceCode();
    if (!uiSourceCode || !this._isFormattable(uiSourceCode)) {
      return;
    }

    if (uiSourceCode.isDirty()) {
      this._contentLoaded(uiSourceCode, uiSourceCode.workingCopy());
    } else {
      uiSourceCode.requestContent().then(deferredContent => {
        this._contentLoaded((uiSourceCode as Workspace.UISourceCode.UISourceCode), deferredContent.content || '');
      });
    }
  }

  async _contentLoaded(uiSourceCode: Workspace.UISourceCode.UISourceCode, content: string): Promise<void> {
    const highlighterType = uiSourceCode.mimeType();
    const {formattedContent, formattedMapping} =
        await Formatter.ScriptFormatter.format(uiSourceCode.contentType(), highlighterType, content);
    this._formattingComplete(uiSourceCode, formattedContent, formattedMapping);
  }

  /**
   * Post-format callback
   */
  _formattingComplete(
      uiSourceCode: Workspace.UISourceCode.UISourceCode, formattedContent: string,
      formatterMapping: Formatter.ScriptFormatter.FormatterSourceMapping): void {
    if (uiSourceCode.workingCopy() === formattedContent) {
      return;
    }
    const sourceFrame = (this._sourcesView.viewForFile(uiSourceCode) as SourceFrame.SourceFrame.SourceFrameImpl);
    let start: number[]|number[] = [0, 0];
    if (sourceFrame) {
      const selection = sourceFrame.selection();
      start = formatterMapping.originalToFormatted(selection.startLine, selection.startColumn);
    }
    uiSourceCode.setWorkingCopy(formattedContent);

    this._sourcesView.showSourceLocation(uiSourceCode, start[0], start[1]);
  }
}

registerEditorAction(InplaceFormatterEditorAction.instance);
