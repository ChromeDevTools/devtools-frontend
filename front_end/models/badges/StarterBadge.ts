// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

export class StarterBadge extends Badge {
  override readonly isStarterBadge = true;
  // TODO(ergunsh): Update the name to be the actual badge for DevTools.
  override readonly name = 'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Fprofile%2Fcreated-profile';
  override readonly title = 'Chrome DevTools User';

  // TODO(ergunsh): Add remaining non-trivial event definitions
  override readonly interestedActions = [
    BadgeAction.CSS_RULE_MODIFIED,
    BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED,
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
