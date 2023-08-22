// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as UI from '../../ui/legacy/legacy.js';

export class ContextMenuProvider implements UI.ContextMenu.Provider  {
  appendApplicableItems(_event: Event, contextMenu: UI.ContextMenu.ContextMenu, _target: Object): void {
    contextMenu.debugSection().appendAction('explain.code');
  }
}
