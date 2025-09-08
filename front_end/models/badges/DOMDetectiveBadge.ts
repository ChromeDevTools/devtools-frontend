// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

const DOM_DETECTIVE_BADGE_IMAGE_URI = new URL('../../Images/dom-detective-badge.svg', import.meta.url).toString();
export class DOMDetectiveBadge extends Badge {
  // TODO(ergunsh): Update the name to be the actual badge for DevTools.
  override readonly name = 'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Flegacy%2Ftest';
  override readonly title = 'DOM Detective';
  override readonly imageUri = DOM_DETECTIVE_BADGE_IMAGE_URI;

  override readonly interestedActions = [
    BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED,
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
