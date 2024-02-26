// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as FrontendHelpers from '../../../../testing/EnvironmentHelpers.js';
import * as PanelFeedback from '../../../components/panel_feedback/panel_feedback.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();
await FrontendHelpers.initializeGlobalVars();

const component = new PanelFeedback.PanelFeedback.PanelFeedback();

component.data = {
  feedbackUrl: 'https://www.example.com' as Platform.DevToolsPath.UrlString,
  quickStartUrl: 'https://www.example.com' as Platform.DevToolsPath.UrlString,
  quickStartLinkText: 'Quick start: get started with the Recorder',
};

document.getElementById('container')?.appendChild(component);
