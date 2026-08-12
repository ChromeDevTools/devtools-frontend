// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';

import {AccessibilitySubPane} from './AccessibilitySubPane.js';

const UIStrings = {
  /**
   * @description Title for the ARIA-Live and JS announcements recording tool
   */
  ariaLiveRecording: 'A11y Announcements recording',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityAnnouncementRecordingView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AccessibilityAnnouncementRecordingView extends AccessibilitySubPane {
  constructor() {
    super({
      title: i18nString(UIStrings.ariaLiveRecording),
      viewId: 'aria-live-recording',
    });
  }
}
