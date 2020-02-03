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

import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';     // eslint-disable-line no-unused-vars

import {Formatter, ProfileDataGridNode, ProfileDataGridTree} from './ProfileDataGrid.js';  // eslint-disable-line no-unused-vars

/**
 * @unrestricted
 */
export class TopDownProfileDataGridNode extends ProfileDataGridNode {
  /**
   * @param {!SDK.ProfileTreeModel.ProfileNode} profileNode
   * @param {!TopDownProfileDataGridTree} owningTree
   */
  constructor(profileNode, owningTree) {
    const hasChildren = !!(profileNode.children && profileNode.children.length);

    super(profileNode, owningTree, hasChildren);

    this._remainingChildren = profileNode.children;
  }

  /**
   * @param {!TopDownProfileDataGridNode|!TopDownProfileDataGridTree} container
   */
  static _sharedPopulate(container) {
    const children = container._remainingChildren;
    const childrenLength = children.length;

    for (let i = 0; i < childrenLength; ++i) {
      container.appendChild(
          new TopDownProfileDataGridNode(children[i], /** @type {!TopDownProfileDataGridTree} */ (container.tree)));
    }

    container._remainingChildren = null;
  }

  /**
   * @param {!TopDownProfileDataGridNode|!TopDownProfileDataGridTree} container
   * @param {string} aCallUID
   */
  static _excludeRecursively(container, aCallUID) {
    if (container._remainingChildren) {
      container.populate();
    }

    container.save();

    const children = container.children;
    let index = container.children.length;

    while (index--) {
      TopDownProfileDataGridNode._excludeRecursively(children[index], aCallUID);
    }

    const child = container.childrenByCallUID.get(aCallUID);

    if (child) {
      ProfileDataGridNode.merge(container, child, true);
    }
  }

  /**
   * @override
   */
  populateChildren() {
    TopDownProfileDataGridNode._sharedPopulate(this);
  }
}

/**
 * @unrestricted
 */
export class TopDownProfileDataGridTree extends ProfileDataGridTree {
  /**
   * @param {!Formatter} formatter
   * @param {!UI.SearchableView.SearchableView} searchableView
   * @param {!SDK.ProfileTreeModel.ProfileNode} rootProfileNode
   * @param {number} total
   */
  constructor(formatter, searchableView, rootProfileNode, total) {
    super(formatter, searchableView, total);
    this._remainingChildren = rootProfileNode.children;
    ProfileDataGridNode.populate(this);
  }

  /**
   * @param {!ProfileDataGridNode} profileDataGridNode
   */
  focus(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }

    this.save();
    profileDataGridNode.savePosition();

    this.children = [profileDataGridNode];
    this.total = profileDataGridNode.total;
  }

  /**
   * @param {!ProfileDataGridNode} profileDataGridNode
   */
  exclude(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }

    this.save();

    TopDownProfileDataGridNode._excludeRecursively(this, profileDataGridNode.callUID);

    if (this.lastComparator) {
      this.sort(this.lastComparator, true);
    }
  }

  /**
   * @override
   */
  restore() {
    if (!this._savedChildren) {
      return;
    }

    this.children[0].restorePosition();

    super.restore();
  }

  /**
   * @override
   */
  populateChildren() {
    TopDownProfileDataGridNode._sharedPopulate(this);
  }
}
