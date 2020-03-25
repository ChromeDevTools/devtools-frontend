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

import * as Common from '../common/common.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @unrestricted
 */
export class ProfileDataGridNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!SDK.ProfileTreeModel.ProfileNode} profileNode
   * @param {!ProfileDataGridTree} owningTree
   * @param {boolean} hasChildren
   */
  constructor(profileNode, owningTree, hasChildren) {
    super(null, hasChildren);

    this._searchMatchedSelfColumn = false;
    this._searchMatchedTotalColumn = false;
    this._searchMatchedFunctionColumn = false;

    this.profileNode = profileNode;
    this.tree = owningTree;
    /** @type {!Map<string, !ProfileDataGridNode>} */
    this.childrenByCallUID = new Map();
    this.lastComparator = null;

    this.callUID = profileNode.callUID;
    this.self = profileNode.self;
    this.total = profileNode.total;
    this.functionName = UI.UIUtils.beautifyFunctionName(profileNode.functionName);
    this._deoptReason = profileNode.deoptReason || '';
    this.url = profileNode.url;
    /** @type {?Element} */
    this.linkElement = null;
  }

  /**
   * @param {!Array<!Array<!ProfileDataGridNode>>} gridNodeGroups
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  static sort(gridNodeGroups, comparator, force) {
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
          children.sort(comparator);

          for (let childIndex = 0; childIndex < childCount; ++childIndex) {
            children[childIndex].recalculateSiblings(childIndex);
          }

          gridNodeGroups.push(children);
        }
      }
    }
  }

  /**
   * @param {!ProfileDataGridNode|!ProfileDataGridTree} container
   * @param {!ProfileDataGridNode} child
   * @param {boolean} shouldAbsorb
   */
  static merge(container, child, shouldAbsorb) {
    container.self += child.self;

    if (!shouldAbsorb) {
      container.total += child.total;
    }

    let children = container.children.slice();

    container.removeChildren();

    let count = children.length;

    for (let index = 0; index < count; ++index) {
      if (!shouldAbsorb || children[index] !== child) {
        container.appendChild(children[index]);
      }
    }

    children = child.children.slice();
    count = children.length;

    for (let index = 0; index < count; ++index) {
      const orphanedChild = children[index];
      const existingChild = container.childrenByCallUID.get(orphanedChild.callUID);

      if (existingChild) {
        existingChild.merge(/** @type{!ProfileDataGridNode} */ (orphanedChild), false);
      } else {
        container.appendChild(orphanedChild);
      }
    }
  }

  /**
   * @param {!ProfileDataGridNode|!ProfileDataGridTree} container
   */
  static populate(container) {
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

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    let cell;
    switch (columnId) {
      case 'self': {
        cell = this._createValueCell(this.self, this.selfPercent, columnId);
        cell.classList.toggle('highlight', this._searchMatchedSelfColumn);
        break;
      }

      case 'total': {
        cell = this._createValueCell(this.total, this.totalPercent, columnId);
        cell.classList.toggle('highlight', this._searchMatchedTotalColumn);
        break;
      }

      case 'function': {
        cell = this.createTD(columnId);
        cell.classList.toggle('highlight', this._searchMatchedFunctionColumn);
        if (this._deoptReason) {
          cell.classList.add('not-optimized');
          const warningIcon = UI.Icon.Icon.create('smallicon-warning', 'profile-warn-marker');
          warningIcon.title = Common.UIString.UIString('Not optimized: %s', this._deoptReason);
          cell.appendChild(warningIcon);
        }
        cell.createTextChild(this.functionName);
        if (this.profileNode.scriptId === '0') {
          break;
        }
        const urlElement = this.tree._formatter.linkifyNode(this);
        if (!urlElement) {
          break;
        }
        urlElement.style.maxWidth = '75%';
        cell.appendChild(urlElement);
        this.linkElement = urlElement;
        break;
      }

      default: {
        cell = super.createCell(columnId);
        break;
      }
    }
    return cell;
  }

  /**
   * @param {number} value
   * @param {number} percent
   * @param {string} columnId
   * @return {!Element}
   */
  _createValueCell(value, percent, columnId) {
    const cell = createElementWithClass('td', 'numeric-column');
    const div = cell.createChild('div', 'profile-multiple-values');
    const valueSpan = div.createChild('span');
    const valueText = this.tree._formatter.formatValue(value, this);
    valueSpan.textContent = valueText;
    const percentSpan = div.createChild('span', 'percent-column');
    const percentText = this.tree._formatter.formatPercent(percent, this);
    percentSpan.textContent = percentText;
    const valueAccessibleText = this.tree._formatter.formatValueAccessibleText(value, this);
    this.setCellAccessibleName(ls`${valueAccessibleText}, ${percentText}`, cell, columnId);
    return cell;
  }

  /**
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  sort(comparator, force) {
    return ProfileDataGridNode.sort([[this]], comparator, force);
  }

  /**
   * @override
   * @param {!DataGrid.DataGrid.DataGridNode} profileDataGridNode
   * @param {number} index
   */
  insertChild(profileDataGridNode, index) {
    super.insertChild(profileDataGridNode, index);

    this.childrenByCallUID.set(profileDataGridNode.callUID, /** @type {!ProfileDataGridNode} */ (profileDataGridNode));
  }

  /**
   * @override
   * @param {!DataGrid.DataGrid.DataGridNode} profileDataGridNode
   */
  removeChild(profileDataGridNode) {
    super.removeChild(profileDataGridNode);

    this.childrenByCallUID.delete((/** @type {!ProfileDataGridNode} */ (profileDataGridNode)).callUID);
  }

  /**
   * @override
   */
  removeChildren() {
    super.removeChildren();

    this.childrenByCallUID.clear();
  }

  /**
   * @param {!ProfileDataGridNode} node
   * @return {?ProfileDataGridNode}
   */
  findChild(node) {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID);
  }

  get selfPercent() {
    return this.self / this.tree.total * 100.0;
  }

  get totalPercent() {
    return this.total / this.tree.total * 100.0;
  }

  /**
   * @override
   */
  populate() {
    ProfileDataGridNode.populate(this);
  }

  /**
   * @protected
   */
  populateChildren() {
  }

  // When focusing and collapsing we modify lots of nodes in the tree.
  // This allows us to restore them all to their original state when we revert.

  save() {
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
   * @protected
   */
  restore() {
    if (!this._savedChildren) {
      return;
    }

    this.self = this._savedSelf;
    this.total = this._savedTotal;

    this.removeChildren();

    const children = this._savedChildren;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      children[index].restore();
      this.appendChild(children[index]);
    }
  }

  /**
   * @param {!ProfileDataGridNode} child
   * @param {boolean} shouldAbsorb
   */
  merge(child, shouldAbsorb) {
    ProfileDataGridNode.merge(this, child, shouldAbsorb);
  }
}


