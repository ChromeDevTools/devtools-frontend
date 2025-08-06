
// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as UI from '../../legacy/legacy.js';

/**
 * @param text Text to copy to clipboard
 * @param alert Message to send for a11y
 */
export function copyTextToClipboard(text: string, alert?: string): void {
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(text);
  // TODO: make alert required.
  if (alert) {
    UI.ARIAUtils.LiveAnnouncer.alert(alert);
  }
}
