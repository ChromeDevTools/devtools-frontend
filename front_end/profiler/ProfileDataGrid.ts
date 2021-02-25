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

/* eslint-disable rulesdir/no_underscored_properties */

import * as DataGrid from '../data_grid/data_grid.js';
import * as i18n from '../i18n/i18n.js';
import type * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  * @description This message is presented as a tooltip when developers investigate the performance
  * of a page. The tooltip alerts developers that some parts of code in execution were not optimized
  * (made to run faster) and that associated timing information must be considered with this in
  * mind. The placeholder text is the reason the code was not optimized.
  * @example {Optimized too many times} PH1
  */
  notOptimizedS: 'Not optimized: {PH1}',
  /**
  *@description Generic text with two placeholders separated by a comma
  *@example {1 613 680} PH1
  *@example {44 %} PH2
  */
  genericTextTwoPlaceholders: '{PH1}, {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('profiler/ProfileDataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProfileDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
  _searchMatchedSelfColumn: boolean;
  _searchMatchedTotalColumn: boolean;
  _searchMatchedFunctionColumn: boolean;
  profileNode: SDK.ProfileTreeModel.ProfileNode;
  tree: ProfileDataGridTree;
  childrenByCallUID: Map<string, ProfileDataGridNode>;
  lastComparator: unknown;
  callUID: string;
  self: number;
  total: number;
  functionName: string;
  _deoptReason: string;
  url: string;
  linkElement: Element|null;
  _populated: boolean;
  _savedSelf?: number;
  _savedTotal?: number;
  _savedChildren?: DataGrid.DataGrid.DataGridNode<unknown>[];

  constructor(profileNode: SDK.ProfileTreeModel.ProfileNode, owningTree: ProfileDataGridTree, hasChildren: boolean) {
    super(null, hasChildren);

    this._searchMatchedSelfColumn = false;
    this._searchMatchedTotalColumn = false;
    this._searchMatchedFunctionColumn = false;

    this.profileNode = profileNode;
    this.tree = owningTree;
    this.childrenByCallUID = new Map();
    this.lastComparator = null;

    this.callUID = profileNode.callUID;
    this.self = profileNode.self;
    this.total = profileNode.total;
    this.functionName = UI.UIUtils.beautifyFunctionName(profileNode.functionName);
    this._deoptReason = profileNode.deoptReason || '';
    this.url = profileNode.url;
    this.linkElement = null;

    this._populated = false;
  }

  static sort<T>(gridNodeGroups: ProfileDataGridNode[][], comparator: (arg0: T, arg1: T) => number, force: boolean):
      void {
    for (let gridNodeGroupIndex = 0; gridNodeGroupIndex < gridNodeGroups.length; ++gridNodeGroupIndex) {
      const gridNodes = gridNodeGroups[gridNodeGroupIndex];
      const count = gridNodes.length;

      for (let index = 0; index < count; ++index) {
        const gridNode = gridNodes[index];

        // If the grid node is collapsed, then don't sort children (save operation for later).
        // If the grid node has the same sorting as previously, then there is no point in sorting it again.
        if (!force && (!gridNode.expanded || gridNode.lastComparator === comparator)) {
          if (gridNode.children.length) {
            gridNode.shouldRefreshChildren = true;
          }
          continue;
        }

        gridNode.lastComparator = comparator;

        const children = gridNode.children;
        const childCount = children.length;

        if (childCount) {
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
          // @ts-expect-error
          children.sort(comparator);

          for (let childIndex = 0; childIndex < childCount; ++childIndex) {
            children[childIndex].recalculateSiblings(childIndex);
          }
          gridNodeGroups.push((children as ProfileDataGridNode[]));
        }
      }
    }
  }

  static merge(container: ProfileDataGridTree|ProfileDataGridNode, child: ProfileDataGridNode, shouldAbsorb: boolean):
      void {
    container.self += child.self;

    if (!shouldAbsorb) {
      container.total += child.total;
    }

    let children = container.children.slice();

    container.removeChildren();

    let count: number = children.length;

    for (let index = 0; index < count; ++index) {
      if (!shouldAbsorb || children[index] !== child) {
        container.appendChild((children[index] as ProfileDataGridNode));
      }
    }

    children = child.children.slice();
    count = children.length;

    for (let index = 0; index < count; ++index) {
      const orphanedChild = (children[index] as ProfileDataGridNode);
      const existingChild = container.childrenByCallUID.get(orphanedChild.callUID);

      if (existingChild) {
        existingChild.merge((orphanedChild as ProfileDataGridNode), false);
      } else {
        container.appendChild(orphanedChild);
      }
    }
  }

  static populate(container: ProfileDataGridTree|ProfileDataGridNode): void {
    if (container._populated) {
      return;
    }
    container._populated = true;

    container.populateChildren();

    const currentComparator = container.tree.lastComparator;

    if (currentComparator) {
      container.sort(currentComparator, true);
    }
  }

  createCell(columnId: string): HTMLElement {
    switch (columnId) {
      case 'self': {
        const cell = this._createValueCell(this.self, this.selfPercent, columnId);
        cell.classList.toggle('highlight', this._searchMatchedSelfColumn);
        return cell;
      }

      case 'total': {
        const cell = this._createValueCell(this.total, this.totalPercent, columnId);
        cell.classList.toggle('highlight', this._searchMatchedTotalColumn);
        return cell;
      }

      case 'function': {
        const cell = this.createTD(columnId);
        cell.classList.toggle('highlight', this._searchMatchedFunctionColumn);
        if (this._deoptReason) {
          cell.classList.add('not-optimized');
          const warningIcon = UI.Icon.Icon.create('smallicon-warning', 'profile-warn-marker');
          UI.Tooltip.Tooltip.install(warningIcon, i18nString(UIStrings.notOptimizedS, {PH1: this._deoptReason}));
          cell.appendChild(warningIcon);
        }
        UI.UIUtils.createTextChild(cell, this.functionName);
        if (this.profileNode.scriptId === '0') {
          return cell;
        }
        const urlElement = this.tree._formatter.linkifyNode(this);
        if (!urlElement) {
          return cell;
        }
        (urlElement as HTMLElement).style.maxWidth = '75%';
        cell.appendChild(urlElement);
        this.linkElement = urlElement;
        return cell;
      }
    }
    return super.createCell(columnId);
  }

  _createValueCell(value: number, percent: number, columnId: string): HTMLElement {
    const cell = (document.createElement('td') as HTMLElement);
    cell.classList.add('numeric-column');
    const div = cell.createChild('div', 'profile-multiple-values');
    const valueSpan = div.createChild('span');
    const valueText = this.tree._formatter.formatValue(value, this);
    valueSpan.textContent = valueText;
    const percentSpan = div.createChild('span', 'percent-column');
    const percentText = this.tree._formatter.formatPercent(percent, this);
    percentSpan.textContent = percentText;
    const valueAccessibleText = this.tree._formatter.formatValueAccessibleText(value, this);
    this.setCellAccessibleName(
        i18nString(UIStrings.genericTextTwoPlaceholders, {PH1: valueAccessibleText, PH2: percentText}), cell, columnId);
    return cell;
  }

  sort(comparator: (arg0: ProfileDataGridNode, arg1: ProfileDataGridNode) => number, force: boolean): void {
    const sortComparator =
        (comparator as (arg0: DataGrid.DataGrid.DataGridNode<unknown>, arg1: DataGrid.DataGrid.DataGridNode<unknown>) =>
             number);
    return ProfileDataGridNode.sort([[this]], sortComparator, force);
  }

  insertChild(child: DataGrid.DataGrid.DataGridNode<unknown>, index: number): void {
    const profileDataGridNode = (child as ProfileDataGridNode);
    super.insertChild(profileDataGridNode, index);
    this.childrenByCallUID.set(profileDataGridNode.callUID, (profileDataGridNode as ProfileDataGridNode));
  }

  removeChild(profileDataGridNode: DataGrid.DataGrid.DataGridNode<unknown>): void {
    super.removeChild(profileDataGridNode);
    this.childrenByCallUID.delete((profileDataGridNode as ProfileDataGridNode).callUID);
  }

  removeChildren(): void {
    super.removeChildren();

    this.childrenByCallUID.clear();
  }

  findChild(node: SDK.ProfileTreeModel.ProfileNode): ProfileDataGridNode|null {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID) || null;
  }

  get selfPercent(): number {
    return this.self / this.tree.total * 100.0;
  }

  get totalPercent(): number {
    return this.total / this.tree.total * 100.0;
  }

  populate(): void {
    ProfileDataGridNode.populate(this);
  }

  populateChildren(): void {
    // Not implemented.
  }

  // When focusing and collapsing we modify lots of nodes in the tree.
  // This allows us to restore them all to their original state when we revert.

  save(): void {
    if (this._savedChildren) {
      return;
    }

    this._savedSelf = this.self;
    this._savedTotal = this.total;

    this._savedChildren = this.children.slice();
  }

  /**
   * When focusing and collapsing we modify lots of nodes in the tree.
   * This allows us to restore them all to their original state when we revert.
   */
  restore(): void {
    if (!this._savedChildren) {
      return;
    }

    if (this._savedSelf && this._savedTotal) {
      this.self = this._savedSelf;
      this.total = this._savedTotal;
    }

    this.removeChildren();

    const children = this._savedChildren;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      (children[index] as ProfileDataGridNode).restore();
      this.appendChild(children[index]);
    }
  }

  merge(child: ProfileDataGridNode, shouldAbsorb: boolean): void {
    ProfileDataGridNode.merge(this, child, shouldAbsorb);
  }
}

