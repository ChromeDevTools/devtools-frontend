// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Title of the Network tool
  */
  network: 'Network',
  /**
  *@description Text to preserve the log after refreshing
  */
  preserveLog: 'Preserve log',
  /**
  *@description A tag of Network preserve log settings that can be searched in the command menu
  */
  preserve: 'preserve',
  /**
  *@description A tag of Network preserve log settings that can be searched in the command menu
  */
  clear: 'clear',
  /**
  *@description A tag of Network preserve log settings that can be searched in the command menu
  */
  reset: 'reset',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  preserveLogOnPageReload: 'Preserve log on page reload / navigation',
  /**
  *@description Title of a setting under the Network category that can be invoked through the Command Menu
  */
  doNotPreserveLogOnPageReload: 'Do not preserve log on page reload / navigation',
  /**
  *@description Title of an action in the network tool to toggle recording
  */
  recordNetworkLog: 'Record network log',
};
i18n.i18n.registerUIStrings('browser_sdk/ModuleUIStrings.js', UIStrings);
