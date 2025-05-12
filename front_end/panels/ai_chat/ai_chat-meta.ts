// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as AIChat from './ai_chat.js';

const UIStrings = {
  /**
   *@description Command for showing the AI Chat panel
   */
  showAiChat: 'Show AI Assistant',
  /**
   *@description Title of the AI Chat panel
   */
  aiChat: 'AI Assistant',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_chat/ai_chat-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedAIChatModule: (typeof AIChat|undefined);

async function loadAIChatModule(): Promise<typeof AIChat> {
  if (!loadedAIChatModule) {
    loadedAIChatModule = await import('./ai_chat.js');
  }
  return loadedAIChatModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.PANEL,
  id: 'ai-chat',
  commandPrompt: i18nLazyString(UIStrings.showAiChat),
  title: i18nLazyString(UIStrings.aiChat),
  order: 1,
  persistence: UI.ViewManager.ViewPersistence.PERMANENT,
  async loadView() {
    const AIChat = await loadAIChatModule();
    return AIChat.AIChatPanel.AIChatPanel.instance();
  },
  iconName: 'assistant',  // Using an appropriate icon
});
