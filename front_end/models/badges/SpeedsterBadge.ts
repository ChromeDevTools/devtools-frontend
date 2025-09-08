// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

const SPEEDSTER_BADGE_URI = new URL('../../Images/speedster-badge.svg', import.meta.url).toString();
export class SpeedsterBadge extends Badge {
  // TODO(ergunsh): Update the name to be the actual badge for DevTools.
  override readonly name = 'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Flegacy%2Ftest';
  override readonly title = 'Speedster';
  override readonly interestedActions = [BadgeAction.PERFORMANCE_INSIGHT_CLICKED] as const;
  override readonly imageUri = SPEEDSTER_BADGE_URI;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
