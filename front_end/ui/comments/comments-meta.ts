// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import type * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Comments from './comments.js';

const UIStrings = {
  /**
   * @description Title of an action that toggles comment mode.
   */
  toggleCommentMode: 'Add comments to send to your AI coding agent',
  /**
   * @description Label for the comments status bar when it's not showing.
   */
  showComments: 'Show comments',
  /**
   * @description Label for the comments status bar when it's showing.
   */
  comments: 'Comments',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/comments/comments-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedCommentsModule: (typeof Comments|undefined);

async function loadCommentsModule(): Promise<typeof Comments> {
  if (!loadedCommentsModule) {
    loadedCommentsModule = await import('./comments.js');
  }
  return loadedCommentsModule;
}

function isCommentsEnabled(config?: Root.Runtime.HostConfig): boolean {
  return Boolean(config?.devToolsComments?.enabled);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.STATUS_BAR,
  id: 'comments-status-bar-pill',
  order: 1,
  condition: isCommentsEnabled,
  commandPrompt: i18nLazyString(UIStrings.showComments),
  title: i18nLazyString(UIStrings.comments),
  async loadView(universe) {
    const Comments = await loadCommentsModule();
    return new Comments.CommentsStatusBarPill.CommentsStatusBarPill(undefined, [universe.commentManager]);
  },
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  actionId: 'comments.toggle-comment-mode',
  title: i18nLazyString(UIStrings.toggleCommentMode),
  iconClass: UI.ActionRegistration.IconClass.COMMENT_MODE,
  toggleable: true,
  condition: isCommentsEnabled,
  async loadActionDelegate() {
    const Comments = await loadCommentsModule();
    return new Comments.CommentsOverlayWidget.ActionDelegate();
  },
});

UI.Toolbar.registerToolbarItem({
  actionId: 'comments.toggle-comment-mode',
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
  order: 1,
  condition: isCommentsEnabled,
});
