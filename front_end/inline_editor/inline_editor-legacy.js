// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InlineEditorModule from './inline_editor.js';

self.InlineEditor = self.InlineEditor || {};
InlineEditor = InlineEditor || {};

/** @constructor */
InlineEditor.BezierEditor = InlineEditorModule.BezierEditor.BezierEditor;

InlineEditor.BezierEditor.Events = InlineEditorModule.BezierEditor.Events;
InlineEditor.BezierEditor.Presets = InlineEditorModule.BezierEditor.Presets;

/** @constructor */
InlineEditor.BezierUI = InlineEditorModule.BezierUI.BezierUI;

InlineEditor.BezierUI.Height = InlineEditorModule.BezierUI.Height;

/** @constructor */
InlineEditor.CSSShadowEditor = InlineEditorModule.CSSShadowEditor.CSSShadowEditor;

InlineEditor.CSSShadowEditor.Events = InlineEditorModule.CSSShadowEditor.Events;

/** @constructor */
InlineEditor.CSSShadowModel = InlineEditorModule.CSSShadowModel.CSSShadowModel;

/** @constructor */
InlineEditor.CSSLength = InlineEditorModule.CSSShadowModel.CSSLength;

/** @constructor */
InlineEditor.ColorSwatch = InlineEditorModule.ColorSwatch.ColorSwatch;

/** @constructor */
InlineEditor.BezierSwatch = InlineEditorModule.ColorSwatch.BezierSwatch;

/** @constructor */
InlineEditor.CSSShadowSwatch = InlineEditorModule.ColorSwatch.CSSShadowSwatch;

/** @constructor */
InlineEditor.SwatchPopoverHelper = InlineEditorModule.SwatchPopoverHelper.SwatchPopoverHelper;
