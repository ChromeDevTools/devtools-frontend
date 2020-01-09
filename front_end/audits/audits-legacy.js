// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as AuditsModule from './audits.js';

self.Audits = self.Audits || {};
Audits = Audits || {};

/**
 * @constructor
 */
Audits.AuditController = AuditsModule.AuditsController.AuditController;

Audits.Events = AuditsModule.AuditsController.Events;

/** @type {!Array.<!Audits.RuntimeSetting>} */
Audits.RuntimeSettings = AuditsModule.AuditsController.RuntimeSettings;

/** @type {!Array.<!Audits.Preset>} */
Audits.Presets = AuditsModule.AuditsController.Presets;

/**
 * @constructor
 */
Audits.AuditsPanel = AuditsModule.AuditsPanel.AuditsPanel;

/**
 * @constructor
 */
Audits.ProtocolService = AuditsModule.AuditsProtocolService.ProtocolService;

/**
 * @constructor
 */
Audits.ReportRenderer = AuditsModule.AuditsReportRenderer.AuditsReportRenderer;

/**
 * @constructor
 */
Audits.ReportUIFeatures = AuditsModule.AuditsReportRenderer.AuditsReportUIFeatures;

/**
 * @constructor
 */
Audits.ReportSelector = AuditsModule.AuditsReportSelector.ReportSelector;

/**
 * @constructor
 */
Audits.ReportSelector.Item = AuditsModule.AuditsReportSelector.Item;

/**
 * @constructor
 */
Audits.StartView = AuditsModule.AuditsStartView.StartView;

/**
* @constructor
*/
Audits.StatusView = AuditsModule.AuditsStatusView.StatusView;

/** @typedef {{message: string, progressBarClass: string, order: number}} */
Audits.StatusView.StatusPhases = AuditsModule.AuditsStatusView.StatusPhases;

Audits.RadioSetting = AuditsModule.RadioSetting.RadioSetting;

/** @typedef {{setting: !Common.Setting, configID: string, title: string, description: string}} */
Audits.Preset;

/** @typedef {{setting: !Common.Setting, description: string, setFlags: function(!Object, string), options: (!Array|undefined), title: (string|undefined)}} */
Audits.RuntimeSetting;