export class ProfileDataGridTree implements UI.SearchableView.Searchable {
  tree: this;
  self: number;
  children: ProfileDataGridNode[];
  _formatter: Formatter;
  _searchableView: UI.SearchableView.SearchableView;
  total: number;
  lastComparator: ((arg0: ProfileDataGridNode, arg1: ProfileDataGridNode) => number)|null;
  childrenByCallUID: Map<string, ProfileDataGridNode>;
  deepSearch: boolean;
  _populated: boolean;
  _searchResults!: {
    profileNode: ProfileDataGridNode,
  }[];
  _savedTotal?: number;
  _savedChildren?: ProfileDataGridNode[]|null;
  _searchResultIndex: number = -1;

  constructor(formatter: Formatter, searchableView: UI.SearchableView.SearchableView, total: number) {
    this.tree = this;
    this.self = 0;
    this.children = [];
    this._formatter = formatter;
    this._searchableView = searchableView;
    this.total = total;

    this.lastComparator = null;
    this.childrenByCallUID = new Map();
    this.deepSearch = true;
    this._populated = false;
  }

  static propertyComparator(property: string, isAscending: boolean):
      (arg0: {
        [x: string]: unknown,
      },
       arg1: {
         [x: string]: unknown,
       }) => number {
    let comparator = ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property];

