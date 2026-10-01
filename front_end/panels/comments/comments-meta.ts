// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Comments from './comments.js';

const UIStrings = {
  /**
   * @description Title for the Comments drawer panel.
   */
  comments: 'Comments',
  /**
   * @description Command menu command for showing the Comments drawer panel.
   */
  showComments: 'Show Comments',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/comments/comments-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedCommentsModule: (typeof Comments|undefined);

async function loadCommentsModule(): Promise<typeof Comments> {
  if (!loadedCommentsModule) {
    loadedCommentsModule = await import('./comments.js');
  }
  return loadedCommentsModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'comments',
  title: i18nLazyString(UIStrings.comments),
  commandPrompt: i18nLazyString(UIStrings.showComments),
  order: 105,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  condition: config => Boolean(config?.devToolsComments?.enabled),
  async loadView(universe) {
    const Comments = await loadCommentsModule();
    return new Comments.CommentsPane.CommentsPane(
        undefined,
        [universe.commentManager],
    );
  },
});
