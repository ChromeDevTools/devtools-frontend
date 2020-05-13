// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../cm/cm.js';
import '../third_party/codemirror/package/mode/css/css.js';
import '../third_party/codemirror/package/mode/javascript/javascript.js';
import '../third_party/codemirror/package/mode/xml/xml.js';
import '../third_party/codemirror/package/mode/htmlmixed/htmlmixed.js';
import '../third_party/codemirror/package/mode/htmlembedded/htmlembedded.js';
import '../third_party/codemirror/package/mode/wast/wast.js';

import * as CodeMirrorTextEditor from './CodeMirrorTextEditor.js';
import * as CodeMirrorUtils from './CodeMirrorUtils.js';
import * as TextEditorAutocompleteController from './TextEditorAutocompleteController.js';

export {
  CodeMirrorTextEditor,
  CodeMirrorUtils,
  TextEditorAutocompleteController,
};