    if (!comparator) {
      if (isAscending) {
        comparator = function(
            lhs: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            },
            rhs: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            }): number {
          if (lhs[property] < rhs[property]) {
            return -1;
          }

          if (lhs[property] > rhs[property]) {
            return 1;
          }

          return 0;
        };
      } else {
        comparator = function(
            lhs: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            },
            rhs: {
              // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              [x: string]: any,
            }): number {
          if (lhs[property] > rhs[property]) {
            return -1;
          }

          if (lhs[property] < rhs[property]) {
            return 1;
          }

          return 0;
        };
      }

      ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property] = comparator;
    }

    return comparator as (
               arg0: {
                 [x: string]: unknown,
               },
               arg1: {
                 [x: string]: unknown,
               }) => number;
  }

  get expanded(): boolean {
    return true;
  }

  appendChild(child: ProfileDataGridNode): void {
    this.insertChild(child, this.children.length);
  }

  focus(_profileDataGridNode: ProfileDataGridNode): void {
  }

  exclude(_profileDataGridNode: ProfileDataGridNode): void {
  }

  insertChild(child: ProfileDataGridNode, index: number): void {
    const childToInsert = (child as ProfileDataGridNode);
    this.children.splice(index, 0, childToInsert);
    this.childrenByCallUID.set(childToInsert.callUID, child);
  }

  removeChildren(): void {
    this.children = [];
    this.childrenByCallUID.clear();
  }

  populateChildren(): void {
    // Not implemented.
  }

  findChild(node: SDK.ProfileTreeModel.ProfileNode): ProfileDataGridNode|null {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID) || null;
  }

  sort<T>(comparator: (arg0: T, arg1: T) => number, force: boolean): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    return ProfileDataGridNode.sort([[this]], comparator, force);
  }

  save(): void {
    if (this._savedChildren) {
      return;
    }

    this._savedTotal = this.total;
    this._savedChildren = this.children.slice();
  }

  restore(): void {
    if (!this._savedChildren) {
      return;
    }

    this.children = this._savedChildren;
    if (this._savedTotal) {
      this.total = this._savedTotal;
    }

    const children = this.children;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      (children[index] as ProfileDataGridNode).restore();
    }

    this._savedChildren = null;
  }

  _matchFunction(searchConfig: UI.SearchableView.SearchConfig): ((arg0: ProfileDataGridNode) => boolean)|null {
    const query = searchConfig.query.trim();
    if (!query.length) {
      return null;
    }

    const greaterThan = (query.startsWith('>'));
    const lessThan = (query.startsWith('<'));
    let equalTo: true|boolean = (query.startsWith('=') || ((greaterThan || lessThan) && query.indexOf('=') === 1));
    const percentUnits = (query.endsWith('%'));
    const millisecondsUnits = (query.length > 2 && query.endsWith('ms'));
    const secondsUnits = (!millisecondsUnits && query.endsWith('s'));

    let queryNumber = parseFloat(query);
    if (greaterThan || lessThan || equalTo) {
      if (equalTo && (greaterThan || lessThan)) {
        queryNumber = parseFloat(query.substring(2));
      } else {
        queryNumber = parseFloat(query.substring(1));
      }
    }

    const queryNumberMilliseconds = (secondsUnits ? (queryNumber * 1000) : queryNumber);

    // Make equalTo implicitly true if it wasn't specified there is no other operator.
    if (!isNaN(queryNumber) && !(greaterThan || lessThan)) {
      equalTo = true;
    }

    const matcher = createPlainTextSearchRegex(query, 'i');

    function matchesQuery(profileDataGridNode: ProfileDataGridNode): boolean {
      profileDataGridNode._searchMatchedSelfColumn = false;
      profileDataGridNode._searchMatchedTotalColumn = false;
      profileDataGridNode._searchMatchedFunctionColumn = false;

      if (percentUnits) {
        if (lessThan) {
          if (profileDataGridNode.selfPercent < queryNumber) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent < queryNumber) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        } else if (greaterThan) {
          if (profileDataGridNode.selfPercent > queryNumber) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent > queryNumber) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        }

        if (equalTo) {
          if (profileDataGridNode.selfPercent === queryNumber) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent === queryNumber) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        }
      } else if (millisecondsUnits || secondsUnits) {
        if (lessThan) {
          if (profileDataGridNode.self < queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total < queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        } else if (greaterThan) {
          if (profileDataGridNode.self > queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total > queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        }

        if (equalTo) {
          if (profileDataGridNode.self === queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total === queryNumberMilliseconds) {
            profileDataGridNode._searchMatchedTotalColumn = true;
          }
        }
      }

      if (profileDataGridNode.functionName.match(matcher) ||
          (profileDataGridNode.url && profileDataGridNode.url.match(matcher))) {
        profileDataGridNode._searchMatchedFunctionColumn = true;
      }

      if (profileDataGridNode._searchMatchedSelfColumn || profileDataGridNode._searchMatchedTotalColumn ||
          profileDataGridNode._searchMatchedFunctionColumn) {
        profileDataGridNode.refresh();
        return true;
      }

      return false;
    }
    return matchesQuery;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    this.searchCanceled();
    const matchesQuery = this._matchFunction(searchConfig);
    if (!matchesQuery) {
      return;
    }

    this._searchResults = [];
    const deepSearch = this.deepSearch;
    let current: DataGrid.DataGrid.DataGridNode<unknown>|null;
    for (current = this.children[0]; current; current = current.traverseNextNode(!deepSearch, null, !deepSearch)) {
      const item = (current as ProfileDataGridNode | null);
      if (!item) {
        break;
      }

      if (matchesQuery(item)) {
        this._searchResults.push({profileNode: item});
      }
    }
    this._searchResultIndex = jumpBackwards ? 0 : this._searchResults.length - 1;
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  searchCanceled(): void {
    if (this._searchResults) {
      for (let i = 0; i < this._searchResults.length; ++i) {
        const profileNode = this._searchResults[i].profileNode;
        profileNode._searchMatchedSelfColumn = false;
        profileNode._searchMatchedTotalColumn = false;
        profileNode._searchMatchedFunctionColumn = false;
        profileNode.refresh();
      }
    }

    this._searchResults = [];
    this._searchResultIndex = -1;
  }

  jumpToNextSearchResult(): void {
    if (!this._searchResults || !this._searchResults.length) {
      return;
    }
    this._searchResultIndex = (this._searchResultIndex + 1) % this._searchResults.length;
    this._jumpToSearchResult(this._searchResultIndex);
  }

  jumpToPreviousSearchResult(): void {
    if (!this._searchResults || !this._searchResults.length) {
      return;
    }
    this._searchResultIndex = (this._searchResultIndex - 1 + this._searchResults.length) % this._searchResults.length;
    this._jumpToSearchResult(this._searchResultIndex);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  _jumpToSearchResult(index: number): void {
    const searchResult = this._searchResults[index];
    if (!searchResult) {
      return;
    }
    const profileNode = searchResult.profileNode;
    profileNode.revealAndSelect();
    this._searchableView.updateCurrentMatchIndex(index);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  static readonly propertyComparators: {[key: string]: unknown}[] = [{}, {}];
}

export interface Formatter {
  formatValue(value: number, node: ProfileDataGridNode): string;
  formatValueAccessibleText(value: number, node: ProfileDataGridNode): string;
  formatPercent(value: number, node: ProfileDataGridNode): string;
  linkifyNode(node: ProfileDataGridNode): Element|null;
}
