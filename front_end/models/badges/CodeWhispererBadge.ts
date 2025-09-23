// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Badge, BadgeAction} from './Badge.js';

const CODE_WHISPERER_BADGE_IMAGE_URI = new URL('../../Images/code-whisperer-badge.svg', import.meta.url).toString();
export class CodeWhispererBadge extends Badge {
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fcode-whisperer';
  override readonly title = 'Code Whisperer';
  override readonly jslogContext = 'code-whisperer';
  override readonly imageUri = CODE_WHISPERER_BADGE_IMAGE_URI;

  override readonly interestedActions = [BadgeAction.DEBUGGER_PAUSED] as const;

  handleAction(_action: BadgeAction): void {
    this.trigger();
  }
}
