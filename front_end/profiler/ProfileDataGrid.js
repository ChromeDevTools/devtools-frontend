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

/**
 * @unrestricted
 */
Profiler.ProfileDataGridNode = class extends DataGrid.DataGridNode {
  /**
   * @param {!SDK.ProfileNode} profileNode
   * @param {!Profiler.ProfileDataGridTree} owningTree
   * @param {boolean} hasChildren
   */
  constructor(profileNode, owningTree, hasChildren) {
    super(null, hasChildren);

    this.profileNode = profileNode;
    this.tree = owningTree;
    /** @type {!Map<string, !Profiler.ProfileDataGridNode>} */
    this.childrenByCallUID = new Map();
    this.lastComparator = null;

    this.callUID = profileNode.callUID;
    this.self = profileNode.self;
    this.total = profileNode.total;
    this.functionName = UI.beautifyFunctionName(profileNode.functionName);
    this._deoptReason = profileNode.deoptReason || '';
    this.url = profileNode.url;
  }

  /**
   * @param {!Array<!Array<!Profiler.ProfileDataGridNode>>} gridNodeGroups
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  static sort(gridNodeGroups, comparator, force) {
    for (var gridNodeGroupIndex = 0; gridNodeGroupIndex < gridNodeGroups.length; ++gridNodeGroupIndex) {
      var gridNodes = gridNodeGroups[gridNodeGroupIndex];
      var count = gridNodes.length;

      for (var index = 0; index < count; ++index) {
        var gridNode = gridNodes[index];

        // If the grid node is collapsed, then don't sort children (save operation for later).
        // If the grid node has the same sorting as previously, then there is no point in sorting it again.
        if (!force && (!gridNode.expanded || gridNode.lastComparator === comparator)) {
          if (gridNode.children.length)
            gridNode.shouldRefreshChildren = true;
          continue;
        }

        gridNode.lastComparator = comparator;

        var children = gridNode.children;
        var childCount = children.length;

        if (childCount) {
          children.sort(comparator);

          for (var childIndex = 0; childIndex < childCount; ++childIndex)
            children[childIndex].recalculateSiblings(childIndex);

          gridNodeGroups.push(children);
        }
      }
    }
  }

  /**
   * @param {!Profiler.ProfileDataGridNode|!Profiler.ProfileDataGridTree} container
   * @param {!Profiler.ProfileDataGridNode} child
   * @param {boolean} shouldAbsorb
   */
  static merge(container, child, shouldAbsorb) {
    container.self += child.self;

    if (!shouldAbsorb)
      container.total += child.total;

    var children = container.children.slice();

    container.removeChildren();

    var count = children.length;

    for (var index = 0; index < count; ++index) {
      if (!shouldAbsorb || children[index] !== child)
        container.appendChild(children[index]);
    }

    children = child.children.slice();
    count = children.length;

    for (var index = 0; index < count; ++index) {
      var orphanedChild = children[index];
      var existingChild = container.childrenByCallUID.get(orphanedChild.callUID);

      if (existingChild)
        existingChild.merge(/** @type{!Profiler.ProfileDataGridNode} */ (orphanedChild), false);
      else
        container.appendChild(orphanedChild);
    }
  }

  /**
   * @param {!Profiler.ProfileDataGridNode|!Profiler.ProfileDataGridTree} container
   */
  static populate(container) {
    if (container._populated)
      return;
    container._populated = true;

    container.populateChildren();

    var currentComparator = container.tree.lastComparator;

    if (currentComparator)
      container.sort(currentComparator, true);
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    var cell;
    switch (columnId) {
      case 'self':
        cell = this._createValueCell(this.self, this.selfPercent);
        cell.classList.toggle('highlight', this._searchMatchedSelfColumn);
        break;

      case 'total':
        cell = this._createValueCell(this.total, this.totalPercent);
        cell.classList.toggle('highlight', this._searchMatchedTotalColumn);
        break;

      case 'function':
        cell = this.createTD(columnId);
        cell.classList.toggle('highlight', this._searchMatchedFunctionColumn);
        if (this._deoptReason) {
          cell.classList.add('not-optimized');
          var warningIcon = UI.Icon.create('smallicon-warning', 'profile-warn-marker');
          warningIcon.title = Common.UIString('Not optimized: %s', this._deoptReason);
          cell.appendChild(warningIcon);
        }
        cell.createTextChild(this.functionName);
        if (this.profileNode.scriptId === '0')
          break;
        var urlElement = this.tree._formatter.linkifyNode(this);
        if (!urlElement)
          break;
        urlElement.style.maxWidth = '75%';
        cell.appendChild(urlElement);
        break;

      default:
        cell = super.createCell(columnId);
        break;
    }
    return cell;
  }

  /**
   * @param {number} value
   * @param {number} percent
   * @return {!Element}
   */
  _createValueCell(value, percent) {
    var cell = createElementWithClass('td', 'numeric-column');
    var div = cell.createChild('div', 'profile-multiple-values');
    div.createChild('span').textContent = this.tree._formatter.formatValue(value, this);
    div.createChild('span', 'percent-column').textContent = this.tree._formatter.formatPercent(percent, this);
    return cell;
  }

  /**
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  sort(comparator, force) {
    return Profiler.ProfileDataGridNode.sort([[this]], comparator, force);
  }

  /**
   * @override
   * @param {!DataGrid.DataGridNode} profileDataGridNode
   * @param {number} index
   */
  insertChild(profileDataGridNode, index) {
    super.insertChild(profileDataGridNode, index);

    this.childrenByCallUID.set(
        profileDataGridNode.callUID, /** @type {!Profiler.ProfileDataGridNode} */ (profileDataGridNode));
  }

  /**
   * @override
   * @param {!DataGrid.DataGridNode} profileDataGridNode
   */
  removeChild(profileDataGridNode) {
    super.removeChild(profileDataGridNode);

    this.childrenByCallUID.delete((/** @type {!Profiler.ProfileDataGridNode} */ (profileDataGridNode)).callUID);
  }

  /**
   * @override
   */
  removeChildren() {
    super.removeChildren();

    this.childrenByCallUID.clear();
  }

  /**
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {?Profiler.ProfileDataGridNode}
   */
  findChild(node) {
    if (!node)
      return null;
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
    Profiler.ProfileDataGridNode.populate(this);
  }

  /**
   * @protected
   */
  populateChildren() {
  }

  // When focusing and collapsing we modify lots of nodes in the tree.
  // This allows us to restore them all to their original state when we revert.

  save() {
    if (this._savedChildren)
      return;

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
    if (!this._savedChildren)
      return;

    this.self = this._savedSelf;
    this.total = this._savedTotal;

    this.removeChildren();

    var children = this._savedChildren;
    var count = children.length;

    for (var index = 0; index < count; ++index) {
      children[index].restore();
      this.appendChild(children[index]);
    }
  }

  /**
   * @param {!Profiler.ProfileDataGridNode} child
   * @param {boolean} shouldAbsorb
   */
  merge(child, shouldAbsorb) {
    Profiler.ProfileDataGridNode.merge(this, child, shouldAbsorb);
  }
};


