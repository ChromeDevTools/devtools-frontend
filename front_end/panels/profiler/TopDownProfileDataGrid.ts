// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2009 280 North Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import type * as SDK from '../../core/sdk/sdk.js';
import type * as UI from '../../ui/legacy/legacy.js';

import {ProfileDataGridNode, ProfileDataGridTree, type Formatter} from './ProfileDataGrid.js';

export class TopDownProfileDataGridNode extends ProfileDataGridNode {
  remainingChildren: SDK.ProfileTreeModel.ProfileNode[];
  constructor(profileNode: SDK.ProfileTreeModel.ProfileNode, owningTree: TopDownProfileDataGridTree) {
    const hasChildren = Boolean(profileNode.children && profileNode.children.length);

    super(profileNode, owningTree, hasChildren);

    this.remainingChildren = profileNode.children;
  }

  static sharedPopulate(container: TopDownProfileDataGridTree|TopDownProfileDataGridNode): void {
    const children = container.remainingChildren;
    const childrenLength = children.length;

    for (let i = 0; i < childrenLength; ++i) {
      container.appendChild(
          new TopDownProfileDataGridNode(children[i], (container.tree as TopDownProfileDataGridTree)));
    }

    container.remainingChildren = [];
  }

  static excludeRecursively(container: TopDownProfileDataGridTree|TopDownProfileDataGridNode, aCallUID: string): void {
    if (container.remainingChildren.length > 0) {
      (container as TopDownProfileDataGridNode).populate();
    }

    container.save();

    const children = container.children;
    let index = container.children.length;

    while (index--) {
      TopDownProfileDataGridNode.excludeRecursively((children[index] as TopDownProfileDataGridNode), aCallUID);
    }

    const child = container.childrenByCallUID.get(aCallUID);

    if (child) {
      ProfileDataGridNode.merge(container, child, true);
    }
  }

  populateChildren(): void {
    TopDownProfileDataGridNode.sharedPopulate(this);
  }
}

export class TopDownProfileDataGridTree extends ProfileDataGridTree {
  remainingChildren: SDK.ProfileTreeModel.ProfileNode[];

  constructor(
      formatter: Formatter, searchableView: UI.SearchableView.SearchableView,
      rootProfileNode: SDK.ProfileTreeModel.ProfileNode, total: number) {
    super(formatter, searchableView, total);
    this.remainingChildren = rootProfileNode.children;
    ProfileDataGridNode.populate(this);
  }

  focus(profileDataGridNode: ProfileDataGridNode): void {
    if (!profileDataGridNode) {
      return;
    }

    this.save();
    profileDataGridNode.savePosition();

    this.children = [profileDataGridNode];
    this.total = profileDataGridNode.total;
  }

  exclude(profileDataGridNode: ProfileDataGridNode): void {
    if (!profileDataGridNode) {
      return;
    }

    this.save();

    TopDownProfileDataGridNode.excludeRecursively(this, profileDataGridNode.callUID);

    if (this.lastComparator) {
      this.sort(this.lastComparator, true);
    }
  }

  restore(): void {
    if (!this.savedChildren) {
      return;
    }

    this.children[0].restorePosition();

    super.restore();
  }

  populateChildren(): void {
    TopDownProfileDataGridNode.sharedPopulate(this);
  }
}
