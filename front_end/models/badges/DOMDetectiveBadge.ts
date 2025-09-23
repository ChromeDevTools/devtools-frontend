// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

const DOM_DETECTIVE_BADGE_IMAGE_URI = new URL('../../Images/dom-detective-badge.svg', import.meta.url).toString();
export class DOMDetectiveBadge extends Badge {
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fdom-detective';
  override readonly title = 'DOM Detective';
  override readonly jslogContext = 'dom-detective';
  override readonly imageUri = DOM_DETECTIVE_BADGE_IMAGE_URI;

  override readonly interestedActions = [
    BadgeAction.MODERN_DOM_BADGE_CLICKED,
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
