// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Title of the Network tool
  */
  network: 'Network',
  /**
  *@description Title of an action in the network conditions tool to network offline
  */
  goOffline: 'Go offline',
  /**
  *@description A tag of Mobile related settings that can be searched in the command menu
  */
  device: 'device',
  /**
  *@description A tag of Network related actions that can be searched in the command menu
  */
  throttling: 'throttling',
  /**
  *@description Title of an action in the network conditions tool to network low end mobile
  */
  enableSlowGThrottling: 'Enable slow 3G throttling',
  /**
  *@description Title of an action in the network conditions tool to network mid tier mobile
  */
  enableFastGThrottling: 'Enable fast 3G throttling',
  /**
  *@description Title of an action in the network conditions tool to network online
  */
  goOnline: 'Go online'
};
i18n.i18n.registerUIStrings('mobile_throttling/ModuleUIStrings.js', UIStrings);
