// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../core/i18n/i18n.js';
import * as Recorder from '../recorder/recorder.js';
import * as SourceFrame from '../source_frame/source_frame.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/legacy/legacy.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {Plugin} from './Plugin.js';

const UIStrings = {
  /**
  *@description Text to record a series of actions for analysis
  */
  record: 'Record',
};
const str_ = i18n.i18n.registerUIStrings('sources/RecorderPlugin.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RecorderPlugin extends Plugin {
  _textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor;
  _uiSourceCode: Workspace.UISourceCode.UISourceCode;
  constructor(
      textEditor: SourceFrame.SourcesTextEditor.SourcesTextEditor, uiSourceCode: Workspace.UISourceCode.UISourceCode) {
    super();
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;
  }

  static accepts(uiSourceCode: Workspace.UISourceCode.UISourceCode): boolean {
    return Recorder.RecordingFileSystem.isRecordingUISourceCode(uiSourceCode);
  }

  leftToolbarItems(): UI.Toolbar.ToolbarItem[] {
    const toggleRecording = UI.Toolbar.Toolbar.createActionButtonForId('recorder.toggle-recording');
    toggleRecording.setText(i18nString(UIStrings.record));

    return [toggleRecording];
  }
}
