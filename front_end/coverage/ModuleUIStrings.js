// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Title of the 'Coverage' tool in the bottom drawer
  */
  coverage: 'Coverage',
  /**
  *@description Text for the performance of something
  */
  performance: 'Performance',
  /**
  *@description Title of an action under the Performance category that can be invoked through the Command Menu
  */
  instrumentCoverage: 'Instrument coverage',
  /**
  *@description Title of an action under the Performance category that can be invoked through the Command Menu
  */
  stopInstrumentingCoverageAndShow: 'Stop instrumenting coverage and show results',
  /**
  *@description Title of an action in the coverage tool to start with reload
  */
  startInstrumentingCoverageAnd: 'Start instrumenting coverage and reload page',
};
i18n.i18n.registerUIStrings('coverage/ModuleUIStrings.js', UIStrings);
