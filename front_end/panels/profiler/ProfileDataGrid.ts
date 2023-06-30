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

import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import type * as CPUProfile from '../../models/cpu_profile/cpu_profile.js';

import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
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
const str_ = i18n.i18n.registerUIStrings('panels/profiler/ProfileDataGrid.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ProfileDataGridNode extends DataGrid.DataGrid.DataGridNode<unknown> {
  searchMatchedSelfColumn: boolean;
  searchMatchedTotalColumn: boolean;
  searchMatchedFunctionColumn: boolean;
  profileNode: CPUProfile.ProfileTreeModel.ProfileNode;
  tree: ProfileDataGridTree;
  childrenByCallUID: Map<string, ProfileDataGridNode>;
  lastComparator: unknown;
  callUID: string;
  self: number;
  total: number;
  functionName: string;
  readonly deoptReason: string;
  url: Platform.DevToolsPath.UrlString;
  linkElement: Element|null;
  populated: boolean;
  savedSelf?: number;
  savedTotal?: number;
  savedChildren?: DataGrid.DataGrid.DataGridNode<unknown>[];

  constructor(
      profileNode: CPUProfile.ProfileTreeModel.ProfileNode, owningTree: ProfileDataGridTree, hasChildren: boolean) {
    super(null, hasChildren);

    this.searchMatchedSelfColumn = false;
    this.searchMatchedTotalColumn = false;
    this.searchMatchedFunctionColumn = false;

    this.profileNode = profileNode;
    this.tree = owningTree;
    this.childrenByCallUID = new Map();
    this.lastComparator = null;

    this.callUID = profileNode.callUID;
    this.self = profileNode.self;
    this.total = profileNode.total;
    this.functionName = UI.UIUtils.beautifyFunctionName(profileNode.functionName);
    this.deoptReason = profileNode.deoptReason || '';
    this.url = profileNode.url;
    this.linkElement = null;

    this.populated = false;
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
    if (container.populated) {
      return;
    }
    container.populated = true;

    container.populateChildren();

    const currentComparator = container.tree.lastComparator;

    if (currentComparator) {
      container.sort(currentComparator, true);
    }
  }

  override createCell(columnId: string): HTMLElement {
    switch (columnId) {
      case 'self': {
        const cell = this.createValueCell(this.self, this.selfPercent, columnId);
        cell.classList.toggle('highlight', this.searchMatchedSelfColumn);
        return cell;
      }

      case 'total': {
        const cell = this.createValueCell(this.total, this.totalPercent, columnId);
        cell.classList.toggle('highlight', this.searchMatchedTotalColumn);
        return cell;
      }

      case 'function': {
        const cell = this.createTD(columnId);
        cell.classList.toggle('highlight', this.searchMatchedFunctionColumn);
        if (this.deoptReason) {
          cell.classList.add('not-optimized');
          const warningIcon = new IconButton.Icon.Icon();
          warningIcon.data = {iconName: 'warning-filled', color: 'var(--icon-warning)', width: '14px', height: '14px'};
          warningIcon.classList.add('profile-warn-marker');
          UI.Tooltip.Tooltip.install(warningIcon, i18nString(UIStrings.notOptimizedS, {PH1: this.deoptReason}));
          cell.appendChild(warningIcon);
        }
        UI.UIUtils.createTextChild(cell, this.functionName);
        if (this.profileNode.scriptId === '0') {
          return cell;
        }
        const urlElement = this.tree.formatter.linkifyNode(this);
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

  createValueCell(value: number, percent: number, columnId: string): HTMLElement {
    const cell = document.createElement('td');
    cell.classList.add('numeric-column');
    const div = cell.createChild('div', 'profile-multiple-values');
    const valueSpan = div.createChild('span');
    const valueText = this.tree.formatter.formatValue(value, this);
    valueSpan.textContent = valueText;
    const percentSpan = div.createChild('span', 'percent-column');
    const percentText = this.tree.formatter.formatPercent(percent, this);
    percentSpan.textContent = percentText;
    const valueAccessibleText = this.tree.formatter.formatValueAccessibleText(value, this);
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

  override insertChild(child: DataGrid.DataGrid.DataGridNode<unknown>, index: number): void {
    const profileDataGridNode = (child as ProfileDataGridNode);
    super.insertChild(profileDataGridNode, index);
    this.childrenByCallUID.set(profileDataGridNode.callUID, (profileDataGridNode as ProfileDataGridNode));
  }

  override removeChild(profileDataGridNode: DataGrid.DataGrid.DataGridNode<unknown>): void {
    super.removeChild(profileDataGridNode);
    this.childrenByCallUID.delete((profileDataGridNode as ProfileDataGridNode).callUID);
  }

  override removeChildren(): void {
    super.removeChildren();

    this.childrenByCallUID.clear();
  }

  findChild(node: CPUProfile.ProfileTreeModel.ProfileNode): ProfileDataGridNode|null {
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

  override populate(): void {
    ProfileDataGridNode.populate(this);
  }

  populateChildren(): void {
    // Not implemented.
  }

  // When focusing and collapsing we modify lots of nodes in the tree.
  // This allows us to restore them all to their original state when we revert.

  save(): void {
    if (this.savedChildren) {
      return;
    }

    this.savedSelf = this.self;
    this.savedTotal = this.total;

    this.savedChildren = this.children.slice();
  }

  /**
   * When focusing and collapsing we modify lots of nodes in the tree.
   * This allows us to restore them all to their original state when we revert.
   */
  restore(): void {
    if (!this.savedChildren) {
      return;
    }

    if (this.savedSelf && this.savedTotal) {
      this.self = this.savedSelf;
      this.total = this.savedTotal;
    }

    this.removeChildren();

    const children = this.savedChildren;
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
  readonly formatter: Formatter;
  readonly searchableView: UI.SearchableView.SearchableView;
  total: number;
  lastComparator: ((arg0: ProfileDataGridNode, arg1: ProfileDataGridNode) => number)|null;
  childrenByCallUID: Map<string, ProfileDataGridNode>;
  deepSearch: boolean;
  populated: boolean;
  searchResults!: {
    profileNode: ProfileDataGridNode,
  }[];
  savedTotal?: number;
  savedChildren?: ProfileDataGridNode[]|null;
  searchResultIndex: number = -1;

  constructor(formatter: Formatter, searchableView: UI.SearchableView.SearchableView, total: number) {
    this.tree = this;
    this.self = 0;
    this.children = [];
    this.formatter = formatter;
    this.searchableView = searchableView;
    this.total = total;

    this.lastComparator = null;
    this.childrenByCallUID = new Map();
    this.deepSearch = true;
    this.populated = false;
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

  findChild(node: CPUProfile.ProfileTreeModel.ProfileNode): ProfileDataGridNode|null {
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
    if (this.savedChildren) {
      return;
    }

    this.savedTotal = this.total;
    this.savedChildren = this.children.slice();
  }

  restore(): void {
    if (!this.savedChildren) {
      return;
    }

    this.children = this.savedChildren;
    if (this.savedTotal) {
      this.total = this.savedTotal;
    }

    const children = this.children;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      (children[index] as ProfileDataGridNode).restore();
    }

    this.savedChildren = null;
  }

  matchFunction(searchConfig: UI.SearchableView.SearchConfig): ((arg0: ProfileDataGridNode) => boolean)|null {
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

    const matcher = Platform.StringUtilities.createPlainTextSearchRegex(query, 'i');

    function matchesQuery(profileDataGridNode: ProfileDataGridNode): boolean {
      profileDataGridNode.searchMatchedSelfColumn = false;
      profileDataGridNode.searchMatchedTotalColumn = false;
      profileDataGridNode.searchMatchedFunctionColumn = false;

      if (percentUnits) {
        if (lessThan) {
          if (profileDataGridNode.selfPercent < queryNumber) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent < queryNumber) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        } else if (greaterThan) {
          if (profileDataGridNode.selfPercent > queryNumber) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent > queryNumber) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        }

        if (equalTo) {
          if (profileDataGridNode.selfPercent === queryNumber) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.totalPercent === queryNumber) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        }
      } else if (millisecondsUnits || secondsUnits) {
        if (lessThan) {
          if (profileDataGridNode.self < queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total < queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        } else if (greaterThan) {
          if (profileDataGridNode.self > queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total > queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        }

        if (equalTo) {
          if (profileDataGridNode.self === queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedSelfColumn = true;
          }
          if (profileDataGridNode.total === queryNumberMilliseconds) {
            profileDataGridNode.searchMatchedTotalColumn = true;
          }
        }
      }

      if (profileDataGridNode.functionName.match(matcher) ||
          (profileDataGridNode.url && profileDataGridNode.url.match(matcher))) {
        profileDataGridNode.searchMatchedFunctionColumn = true;
      }

      if (profileDataGridNode.searchMatchedSelfColumn || profileDataGridNode.searchMatchedTotalColumn ||
          profileDataGridNode.searchMatchedFunctionColumn) {
        profileDataGridNode.refresh();
        return true;
      }

      return false;
    }
    return matchesQuery;
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    this.onSearchCanceled();
    const matchesQuery = this.matchFunction(searchConfig);
    if (!matchesQuery) {
      return;
    }

    this.searchResults = [];
    const deepSearch = this.deepSearch;
    let current: DataGrid.DataGrid.DataGridNode<unknown>|null;
    for (current = this.children[0]; current; current = current.traverseNextNode(!deepSearch, null, !deepSearch)) {
      const item = (current as ProfileDataGridNode | null);
      if (!item) {
        break;
      }

      if (matchesQuery(item)) {
        this.searchResults.push({profileNode: item});
      }
    }
    this.searchResultIndex = jumpBackwards ? 0 : this.searchResults.length - 1;
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }

  onSearchCanceled(): void {
    if (this.searchResults) {
      for (let i = 0; i < this.searchResults.length; ++i) {
        const profileNode = this.searchResults[i].profileNode;
        profileNode.searchMatchedSelfColumn = false;
        profileNode.searchMatchedTotalColumn = false;
        profileNode.searchMatchedFunctionColumn = false;
        profileNode.refresh();
      }
    }

    this.searchResults = [];
    this.searchResultIndex = -1;
  }

  jumpToNextSearchResult(): void {
    if (!this.searchResults || !this.searchResults.length) {
      return;
    }
    this.searchResultIndex = (this.searchResultIndex + 1) % this.searchResults.length;
    this.jumpToSearchResult(this.searchResultIndex);
  }

  jumpToPreviousSearchResult(): void {
    if (!this.searchResults || !this.searchResults.length) {
      return;
    }
    this.searchResultIndex = (this.searchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.jumpToSearchResult(this.searchResultIndex);
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return false;
  }

  jumpToSearchResult(index: number): void {
    const searchResult = this.searchResults[index];
    if (!searchResult) {
      return;
    }
    const profileNode = searchResult.profileNode;
    profileNode.revealAndSelect();
    this.searchableView.updateCurrentMatchIndex(index);
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