/**
 * @implements {UI.Searchable}
 * @unrestricted
 */
Profiler.ProfileDataGridTree = class {
  /**
   * @param {!Profiler.ProfileDataGridNode.Formatter} formatter
   * @param {!UI.SearchableView} searchableView
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
    var comparator = Profiler.ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property];

    if (!comparator) {
      if (isAscending) {
        comparator = function(lhs, rhs) {
          if (lhs[property] < rhs[property])
            return -1;

          if (lhs[property] > rhs[property])
            return 1;

          return 0;
        };
      } else {
        comparator = function(lhs, rhs) {
          if (lhs[property] > rhs[property])
            return -1;

          if (lhs[property] < rhs[property])
            return 1;

          return 0;
        };
      }

      Profiler.ProfileDataGridTree.propertyComparators[(isAscending ? 1 : 0)][property] = comparator;
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
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {?Profiler.ProfileDataGridNode}
   */
  findChild(node) {
    if (!node)
      return null;
    return this.childrenByCallUID.get(node.callUID);
  }

  /**
   * @param {function(!T, !T)} comparator
   * @param {boolean} force
   * @template T
   */
  sort(comparator, force) {
    return Profiler.ProfileDataGridNode.sort([[this]], comparator, force);
  }

  /**
   * @protected
   */
  save() {
    if (this._savedChildren)
      return;

    this._savedTotal = this.total;
    this._savedChildren = this.children.slice();
  }

  restore() {
    if (!this._savedChildren)
      return;

    this.children = this._savedChildren;
    this.total = this._savedTotal;

    var children = this.children;
    var count = children.length;

    for (var index = 0; index < count; ++index)
      children[index].restore();

    this._savedChildren = null;
  }

  /**
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @return {?function(!Profiler.ProfileDataGridNode):boolean}
   */
  _matchFunction(searchConfig) {
    var query = searchConfig.query.trim();
    if (!query.length)
      return null;

    var greaterThan = (query.startsWith('>'));
    var lessThan = (query.startsWith('<'));
    var equalTo = (query.startsWith('=') || ((greaterThan || lessThan) && query.indexOf('=') === 1));
    var percentUnits = (query.endsWith('%'));
    var millisecondsUnits = (query.length > 2 && query.endsWith('ms'));
    var secondsUnits = (!millisecondsUnits && query.endsWith('s'));

    var queryNumber = parseFloat(query);
    if (greaterThan || lessThan || equalTo) {
      if (equalTo && (greaterThan || lessThan))
        queryNumber = parseFloat(query.substring(2));
      else
        queryNumber = parseFloat(query.substring(1));
    }

    var queryNumberMilliseconds = (secondsUnits ? (queryNumber * 1000) : queryNumber);

    // Make equalTo implicitly true if it wasn't specified there is no other operator.
    if (!isNaN(queryNumber) && !(greaterThan || lessThan))
      equalTo = true;

    var matcher = createPlainTextSearchRegex(query, 'i');

    /**
     * @param {!Profiler.ProfileDataGridNode} profileDataGridNode
     * @return {boolean}
     */
    function matchesQuery(profileDataGridNode) {
      delete profileDataGridNode._searchMatchedSelfColumn;
      delete profileDataGridNode._searchMatchedTotalColumn;
      delete profileDataGridNode._searchMatchedFunctionColumn;

      if (percentUnits) {
        if (lessThan) {
          if (profileDataGridNode.selfPercent < queryNumber)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.totalPercent < queryNumber)
            profileDataGridNode._searchMatchedTotalColumn = true;
        } else if (greaterThan) {
          if (profileDataGridNode.selfPercent > queryNumber)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.totalPercent > queryNumber)
            profileDataGridNode._searchMatchedTotalColumn = true;
        }

        if (equalTo) {
          if (profileDataGridNode.selfPercent === queryNumber)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.totalPercent === queryNumber)
            profileDataGridNode._searchMatchedTotalColumn = true;
        }
      } else if (millisecondsUnits || secondsUnits) {
        if (lessThan) {
          if (profileDataGridNode.self < queryNumberMilliseconds)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.total < queryNumberMilliseconds)
            profileDataGridNode._searchMatchedTotalColumn = true;
        } else if (greaterThan) {
          if (profileDataGridNode.self > queryNumberMilliseconds)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.total > queryNumberMilliseconds)
            profileDataGridNode._searchMatchedTotalColumn = true;
        }

        if (equalTo) {
          if (profileDataGridNode.self === queryNumberMilliseconds)
            profileDataGridNode._searchMatchedSelfColumn = true;
          if (profileDataGridNode.total === queryNumberMilliseconds)
            profileDataGridNode._searchMatchedTotalColumn = true;
        }
      }

      if (profileDataGridNode.functionName.match(matcher) ||
          (profileDataGridNode.url && profileDataGridNode.url.match(matcher)))
        profileDataGridNode._searchMatchedFunctionColumn = true;

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
    var matchesQuery = this._matchFunction(searchConfig);
    if (!matchesQuery)
      return;

    this._searchResults = [];
    const deepSearch = this.deepSearch;
    for (var current = this.children[0]; current; current = current.traverseNextNode(!deepSearch, null, !deepSearch)) {
      if (matchesQuery(current))
        this._searchResults.push({profileNode: current});
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
      for (var i = 0; i < this._searchResults.length; ++i) {
        var profileNode = this._searchResults[i].profileNode;
        delete profileNode._searchMatchedSelfColumn;
        delete profileNode._searchMatchedTotalColumn;
        delete profileNode._searchMatchedFunctionColumn;
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
    if (!this._searchResults || !this._searchResults.length)
      return;
    this._searchResultIndex = (this._searchResultIndex + 1) % this._searchResults.length;
    this._jumpToSearchResult(this._searchResultIndex);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults || !this._searchResults.length)
      return;
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
    var searchResult = this._searchResults[index];
    if (!searchResult)
      return;
    var profileNode = searchResult.profileNode;
    profileNode.revealAndSelect();
    this._searchableView.updateCurrentMatchIndex(index);
  }
};

Profiler.ProfileDataGridTree.propertyComparators = [{}, {}];


/**
 * @interface
 */
Profiler.ProfileDataGridNode.Formatter = function() {};

Profiler.ProfileDataGridNode.Formatter.prototype = {
  /**
   * @param {number} value
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {string}
   */
  formatValue(value, node) {},

  /**
   * @param {number} value
   * @param {!Profiler.ProfileDataGridNode} node
   * @return {string}
   */
  formatPercent(value, node) {},

  /**
   * @param  {!Profiler.ProfileDataGridNode} node
   * @return {?Element}
   */
  linkifyNode(node) {}
};