/**
 * @implements {UI.SearchableView.Searchable}
 * @unrestricted
 */
export class ProfileDataGridTree {
  /**
   * @param {!Formatter} formatter
   * @param {!UI.SearchableView.SearchableView} searchableView
   * @param {number} total
   */
  constructor(formatter, searchableView, total) {
    this.tree = this;
    this.children = [];
    this._formatter = formatter;
    this._searchableView = searchableView;
    this.total = total;
    this.lastComparator = null;
    this.childrenByCallUID = new Map();
    this.deepSearch = true;
  }

  /**
   * @param {string} property
   * @param {boolean} isAscending
   * @return {function(!Object.<string, *>, !Object.<string, *>)}
   */
  static propertyComparator(property, isAscending) {
    let comparator = ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property];

    if (!comparator) {
      if (isAscending) {
        comparator = function(lhs, rhs) {
          if (lhs[property] < rhs[property]) {
            return -1;
          }

          if (lhs[property] > rhs[property]) {
            return 1;
          }

          return 0;
        };
      } else {
        comparator = function(lhs, rhs) {
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

    return comparator;
  }

  get expanded() {
    return true;
  }

  appendChild(child) {
    this.insertChild(child, this.children.length);
  }

  insertChild(child, index) {
    this.children.splice(index, 0, child);
    this.childrenByCallUID.set(child.callUID, child);
  }

  removeChildren() {
    this.children = [];
    this.childrenByCallUID.clear();
  }

  populateChildren() {
  }

  /**
   * @param {!ProfileDataGridNode} node
   * @return {?ProfileDataGridNode}
   */
  findChild(node) {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID);
  }

  /**
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  sort(comparator, force) {
    return ProfileDataGridNode.sort([[this]], comparator, force);
  }

  /**
   * @protected
   */
  save() {
    if (this._savedChildren) {
      return;
    }

    this._savedTotal = this.total;
    this._savedChildren = this.children.slice();
  }

  restore() {
    if (!this._savedChildren) {
      return;
    }

    this.children = this._savedChildren;
    this.total = this._savedTotal;

    const children = this.children;
    const count = children.length;

    for (let index = 0; index < count; ++index) {
      children[index].restore();
    }

    this._savedChildren = null;
  }

  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @return {?function(!ProfileDataGridNode):boolean}
   */
  _matchFunction(searchConfig) {
    const query = searchConfig.query.trim();
    if (!query.length) {
      return null;
    }

    const greaterThan = (query.startsWith('>'));
    const lessThan = (query.startsWith('<'));
    let equalTo = (query.startsWith('=') || ((greaterThan || lessThan) && query.indexOf('=') === 1));
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

    /**
     * @param {!ProfileDataGridNode} profileDataGridNode
     * @return {boolean}
     */
    function matchesQuery(profileDataGridNode) {
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

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this.searchCanceled();
    const matchesQuery = this._matchFunction(searchConfig);
    if (!matchesQuery) {
      return;
    }

    this._searchResults = [];
    const deepSearch = this.deepSearch;
    for (let current = this.children[0]; current; current = current.traverseNextNode(!deepSearch, null, !deepSearch)) {
      if (matchesQuery(current)) {
        this._searchResults.push({profileNode: current});
      }
    }
    this._searchResultIndex = jumpBackwards ? 0 : this._searchResults.length - 1;
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
    this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
  }

  /**
   * @override
   */
  searchCanceled() {
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

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults || !this._searchResults.length) {
      return;
    }
    this._searchResultIndex = (this._searchResultIndex + 1) % this._searchResults.length;
    this._jumpToSearchResult(this._searchResultIndex);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults || !this._searchResults.length) {
      return;
    }
    this._searchResultIndex = (this._searchResultIndex - 1 + this._searchResults.length) % this._searchResults.length;
    this._jumpToSearchResult(this._searchResultIndex);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return false;
  }

  /**
   * @param {number} index
   */
  _jumpToSearchResult(index) {
    const searchResult = this._searchResults[index];
    if (!searchResult) {
      return;
    }
    const profileNode = searchResult.profileNode;
    profileNode.revealAndSelect();
    this._searchableView.updateCurrentMatchIndex(index);
  }
}

ProfileDataGridTree.propertyComparators = [{}, {}];


/**
 * @interface
 */
export class Formatter {
  /**
   * @param {number} value
   * @param {!ProfileDataGridNode} node
   * @return {string}
   */
  formatValue(value, node) {
  }

  /**
   * @param {number} value
   * @return {string}
   */
  formatValueAccessibleText(value) {
  }

  /**
   * @param {number} value
   * @param {!ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {
  }

  /**
   * @param  {!ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {}
}
