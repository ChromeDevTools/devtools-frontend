// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {Badge, BadgeAction} from './Badge.js';

const AI_EXPLORER_BADGE_URI = new URL('../../Images/ai-explorer-badge.svg', import.meta.url).toString();
const AI_CONVERSATION_COUNT_SETTING_NAME = 'gdp.ai-conversation-count';
const AI_CONVERSATION_COUNT_LIMIT = 5;

export class AiExplorerBadge extends Badge {
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fai-explorer';
  override readonly title = 'AI Explorer';
  override readonly jslogContext = 'ai-explorer';
  override readonly imageUri = AI_EXPLORER_BADGE_URI;
  #aiConversationCountSetting: Common.Settings.Setting<number> = Common.Settings.Settings.instance().createSetting(
      AI_CONVERSATION_COUNT_SETTING_NAME, 0, Common.Settings.SettingStorageType.SYNCED);

  override readonly interestedActions = [
    BadgeAction.STARTED_AI_CONVERSATION,
  ] as const;

  handleAction(_action: BadgeAction): void {
    const currentCount = this.#aiConversationCountSetting.get();
    if (currentCount >= AI_CONVERSATION_COUNT_LIMIT) {
      return;
    }

    this.#aiConversationCountSetting.set(currentCount + 1);
    if (this.#aiConversationCountSetting.get() === AI_CONVERSATION_COUNT_LIMIT) {
      this.trigger();
    }
  }
}
