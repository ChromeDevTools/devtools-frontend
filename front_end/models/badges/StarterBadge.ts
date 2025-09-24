// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

const STARTER_BADGE_IMAGE_URI = new URL('../../Images/devtools-user-badge.svg', import.meta.url).toString();
export class StarterBadge extends Badge {
  override readonly isStarterBadge = true;
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fchrome-devtools-user';
  override readonly title = 'Chrome DevTools User';
  override readonly jslogContext = 'chrome-devtools-user';
  override readonly imageUri = STARTER_BADGE_IMAGE_URI;

  // TODO(ergunsh): Add remaining non-trivial event definitions
  override readonly interestedActions = [
    BadgeAction.GDP_SIGN_UP_COMPLETE,
    BadgeAction.RECEIVE_BADGES_SETTING_ENABLED,
    BadgeAction.CSS_RULE_MODIFIED,
    BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED,
    BadgeAction.BREAKPOINT_ADDED,
    BadgeAction.CONSOLE_PROMPT_EXECUTED,
    BadgeAction.PERFORMANCE_RECORDING_STARTED,
    BadgeAction.NETWORK_SPEED_THROTTLED,
    BadgeAction.RECORDER_RECORDING_STARTED,
  ] as const;

  handleAction(action: BadgeAction): void {
    this.trigger({immediate: action === BadgeAction.GDP_SIGN_UP_COMPLETE});
  }
}
