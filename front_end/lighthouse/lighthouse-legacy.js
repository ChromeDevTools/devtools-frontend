// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LighthouseModule from './lighthouse.js';

self.Lighthouse = self.Lighthouse || {};
Lighthouse = Lighthouse || {};

/** @type {!LighthouseReportGenerator} */
Lighthouse.ReportGenerator;

/**
 * @constructor
 */
Lighthouse.LighthousePanel = LighthouseModule.LighthousePanel.LighthousePanel;

/**
 * @constructor
 */
Lighthouse.ReportSelector = LighthouseModule.LighthouseReportSelector.ReportSelector;

/**
* @constructor
*/
Lighthouse.StatusView = LighthouseModule.LighthouseStatusView.StatusView;

/** @typedef {{setting: !Common.Setting, configID: string, title: string, description: string}} */
Lighthouse.Preset;

/** @typedef {{setting: !Common.Setting, description: string, setFlags: function(!Object, string), options: (!Array|undefined), title: (string|undefined)}} */
Lighthouse.RuntimeSetting;
