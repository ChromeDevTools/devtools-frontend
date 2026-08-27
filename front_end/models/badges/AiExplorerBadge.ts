// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {Badge, BadgeAction, type BadgeContext} from './Badge.js';

const AI_EXPLORER_BADGE_URI = new URL('../../Images/ai-explorer-badge.svg', import.meta.url).toString();
const AI_CONVERSATION_COUNT_SETTING_NAME = 'gdp.ai-conversation-count';
const AI_CONVERSATION_COUNT_LIMIT = 5;

export class AiExplorerBadge extends Badge {
  override readonly name =
      'profiles/me/awards/developers.google.com%2Fprofile%2Fbadges%2Factivity%2Fchrome-devtools%2Fai-explorer';
  override readonly title = 'AI Explorer';
  override readonly jslogContext = 'ai-explorer';
  override readonly imageUri: string = AI_EXPLORER_BADGE_URI;
  readonly #aiConversationCountSetting: Common.Settings.Setting<number>;

  override readonly interestedActions: readonly BadgeAction[] = [
    BadgeAction.STARTED_AI_CONVERSATION,
  ];

  constructor(badgeContext: BadgeContext) {
    super(badgeContext);
    this.#aiConversationCountSetting = badgeContext.settings.createSetting(AI_CONVERSATION_COUNT_SETTING_NAME, 0,
                                                                           Common.Settings.SettingStorageType.SYNCED);
  }

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
