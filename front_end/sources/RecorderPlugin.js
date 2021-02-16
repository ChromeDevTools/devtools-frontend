// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Recorder from '../recorder/recorder.js';
import * as SourceFrame from '../source_frame/source_frame.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';  // eslint-disable-line no-unused-vars

import {Plugin} from './Plugin.js';

export const UIStrings = {
  /**
  *@description Text to record a series of actions for analysis
  */
  record: 'Record',
};
const str_ = i18n.i18n.registerUIStrings('sources/RecorderPlugin.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RecorderPlugin extends Plugin {
  /**
   * @param {!SourceFrame.SourcesTextEditor.SourcesTextEditor} textEditor
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   */
  constructor(textEditor, uiSourceCode) {
    super();
    this._textEditor = textEditor;
    this._uiSourceCode = uiSourceCode;
  }

  /**
   * @override
   * @param {!Workspace.UISourceCode.UISourceCode} uiSourceCode
   * @return {boolean}
   */
  static accepts(uiSourceCode) {
    return Recorder.RecordingFileSystem.isRecordingUISourceCode(uiSourceCode);
  }

  /**
   * @override
   * @return {!Array<!UI.Toolbar.ToolbarItem>}
   */
  leftToolbarItems() {
    const toggleRecording = UI.Toolbar.Toolbar.createActionButtonForId('recorder.toggle-recording');
    toggleRecording.setText(i18nString(UIStrings.record));

    return [toggleRecording];
  }
}
