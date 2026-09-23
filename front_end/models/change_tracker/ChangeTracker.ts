// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Root from '../../core/root/root.js';
import type * as CommentManager from '../comment_manager/comment_manager.js';

export class ChangeTracker {
  readonly #commentManager: CommentManager.CommentManager.CommentManager;

  constructor(commentManager: CommentManager.CommentManager.CommentManager) {
    this.#commentManager = commentManager;
  }

  get isTracking(): boolean {
    return Boolean(Root.Runtime.hostConfig.devToolsComments?.enabled) && this.#commentManager.isAgentAttached();
  }

  trackChange(
      description: string,
      anchor: CommentManager.CommentManager.CommentAnchorSignature,
      ): void {
    if (!this.isTracking) {
      return;
    }

    const thread = this.#commentManager.createCommentThread(anchor, description, 'DEVELOPER', true);
    thread.save();
  }
}
