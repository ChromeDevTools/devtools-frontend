// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, type BadgeAction} from './Badge.js';

const AI_EXPLORER_BADGE_URI = new URL('../../Images/ai-explorer-badge.svg', import.meta.url).toString();
export class AiExplorerBadge extends Badge {
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fai-explorer';
  override readonly title = 'AI Explorer';
  override readonly jslogContext = 'ai-explorer';
  override readonly imageUri = AI_EXPLORER_BADGE_URI;

  override readonly interestedActions = [
    // TODO(ergunsh): Instrument related actions.
  ] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
