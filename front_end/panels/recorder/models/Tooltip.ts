// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as UI from '../../../ui/legacy/legacy.js';

export function getTooltipForActions(
    translation: string|Common.UIString.LocalizedString,
    action: string,
    ): string {
  let title: string = translation;
  const shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(action);

  for (const shortcut of shortcuts) {
    title += ` - ${shortcut.title()}`;
  }

  return title;
}
