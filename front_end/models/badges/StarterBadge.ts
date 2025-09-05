// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

export class StarterBadge extends Badge {
  override readonly isStarterBadge = true;
  override readonly name = 'awards/chrome-devtools-user';
  override readonly title = 'Chrome DevTools User';

  // TODO(ergunsh): Add remaining non-trivial event definitions
  override readonly interestedActions = [
    BadgeAction.CSS_RULE_MODIFIED,
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
