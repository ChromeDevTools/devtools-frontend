var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/panels/profiler/BottomUpProfileDataGrid.js
var BottomUpProfileDataGrid_exports = {};
__export(BottomUpProfileDataGrid_exports, {
  BottomUpProfileDataGridNode: () => BottomUpProfileDataGridNode,
  BottomUpProfileDataGridTree: () => BottomUpProfileDataGridTree
});
import * as Platform2 from "./../../core/platform/platform.js";

// gen/front_end/panels/profiler/ProfileDataGrid.js
var ProfileDataGrid_exports = {};
__export(ProfileDataGrid_exports, {
  ProfileDataGridNode: () => ProfileDataGridNode,
  ProfileDataGridTree: () => ProfileDataGridTree
});
import * as i18n from "./../../core/i18n/i18n.js";
import * as Platform from "./../../core/platform/platform.js";
import * as IconButton from "./../../ui/components/icon_button/icon_button.js";
import * as DataGrid from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description This message is presented as a tooltip when developers investigate the performance
   * of a page. The tooltip alerts developers that some parts of code in execution were not optimized
   * (made to run faster) and that associated timing information must be considered with this in
   * mind. The placeholder text is the reason the code was not optimized.
   * @example {Optimized too many times} PH1
   */
  notOptimizedS: "Not optimized: {PH1}",
  /**
   * @description Generic text with two placeholders separated by a comma
   * @example {1 613 680} PH1
   * @example {44 %} PH2
   */
  genericTextTwoPlaceholders: "{PH1}, {PH2}"
};
var str_ = i18n.i18n.registerUIStrings("panels/profiler/ProfileDataGrid.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var ProfileDataGridNode = class _ProfileDataGridNode extends DataGrid.DataGrid.DataGridNode {
  searchMatchedSelfColumn;
  searchMatchedTotalColumn;
  searchMatchedFunctionColumn;
  profileNode;
  tree;
  childrenByCallUID;
  lastComparator;
  callUID;
  self;
  total;
  functionName;
  deoptReason;
  url;
  linkElement;
  populated;
  savedSelf;
  savedTotal;
  savedChildren;
  constructor(profileNode, owningTree, hasChildren) {
    super(null, hasChildren);
    this.searchMatchedSelfColumn = false;
    this.searchMatchedTotalColumn = false;
    this.searchMatchedFunctionColumn = false;
    this.profileNode = profileNode;
    this.tree = owningTree;
    this.childrenByCallUID = /* @__PURE__ */ new Map();
    this.lastComparator = null;
    this.callUID = profileNode.callUID;
    this.self = profileNode.self;
    this.total = profileNode.total;
    this.functionName = UI.UIUtils.beautifyFunctionName(profileNode.functionName);
    this.deoptReason = profileNode.deoptReason || "";
    this.url = profileNode.url;
    this.linkElement = null;
    this.populated = false;
  }
  static sort(gridNodeGroups, comparator, force) {
    for (let gridNodeGroupIndex = 0; gridNodeGroupIndex < gridNodeGroups.length; ++gridNodeGroupIndex) {
      const gridNodes = gridNodeGroups[gridNodeGroupIndex];
      const count = gridNodes.length;
      for (let index = 0; index < count; ++index) {
        const gridNode = gridNodes[index];
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
        existingChild.merge(orphanedChild, false);
      } else {
        container.appendChild(orphanedChild);
      }
    }
  }
  static populate(container) {
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
  createCell(columnId) {
    switch (columnId) {
      case "self": {
        const cell = this.createValueCell(this.self, this.selfPercent, columnId);
        cell.classList.toggle("highlight", this.searchMatchedSelfColumn);
        return cell;
      }
      case "total": {
        const cell = this.createValueCell(this.total, this.totalPercent, columnId);
        cell.classList.toggle("highlight", this.searchMatchedTotalColumn);
        return cell;
      }
      case "function": {
        const cell = this.createTD(columnId);
        cell.classList.toggle("highlight", this.searchMatchedFunctionColumn);
        if (this.deoptReason) {
          cell.classList.add("not-optimized");
          const warningIcon = new IconButton.Icon.Icon();
          warningIcon.name = "warning-filled";
          warningIcon.classList.add("profile-warn-marker", "small");
          UI.Tooltip.Tooltip.install(warningIcon, i18nString(UIStrings.notOptimizedS, { PH1: this.deoptReason }));
          cell.appendChild(warningIcon);
        }
        UI.UIUtils.createTextChild(cell, this.functionName);
        if (this.profileNode.scriptId === "0") {
          return cell;
        }
        const urlElement = this.tree.formatter.linkifyNode(this);
        if (!urlElement) {
          return cell;
        }
        urlElement.style.maxWidth = "75%";
        cell.appendChild(urlElement);
        this.linkElement = urlElement;
        return cell;
      }
    }
    return super.createCell(columnId);
  }
  createValueCell(value2, percent, columnId) {
    const cell = document.createElement("td");
    cell.classList.add("numeric-column");
    const div = cell.createChild("div", "profile-multiple-values");
    const valueSpan = div.createChild("span");
    const valueText = this.tree.formatter.formatValue(value2, this);
    valueSpan.textContent = valueText;
    const percentSpan = div.createChild("span", "percent-column");
    const percentText = this.tree.formatter.formatPercent(percent, this);
    percentSpan.textContent = percentText;
    const valueAccessibleText = this.tree.formatter.formatValueAccessibleText(value2, this);
    this.setCellAccessibleName(i18nString(UIStrings.genericTextTwoPlaceholders, { PH1: valueAccessibleText, PH2: percentText }), cell, columnId);
    return cell;
  }
  sort(comparator, force) {
    const sortComparator = comparator;
    return _ProfileDataGridNode.sort([[this]], sortComparator, force);
  }
  insertChild(child, index) {
    const profileDataGridNode = child;
    super.insertChild(profileDataGridNode, index);
    this.childrenByCallUID.set(profileDataGridNode.callUID, profileDataGridNode);
  }
  removeChild(profileDataGridNode) {
    super.removeChild(profileDataGridNode);
    this.childrenByCallUID.delete(profileDataGridNode.callUID);
  }
  removeChildren() {
    super.removeChildren();
    this.childrenByCallUID.clear();
  }
  findChild(node) {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID) || null;
  }
  get selfPercent() {
    return this.self / this.tree.total * 100;
  }
  get totalPercent() {
    return this.total / this.tree.total * 100;
  }
  populate() {
    _ProfileDataGridNode.populate(this);
  }
  populateChildren() {
  }
  // When focusing and collapsing we modify lots of nodes in the tree.
  // This allows us to restore them all to their original state when we revert.
  save() {
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
  restore() {
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
      children[index].restore();
      this.appendChild(children[index]);
    }
  }
  merge(child, shouldAbsorb) {
    _ProfileDataGridNode.merge(this, child, shouldAbsorb);
  }
};
var ProfileDataGridTree = class {
  tree;
  self;
  children;
  formatter;
  searchableView;
  total;
  lastComparator;
  childrenByCallUID;
  deepSearch;
  populated;
  searchResults;
  savedTotal;
  savedChildren;
  searchResultIndex = -1;
  constructor(formatter, searchableView, total) {
    this.tree = this;
    this.self = 0;
    this.children = [];
    this.formatter = formatter;
    this.searchableView = searchableView;
    this.total = total;
    this.lastComparator = null;
    this.childrenByCallUID = /* @__PURE__ */ new Map();
    this.deepSearch = true;
    this.populated = false;
  }
  static propertyComparator(property, isAscending) {
    let comparator = propertyComparators[isAscending ? 1 : 0][property];
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
      propertyComparators[isAscending ? 1 : 0][property] = comparator;
    }
    return comparator;
  }
  get expanded() {
    return true;
  }
  appendChild(child) {
    this.insertChild(child, this.children.length);
  }
  focus(_profileDataGridNode) {
  }
  exclude(_profileDataGridNode) {
  }
  insertChild(child, index) {
    const childToInsert = child;
    this.children.splice(index, 0, childToInsert);
    this.childrenByCallUID.set(childToInsert.callUID, child);
  }
  removeChildren() {
    this.children = [];
    this.childrenByCallUID.clear();
  }
  populateChildren() {
  }
  findChild(node) {
    if (!node) {
      return null;
    }
    return this.childrenByCallUID.get(node.callUID) || null;
  }
  sort(comparator, force) {
    return ProfileDataGridNode.sort([[this]], comparator, force);
  }
  save() {
    if (this.savedChildren) {
      return;
    }
    this.savedTotal = this.total;
    this.savedChildren = this.children.slice();
  }
  restore() {
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
      children[index].restore();
    }
    this.savedChildren = null;
  }
  matchFunction(searchConfig) {
    const query = searchConfig.query.trim();
    if (!query.length) {
      return null;
    }
    const greaterThan = query.startsWith(">");
    const lessThan = query.startsWith("<");
    let equalTo = query.startsWith("=") || (greaterThan || lessThan) && query.indexOf("=") === 1;
    const percentUnits = query.endsWith("%");
    const millisecondsUnits = query.length > 2 && query.endsWith("ms");
    const secondsUnits = !millisecondsUnits && query.endsWith("s");
    let queryNumber = parseFloat(query);
    if (greaterThan || lessThan || equalTo) {
      if (equalTo && (greaterThan || lessThan)) {
        queryNumber = parseFloat(query.substring(2));
      } else {
        queryNumber = parseFloat(query.substring(1));
      }
    }
    const queryNumberMilliseconds = secondsUnits ? queryNumber * 1e3 : queryNumber;
    if (!isNaN(queryNumber) && !(greaterThan || lessThan)) {
      equalTo = true;
    }
    const matcher = Platform.StringUtilities.createPlainTextSearchRegex(query, "i");
    function matchesQuery(profileDataGridNode) {
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
      if (profileDataGridNode.functionName.match(matcher) || profileDataGridNode.url && profileDataGridNode.url.match(matcher)) {
        profileDataGridNode.searchMatchedFunctionColumn = true;
      }
      if (profileDataGridNode.searchMatchedSelfColumn || profileDataGridNode.searchMatchedTotalColumn || profileDataGridNode.searchMatchedFunctionColumn) {
        profileDataGridNode.refresh();
        return true;
      }
      return false;
    }
    return matchesQuery;
  }
  performSearch(searchConfig, _shouldJump, jumpBackwards) {
    this.onSearchCanceled();
    const matchesQuery = this.matchFunction(searchConfig);
    if (!matchesQuery) {
      return;
    }
    this.searchResults = [];
    const deepSearch = this.deepSearch;
    let current;
    for (current = this.children[0]; current; current = current.traverseNextNode(!deepSearch, null, !deepSearch)) {
      const item = current;
      if (!item) {
        break;
      }
      if (matchesQuery(item)) {
        this.searchResults.push({ profileNode: item });
      }
    }
    this.searchResultIndex = jumpBackwards ? 0 : this.searchResults.length - 1;
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }
  onSearchCanceled() {
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
  jumpToNextSearchResult() {
    if (!this.searchResults?.length) {
      return;
    }
    this.searchResultIndex = (this.searchResultIndex + 1) % this.searchResults.length;
    this.jumpToSearchResult(this.searchResultIndex);
  }
  jumpToPreviousSearchResult() {
    if (!this.searchResults?.length) {
      return;
    }
    this.searchResultIndex = (this.searchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.jumpToSearchResult(this.searchResultIndex);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
  jumpToSearchResult(index) {
    const searchResult = this.searchResults[index];
    if (!searchResult) {
      return;
    }
    const profileNode = searchResult.profileNode;
    profileNode.revealAndSelect();
    this.searchableView.updateCurrentMatchIndex(index);
  }
};
var propertyComparators = [{}, {}];

// gen/front_end/panels/profiler/BottomUpProfileDataGrid.js
var BottomUpProfileDataGridNode = class _BottomUpProfileDataGridNode extends ProfileDataGridNode {
  remainingNodeInfos;
  constructor(profileNode, owningTree) {
    super(profileNode, owningTree, profileNode.parent !== null && Boolean(profileNode.parent.parent));
    this.remainingNodeInfos = [];
  }
  static sharedPopulate(container) {
    if (container.remainingNodeInfos === void 0) {
      return;
    }
    const remainingNodeInfos = container.remainingNodeInfos;
    const count = remainingNodeInfos.length;
    for (let index = 0; index < count; ++index) {
      const nodeInfo = remainingNodeInfos[index];
      const ancestor = nodeInfo.ancestor;
      const focusNode = nodeInfo.focusNode;
      let child = container.findChild(ancestor);
      if (child) {
        const totalAccountedFor = nodeInfo.totalAccountedFor;
        child.self += focusNode.self;
        if (!totalAccountedFor) {
          child.total += focusNode.total;
        }
      } else {
        child = new _BottomUpProfileDataGridNode(ancestor, container.tree);
        if (ancestor !== focusNode) {
          child.self = focusNode.self;
          child.total = focusNode.total;
        }
        container.appendChild(child);
      }
      const parent = ancestor.parent;
      if (parent?.parent) {
        nodeInfo.ancestor = parent;
        if (!child.remainingNodeInfos) {
          child.remainingNodeInfos = [];
        }
        child.remainingNodeInfos.push(nodeInfo);
      }
    }
    delete container.remainingNodeInfos;
  }
  takePropertiesFromProfileDataGridNode(profileDataGridNode) {
    this.save();
    this.self = profileDataGridNode.self;
    this.total = profileDataGridNode.total;
  }
  /**
   * When focusing, we keep just the members of the callstack.
   */
  keepOnlyChild(child) {
    this.save();
    this.removeChildren();
    this.appendChild(child);
  }
  exclude(aCallUID) {
    if (this.remainingNodeInfos) {
      this.populate();
    }
    this.save();
    const children = this.children;
    let index = this.children.length;
    while (index--) {
      children[index].exclude(aCallUID);
    }
    const child = this.childrenByCallUID.get(aCallUID);
    if (child) {
      this.merge(child, true);
    }
  }
  restore() {
    super.restore();
    if (!this.children.length) {
      this.setHasChildren(this.willHaveChildren(this.profileNode));
    }
  }
  merge(child, shouldAbsorb) {
    this.self -= child.self;
    super.merge(child, shouldAbsorb);
  }
  populateChildren() {
    _BottomUpProfileDataGridNode.sharedPopulate(this);
  }
  willHaveChildren(profileNode) {
    return Boolean(profileNode.parent?.parent);
  }
};
var BottomUpProfileDataGridTree = class extends ProfileDataGridTree {
  deepSearch;
  remainingNodeInfos;
  constructor(formatter, searchableView, rootProfileNode, total) {
    super(formatter, searchableView, total);
    this.deepSearch = false;
    let profileNodeUIDs = 0;
    const profileNodeGroups = [[], [rootProfileNode]];
    const visitedProfileNodesForCallUID = /* @__PURE__ */ new Map();
    this.remainingNodeInfos = [];
    for (let profileNodeGroupIndex = 0; profileNodeGroupIndex < profileNodeGroups.length; ++profileNodeGroupIndex) {
      const parentProfileNodes = profileNodeGroups[profileNodeGroupIndex];
      const profileNodes = profileNodeGroups[++profileNodeGroupIndex];
      const count = profileNodes.length;
      const profileNodeUIDValues = /* @__PURE__ */ new WeakMap();
      for (let index = 0; index < count; ++index) {
        const profileNode = profileNodes[index];
        if (!profileNodeUIDValues.get(profileNode)) {
          profileNodeUIDValues.set(profileNode, ++profileNodeUIDs);
        }
        if (profileNode.parent) {
          let visitedNodes = visitedProfileNodesForCallUID.get(profileNode.callUID);
          let totalAccountedFor = false;
          if (!visitedNodes) {
            visitedNodes = /* @__PURE__ */ new Set();
            visitedProfileNodesForCallUID.set(profileNode.callUID, visitedNodes);
          } else {
            const parentCount = parentProfileNodes.length;
            for (let parentIndex = 0; parentIndex < parentCount; ++parentIndex) {
              const parentUID = profileNodeUIDValues.get(parentProfileNodes[parentIndex]);
              if (parentUID && visitedNodes.has(parentUID)) {
                totalAccountedFor = true;
                break;
              }
            }
          }
          const uid = profileNodeUIDValues.get(profileNode);
          if (uid) {
            visitedNodes.add(uid);
          }
          this.remainingNodeInfos.push({ ancestor: profileNode, focusNode: profileNode, totalAccountedFor });
        }
        const children = profileNode.children;
        if (children.length) {
          profileNodeGroups.push(parentProfileNodes.concat([profileNode]));
          profileNodeGroups.push(children);
        }
      }
    }
    ProfileDataGridNode.populate(this);
    return this;
  }
  /**
   * When focusing, we keep the entire callstack up to this ancestor.
   */
  focus(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }
    this.save();
    let currentNode = profileDataGridNode;
    let focusNode = profileDataGridNode;
    while (currentNode.parent && currentNode instanceof BottomUpProfileDataGridNode) {
      currentNode.takePropertiesFromProfileDataGridNode(profileDataGridNode);
      focusNode = currentNode;
      currentNode = currentNode.parent;
      if (currentNode instanceof BottomUpProfileDataGridNode) {
        currentNode.keepOnlyChild(focusNode);
      }
    }
    this.children = [focusNode];
    this.total = profileDataGridNode.total;
  }
  exclude(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }
    this.save();
    const excludedCallUID = profileDataGridNode.callUID;
    const excludedTopLevelChild = this.childrenByCallUID.get(excludedCallUID);
    if (excludedTopLevelChild) {
      Platform2.ArrayUtilities.removeElement(this.children, excludedTopLevelChild);
    }
    const children = this.children;
    const count = children.length;
    for (let index = 0; index < count; ++index) {
      children[index].exclude(excludedCallUID);
    }
    if (this.lastComparator) {
      this.sort(this.lastComparator, true);
    }
  }
  populateChildren() {
    BottomUpProfileDataGridNode.sharedPopulate(this);
  }
};

// gen/front_end/panels/profiler/ChildrenProvider.js
var ChildrenProvider_exports = {};

// gen/front_end/panels/profiler/HeapProfilerPanel.js
var HeapProfilerPanel_exports = {};
__export(HeapProfilerPanel_exports, {
  HeapProfilerPanel: () => HeapProfilerPanel
});
import * as Host3 from "./../../core/host/host.js";
import * as i18n29 from "./../../core/i18n/i18n.js";
import * as UI15 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/ProfilesPanel.js
var ProfilesPanel_exports = {};
__export(ProfilesPanel_exports, {
  ActionDelegate: () => ActionDelegate,
  ProfileGroup: () => ProfileGroup,
  ProfileGroupSidebarTreeElement: () => ProfileGroupSidebarTreeElement,
  ProfileTypeSidebarSection: () => ProfileTypeSidebarSection,
  ProfilesPanel: () => ProfilesPanel,
  ProfilesSidebarTreeElement: () => ProfilesSidebarTreeElement
});
import "./../../ui/legacy/legacy.js";
import * as Common4 from "./../../core/common/common.js";
import * as i18n9 from "./../../core/i18n/i18n.js";
import * as SDK2 from "./../../core/sdk/sdk.js";
import * as IconButton2 from "./../../ui/components/icon_button/icon_button.js";

// gen/front_end/ui/legacy/components/object_ui/objectValue.css.js
var objectValue_css_default = `/*
 * Copyright 2015 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.value.object-value-node:hover {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.object-value-function-prefix,
.object-value-boolean {
  color: var(--sys-color-token-attribute-value);
}

.object-value-function {
  font-style: italic;
}

.object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(0 0 0 / 10%);

  background-color: var(--override-linkified-hover-background);
  cursor: pointer;
}

.theme-with-dark-background .object-value-function.linkified:hover,
:host-context(.theme-with-dark-background) .object-value-function.linkified:hover {
  --override-linkified-hover-background: rgb(230 230 230 / 10%);
}

.object-value-number {
  color: var(--sys-color-token-attribute-value);
}

.object-value-bigint {
  color: var(--sys-color-token-comment);
}

.object-value-string,
.object-value-regexp,
.object-value-symbol {
  white-space: pre;
  unicode-bidi: -webkit-isolate;
  color: var(--sys-color-token-property-special);
}

.object-value-node {
  position: relative;
  vertical-align: baseline;
  color: var(--sys-color-token-variable);
  white-space: nowrap;
}

.object-value-null,
.object-value-undefined {
  color: var(--sys-color-state-disabled);
}

.object-value-unavailable {
  color: var(--sys-color-token-tag);
}

.object-value-calculate-value-button:hover {
  text-decoration: underline;
}

.object-properties-section-custom-section {
  display: inline-flex;
  flex-direction: column;
}

.theme-with-dark-background .object-value-number,
:host-context(.theme-with-dark-background) .object-value-number,
.theme-with-dark-background .object-value-boolean,
:host-context(.theme-with-dark-background) .object-value-boolean {
  --override-primitive-dark-mode-color: hsl(252deg 100% 75%);

  color: var(--override-primitive-dark-mode-color);
}

.object-properties-section .object-description {
  color: var(--sys-color-token-subtle);
}

.value .object-properties-preview {
  white-space: nowrap;
}

.name {
  color: var(--sys-color-token-tag);
  flex-shrink: 0;
}

.object-properties-preview .name {
  color: var(--sys-color-token-subtle);
}

@media (forced-colors: active) {
  .object-value-calculate-value-button:hover {
    forced-color-adjust: none;
    color: Highlight;
  }
}

/*# sourceURL=${import.meta.resolve("./objectValue.css")} */`;

// gen/front_end/panels/profiler/ProfilesPanel.js
import * as UI5 from "./../../ui/legacy/legacy.js";
import * as VisualLogging2 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/profiler/heapProfiler.css.js
var heapProfiler_css_default = `/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 * Copyright (C) 2010 Apple Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

.heap-snapshot-view {
  overflow: hidden;
}

.heap-snapshot-view .data-grid {
  border: none;
  flex: auto;

  .data-container {
    overflow-x: scroll;
  }

  .corner {
    width: 100%;
  }
}

.heap-snapshot-view .data-grid tr:empty {
  height: 16px;
  visibility: hidden;
}

.heap-snapshot-view .data-grid span.percent-column {
  width: 35px !important; /* stylelint-disable-line declaration-no-important */
}

.heap-snapshot-view .object-value-object,
.object-value-node {
  display: inline;
  position: static;
}

.heap-snapshot-view .object-value-string {
  white-space: nowrap;
}

.heap-snapshot-view td.object-column .objects-count {
  margin-left: 10px;
  font-size: 11px;
  color: var(--sys-color-token-subtle);
}

.heap-snapshot-view tr:not(.selected) .object-value-id {
  color: var(--sys-color-token-subtle);
}

.profile-view .heap-tracking-overview {
  flex: 0 0 80px;
  height: 80px;
}

.heap-snapshot-view .retaining-paths-view {
  overflow: hidden;
}

.heap-snapshot-view .heap-snapshot-view-resizer {
  background-color: var(--sys-color-surface1);
  display: flex;
  flex: 0 0 21px;
}

.heap-snapshot-view td.object-column > div > span {
  margin-right: 6px;
}

.heap-snapshot-view .heap-snapshot-view-resizer .title {
  flex: 0 1 auto;
  overflow: hidden;
  white-space: nowrap;
}

.heap-snapshot-view .heap-snapshot-view-resizer .verticalResizerIcon {
  /* stylelint-disable-next-line custom-property-pattern */
  background-image: var(--image-file-toolbarResizerVertical);
  background-repeat: no-repeat;
  background-position: center;
  flex: 0 0 28px;
  margin-left: auto;
}

.heap-snapshot-view .heap-snapshot-view-resizer .title > span {
  display: inline-block;
  padding-top: 3px;
  vertical-align: middle;
  margin-left: 4px;
  margin-right: 8px;
}

.heap-snapshot-view .heap-snapshot-view-resizer * {
  pointer-events: none;
}

.heap-snapshot-view tr:not(.selected) td.object-column span.highlight {
  background-color: inherit;
}

.heap-snapshot-view td.object-column span.heap-object-source-link {
  float: right;

  & > button.text-button.devtools-link {
    background-color: inherit;
    outline-offset: calc(-1 * var(--sys-size-1));
    padding-inline: var(--sys-size-2) !important;  /* stylelint-disable-line declaration-no-important */
  }
}

.heap-snapshot-view td.object-column span.heap-object-source-link:empty {
  animation: fadeInOut 2s infinite;
}

.heap-snapshot-view td.object-column span.heap-object-source-link:empty::before {
  content: "\\b7\\b7";
  font-weight: bold;
}

@keyframes fadeInOut {
  0% {
    transform: rotate(0);
  }

  50% {
    transform: rotate(0.5turn);
  }

  100% {
    transform: rotate(1turn);
  }
}

.heap-object-tag {
  height: 14px;
  width: 14px;
}

.heap-snapshot-view tr:not(.selected) td.object-column span.heap-object-tag,
.heap-snapshot-view tr:not(.selected) td.object-column span.grayed {
  color: var(--sys-color-token-subtle);
}

.heap-snapshot-view tr:not(.selected) .cycled-ancestor-node,
.heap-snapshot-view tr:not(.selected) .unreachable-ancestor-node {
  opacity: 60%;
}

#heap-recording-view .profile-view {
  top: 80px;
}

.heap-overview-container {
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 100%;
  height: 80px;
}

#heap-recording-overview-grid .resources-dividers-label-bar {
  pointer-events: auto;
}

.heap-recording-overview-canvas {
  position: absolute;
  inset: 20px 0 0;
}

.heap-snapshot-statistics-view {
  overflow: auto;
}

.heap-snapshot-stats-pie-chart {
  margin: 12px 30px;
  flex-shrink: 0;
}

.heap-allocation-stack .stack-frame {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid var(--sys-color-divider);
  padding: 2px;
}

.heap-allocation-stack .stack-frame:focus {
  background-color: var(--sys-color-tonal-container);
  color: var(--sys-color-on-tonal-container);
}

.heap-allocation-stack .stack-frame:hover:not(:focus) {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.heap-allocation-stack .stack-frame .devtools-link {
  color: var(--sys-color-primary);
}

.no-heap-allocation-stack {
  padding: 5px;
}

@media (forced-colors: active) {
  .cycled-ancestor-node {
    opacity: 100%;
  }

  .heap-snapshot-view td.object-column .objects-count,
  .heap-snapshot-view tr:not(.selected) td.object-column span.heap-object-tag,
  .heap-snapshot-view tr:not(.selected) .object-value-id {
    color: ButtonText;
  }
}

.detached-elements-view {
  overflow: auto;
}

/*# sourceURL=${import.meta.resolve("./heapProfiler.css")} */`;

// gen/front_end/panels/profiler/ProfileHeader.js
var ProfileHeader_exports = {};
__export(ProfileHeader_exports, {
  ProfileHeader: () => ProfileHeader,
  ProfileType: () => ProfileType,
  StatusUpdate: () => StatusUpdate
});
import * as Common from "./../../core/common/common.js";
var ProfileHeader = class extends Common.ObjectWrapper.ObjectWrapper {
  #profileType;
  title;
  uid;
  #fromFile;
  tempFile;
  constructor(profileType, title) {
    super();
    this.#profileType = profileType;
    this.title = title;
    this.uid = profileType.incrementProfileUid();
    this.#fromFile = false;
    this.tempFile = null;
  }
  setTitle(title) {
    this.title = title;
    this.dispatchEventToListeners("ProfileTitleChanged", this);
  }
  profileType() {
    return this.#profileType;
  }
  updateStatus(subtitle, wait) {
    this.dispatchEventToListeners("UpdateStatus", new StatusUpdate(subtitle, wait));
  }
  /**
   * Must be implemented by subclasses.
   */
  createSidebarTreeElement(_dataDisplayDelegate) {
    throw new Error("Not implemented.");
  }
  createView(_dataDisplayDelegate) {
    throw new Error("Not implemented.");
  }
  removeTempFile() {
    if (this.tempFile) {
      this.tempFile.remove();
    }
  }
  dispose() {
  }
  canSaveToFile() {
    return false;
  }
  saveToFile() {
    throw new Error("Not implemented.");
  }
  loadFromFile(_file) {
    throw new Error("Not implemented.");
  }
  fromFile() {
    return this.#fromFile;
  }
  setFromFile() {
    this.#fromFile = true;
  }
  setProfile(_profile) {
  }
};
var StatusUpdate = class {
  subtitle;
  wait;
  constructor(subtitle, wait) {
    this.subtitle = subtitle;
    this.wait = wait;
  }
};
var ProfileType = class extends Common.ObjectWrapper.ObjectWrapper {
  #id;
  #name;
  profiles;
  #profileBeingRecorded;
  #nextProfileUid;
  constructor(id, name) {
    super();
    this.#id = id;
    this.#name = name;
    this.profiles = [];
    this.#profileBeingRecorded = null;
    this.#nextProfileUid = 1;
    if (!window.opener) {
      window.addEventListener("pagehide", this.clearTempStorage.bind(this), false);
    }
  }
  typeName() {
    return "";
  }
  nextProfileUid() {
    return this.#nextProfileUid;
  }
  incrementProfileUid() {
    return this.#nextProfileUid++;
  }
  hasTemporaryView() {
    return false;
  }
  fileExtension() {
    return null;
  }
  get buttonTooltip() {
    return "";
  }
  get id() {
    return this.#id;
  }
  get treeItemTitle() {
    return this.#name;
  }
  get name() {
    return this.#name;
  }
  buttonClicked() {
    return false;
  }
  get description() {
    return "";
  }
  isInstantProfile() {
    return false;
  }
  isEnabled() {
    return true;
  }
  getProfiles() {
    function isFinished(profile) {
      return this.#profileBeingRecorded !== profile;
    }
    return this.profiles.filter(isFinished.bind(this));
  }
  customContent() {
    return null;
  }
  setCustomContentEnabled(_enable) {
  }
  loadFromFile(file) {
    let name = file.name;
    const fileExtension = this.fileExtension();
    if (fileExtension && name.endsWith(fileExtension)) {
      name = name.substr(0, name.length - fileExtension.length);
    }
    const profile = this.createProfileLoadedFromFile(name);
    profile.setFromFile();
    this.setProfileBeingRecorded(profile);
    this.addProfile(profile);
    return profile.loadFromFile(file);
  }
  createProfileLoadedFromFile(_title) {
    throw new Error("Not implemented");
  }
  addProfile(profile) {
    this.profiles.push(profile);
    this.dispatchEventToListeners("add-profile-header", profile);
  }
  removeProfile(profile) {
    const index = this.profiles.indexOf(profile);
    if (index === -1) {
      return;
    }
    this.profiles.splice(index, 1);
    this.disposeProfile(profile);
  }
  clearTempStorage() {
    for (let i = 0; i < this.profiles.length; ++i) {
      this.profiles[i].removeTempFile();
    }
  }
  profileBeingRecorded() {
    return this.#profileBeingRecorded;
  }
  setProfileBeingRecorded(profile) {
    this.#profileBeingRecorded = profile;
  }
  profileBeingRecordedRemoved() {
  }
  reset() {
    for (const profile of this.profiles.slice()) {
      this.disposeProfile(profile);
    }
    this.profiles = [];
    this.#nextProfileUid = 1;
  }
  disposeProfile(profile) {
    this.dispatchEventToListeners("remove-profile-header", profile);
    profile.dispose();
    if (this.#profileBeingRecorded === profile) {
      this.profileBeingRecordedRemoved();
      this.setProfileBeingRecorded(null);
    }
  }
};

// gen/front_end/panels/profiler/ProfileLauncherView.js
var ProfileLauncherView_exports = {};
__export(ProfileLauncherView_exports, {
  ProfileLauncherView: () => ProfileLauncherView
});
import * as Common3 from "./../../core/common/common.js";
import * as i18n5 from "./../../core/i18n/i18n.js";
import * as Buttons from "./../../ui/components/buttons/buttons.js";
import * as UI3 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/IsolateSelector.js
var IsolateSelector_exports = {};
__export(IsolateSelector_exports, {
  IsolateSelector: () => IsolateSelector,
  ListItem: () => ListItem
});
import * as Common2 from "./../../core/common/common.js";
import * as i18n3 from "./../../core/i18n/i18n.js";
import * as SDK from "./../../core/sdk/sdk.js";
import * as UI2 from "./../../ui/legacy/legacy.js";
var UIStrings2 = {
  /**
   * @description aria label for javascript VM instances target list in heap profiler
   */
  javascriptVmInstances: "JavaScript VM instances",
  /**
   * @description Text in Isolate Selector of a profiler tool
   */
  totalJsHeapSize: "Total JS heap size",
  /**
   * @description Total trend div title in Isolate Selector of a profiler tool
   * @example {3} PH1
   */
  totalPageJsHeapSizeChangeTrend: "Total page JS heap size change trend over the last {PH1} minutes.",
  /**
   * @description Total value div title in Isolate Selector of a profiler tool
   */
  totalPageJsHeapSizeAcrossAllVm: "Total page JS heap size across all VM instances.",
  /**
   * @description Heap size change trend measured in kB/s
   * @example {2 kB} PH1
   */
  changeRate: "{PH1}/s",
  /**
   * @description Text for isolate selector list items with positive change rate
   * @example {1.0 kB} PH1
   */
  increasingBySPerSecond: "increasing by {PH1} per second",
  /**
   * @description Text for isolate selector list items with negative change rate
   * @example {1.0 kB} PH1
   */
  decreasingBySPerSecond: "decreasing by {PH1} per second",
  /**
   * @description Heap div title in Isolate Selector of a profiler tool
   */
  heapSizeInUseByLiveJsObjects: "Heap size in use by live JS objects.",
  /**
   * @description Trend div title in Isolate Selector of a profiler tool
   * @example {3} PH1
   */
  heapSizeChangeTrendOverTheLastS: "Heap size change trend over the last {PH1} minutes.",
  /**
   * @description Text to show an item is empty
   */
  empty: "(empty)"
};
var str_2 = i18n3.i18n.registerUIStrings("panels/profiler/IsolateSelector.ts", UIStrings2);
var i18nString2 = i18n3.i18n.getLocalizedString.bind(void 0, str_2);
var IsolateSelector = class _IsolateSelector extends UI2.Widget.VBox {
  items;
  list;
  itemByIsolate;
  totalElement;
  totalValueDiv;
  totalTrendDiv;
  constructor() {
    super();
    this.items = new UI2.ListModel.ListModel();
    this.list = new UI2.ListControl.ListControl(this.items, this, UI2.ListControl.ListMode.NonViewport);
    this.list.element.classList.add("javascript-vm-instances-list");
    UI2.ARIAUtils.setLabel(this.list.element, i18nString2(UIStrings2.javascriptVmInstances));
    this.contentElement.appendChild(this.list.element);
    this.itemByIsolate = /* @__PURE__ */ new Map();
    this.totalElement = document.createElement("div");
    this.totalElement.classList.add("profile-memory-usage-item");
    this.totalElement.classList.add("hbox");
    this.totalValueDiv = this.totalElement.createChild("div", "profile-memory-usage-item-size");
    this.totalTrendDiv = this.totalElement.createChild("div", "profile-memory-usage-item-trend");
    this.totalElement.createChild("div").textContent = i18nString2(UIStrings2.totalJsHeapSize);
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 6e4);
    UI2.Tooltip.Tooltip.install(this.totalTrendDiv, i18nString2(UIStrings2.totalPageJsHeapSizeChangeTrend, { PH1: trendIntervalMinutes }));
    UI2.Tooltip.Tooltip.install(this.totalValueDiv, i18nString2(UIStrings2.totalPageJsHeapSizeAcrossAllVm));
    SDK.IsolateManager.IsolateManager.instance().observeIsolates(this);
    SDK.TargetManager.TargetManager.instance().addEventListener("NameChanged", this.targetChanged, this);
    SDK.TargetManager.TargetManager.instance().addEventListener("InspectedURLChanged", this.targetChanged, this);
  }
  wasShown() {
    super.wasShown();
    SDK.IsolateManager.IsolateManager.instance().addEventListener("MemoryChanged", this.heapStatsChanged, this);
  }
  willHide() {
    super.willHide();
    SDK.IsolateManager.IsolateManager.instance().removeEventListener("MemoryChanged", this.heapStatsChanged, this);
  }
  isolateAdded(isolate) {
    this.list.element.tabIndex = 0;
    const item = new ListItem(isolate);
    const index = item.model().target() === SDK.TargetManager.TargetManager.instance().primaryPageTarget() ? 0 : this.items.length;
    this.items.insert(index, item);
    this.itemByIsolate.set(isolate, item);
    if (index === 0) {
      this.list.selectItem(item);
    }
    this.update();
  }
  isolateChanged(isolate) {
    const item = this.itemByIsolate.get(isolate);
    if (item) {
      item.updateTitle();
    }
    this.update();
  }
  isolateRemoved(isolate) {
    const item = this.itemByIsolate.get(isolate);
    if (item) {
      this.items.remove(this.items.indexOf(item));
    }
    this.itemByIsolate.delete(isolate);
    if (this.items.length === 0) {
      this.list.element.tabIndex = -1;
    }
    this.update();
  }
  targetChanged(event) {
    const target = event.data;
    const model = target.model(SDK.RuntimeModel.RuntimeModel);
    if (!model) {
      return;
    }
    const isolate = SDK.IsolateManager.IsolateManager.instance().isolateByModel(model);
    const item = isolate && this.itemByIsolate.get(isolate);
    if (item) {
      item.updateTitle();
    }
  }
  heapStatsChanged(event) {
    const isolate = event.data;
    const listItem = this.itemByIsolate.get(isolate);
    if (listItem) {
      listItem.updateStats();
    }
    this.updateTotal();
  }
  updateTotal() {
    let total = 0;
    let trend = 0;
    for (const isolate of SDK.IsolateManager.IsolateManager.instance().isolates()) {
      total += isolate.usedHeapSize();
      trend += isolate.usedHeapSizeGrowRate();
    }
    this.totalValueDiv.textContent = i18n3.ByteUtilities.bytesToString(total);
    _IsolateSelector.formatTrendElement(trend, this.totalTrendDiv);
  }
  static formatTrendElement(trendValueMs, element) {
    const changeRateBytesPerSecond = trendValueMs * 1e3;
    const changeRateThresholdBytesPerSecond = 1e3;
    if (Math.abs(changeRateBytesPerSecond) < changeRateThresholdBytesPerSecond) {
      return;
    }
    const changeRateText = i18n3.ByteUtilities.bytesToString(Math.abs(changeRateBytesPerSecond));
    let changeText, changeLabel;
    if (changeRateBytesPerSecond > 0) {
      changeText = "\u2B06" + i18nString2(UIStrings2.changeRate, { PH1: changeRateText });
      element.classList.toggle("increasing", true);
      changeLabel = i18nString2(UIStrings2.increasingBySPerSecond, { PH1: changeRateText });
    } else {
      changeText = "\u2B07" + i18nString2(UIStrings2.changeRate, { PH1: changeRateText });
      element.classList.toggle("increasing", false);
      changeLabel = i18nString2(UIStrings2.decreasingBySPerSecond, { PH1: changeRateText });
    }
    element.textContent = changeText;
    UI2.ARIAUtils.setLabel(element, changeLabel);
  }
  totalMemoryElement() {
    return this.totalElement;
  }
  createElementForItem(item) {
    return item.element;
  }
  heightForItem(_item) {
    console.assert(false, "should not be called");
    return 0;
  }
  updateSelectedItemARIA(_fromElement, _toElement) {
    return false;
  }
  isItemSelectable(_item) {
    return true;
  }
  selectedItemChanged(_from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.classList.remove("selected");
    }
    if (toElement) {
      toElement.classList.add("selected");
    }
    const model = to?.model();
    UI2.Context.Context.instance().setFlavor(SDK.HeapProfilerModel.HeapProfilerModel, model?.heapProfilerModel() ?? null);
    UI2.Context.Context.instance().setFlavor(SDK.CPUProfilerModel.CPUProfilerModel, model?.target().model(SDK.CPUProfilerModel.CPUProfilerModel) ?? null);
  }
  update() {
    this.updateTotal();
    this.list.invalidateRange(0, this.items.length);
  }
};
var ListItem = class {
  isolate;
  element;
  heapDiv;
  trendDiv;
  nameDiv;
  constructor(isolate) {
    this.isolate = isolate;
    const trendIntervalMinutes = Math.round(SDK.IsolateManager.MemoryTrendWindowMs / 6e4);
    this.element = document.createElement("div");
    this.element.classList.add("profile-memory-usage-item");
    this.element.classList.add("hbox");
    UI2.ARIAUtils.markAsOption(this.element);
    this.heapDiv = this.element.createChild("div", "profile-memory-usage-item-size");
    UI2.Tooltip.Tooltip.install(this.heapDiv, i18nString2(UIStrings2.heapSizeInUseByLiveJsObjects));
    this.trendDiv = this.element.createChild("div", "profile-memory-usage-item-trend");
    UI2.Tooltip.Tooltip.install(this.trendDiv, i18nString2(UIStrings2.heapSizeChangeTrendOverTheLastS, { PH1: trendIntervalMinutes }));
    this.nameDiv = this.element.createChild("div", "profile-memory-usage-item-name");
    this.updateTitle();
  }
  model() {
    return this.isolate.runtimeModel();
  }
  updateStats() {
    this.heapDiv.textContent = i18n3.ByteUtilities.bytesToString(this.isolate.usedHeapSize());
    IsolateSelector.formatTrendElement(this.isolate.usedHeapSizeGrowRate(), this.trendDiv);
  }
  updateTitle() {
    const modelCountByName = /* @__PURE__ */ new Map();
    const targetManager = SDK.TargetManager.TargetManager.instance();
    for (const model of this.isolate.models()) {
      const target = model.target();
      const isPrimaryPageTarget = targetManager.primaryPageTarget() === target;
      const name = target.name();
      const parsedURL = new Common2.ParsedURL.ParsedURL(target.inspectedURL());
      const domain = parsedURL.isValid ? parsedURL.domain() : "";
      const title = target.decorateLabel(domain && !isPrimaryPageTarget ? `${domain}: ${name}` : name || domain || i18nString2(UIStrings2.empty));
      modelCountByName.set(title, (modelCountByName.get(title) || 0) + 1);
    }
    this.nameDiv.removeChildren();
    const titles = [];
    for (const [name, count] of modelCountByName) {
      const title = count > 1 ? `${name} (${count})` : name;
      titles.push(title);
      const titleDiv = this.nameDiv.createChild("div");
      titleDiv.textContent = title;
      UI2.Tooltip.Tooltip.install(titleDiv, String(title));
    }
  }
};

// gen/front_end/panels/profiler/profileLauncherView.css.js
var profileLauncherView_css_default = `/*
 * Copyright 2018 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.profile-launcher-view {
  overflow: auto;
}

.profile-launcher-view-content {
  margin: 10px 16px;
  flex: auto 1 0;

  & h1 {
    font: var(--sys-typescale-headline4);
    margin: 6px 0 10px;
  }

  & label {
    font: var(--sys-typescale-body3-regular);
  }

  & p {
    color: var(--sys-color-token-subtle);
    margin-top: var(--sys-size-1);
    margin-left: var(--sys-size-10);

    & > devtools-checkbox {
      display: flex;
    }
  }

  .profile-launcher-view-content button.text-button.running,
  .profile-launcher-view-content button.text-button.running:focus {
    color: var(--sys-color-error);
  }

  & > div {
    flex: auto 0 0;
  }

  & > .profile-isolate-selector-block {
    flex: auto 1 0;
    overflow: hidden;
  }
}

.profile-launcher-target-list {
  margin-bottom: 6px;
  border: 1px solid var(--sys-color-divider);
  flex: 150px 1 0;
}

.profile-launcher-target-list-container {
  overflow: auto;
}

.profile-memory-usage-item {
  min-width: 100%;
  width: max-content;
  padding: 4px;
  line-height: 16px;
}

.profile-isolate-selector-block > .profile-memory-usage-item {
  margin-left: 1px;
  margin-bottom: 4px;
  font-weight: bolder;
}

.profile-memory-usage-item.selected {
  background-color: var(--sys-color-neutral-container);
}

.profile-memory-usage-item:focus {
  background-color: var(--sys-color-tonal-container);
}

.profile-launcher-target-list .profile-memory-usage-item:hover:not(.selected) {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.javascript-vm-instances-list {
  width: max-content;
  min-width: 100%;
}

.javascript-vm-instances-list:focus .profile-memory-usage-item.selected {
  background-color: var(--sys-color-tonal-container);
}

.profile-memory-usage-item > div {
  flex-shrink: 0;
  margin-right: 12px;
}

.profile-memory-usage-item-size {
  width: 60px;
  text-align: right;
}

.profile-memory-usage-item-trend {
  min-width: 5em;
  color: var(--sys-color-tertiary);
}

.profile-memory-usage-item-trend.increasing {
  color: var(--sys-color-error);
}

.profile-launcher-buttons {
  flex-wrap: wrap;
  column-gap: 8px;
}

@media (forced-colors: active) {
  .profile-memory-usage-item {
    forced-color-adjust: none;
    border-left-color: transparent;
  }

  .profile-memory-usage-item-trend,
  .profile-memory-usage-item-trend.increasing,
  .profile-launcher-view-content button.running {
    color: ButtonText;
  }

  .javascript-vm-instances-list .profile-memory-usage-item:hover:not(.selected) {
    background-color: Highlight;
    color: HighlightText;
  }

  .javascript-vm-instances-list .profile-memory-usage-item.selected .profile-memory-usage-item-trend,
  .javascript-vm-instances-list .profile-memory-usage-item.selected .profile-memory-usage-item-trend.increasing {
    color: ButtonFace;
  }

  .javascript-vm-instances-list .profile-memory-usage-item:hover:not(.selected) .profile-memory-usage-item-trend,
  .javascript-vm-instances-list .profile-memory-usage-item:hover:not(.selected) .profile-memory-usage-item-trend.increasing {
    background-color: Highlight;
    color: HighlightText;
  }

  .javascript-vm-instances-list .profile-memory-usage-item.selected {
    background-color: ButtonText;
    border-color: Highlight;
    color: ButtonFace;
  }

  .javascript-vm-instances-list:focus .profile-memory-usage-item.selected,
  .javascript-vm-instances-list:focus-visible .profile-memory-usage-item.selected {
    background-color: Highlight;
    border-color: ButtonText;
    color: HighlightText;
  }
}

/*# sourceURL=${import.meta.resolve("./profileLauncherView.css")} */`;

// gen/front_end/panels/profiler/ProfileLauncherView.js
var UIStrings3 = {
  /**
   * @description Text in Profile Launcher View of a profiler tool
   */
  selectJavascriptVmInstance: "Select JavaScript VM instance",
  /**
   * @description Text to load something
   */
  load: "Load profile",
  /**
   * @description Control button text content in Profile Launcher View of a profiler tool
   */
  takeSnapshot: "Take snapshot",
  /**
   * @description Text of an item that stops the running task
   */
  stop: "Stop",
  /**
   * @description Control button text content in Profile Launcher View of a profiler tool
   */
  start: "Start",
  /**
   * @description Profile type header element text content in Profile Launcher View of a profiler tool
   */
  selectProfilingType: "Select profiling type"
};
var str_3 = i18n5.i18n.registerUIStrings("panels/profiler/ProfileLauncherView.ts", UIStrings3);
var i18nString3 = i18n5.i18n.getLocalizedString.bind(void 0, str_3);
var ProfileLauncherView = class extends Common3.ObjectWrapper.eventMixin(UI3.Widget.VBox) {
  panel;
  #contentElement;
  selectedProfileTypeSetting;
  profileTypeHeaderElement;
  profileTypeSelectorForm;
  controlButton;
  loadButton;
  recordButtonEnabled;
  typeIdToOptionElementAndProfileType;
  isProfiling;
  isInstantProfile;
  isEnabled;
  constructor(profilesPanel) {
    super();
    this.registerRequiredCSS(profileLauncherView_css_default);
    this.panel = profilesPanel;
    this.element.classList.add("profile-launcher-view");
    this.#contentElement = this.element.createChild("div", "profile-launcher-view-content vbox");
    const profileTypeSelectorElement = this.#contentElement.createChild("div", "vbox");
    this.selectedProfileTypeSetting = Common3.Settings.Settings.instance().createSetting("selected-profile-type", "CPU");
    this.profileTypeHeaderElement = profileTypeSelectorElement.createChild("h1");
    this.profileTypeSelectorForm = profileTypeSelectorElement.createChild("form");
    UI3.ARIAUtils.markAsRadioGroup(this.profileTypeSelectorForm);
    const isolateSelectorElement = this.#contentElement.createChild("div", "vbox profile-isolate-selector-block");
    isolateSelectorElement.createChild("h1").textContent = i18nString3(UIStrings3.selectJavascriptVmInstance);
    const isolateSelector = new IsolateSelector();
    const isolateSelectorElementChild = isolateSelectorElement.createChild("div", "vbox profile-launcher-target-list");
    isolateSelectorElementChild.classList.add("profile-launcher-target-list-container");
    isolateSelector.show(isolateSelectorElementChild);
    isolateSelectorElement.appendChild(isolateSelector.totalMemoryElement());
    const buttonsDiv = this.#contentElement.createChild("div", "hbox profile-launcher-buttons");
    this.controlButton = UI3.UIUtils.createTextButton("", this.controlButtonClicked.bind(this), {
      jslogContext: "profiler.heap-toggle-recording",
      variant: "primary"
    });
    this.loadButton = new Buttons.Button.Button();
    this.loadButton.data = { iconName: "import", variant: "outlined", jslogContext: "profiler.load-from-file" };
    this.loadButton.textContent = i18nString3(UIStrings3.load);
    this.loadButton.addEventListener("click", this.loadButtonClicked.bind(this));
    buttonsDiv.appendChild(this.loadButton);
    buttonsDiv.appendChild(this.controlButton);
    this.recordButtonEnabled = true;
    this.typeIdToOptionElementAndProfileType = /* @__PURE__ */ new Map();
  }
  loadButtonClicked() {
    const loadFromFileAction = UI3.ActionRegistry.ActionRegistry.instance().getAction("profiler.load-from-file");
    void loadFromFileAction.execute();
  }
  updateControls() {
    if (this.isEnabled && this.recordButtonEnabled) {
      this.controlButton.removeAttribute("disabled");
    } else {
      this.controlButton.setAttribute("disabled", "");
    }
    UI3.Tooltip.Tooltip.install(this.controlButton, this.recordButtonEnabled ? "" : UI3.UIUtils.anotherProfilerActiveLabel());
    if (this.isInstantProfile) {
      this.controlButton.classList.remove("running");
      this.controlButton.textContent = i18nString3(UIStrings3.takeSnapshot);
    } else if (this.isProfiling) {
      this.controlButton.classList.add("running");
      this.controlButton.textContent = i18nString3(UIStrings3.stop);
    } else {
      this.controlButton.classList.remove("running");
      this.controlButton.textContent = i18nString3(UIStrings3.start);
    }
    for (const { optionElement } of this.typeIdToOptionElementAndProfileType.values()) {
      optionElement.disabled = Boolean(this.isProfiling);
    }
  }
  profileStarted() {
    this.isProfiling = true;
    this.updateControls();
  }
  profileFinished() {
    this.isProfiling = false;
    this.updateControls();
  }
  updateProfileType(profileType, recordButtonEnabled) {
    this.isInstantProfile = profileType.isInstantProfile();
    this.recordButtonEnabled = recordButtonEnabled;
    this.isEnabled = profileType.isEnabled();
    this.updateControls();
  }
  addProfileType(profileType) {
    const { radio, label } = UI3.UIUtils.createRadioButton("profile-type", profileType.name, "profiler.profile-type");
    this.profileTypeSelectorForm.appendChild(label);
    this.typeIdToOptionElementAndProfileType.set(profileType.id, { optionElement: radio, profileType });
    radio.addEventListener("change", this.profileTypeChanged.bind(this, profileType), false);
    const descriptionElement = this.profileTypeSelectorForm.createChild("p");
    descriptionElement.textContent = profileType.description;
    UI3.ARIAUtils.setDescription(radio, profileType.description);
    const customContent = profileType.customContent();
    if (customContent) {
      customContent.setAttribute("role", "group");
      customContent.setAttribute("aria-labelledby", `${radio.id}`);
      this.profileTypeSelectorForm.createChild("p").appendChild(customContent);
      profileType.setCustomContentEnabled(false);
    }
    const headerText = this.typeIdToOptionElementAndProfileType.size > 1 ? i18nString3(UIStrings3.selectProfilingType) : profileType.name;
    this.profileTypeHeaderElement.textContent = headerText;
    UI3.ARIAUtils.setLabel(this.profileTypeSelectorForm, headerText);
  }
  restoreSelectedProfileType() {
    let typeId = this.selectedProfileTypeSetting.get();
    if (!this.typeIdToOptionElementAndProfileType.has(typeId)) {
      typeId = this.typeIdToOptionElementAndProfileType.keys().next().value;
      this.selectedProfileTypeSetting.set(typeId);
    }
    const optionElementAndProfileType = this.typeIdToOptionElementAndProfileType.get(typeId);
    optionElementAndProfileType.optionElement.checked = true;
    const type = optionElementAndProfileType.profileType;
    for (const [id, { profileType }] of this.typeIdToOptionElementAndProfileType) {
      const enabled = id === typeId;
      profileType.setCustomContentEnabled(enabled);
    }
    this.dispatchEventToListeners("ProfileTypeSelected", type);
  }
  controlButtonClicked() {
    this.panel.toggleRecord();
  }
  profileTypeChanged(profileType) {
    const typeId = this.selectedProfileTypeSetting.get();
    const type = this.typeIdToOptionElementAndProfileType.get(typeId).profileType;
    type.setCustomContentEnabled(false);
    profileType.setCustomContentEnabled(true);
    this.dispatchEventToListeners("ProfileTypeSelected", profileType);
    this.isInstantProfile = profileType.isInstantProfile();
    this.isEnabled = profileType.isEnabled();
    this.updateControls();
    this.selectedProfileTypeSetting.set(profileType.id);
  }
};

// gen/front_end/panels/profiler/ProfileSidebarTreeElement.js
var ProfileSidebarTreeElement_exports = {};
__export(ProfileSidebarTreeElement_exports, {
  ProfileSidebarTreeElement: () => ProfileSidebarTreeElement
});
import * as i18n7 from "./../../core/i18n/i18n.js";
import * as Buttons2 from "./../../ui/components/buttons/buttons.js";
import * as UI4 from "./../../ui/legacy/legacy.js";
import * as VisualLogging from "./../../ui/visual_logging/visual_logging.js";
var UIStrings4 = {
  /**
   * @description Tooltip for the 3-dots menu in the Memory panel profiles list.
   */
  profileOptions: "Profile options"
};
var str_4 = i18n7.i18n.registerUIStrings("panels/profiler/ProfileSidebarTreeElement.ts", UIStrings4);
var i18nString4 = i18n7.i18n.getLocalizedString.bind(void 0, str_4);
var ProfileSidebarTreeElement = class extends UI4.TreeOutline.TreeElement {
  iconElement;
  titlesElement;
  menuElement;
  titleContainer;
  titleElement;
  subtitleElement;
  className;
  small;
  dataDisplayDelegate;
  profile;
  editing;
  constructor(dataDisplayDelegate, profile, className) {
    super("", false);
    this.iconElement = document.createElement("div");
    this.iconElement.classList.add("icon");
    this.titlesElement = document.createElement("div");
    this.titlesElement.classList.add("titles");
    this.titlesElement.classList.add("no-subtitle");
    this.titlesElement.setAttribute("jslog", `${VisualLogging.value("title").track({ dblclick: true, change: true })}`);
    this.titleContainer = this.titlesElement.createChild("span", "title-container");
    this.titleElement = this.titleContainer.createChild("span", "title");
    this.subtitleElement = this.titlesElement.createChild("span", "subtitle");
    this.menuElement = new Buttons2.Button.Button();
    this.menuElement.data = {
      variant: "icon",
      iconName: "dots-vertical",
      title: i18nString4(UIStrings4.profileOptions)
    };
    this.menuElement.tabIndex = -1;
    this.menuElement.addEventListener("click", this.handleContextMenuEvent.bind(this));
    this.menuElement.setAttribute("jslog", `${VisualLogging.dropDown("profile-options").track({ click: true })}`);
    UI4.Tooltip.Tooltip.install(this.menuElement, i18nString4(UIStrings4.profileOptions));
    this.titleElement.textContent = profile.title;
    this.className = className;
    this.small = false;
    this.dataDisplayDelegate = dataDisplayDelegate;
    this.profile = profile;
    profile.addEventListener("UpdateStatus", this.updateStatus, this);
    this.editing = null;
  }
  updateStatus(event) {
    const statusUpdate = event.data;
    if (statusUpdate.subtitle !== null) {
      this.subtitleElement.textContent = statusUpdate.subtitle.length > 0 ? `(${statusUpdate.subtitle})` : "";
      this.titlesElement.classList.toggle("no-subtitle", !statusUpdate.subtitle);
      UI4.ARIAUtils.setLabel(this.listItemElement, `${this.profile.title}, ${statusUpdate.subtitle}`);
    }
    if (typeof statusUpdate.wait === "boolean" && this.listItemElement) {
      this.iconElement.classList.toggle("spinner", statusUpdate.wait);
      this.listItemElement.classList.toggle("wait", statusUpdate.wait);
    }
  }
  ondblclick(event) {
    if (!this.editing) {
      this.startEditing(event.target);
    }
    return false;
  }
  startEditing(eventTarget) {
    const container = eventTarget.enclosingNodeOrSelfWithClass("title");
    if (!container) {
      return;
    }
    const config = new UI4.InplaceEditor.Config(this.editingCommitted.bind(this), this.editingCancelled.bind(this), void 0);
    this.editing = UI4.InplaceEditor.InplaceEditor.startEditing(container, config);
  }
  editingCommitted(_container, newTitle) {
    if (newTitle.trim().length === 0) {
      if (this.editing) {
        this.editing.cancel();
      }
    } else {
      this.editing = null;
      this.profile.setTitle(newTitle);
    }
  }
  editingCancelled() {
    this.editing = null;
  }
  dispose() {
    this.profile.removeEventListener("UpdateStatus", this.updateStatus, this);
  }
  onselect() {
    this.dataDisplayDelegate.showProfile(this.profile);
    return true;
  }
  ondelete() {
    this.profile.profileType().removeProfile(this.profile);
    return true;
  }
  onattach() {
    if (this.className) {
      this.listItemElement.classList.add(this.className);
    }
    if (this.small) {
      this.listItemElement.classList.add("small");
    }
    this.listItemElement.append(this.iconElement, this.titlesElement, this.menuElement);
    this.listItemElement.addEventListener("contextmenu", this.handleContextMenuEvent.bind(this), true);
    UI4.ARIAUtils.setDescription(this.listItemElement, this.profile.profileType().name);
  }
  handleContextMenuEvent(event) {
    const contextMenu = new UI4.ContextMenu.ContextMenu(event);
    contextMenu.appendItemsAtLocation("profilerMenu");
    void contextMenu.show();
  }
  setSmall(small) {
    this.small = small;
    if (this.listItemElement) {
      this.listItemElement.classList.toggle("small", this.small);
    }
  }
  setMainTitle(title) {
    this.titleElement.textContent = title;
  }
};

// gen/front_end/panels/profiler/profilesPanel.css.js
var profilesPanel_css_default = `/*
 * Copyright (C) 2006, 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2009 Anthony Ricaud <rik@webkit.org>
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/* Profiler Style */

#profile-views {
  flex: auto;
  position: relative;
}

.profile-view .data-grid table.data {
  background: var(--sys-color-cdt-base-container);
}

.profile-view .data-grid tr:not(.selected) .highlight {
  background-color: var(--sys-color-tonal-container);
}

.profile-view .data-grid tr:hover td:not(.bottom-filler-td) {
  background-color: var(--sys-color-state-hover-on-subtle);
}

.profile-view .data-grid td.numeric-column {
  text-align: right;
}

.profile-view .data-grid div.profile-multiple-values {
  float: right;
}

.profile-view .data-grid span.percent-column {
  color: var(--sys-color-token-subtle);
  width: 9ex;
  display: inline-block;
}

.profile-view .data-grid tr.selected span {
  color: inherit;
}

.profiles-toolbar {
  background-color: var(--sys-color-cdt-base-container);
  border-bottom: 1px solid var(--sys-color-divider);
  flex-shrink: 0;
}

.profiles-tree-sidebar {
  flex: auto;
  overflow: hidden;
}

.profiles-sidebar-tree-box {
  overflow-y: auto;
}

.profile-view {
  display: flex;
  overflow: hidden;
}

.profile-view .data-grid {
  border: none;
  flex: auto;
}

.profile-view .data-grid th.self-column,
.profile-view .data-grid th.total-column {
  text-align: center;
}

.profile-node-file {
  float: right;
  color: var(--sys-color-token-subtle);
}

.profile-warn-marker {
  vertical-align: -1px;
  margin-right: 2px;
}

.cpu-profile-flame-chart-overview-container {
  overflow: hidden;
  position: absolute;
  top: 0;
  width: 100%;
  height: 80px;
}

#cpu-profile-flame-chart-overview-container {
  border-bottom: 1px solid var(--sys-color-divider);
  overflow: hidden;
}

.cpu-profile-flame-chart-overview-canvas {
  position: absolute;
  inset: 20px 0 0;
}

#cpu-profile-flame-chart-overview-grid .resources-dividers-label-bar {
  pointer-events: auto;
}

.cpu-profile-flame-chart-overview-pane {
  flex: 0 0 80px !important; /* stylelint-disable-line declaration-no-important */
}

.profile-text-view {
  padding: 10px;
  overflow: auto;
  margin: 0;
  user-select: text;
  cursor: text;
}

.empty-landing-page {
  position: absolute;
  background-color: var(--sys-color-cdt-base-container);
  justify-content: center;
  align-items: center;
  overflow: auto;
  font-size: 16px;
  color: var(--sys-color-token-subtle);
  padding: 50px;
}

@media (forced-colors: active) {
  .profile-view .data-grid tr:hover td:not(.bottom-filler-td) {
    background: Highlight;
  }

  .profile-view .data-grid table.data {
    background: transparent;
  }
}

/*# sourceURL=${import.meta.resolve("./profilesPanel.css")} */`;

// gen/front_end/panels/profiler/profilesSidebarTree.css.js
var profilesSidebarTree_css_default = `/*
 * Copyright 2016 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */
:host {
  padding: var(--sys-size-3) 0;
}

.tree-outline-disclosure {
  width: 100%;
}

/* Icon-related changes */
li .icon {
  width: 20px;
  height: 20px;
  margin-right: var(--sys-size-6);
  flex: none;
}

/* Heap profiles and CPU profiles */
.heap-snapshot-sidebar-tree-item .icon,
.profile-sidebar-tree-item .icon {
  mask-image: var(--image-file-heap-snapshot);
  background: var(--icon-default);
}

.profile-group-sidebar-tree-item .icon {
  mask-image: var(--image-file-heap-snapshots);
  background: var(--icon-default);
}

li.small .icon {
  width: 16px;
  height: 16px;
}

li.wait .icon {
  content: none;
}

li devtools-button {
  min-width: var(--sys-size-12);
  visibility: hidden;
}

/* Tree outline overrides */
.heap-snapshot-sidebar-tree-item:not(:hover) devtools-button {
  visibility: hidden;
}

.heap-snapshot-sidebar-tree-item.wait .icon {
  mask-image: unset;
  background-color: inherit;
}

.heap-snapshot-sidebar-tree-item.small .icon {
  mask-image: var(--image-file-heap-snapshots);
  background: var(--icon-default);
}

.profile-sidebar-tree-item.small .icon {
  mask-image: var(--image-file-heap-snapshots);
  background: var(--icon-default);
}

.tree-outline li:not(.parent)::before {
  content: none;
}

ol.tree-outline {
  flex: auto;
  padding: 0;
}

.tree-outline li {
  height: var(--sys-size-12);
  padding-left: var(--sys-size-7);
  margin-right: var(--sys-size-5);
  color: var(--sys-color-on-surface);

  & .leading-icons {
    margin-right: var(--sys-size-6);
    flex: none;
  }

  & .selection {
    border-radius: 0 100px 100px 0;
  }
}

.tree-outline .profile-launcher-view-tree-item,
.tree-outline li.profiles-tree-section + .children > li {
  border-radius: 0 100px 100px 0;
  position: relative;

  &.selected {
    background-color: var(--app-color-navigation-drawer-background-selected);
    color: var(--app-color-navigation-drawer-label-selected);

    & devtools-icon {
      color: var(--app-color-navigation-drawer-label-selected);
    }

    & > .icon:not(.spinner) {
      background-color: var(--app-color-navigation-drawer-label-selected);
    }
  }

  &:active::before {
    background-color: var(--sys-color-state-ripple-neutral-on-subtle);
    mask-image: none;
    content: "";
    height: 100%;
    width: 100%;
    border-radius: inherit;
    position: absolute;
    top: 0;
    left: 0;
  }

  &:focus-visible {
    box-shadow: inset 0 0 0 2px var(--sys-color-state-focus-ring);
  }
}

.tree-outline li.profiles-tree-section {
  margin-top: var(--sys-size-6);
  line-height: var(--sys-size-8);

  &:hover:not(:has(devtools-checkbox)) .selection {
    background-color: transparent;
  }
}

.tree-outline li.profiles-tree-section::before {
  display: none;
}

.tree-outline ol {
  overflow: hidden;
  padding: 0;
}

/* Generic items styling */

li.wait .spinner::before {
  --dimension: 20px;

  margin: 0;
}

li.wait.small .spinner::before {
  --dimension: 14px;
  --clip-size: 9px;
  --override-spinner-size: 2px;

  margin: 1px;
}

li.wait.selected .spinner::before {
  --override-spinner-color: var(--ref-palette-neutral100);
}

@keyframes spinner-animation {
  from {
    transform: rotate(0);
  }

  to {
    transform: rotate(360deg);
  }
}

li.small {
  height: 20px;
}

li .titles {
  display: inline-flex;
  padding-right: var(--sys-size-5);
}

li .titles > .title-container {
  z-index: 1;
  overflow: hidden;
}

li .titles > .title-container:has(:not(.editing)) {
  text-overflow: ellipsis;
}

li .titles > .title-container .title.editing {
  display: flex;
  overflow: hidden;
  margin-inline: 0;
  padding-inline: 0;
}

li.small .titles {
  top: 2px;
  line-height: normal;
}

li:not(.small) .title::after {
  content: "\\A";
  white-space: pre;
}

li .subtitle {
  text-overflow: ellipsis;
  overflow: hidden;
  margin-left: var(--sys-size-3);
}

li.small .subtitle {
  display: none;
}

li.selected:hover devtools-button {
  visibility: visible;
  margin-left: auto;
}

@media (forced-colors: active) {
  .tree-outline li,
  .tree-outline li.profiles-tree-section,
  .tree-outline li:hover .tree-element-title {
    forced-color-adjust: none;
    color: ButtonText;
    text-shadow: unset;
  }

  .tree-outline .profile-launcher-view-tree-item,
  .tree-outline li.profiles-tree-section + .children > li {
    &.selected {
      background-color: Highlight;
      color: HighlightText;

      & devtools-icon {
        color: HighlightText;
      }

      & > .icon:not(.spinner) {
        background-color: HighlightText;
      }
    }
  }
}

/*# sourceURL=${import.meta.resolve("./profilesSidebarTree.css")} */`;

// gen/front_end/panels/profiler/ProfilesPanel.js
var UIStrings5 = {
  /**
   * @description Text in Profiles Panel of a profiler tool
   * @example {'.js', '.json'} PH1
   */
  cantLoadFileSupportedFile: "Can\u2019t load file. Supported file extensions: ''{PH1}''.",
  /**
   * @description Text in Profiles Panel of a profiler tool
   */
  cantLoadProfileWhileAnother: "Can\u2019t load profile while another profile is being recorded.",
  /**
   * @description Text in Profiles Panel of a profiler tool
   */
  profileLoadingFailed: "Profile loading failed",
  /**
   * @description Text in Profiles Panel of a profiler tool
   * @example {cannot open file} PH1
   */
  failReason: "Reason: {PH1}.",
  /**
   * @description Text in Profiles Panel of a profiler tool
   * @example {2} PH1
   */
  runD: "Run {PH1}",
  /**
   * @description Text in Profiles Panel of a profiler tool
   */
  profiles: "Profiles"
};
var str_5 = i18n9.i18n.registerUIStrings("panels/profiler/ProfilesPanel.ts", UIStrings5);
var i18nString5 = i18n9.i18n.getLocalizedString.bind(void 0, str_5);
var ProfilesPanel = class _ProfilesPanel extends UI5.Panel.PanelWithSidebar {
  profileTypes;
  profilesItemTreeElement;
  sidebarTree;
  profileViews;
  toolbarElement;
  toggleRecordAction;
  toggleRecordButton;
  #saveToFileAction;
  profileViewToolbar;
  profileGroups;
  launcherView;
  visibleView;
  profileToView;
  typeIdToSidebarSection;
  fileSelectorElement;
  selectedProfileType;
  constructor(name, profileTypes, recordingActionId) {
    super(name);
    this.profileTypes = profileTypes;
    this.registerRequiredCSS(objectValue_css_default, profilesPanel_css_default, heapProfiler_css_default);
    const mainContainer = new UI5.Widget.VBox();
    this.splitWidget().setMainWidget(mainContainer);
    this.profilesItemTreeElement = new ProfilesSidebarTreeElement(this);
    this.sidebarTree = new UI5.TreeOutline.TreeOutlineInShadow();
    this.sidebarTree.registerRequiredCSS(profilesSidebarTree_css_default);
    this.sidebarTree.element.classList.add("profiles-sidebar-tree-box");
    this.panelSidebarElement().appendChild(this.sidebarTree.element);
    this.sidebarTree.appendChild(this.profilesItemTreeElement);
    this.sidebarTree.element.addEventListener("keydown", this.onKeyDown.bind(this), false);
    this.profileViews = document.createElement("div");
    this.profileViews.id = "profile-views";
    this.profileViews.classList.add("vbox");
    mainContainer.element.appendChild(this.profileViews);
    this.toolbarElement = document.createElement("div");
    this.toolbarElement.classList.add("profiles-toolbar");
    mainContainer.element.insertBefore(this.toolbarElement, mainContainer.element.firstChild);
    this.panelSidebarElement().classList.add("profiles-tree-sidebar");
    const toolbarContainerLeft = document.createElement("div");
    toolbarContainerLeft.classList.add("profiles-toolbar");
    toolbarContainerLeft.setAttribute("jslog", `${VisualLogging2.toolbar("profiles-sidebar")}`);
    this.panelSidebarElement().insertBefore(toolbarContainerLeft, this.panelSidebarElement().firstChild);
    const toolbar2 = toolbarContainerLeft.createChild("devtools-toolbar");
    toolbar2.wrappable = true;
    this.toggleRecordAction = UI5.ActionRegistry.ActionRegistry.instance().getAction(recordingActionId);
    this.toggleRecordButton = UI5.Toolbar.Toolbar.createActionButton(this.toggleRecordAction);
    toolbar2.appendToolbarItem(this.toggleRecordButton);
    toolbar2.appendToolbarItem(UI5.Toolbar.Toolbar.createActionButton("profiler.clear-all"));
    toolbar2.appendSeparator();
    toolbar2.appendToolbarItem(UI5.Toolbar.Toolbar.createActionButton("profiler.load-from-file"));
    this.#saveToFileAction = UI5.ActionRegistry.ActionRegistry.instance().getAction("profiler.save-to-file");
    this.#saveToFileAction.setEnabled(false);
    toolbar2.appendToolbarItem(UI5.Toolbar.Toolbar.createActionButton(this.#saveToFileAction));
    toolbar2.appendSeparator();
    toolbar2.appendToolbarItem(UI5.Toolbar.Toolbar.createActionButton("components.collect-garbage"));
    this.profileViewToolbar = this.toolbarElement.createChild("devtools-toolbar");
    this.profileViewToolbar.wrappable = true;
    this.profileViewToolbar.setAttribute("jslog", `${VisualLogging2.toolbar("profile-view")}`);
    this.profileGroups = {};
    this.launcherView = new ProfileLauncherView(this);
    this.launcherView.addEventListener("ProfileTypeSelected", this.onProfileTypeSelected, this);
    this.profileToView = [];
    this.typeIdToSidebarSection = {};
    const types = this.profileTypes;
    for (let i = 0; i < types.length; i++) {
      this.registerProfileType(types[i]);
    }
    this.launcherView.restoreSelectedProfileType();
    this.profilesItemTreeElement.select();
    this.showLauncherView();
    this.createFileSelectorElement();
    SDK2.TargetManager.TargetManager.instance().addEventListener("SuspendStateChanged", this.onSuspendStateChanged, this);
    UI5.Context.Context.instance().addFlavorChangeListener(SDK2.CPUProfilerModel.CPUProfilerModel, this.updateProfileTypeSpecificUI, this);
    UI5.Context.Context.instance().addFlavorChangeListener(SDK2.HeapProfilerModel.HeapProfilerModel, this.updateProfileTypeSpecificUI, this);
  }
  onKeyDown(event) {
    let handled = false;
    if (event.key === "ArrowDown" && !event.altKey) {
      handled = this.sidebarTree.selectNext();
    } else if (event.key === "ArrowUp" && !event.altKey) {
      handled = this.sidebarTree.selectPrevious();
    }
    if (handled) {
      event.consume(true);
    }
  }
  searchableView() {
    const visibleView = this.visibleView;
    return visibleView?.searchableView ? visibleView.searchableView() : null;
  }
  createFileSelectorElement() {
    if (this.fileSelectorElement) {
      this.element.removeChild(this.fileSelectorElement);
    }
    this.fileSelectorElement = UI5.UIUtils.createFileSelectorElement(this.loadFromFile.bind(this));
    this.element.appendChild(this.fileSelectorElement);
  }
  findProfileTypeByExtension(fileName) {
    return this.profileTypes.find((type) => Boolean(type.fileExtension()) && fileName.endsWith(type.fileExtension() || "")) || null;
  }
  async loadFromFile(file) {
    this.createFileSelectorElement();
    const profileType = this.findProfileTypeByExtension(file.name);
    if (!profileType) {
      const extensions = new Set(this.profileTypes.map((type) => type.fileExtension()).filter((ext) => ext));
      Common4.Console.Console.instance().error(i18nString5(UIStrings5.cantLoadFileSupportedFile, { PH1: Array.from(extensions).join("', '") }));
      return;
    }
    if (Boolean(profileType.profileBeingRecorded())) {
      Common4.Console.Console.instance().error(i18nString5(UIStrings5.cantLoadProfileWhileAnother));
      return;
    }
    const error = await profileType.loadFromFile(file);
    if (error && "message" in error) {
      void UI5.UIUtils.MessageDialog.show(i18nString5(UIStrings5.profileLoadingFailed), i18nString5(UIStrings5.failReason, { PH1: error.message }), void 0, "profile-loading-failed");
    }
  }
  toggleRecord() {
    if (!this.toggleRecordAction.enabled()) {
      return true;
    }
    const toggleButton = UI5.DOMUtilities.deepActiveElement(this.element.ownerDocument);
    const type = this.selectedProfileType;
    if (!type) {
      return true;
    }
    const isProfiling = type.buttonClicked();
    this.updateToggleRecordAction(isProfiling);
    if (isProfiling) {
      this.launcherView.profileStarted();
      if (type.hasTemporaryView()) {
        this.showProfile(type.profileBeingRecorded());
      }
    } else {
      this.launcherView.profileFinished();
    }
    if (toggleButton) {
      toggleButton.focus();
    }
    return true;
  }
  onSuspendStateChanged() {
    this.updateToggleRecordAction(this.toggleRecordAction.toggled());
  }
  updateToggleRecordAction(toggled) {
    const hasSelectedTarget = Boolean(UI5.Context.Context.instance().flavor(SDK2.CPUProfilerModel.CPUProfilerModel) || UI5.Context.Context.instance().flavor(SDK2.HeapProfilerModel.HeapProfilerModel));
    const enable = toggled || !SDK2.TargetManager.TargetManager.instance().allTargetsSuspended() && hasSelectedTarget;
    this.toggleRecordAction.setEnabled(enable);
    this.toggleRecordAction.setToggled(toggled);
    if (enable) {
      this.toggleRecordButton.setTitle(this.selectedProfileType ? this.selectedProfileType.buttonTooltip : "");
    } else {
      this.toggleRecordButton.setTitle(UI5.UIUtils.anotherProfilerActiveLabel());
    }
    if (this.selectedProfileType) {
      this.launcherView.updateProfileType(this.selectedProfileType, enable);
    }
  }
  profileBeingRecordedRemoved() {
    this.updateToggleRecordAction(false);
    this.launcherView.profileFinished();
  }
  onProfileTypeSelected(event) {
    this.selectedProfileType = event.data;
    this.updateProfileTypeSpecificUI();
  }
  updateProfileTypeSpecificUI() {
    if (this.selectedProfileType?.isInstantProfile()) {
      this.toggleRecordButton.toggleOnClick(false);
    }
    this.updateToggleRecordAction(this.toggleRecordAction.toggled());
  }
  reset() {
    this.profileTypes.forEach((type) => type.reset());
    delete this.visibleView;
    this.profileGroups = {};
    this.updateToggleRecordAction(false);
    this.launcherView.profileFinished();
    this.sidebarTree.element.classList.remove("some-expandable");
    this.launcherView.detach();
    this.profileViews.removeChildren();
    this.profileViewToolbar.removeToolbarItems();
    this.profilesItemTreeElement.select();
    this.showLauncherView();
  }
  showLauncherView() {
    this.closeVisibleView();
    this.profileViewToolbar.removeToolbarItems();
    this.launcherView.show(this.profileViews);
    this.visibleView = this.launcherView;
    this.toolbarElement.classList.add("hidden");
    this.#saveToFileAction.setEnabled(false);
  }
  registerProfileType(profileType) {
    this.launcherView.addProfileType(profileType);
    const profileTypeSection = new ProfileTypeSidebarSection(this, profileType);
    this.typeIdToSidebarSection[profileType.id] = profileTypeSection;
    this.sidebarTree.appendChild(profileTypeSection);
    function onAddProfileHeader(event) {
      this.addProfileHeader(event.data);
    }
    function onRemoveProfileHeader(event) {
      this.removeProfileHeader(event.data);
    }
    function profileComplete(event) {
      this.showProfile(event.data);
    }
    profileType.addEventListener("view-updated", this.updateProfileTypeSpecificUI, this);
    profileType.addEventListener("add-profile-header", onAddProfileHeader, this);
    profileType.addEventListener("remove-profile-header", onRemoveProfileHeader, this);
    profileType.addEventListener("profile-complete", profileComplete, this);
    const profiles = profileType.getProfiles();
    for (let i = 0; i < profiles.length; i++) {
      this.addProfileHeader(profiles[i]);
    }
  }
  showLoadFromFileDialog() {
    this.fileSelectorElement.click();
  }
  addProfileHeader(profile) {
    const profileType = profile.profileType();
    const typeId = profileType.id;
    this.typeIdToSidebarSection[typeId].addProfileHeader(profile);
    if (!this.visibleView || this.visibleView === this.launcherView) {
      this.showProfile(profile);
    }
  }
  removeProfileHeader(profile) {
    if (profile.profileType().profileBeingRecorded() === profile) {
      this.profileBeingRecordedRemoved();
    }
    const i = this.indexOfViewForProfile(profile);
    if (i !== -1) {
      this.profileToView.splice(i, 1);
    }
    const typeId = profile.profileType().id;
    const sectionIsEmpty = this.typeIdToSidebarSection[typeId].removeProfileHeader(profile);
    if (sectionIsEmpty) {
      this.profilesItemTreeElement.select();
      this.showLauncherView();
    }
  }
  showProfile(profile) {
    if (!profile || profile.profileType().profileBeingRecorded() === profile && !profile.profileType().hasTemporaryView()) {
      return null;
    }
    const view = this.viewForProfile(profile);
    if (view === this.visibleView) {
      return view;
    }
    this.closeVisibleView();
    UI5.Context.Context.instance().setFlavor(ProfileHeader, profile);
    this.#saveToFileAction.setEnabled(profile.canSaveToFile());
    view.show(this.profileViews);
    this.toolbarElement.classList.remove("hidden");
    this.visibleView = view;
    const profileTypeSection = this.typeIdToSidebarSection[profile.profileType().id];
    const sidebarElement = profileTypeSection.sidebarElementForProfile(profile);
    if (sidebarElement) {
      sidebarElement.revealAndSelect();
    }
    this.profileViewToolbar.removeToolbarItems();
    void view.toolbarItems().then((items) => {
      items.map((item) => this.profileViewToolbar.appendToolbarItem(item));
    });
    return view;
  }
  showObject(_snapshotObjectId, _perspectiveName) {
  }
  async linkifyObject(_nodeIndex) {
    return null;
  }
  viewForProfile(profile) {
    const index = this.indexOfViewForProfile(profile);
    if (index !== -1) {
      return this.profileToView[index].view;
    }
    const view = profile.createView(this);
    view.element.classList.add("profile-view");
    this.profileToView.push({ profile, view });
    return view;
  }
  indexOfViewForProfile(profile) {
    return this.profileToView.findIndex((item) => item.profile === profile);
  }
  closeVisibleView() {
    UI5.Context.Context.instance().setFlavor(ProfileHeader, null);
    this.#saveToFileAction.setEnabled(false);
    if (this.visibleView) {
      this.visibleView.detach();
    }
    delete this.visibleView;
  }
  focus() {
    this.sidebarTree.focus();
  }
  wasShown() {
    super.wasShown();
    UI5.Context.Context.instance().setFlavor(_ProfilesPanel, this);
  }
  willHide() {
    UI5.Context.Context.instance().setFlavor(_ProfilesPanel, null);
    super.willHide();
  }
};
var ProfileTypeSidebarSection = class extends UI5.TreeOutline.TreeElement {
  dataDisplayDelegate;
  profileTreeElements;
  profileGroups;
  constructor(dataDisplayDelegate, profileType) {
    super(profileType.treeItemTitle, true);
    this.selectable = false;
    this.dataDisplayDelegate = dataDisplayDelegate;
    this.profileTreeElements = [];
    this.profileGroups = {};
    this.expand();
    this.hidden = true;
    this.setCollapsible(false);
  }
  addProfileHeader(profile) {
    this.hidden = false;
    const profileType = profile.profileType();
    let sidebarParent = this;
    const profileTreeElement = profile.createSidebarTreeElement(this.dataDisplayDelegate);
    this.profileTreeElements.push(profileTreeElement);
    if (!profile.fromFile() && profileType.profileBeingRecorded() !== profile) {
      const profileTitle = profile.title;
      let group = this.profileGroups[profileTitle];
      if (!group) {
        group = new ProfileGroup();
        this.profileGroups[profileTitle] = group;
      }
      group.profileSidebarTreeElements.push(profileTreeElement);
      const groupSize = group.profileSidebarTreeElements.length;
      if (groupSize === 2) {
        group.sidebarTreeElement = new ProfileGroupSidebarTreeElement(this.dataDisplayDelegate, profile.title);
        const firstProfileTreeElement = group.profileSidebarTreeElements[0];
        const index = this.children().indexOf(firstProfileTreeElement);
        this.insertChild(group.sidebarTreeElement, index);
        const selected = firstProfileTreeElement.selected;
        this.removeChild(firstProfileTreeElement);
        group.sidebarTreeElement.appendChild(firstProfileTreeElement);
        if (selected) {
          firstProfileTreeElement.revealAndSelect();
        }
        firstProfileTreeElement.setSmall(true);
        firstProfileTreeElement.setMainTitle(i18nString5(UIStrings5.runD, { PH1: 1 }));
        if (this.treeOutline) {
          this.treeOutline.element.classList.add("some-expandable");
        }
      }
      if (groupSize >= 2) {
        sidebarParent = group.sidebarTreeElement;
        profileTreeElement.setSmall(true);
        profileTreeElement.setMainTitle(i18nString5(UIStrings5.runD, { PH1: groupSize }));
      }
    }
    if (sidebarParent) {
      sidebarParent.appendChild(profileTreeElement);
    }
  }
  removeProfileHeader(profile) {
    const index = this.sidebarElementIndex(profile);
    if (index === -1) {
      return false;
    }
    const profileTreeElement = this.profileTreeElements[index];
    this.profileTreeElements.splice(index, 1);
    let sidebarParent = this;
    const group = this.profileGroups[profile.title];
    if (group) {
      const groupElements = group.profileSidebarTreeElements;
      groupElements.splice(groupElements.indexOf(profileTreeElement), 1);
      if (groupElements.length === 1) {
        const pos = sidebarParent.children().indexOf(group.sidebarTreeElement);
        if (group.sidebarTreeElement) {
          group.sidebarTreeElement.removeChild(groupElements[0]);
        }
        this.insertChild(groupElements[0], pos);
        groupElements[0].setSmall(false);
        groupElements[0].setMainTitle(profile.title);
        if (group.sidebarTreeElement) {
          this.removeChild(group.sidebarTreeElement);
        }
      }
      if (groupElements.length !== 0) {
        sidebarParent = group.sidebarTreeElement;
      }
    }
    if (sidebarParent) {
      sidebarParent.removeChild(profileTreeElement);
    }
    profileTreeElement.dispose();
    if (this.childCount()) {
      return false;
    }
    this.hidden = true;
    return true;
  }
  sidebarElementForProfile(profile) {
    const index = this.sidebarElementIndex(profile);
    return index === -1 ? null : this.profileTreeElements[index];
  }
  sidebarElementIndex(profile) {
    const elements = this.profileTreeElements;
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].profile === profile) {
        return i;
      }
    }
    return -1;
  }
  onattach() {
    this.listItemElement.classList.add("profiles-tree-section");
  }
};
var ProfileGroup = class {
  profileSidebarTreeElements;
  sidebarTreeElement;
  constructor() {
    this.profileSidebarTreeElements = [];
    this.sidebarTreeElement = null;
  }
};
var ProfileGroupSidebarTreeElement = class extends UI5.TreeOutline.TreeElement {
  dataDisplayDelegate;
  profileTitle;
  toggleOnClick;
  constructor(dataDisplayDelegate, title) {
    super("", true);
    this.selectable = false;
    this.dataDisplayDelegate = dataDisplayDelegate;
    this.profileTitle = title;
    this.expand();
    this.toggleOnClick = true;
  }
  onselect() {
    const hasChildren = this.childCount() > 0;
    if (hasChildren) {
      const lastChild = this.lastChild();
      if (lastChild instanceof ProfileSidebarTreeElement) {
        this.dataDisplayDelegate.showProfile(lastChild.profile);
      }
    }
    return hasChildren;
  }
  onattach() {
    this.listItemElement.classList.add("profile-group-sidebar-tree-item");
    this.listItemElement.createChild("div", "icon");
    this.listItemElement.createChild("div", "titles no-subtitle").createChild("span", "title-container").createChild("span", "title").textContent = this.profileTitle;
  }
};
var ProfilesSidebarTreeElement = class extends UI5.TreeOutline.TreeElement {
  panel;
  constructor(panel) {
    super("", false);
    this.selectable = true;
    this.panel = panel;
  }
  onselect() {
    this.panel.showLauncherView();
    return true;
  }
  onattach() {
    this.listItemElement.classList.add("profile-launcher-view-tree-item");
    this.listItemElement.createChild("div", "titles no-subtitle").createChild("span", "title-container").createChild("span", "title").textContent = i18nString5(UIStrings5.profiles);
    this.setLeadingIcons([IconButton2.Icon.create("tune")]);
  }
};
var ActionDelegate = class {
  handleAction(context, actionId) {
    switch (actionId) {
      case "profiler.clear-all": {
        const profilesPanel = context.flavor(ProfilesPanel);
        if (profilesPanel !== null) {
          profilesPanel.reset();
          return true;
        }
        return false;
      }
      case "profiler.load-from-file": {
        const profilesPanel = context.flavor(ProfilesPanel);
        if (profilesPanel !== null) {
          profilesPanel.showLoadFromFileDialog();
          return true;
        }
        return false;
      }
      case "profiler.save-to-file": {
        const profile = context.flavor(ProfileHeader);
        if (profile !== null) {
          profile.saveToFile();
          return true;
        }
        return false;
      }
      case "profiler.delete-profile": {
        const profile = context.flavor(ProfileHeader);
        if (profile !== null) {
          profile.profileType().removeProfile(profile);
          return true;
        }
        return false;
      }
    }
    return false;
  }
};

// gen/front_end/panels/profiler/ProfileTypeRegistry.js
var ProfileTypeRegistry_exports = {};
__export(ProfileTypeRegistry_exports, {
  ProfileTypeRegistry: () => ProfileTypeRegistry,
  instance: () => instance
});

// gen/front_end/panels/profiler/HeapDetachedElementsView.js
import * as Common7 from "./../../core/common/common.js";
import * as i18n16 from "./../../core/i18n/i18n.js";
import * as SDK4 from "./../../core/sdk/sdk.js";
import * as UI9 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/HeapDetachedElementsDataGrid.js
import * as i18n11 from "./../../core/i18n/i18n.js";
import * as SDK3 from "./../../core/sdk/sdk.js";
import * as DataGrid3 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI6 from "./../../ui/legacy/legacy.js";
import * as Elements from "./../elements/elements.js";
var UIStrings6 = {
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  detachedNodes: "Detached nodes",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  nodeSize: "Node count",
  /**
   * @description Label for the detached elements table
   */
  detachedElementsList: "Detached elements list"
};
var str_6 = i18n11.i18n.registerUIStrings("panels/profiler/HeapDetachedElementsDataGrid.ts", UIStrings6);
var i18nString6 = i18n11.i18n.getLocalizedString.bind(void 0, str_6);
var HeapDetachedElementsDataGrid = class extends DataGrid3.DataGrid.DataGridImpl {
  constructor() {
    const columns = [];
    columns.push({
      id: "detached-node",
      title: i18nString6(UIStrings6.detachedNodes),
      sortable: false
    });
    columns.push({
      id: "detached-node-count",
      title: i18nString6(UIStrings6.nodeSize),
      sortable: false,
      disclosure: true
    });
    super({
      displayName: i18nString6(UIStrings6.detachedElementsList),
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.setStriped(true);
  }
};
var HeapDetachedElementsDataGridNode = class extends DataGrid3.DataGrid.DataGridNode {
  detachedElementInfo;
  domModel;
  retainedNodeIds = /* @__PURE__ */ new Set();
  constructor(detachedElementInfo, domModel) {
    super(null);
    this.detachedElementInfo = detachedElementInfo;
    this.domModel = domModel;
    for (const retainedNodeId of detachedElementInfo.retainedNodeIds) {
      this.retainedNodeIds.add(retainedNodeId);
    }
  }
  createCell(columnId) {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case "detached-node": {
        const node = SDK3.DOMModel.DOMNode.create(this.domModel, null, false, this.detachedElementInfo.treeNode, this.retainedNodeIds);
        node.detached = true;
        this.#renderNode(node, cell);
        return cell;
      }
      case "detached-node-count": {
        const size = this.#getNodeSize(this.detachedElementInfo);
        UI6.UIUtils.createTextChild(cell, size.toString());
        return cell;
      }
    }
    return cell;
  }
  #getNodeSize(detachedElementInfo) {
    let count = 1;
    const queue = [];
    let node;
    queue.push(detachedElementInfo.treeNode);
    while (queue.length > 0) {
      node = queue.shift();
      if (!node) {
        break;
      }
      if (node.childNodeCount) {
        count += node.childNodeCount;
      }
      if (node.children) {
        for (const child of node.children) {
          queue.push(child);
        }
      }
    }
    return count;
  }
  // FIXME: is it a partial dupe of front_end/panels/elements/ElementsTreeOutlineRenderer.ts?
  #renderNode(node, target) {
    const domTree = new Elements.ElementsTreeOutline.DOMTreeWidget();
    domTree.omitRootDOMNode = false;
    domTree.selectEnabled = true;
    domTree.hideGutter = true;
    domTree.rootDOMNode = node;
    domTree.showSelectionOnKeyboardFocus = true;
    domTree.preventTabOrder = true;
    domTree.deindentSingleNode = true;
    domTree.show(target, void 0, true);
  }
};

// gen/front_end/panels/profiler/ProfileView.js
var ProfileView_exports = {};
__export(ProfileView_exports, {
  ProfileView: () => ProfileView,
  WritableProfileHeader: () => WritableProfileHeader,
  maxLinkLength: () => maxLinkLength
});
import * as Common6 from "./../../core/common/common.js";
import * as Host from "./../../core/host/host.js";
import * as i18n14 from "./../../core/i18n/i18n.js";
import * as Platform4 from "./../../core/platform/platform.js";
import * as Bindings from "./../../models/bindings/bindings.js";
import * as DataGrid5 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as PerfUI2 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Components from "./../../ui/legacy/components/utils/utils.js";
import * as UI8 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/ProfileFlameChartDataProvider.js
var ProfileFlameChartDataProvider_exports = {};
__export(ProfileFlameChartDataProvider_exports, {
  OverviewCalculator: () => OverviewCalculator,
  OverviewPane: () => OverviewPane,
  ProfileFlameChart: () => ProfileFlameChart,
  ProfileFlameChartDataProvider: () => ProfileFlameChartDataProvider
});
import * as Common5 from "./../../core/common/common.js";
import * as i18n13 from "./../../core/i18n/i18n.js";
import * as Platform3 from "./../../core/platform/platform.js";
import * as PerfUI from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI7 from "./../../ui/legacy/legacy.js";
var colorGeneratorInstance = null;
var ProfileFlameChartDataProvider = class _ProfileFlameChartDataProvider {
  #colorGenerator;
  maxStackDepthInternal;
  timelineDataInternal;
  entryNodes;
  #font;
  boldFont;
  constructor() {
    this.#colorGenerator = _ProfileFlameChartDataProvider.colorGenerator();
    this.maxStackDepthInternal = 0;
    this.timelineDataInternal = null;
    this.entryNodes = [];
    this.#font = `${PerfUI.Font.DEFAULT_FONT_SIZE} ${PerfUI.Font.getFontFamilyForCanvas()}`;
  }
  static colorGenerator() {
    if (!colorGeneratorInstance) {
      colorGeneratorInstance = new Common5.Color.Generator({ min: 30, max: 330, count: void 0 }, { min: 50, max: 80, count: 5 }, { min: 80, max: 90, count: 3 });
      colorGeneratorInstance.setColorForID("(idle)", "hsl(0, 0%, 94%)");
      colorGeneratorInstance.setColorForID("(program)", "hsl(0, 0%, 80%)");
      colorGeneratorInstance.setColorForID("(garbage collector)", "hsl(0, 0%, 80%)");
    }
    return colorGeneratorInstance;
  }
  minimumBoundary() {
    throw new Error("Not implemented");
  }
  totalTime() {
    throw new Error("Not implemented");
  }
  formatValue(value2, precision) {
    return i18n13.TimeUtilities.preciseMillisToString(value2, precision);
  }
  maxStackDepth() {
    return this.maxStackDepthInternal;
  }
  hasTrackConfigurationMode() {
    return false;
  }
  timelineData() {
    return this.timelineDataInternal || this.calculateTimelineData();
  }
  calculateTimelineData() {
    throw new Error("Not implemented");
  }
  preparePopoverElement(_entryIndex) {
    throw new Error("Not implemented");
  }
  canJumpToEntry(entryIndex) {
    return this.entryNodes[entryIndex].scriptId !== "0";
  }
  entryTitle(entryIndex) {
    const node = this.entryNodes[entryIndex];
    return UI7.UIUtils.beautifyFunctionName(node.functionName);
  }
  entryFont(entryIndex) {
    const boldFont = "bold " + this.#font;
    return this.entryHasDeoptReason(entryIndex) ? boldFont : this.#font;
  }
  entryHasDeoptReason(_entryIndex) {
    throw new Error("Not implemented");
  }
  entryColor(entryIndex) {
    const node = this.entryNodes[entryIndex];
    return this.#colorGenerator.colorForID(node.url || (node.scriptId !== "0" ? node.scriptId : node.functionName));
  }
  decorateEntry(_entryIndex, _context, _text, _barX, _barY, _barWidth, _barHeight) {
    return false;
  }
  forceDecoration(_entryIndex) {
    return false;
  }
  textColor(_entryIndex) {
    return "#333";
  }
  entryNodesLength() {
    return this.entryNodes.length;
  }
};
var ProfileFlameChart = class extends Common5.ObjectWrapper.eventMixin(UI7.Widget.VBox) {
  searchableView;
  overviewPane;
  mainPane;
  entrySelected;
  dataProvider;
  searchResults;
  searchResultIndex = -1;
  constructor(searchableView, dataProvider) {
    super();
    this.element.id = "cpu-flame-chart";
    this.searchableView = searchableView;
    this.overviewPane = new OverviewPane(dataProvider);
    this.overviewPane.show(this.element);
    this.mainPane = new PerfUI.FlameChart.FlameChart(dataProvider, this.overviewPane);
    this.mainPane.setBarHeight(15);
    this.mainPane.setTextBaseline(4);
    this.mainPane.setTextPadding(2);
    this.mainPane.show(this.element);
    this.mainPane.addEventListener("EntrySelected", this.onEntrySelected, this);
    this.mainPane.addEventListener("EntryInvoked", this.onEntryInvoked, this);
    this.entrySelected = false;
    this.mainPane.addEventListener("CanvasFocused", this.onEntrySelected, this);
    this.overviewPane.addEventListener("WindowChanged", this.onWindowChanged, this);
    this.dataProvider = dataProvider;
    this.searchResults = [];
  }
  focus() {
    this.mainPane.focus();
  }
  onWindowChanged(event) {
    const { windowTimeLeft: windowLeft, windowTimeRight: windowRight } = event.data;
    this.mainPane.setWindowTimes(
      windowLeft,
      windowRight,
      /* animate */
      true
    );
  }
  selectRange(timeLeft, timeRight) {
    this.overviewPane.selectRange(timeLeft, timeRight);
  }
  onEntrySelected(event) {
    if (event.data) {
      const eventIndex = event.data;
      this.mainPane.setSelectedEntry(eventIndex);
      if (eventIndex === -1) {
        this.entrySelected = false;
      } else {
        this.entrySelected = true;
      }
    } else if (!this.entrySelected) {
      this.mainPane.setSelectedEntry(0);
      this.entrySelected = true;
    }
  }
  onEntryInvoked(event) {
    this.onEntrySelected(event);
    this.dispatchEventToListeners("EntryInvoked", event.data);
  }
  update() {
    this.overviewPane.update();
    this.mainPane.update();
  }
  performSearch(searchConfig, _shouldJump, jumpBackwards) {
    const matcher = Platform3.StringUtilities.createPlainTextSearchRegex(searchConfig.query, searchConfig.caseSensitive ? "" : "i");
    const selectedEntryIndex = this.searchResultIndex !== -1 ? this.searchResults[this.searchResultIndex] : -1;
    this.searchResults = [];
    const entriesCount = this.dataProvider.entryNodesLength();
    for (let index = 0; index < entriesCount; ++index) {
      if (this.dataProvider.entryTitle(index).match(matcher)) {
        this.searchResults.push(index);
      }
    }
    if (this.searchResults.length) {
      this.searchResultIndex = this.searchResults.indexOf(selectedEntryIndex);
      if (this.searchResultIndex === -1) {
        this.searchResultIndex = jumpBackwards ? this.searchResults.length - 1 : 0;
      }
      this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    } else {
      this.onSearchCanceled();
    }
    this.searchableView.updateSearchMatchesCount(this.searchResults.length);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }
  onSearchCanceled() {
    this.mainPane.setSelectedEntry(-1);
    this.searchResults = [];
    this.searchResultIndex = -1;
  }
  jumpToNextSearchResult() {
    this.searchResultIndex = (this.searchResultIndex + 1) % this.searchResults.length;
    this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }
  jumpToPreviousSearchResult() {
    this.searchResultIndex = (this.searchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    this.mainPane.setSelectedEntry(this.searchResults[this.searchResultIndex]);
    this.searchableView.updateCurrentMatchIndex(this.searchResultIndex);
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
};
var OverviewCalculator = class {
  formatter;
  minimumBoundaries;
  maximumBoundaries;
  xScaleFactor;
  constructor(formatter) {
    this.formatter = formatter;
  }
  updateBoundaries(overviewPane) {
    this.minimumBoundaries = overviewPane.dataProvider.minimumBoundary();
    const totalTime = overviewPane.dataProvider.totalTime();
    this.maximumBoundaries = this.minimumBoundaries + totalTime;
    this.xScaleFactor = overviewPane.overviewContainer.clientWidth / totalTime;
  }
  computePosition(time) {
    return (time - this.minimumBoundaries) * this.xScaleFactor;
  }
  formatValue(value2, precision) {
    return this.formatter(value2 - this.minimumBoundaries, precision);
  }
  maximumBoundary() {
    return this.maximumBoundaries;
  }
  minimumBoundary() {
    return this.minimumBoundaries;
  }
  zeroTime() {
    return this.minimumBoundaries;
  }
  boundarySpan() {
    return this.maximumBoundaries - this.minimumBoundaries;
  }
};
var OverviewPane = class extends Common5.ObjectWrapper.eventMixin(UI7.Widget.VBox) {
  overviewContainer;
  overviewCalculator;
  overviewGrid;
  overviewCanvas;
  dataProvider;
  windowTimeLeft;
  windowTimeRight;
  updateTimerId;
  constructor(dataProvider) {
    super();
    this.element.classList.add("cpu-profile-flame-chart-overview-pane");
    this.overviewContainer = this.element.createChild("div", "cpu-profile-flame-chart-overview-container");
    this.overviewCalculator = new OverviewCalculator(dataProvider.formatValue);
    this.overviewGrid = new PerfUI.OverviewGrid.OverviewGrid("cpu-profile-flame-chart", this.overviewCalculator);
    this.overviewGrid.element.classList.add("fill");
    this.overviewCanvas = this.overviewContainer.createChild("canvas", "cpu-profile-flame-chart-overview-canvas");
    this.overviewContainer.appendChild(this.overviewGrid.element);
    this.dataProvider = dataProvider;
    this.overviewGrid.addEventListener("WindowChangedWithPosition", this.onWindowChanged, this);
  }
  windowChanged(windowStartTime, windowEndTime) {
    this.selectRange(windowStartTime, windowEndTime);
  }
  updateRangeSelection(_startTime, _endTime) {
  }
  updateSelectedGroup(_flameChart, _group) {
  }
  selectRange(timeLeft, timeRight) {
    const startTime = this.dataProvider.minimumBoundary();
    const totalTime = this.dataProvider.totalTime();
    this.overviewGrid.setWindowRatio((timeLeft - startTime) / totalTime, (timeRight - startTime) / totalTime);
  }
  onWindowChanged(event) {
    const windowPosition = { windowTimeLeft: event.data.rawStartValue, windowTimeRight: event.data.rawEndValue };
    this.windowTimeLeft = windowPosition.windowTimeLeft;
    this.windowTimeRight = windowPosition.windowTimeRight;
    this.dispatchEventToListeners("WindowChanged", windowPosition);
  }
  timelineData() {
    return this.dataProvider.timelineData();
  }
  onResize() {
    this.scheduleUpdate();
  }
  scheduleUpdate() {
    if (this.updateTimerId) {
      return;
    }
    this.updateTimerId = this.element.window().requestAnimationFrame(this.update.bind(this));
  }
  update() {
    this.updateTimerId = 0;
    const timelineData = this.timelineData();
    if (!timelineData) {
      return;
    }
    this.resetCanvas(this.overviewContainer.clientWidth, this.overviewContainer.clientHeight - PerfUI.FlameChart.RulerHeight);
    this.overviewCalculator.updateBoundaries(this);
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.drawOverviewCanvas();
  }
  drawOverviewCanvas() {
    const canvasWidth = this.overviewCanvas.width;
    const canvasHeight = this.overviewCanvas.height;
    const drawData = this.calculateDrawData(canvasWidth);
    const context = this.overviewCanvas.getContext("2d");
    if (!context) {
      throw new Error("Failed to get canvas context");
    }
    const ratio = window.devicePixelRatio;
    const offsetFromBottom = ratio;
    const lineWidth = 1;
    const yScaleFactor = canvasHeight / (this.dataProvider.maxStackDepth() * 1.1);
    context.lineWidth = lineWidth;
    context.translate(0.5, 0.5);
    context.strokeStyle = "rgba(20,0,0,0.4)";
    context.fillStyle = "rgba(214,225,254,0.8)";
    context.moveTo(-lineWidth, canvasHeight + lineWidth);
    context.lineTo(-lineWidth, Math.round(canvasHeight - drawData[0] * yScaleFactor - offsetFromBottom));
    let value2 = 0;
    for (let x = 0; x < canvasWidth; ++x) {
      value2 = Math.round(canvasHeight - drawData[x] * yScaleFactor - offsetFromBottom);
      context.lineTo(x, value2);
    }
    context.lineTo(canvasWidth + lineWidth, value2);
    context.lineTo(canvasWidth + lineWidth, canvasHeight + lineWidth);
    context.fill();
    context.stroke();
    context.closePath();
  }
  calculateDrawData(width) {
    const dataProvider = this.dataProvider;
    const timelineData = this.timelineData();
    const entryStartTimes = timelineData.entryStartTimes;
    const entryTotalTimes = timelineData.entryTotalTimes;
    const entryLevels = timelineData.entryLevels;
    const length = entryStartTimes.length;
    const minimumBoundary = this.dataProvider.minimumBoundary();
    const drawData = new Uint8Array(width);
    const scaleFactor = width / dataProvider.totalTime();
    for (let entryIndex = 0; entryIndex < length; ++entryIndex) {
      const start = Math.floor((entryStartTimes[entryIndex] - minimumBoundary) * scaleFactor);
      const finish = Math.floor((entryStartTimes[entryIndex] - minimumBoundary + entryTotalTimes[entryIndex]) * scaleFactor);
      for (let x = start; x <= finish; ++x) {
        drawData[x] = Math.max(drawData[x], entryLevels[entryIndex] + 1);
      }
    }
    return drawData;
  }
  resetCanvas(width, height) {
    const ratio = window.devicePixelRatio;
    this.overviewCanvas.width = width * ratio;
    this.overviewCanvas.height = height * ratio;
    this.overviewCanvas.style.width = width + "px";
    this.overviewCanvas.style.height = height + "px";
  }
};

// gen/front_end/panels/profiler/TopDownProfileDataGrid.js
var TopDownProfileDataGrid_exports = {};
__export(TopDownProfileDataGrid_exports, {
  TopDownProfileDataGridNode: () => TopDownProfileDataGridNode,
  TopDownProfileDataGridTree: () => TopDownProfileDataGridTree
});
var TopDownProfileDataGridNode = class _TopDownProfileDataGridNode extends ProfileDataGridNode {
  remainingChildren;
  constructor(profileNode, owningTree) {
    const hasChildren = Boolean(profileNode.children?.length);
    super(profileNode, owningTree, hasChildren);
    this.remainingChildren = profileNode.children;
  }
  static sharedPopulate(container) {
    const children = container.remainingChildren;
    const childrenLength = children.length;
    for (let i = 0; i < childrenLength; ++i) {
      container.appendChild(new _TopDownProfileDataGridNode(children[i], container.tree));
    }
    container.remainingChildren = [];
  }
  static excludeRecursively(container, aCallUID) {
    if (container.remainingChildren.length > 0) {
      container.populate();
    }
    container.save();
    const children = container.children;
    let index = container.children.length;
    while (index--) {
      _TopDownProfileDataGridNode.excludeRecursively(children[index], aCallUID);
    }
    const child = container.childrenByCallUID.get(aCallUID);
    if (child) {
      ProfileDataGridNode.merge(container, child, true);
    }
  }
  populateChildren() {
    _TopDownProfileDataGridNode.sharedPopulate(this);
  }
};
var TopDownProfileDataGridTree = class extends ProfileDataGridTree {
  remainingChildren;
  constructor(formatter, searchableView, rootProfileNode, total) {
    super(formatter, searchableView, total);
    this.remainingChildren = rootProfileNode.children;
    ProfileDataGridNode.populate(this);
  }
  focus(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }
    this.save();
    profileDataGridNode.savePosition();
    this.children = [profileDataGridNode];
    this.total = profileDataGridNode.total;
  }
  exclude(profileDataGridNode) {
    if (!profileDataGridNode) {
      return;
    }
    this.save();
    TopDownProfileDataGridNode.excludeRecursively(this, profileDataGridNode.callUID);
    if (this.lastComparator) {
      this.sort(this.lastComparator, true);
    }
  }
  restore() {
    if (!this.savedChildren) {
      return;
    }
    this.children[0].restorePosition();
    super.restore();
  }
  populateChildren() {
    TopDownProfileDataGridNode.sharedPopulate(this);
  }
};

// gen/front_end/panels/profiler/ProfileView.js
var UIStrings7 = {
  /**
   * @description Text in Profile View of a profiler tool
   */
  profile: "Profile",
  /**
   * @description Placeholder text in the search box of the JavaScript profiler tool. Users can search
   *the results by the cost in milliseconds, the name of the function, or the file name.
   */
  findByCostMsNameOrFile: "Find by cost (>50ms), name or file",
  /**
   * @description Text for a programming function
   */
  function: "Function",
  /**
   * @description Title of the Profiler tool
   */
  profiler: "Profiler",
  /**
   * @description Aria-label for profiles view combobox in memory tool
   */
  profileViewMode: "Profile view mode",
  /**
   * @description Tooltip text that appears when hovering over the largeicon visibility button in the Profile View of a profiler tool
   */
  focusSelectedFunction: "Focus selected function",
  /**
   * @description Tooltip text that appears when hovering over the largeicon delete button in the Profile View of a profiler tool
   */
  excludeSelectedFunction: "Exclude selected function",
  /**
   * @description Tooltip text that appears when hovering over the largeicon refresh button in the Profile View of a profiler tool
   */
  restoreAllFunctions: "Restore all functions",
  /**
   * @description Text in Profile View of a profiler tool
   */
  chart: "Chart",
  /**
   * @description Text in Profile View of a profiler tool
   */
  heavyBottomUp: "Heavy (Bottom Up)",
  /**
   * @description Text for selecting different profile views in the JS profiler tool. This option is a tree view.
   */
  treeTopDown: "Tree (Top Down)",
  /**
   * @description Name of a profile
   * @example {2} PH1
   */
  profileD: "Profile {PH1}",
  /**
   * @description Text in Profile View of a profiler tool
   * @example {4 MB} PH1
   */
  loadingD: "Loading\u2026 {PH1}%",
  /**
   * @description Text in Profile View of a profiler tool
   * @example {example.file} PH1
   * @example {cannot open file} PH2
   */
  fileSReadErrorS: "File ''{PH1}'' read error: {PH2}",
  /**
   * @description Text when something is loading
   */
  loading: "Loading\u2026",
  /**
   * @description Text in Profile View of a profiler tool
   */
  failedToReadFile: "Failed to read file",
  /**
   * @description Text in Profile View of a profiler tool
   */
  parsing: "Parsing\u2026",
  /**
   * @description Status indicator in the JS Profiler to show that a file has been successfully loaded
   * from file, as opposed to a profile that has been captured locally.
   */
  loaded: "Loaded"
};
var str_7 = i18n14.i18n.registerUIStrings("panels/profiler/ProfileView.ts", UIStrings7);
var i18nString7 = i18n14.i18n.getLocalizedString.bind(void 0, str_7);
var ProfileView = class extends UI8.View.SimpleView {
  profileInternal;
  searchableViewInternal;
  dataGrid;
  viewSelectComboBox;
  focusButton;
  excludeButton;
  resetButton;
  linkifierInternal;
  nodeFormatter;
  viewType;
  adjustedTotal;
  profileHeader;
  bottomUpProfileDataGridTree;
  topDownProfileDataGridTree;
  currentSearchResultIndex;
  dataProvider;
  flameChart;
  visibleView;
  searchableElement;
  profileDataGridTree;
  constructor() {
    super({
      title: i18nString7(UIStrings7.profile),
      viewId: "profile"
    });
    this.profileInternal = null;
    this.searchableViewInternal = new UI8.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.setPlaceholder(i18nString7(UIStrings7.findByCostMsNameOrFile));
    this.searchableViewInternal.show(this.element);
    const columns = [];
    columns.push({
      id: "self",
      title: this.columnHeader("self"),
      width: "120px",
      fixedWidth: true,
      sortable: true,
      sort: DataGrid5.DataGrid.Order.Descending,
      titleDOMFragment: void 0,
      align: void 0,
      editable: void 0,
      nonSelectable: void 0,
      longText: void 0,
      disclosure: void 0,
      weight: void 0,
      allowInSortByEvenWhenHidden: void 0,
      dataType: void 0,
      defaultWeight: void 0
    });
    columns.push({
      id: "total",
      title: this.columnHeader("total"),
      width: "120px",
      fixedWidth: true,
      sortable: true,
      sort: void 0,
      titleDOMFragment: void 0,
      align: void 0,
      editable: void 0,
      nonSelectable: void 0,
      longText: void 0,
      disclosure: void 0,
      weight: void 0,
      allowInSortByEvenWhenHidden: void 0,
      dataType: void 0,
      defaultWeight: void 0
    });
    columns.push({
      id: "function",
      title: i18nString7(UIStrings7.function),
      disclosure: true,
      sortable: true,
      sort: void 0,
      titleDOMFragment: void 0,
      align: void 0,
      editable: void 0,
      nonSelectable: void 0,
      longText: void 0,
      weight: void 0,
      allowInSortByEvenWhenHidden: void 0,
      dataType: void 0,
      defaultWeight: void 0,
      width: void 0,
      fixedWidth: void 0
    });
    this.dataGrid = new DataGrid5.DataGrid.DataGridImpl({
      displayName: i18nString7(UIStrings7.profiler),
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    this.dataGrid.addEventListener("SortingChanged", this.sortProfile, this);
    this.dataGrid.addEventListener("SelectedNode", this.nodeSelected.bind(this, true));
    this.dataGrid.addEventListener("DeselectedNode", this.nodeSelected.bind(this, false));
    this.dataGrid.setRowContextMenuCallback(this.populateContextMenu.bind(this));
    this.viewSelectComboBox = new UI8.Toolbar.ToolbarComboBox(this.changeView.bind(this), i18nString7(UIStrings7.profileViewMode), void 0, "profile-view.selected-view");
    this.focusButton = new UI8.Toolbar.ToolbarButton(i18nString7(UIStrings7.focusSelectedFunction), "eye", void 0, "profile-view.focus-selected-function");
    this.focusButton.setEnabled(false);
    this.focusButton.addEventListener("Click", this.focusClicked, this);
    this.excludeButton = new UI8.Toolbar.ToolbarButton(i18nString7(UIStrings7.excludeSelectedFunction), "cross", void 0, "profile-view.exclude-selected-function");
    this.excludeButton.setEnabled(false);
    this.excludeButton.addEventListener("Click", this.excludeClicked, this);
    this.resetButton = new UI8.Toolbar.ToolbarButton(i18nString7(UIStrings7.restoreAllFunctions), "refresh", void 0, "profile-view.restore-all-functions");
    this.resetButton.setEnabled(false);
    this.resetButton.addEventListener("Click", this.resetClicked, this);
    this.linkifierInternal = new Components.Linkifier.Linkifier(maxLinkLength);
  }
  static buildPopoverTable(popoverInfo) {
    const table = document.createElement("table");
    for (const entry of popoverInfo) {
      const row = table.createChild("tr");
      row.createChild("td").textContent = entry.title;
      row.createChild("td").textContent = entry.value;
    }
    return table;
  }
  setProfile(profile) {
    this.profileInternal = profile;
    this.bottomUpProfileDataGridTree = null;
    this.topDownProfileDataGridTree = null;
    this.changeView();
    this.refresh();
  }
  profile() {
    return this.profileInternal;
  }
  initialize(nodeFormatter) {
    this.nodeFormatter = nodeFormatter;
    this.viewType = Common6.Settings.Settings.instance().createSetting(
      "profile-view",
      "Heavy"
      /* ViewTypes.HEAVY */
    );
    const viewTypes = [
      "Flame",
      "Heavy",
      "Tree"
      /* ViewTypes.TREE */
    ];
    const optionNames = /* @__PURE__ */ new Map([
      ["Flame", i18nString7(UIStrings7.chart)],
      ["Heavy", i18nString7(UIStrings7.heavyBottomUp)],
      ["Tree", i18nString7(UIStrings7.treeTopDown)]
    ]);
    const options = new Map(viewTypes.map((type) => [type, this.viewSelectComboBox.createOption(optionNames.get(type), type)]));
    const optionName = this.viewType.get() || viewTypes[0];
    const option = options.get(optionName) || options.get(viewTypes[0]);
    this.viewSelectComboBox.select(option);
    this.changeView();
    if (this.flameChart) {
      this.flameChart.update();
    }
  }
  focus() {
    if (this.flameChart) {
      this.flameChart.focus();
    } else {
      super.focus();
    }
  }
  columnHeader(_columnId) {
    throw new Error("Not implemented");
  }
  selectRange(timeLeft, timeRight) {
    if (!this.flameChart) {
      return;
    }
    this.flameChart.selectRange(timeLeft, timeRight);
  }
  async toolbarItems() {
    return [this.viewSelectComboBox, this.focusButton, this.excludeButton, this.resetButton];
  }
  getBottomUpProfileDataGridTree() {
    if (!this.bottomUpProfileDataGridTree) {
      this.bottomUpProfileDataGridTree = new BottomUpProfileDataGridTree(this.nodeFormatter, this.searchableViewInternal, this.profileInternal.root, this.adjustedTotal);
    }
    return this.bottomUpProfileDataGridTree;
  }
  getTopDownProfileDataGridTree() {
    if (!this.topDownProfileDataGridTree) {
      this.topDownProfileDataGridTree = new TopDownProfileDataGridTree(this.nodeFormatter, this.searchableViewInternal, this.profileInternal.root, this.adjustedTotal);
    }
    return this.topDownProfileDataGridTree;
  }
  populateContextMenu(contextMenu, gridNode) {
    const node = gridNode;
    if (node.linkElement) {
      contextMenu.appendApplicableItems(node.linkElement);
    }
  }
  willHide() {
    super.willHide();
    this.currentSearchResultIndex = -1;
  }
  refresh() {
    if (!this.profileDataGridTree) {
      return;
    }
    const selectedProfileNode = this.dataGrid.selectedNode ? this.dataGrid.selectedNode.profileNode : null;
    this.dataGrid.rootNode().removeChildren();
    const children = this.profileDataGridTree.children;
    const count = children.length;
    for (let index = 0; index < count; ++index) {
      this.dataGrid.rootNode().appendChild(children[index]);
    }
    if (selectedProfileNode) {
      selectedProfileNode.selected = true;
    }
  }
  refreshVisibleData() {
    let child = this.dataGrid.rootNode().children[0];
    while (child) {
      child.refresh();
      child = child.traverseNextNode(false, null, true);
    }
  }
  searchableView() {
    return this.searchableViewInternal;
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
  onSearchCanceled() {
    if (this.searchableElement) {
      this.searchableElement.onSearchCanceled();
    }
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    if (this.searchableElement) {
      this.searchableElement.performSearch(searchConfig, shouldJump, jumpBackwards);
    }
  }
  jumpToNextSearchResult() {
    if (this.searchableElement) {
      this.searchableElement.jumpToNextSearchResult();
    }
  }
  jumpToPreviousSearchResult() {
    if (this.searchableElement) {
      this.searchableElement.jumpToPreviousSearchResult();
    }
  }
  linkifier() {
    return this.linkifierInternal;
  }
  createFlameChartDataProvider() {
    throw new Error("Not implemented");
  }
  ensureFlameChartCreated() {
    if (this.flameChart) {
      return;
    }
    this.dataProvider = this.createFlameChartDataProvider();
    this.flameChart = new ProfileFlameChart(this.searchableViewInternal, this.dataProvider);
    this.flameChart.addEventListener("EntryInvoked", (event) => {
      void this.onEntryInvoked(event);
    });
  }
  async onEntryInvoked(event) {
    if (!this.dataProvider) {
      return;
    }
    const entryIndex = event.data;
    const node = this.dataProvider.entryNodes[entryIndex];
    const debuggerModel = this.profileHeader.debuggerModel;
    if (!node || !node.scriptId || !debuggerModel) {
      return;
    }
    const script = debuggerModel.scriptForId(node.scriptId);
    if (!script) {
      return;
    }
    const location = debuggerModel.createRawLocation(script, node.lineNumber, node.columnNumber);
    const uiLocation = await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(location);
    void Common6.Revealer.reveal(uiLocation);
  }
  changeView() {
    if (!this.profileInternal) {
      return;
    }
    this.searchableViewInternal.closeSearch();
    if (this.visibleView) {
      this.visibleView.detach();
    }
    this.viewType.set(this.viewSelectComboBox.selectedOption().value);
    switch (this.viewType.get()) {
      case "Flame":
        this.ensureFlameChartCreated();
        this.visibleView = this.flameChart;
        this.searchableElement = this.flameChart;
        break;
      case "Tree":
        this.profileDataGridTree = this.getTopDownProfileDataGridTree();
        this.sortProfile();
        this.visibleView = this.dataGrid.asWidget();
        this.searchableElement = this.profileDataGridTree;
        break;
      case "Heavy":
        this.profileDataGridTree = this.getBottomUpProfileDataGridTree();
        this.sortProfile();
        this.visibleView = this.dataGrid.asWidget();
        this.searchableElement = this.profileDataGridTree;
        break;
    }
    const isFlame = this.viewType.get() === "Flame";
    this.focusButton.setVisible(!isFlame);
    this.excludeButton.setVisible(!isFlame);
    this.resetButton.setVisible(!isFlame);
    if (this.visibleView) {
      this.visibleView.show(this.searchableViewInternal.element);
    }
  }
  nodeSelected(selected) {
    this.focusButton.setEnabled(selected);
    this.excludeButton.setEnabled(selected);
  }
  focusClicked() {
    if (!this.dataGrid.selectedNode) {
      return;
    }
    this.resetButton.setEnabled(true);
    this.resetButton.element.focus();
    if (this.profileDataGridTree) {
      this.profileDataGridTree.focus(this.dataGrid.selectedNode);
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeFocused);
  }
  excludeClicked() {
    const selectedNode = this.dataGrid.selectedNode;
    if (!selectedNode) {
      return;
    }
    this.resetButton.setEnabled(true);
    this.resetButton.element.focus();
    selectedNode.deselect();
    if (this.profileDataGridTree) {
      this.profileDataGridTree.exclude(selectedNode);
    }
    this.refresh();
    this.refreshVisibleData();
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.CpuProfileNodeExcluded);
  }
  resetClicked() {
    this.viewSelectComboBox.element.focus();
    this.resetButton.setEnabled(false);
    if (this.profileDataGridTree) {
      this.profileDataGridTree.restore();
    }
    this.linkifierInternal.reset();
    this.refresh();
    this.refreshVisibleData();
  }
  sortProfile() {
    if (!this.profileDataGridTree) {
      return;
    }
    const sortAscending = this.dataGrid.isSortOrderAscending();
    const sortColumnId = this.dataGrid.sortColumnId();
    const sortProperty = sortColumnId === "function" ? "functionName" : sortColumnId || "";
    this.profileDataGridTree.sort(ProfileDataGridTree.propertyComparator(sortProperty, sortAscending), false);
    this.refresh();
  }
};
var maxLinkLength = 30;
var WritableProfileHeader = class extends ProfileHeader {
  debuggerModel;
  fileName;
  jsonifiedProfile;
  profile;
  protocolProfileInternal;
  #profileReceivedPromise = Promise.withResolvers();
  constructor(debuggerModel, type, title) {
    super(type, title || i18nString7(UIStrings7.profileD, { PH1: type.nextProfileUid() }));
    this.debuggerModel = debuggerModel;
  }
  onChunkTransferred(_reader) {
    if (this.jsonifiedProfile) {
      this.updateStatus(i18nString7(UIStrings7.loadingD, { PH1: i18n14.ByteUtilities.bytesToString(this.jsonifiedProfile.length) }));
    }
  }
  onError(reader) {
    const error = reader.error();
    if (error) {
      this.updateStatus(i18nString7(UIStrings7.fileSReadErrorS, { PH1: reader.fileName(), PH2: error.message }));
    }
  }
  async write(text) {
    this.jsonifiedProfile += text;
  }
  async close() {
  }
  dispose() {
    this.removeTempFile();
  }
  createSidebarTreeElement(panel) {
    return new ProfileSidebarTreeElement(panel, this, "profile-sidebar-tree-item");
  }
  canSaveToFile() {
    return !this.fromFile();
  }
  async saveToFile() {
    await this.#profileReceivedPromise.promise;
    const fileOutputStream = new Bindings.FileUtils.FileOutputStream();
    if (!this.fileName) {
      const now = Platform4.DateUtilities.toISO8601Compact(/* @__PURE__ */ new Date());
      const fileExtension = this.profileType().fileExtension();
      this.fileName = `${this.profileType().typeName()}-${now}${fileExtension}`;
    }
    const accepted = await fileOutputStream.open(this.fileName);
    if (!accepted || !this.tempFile) {
      return;
    }
    const data = await this.tempFile.read();
    if (data) {
      await fileOutputStream.write(data);
    }
    void fileOutputStream.close();
  }
  async loadFromFile(file) {
    this.updateStatus(i18nString7(UIStrings7.loading), true);
    const fileReader = new Bindings.FileUtils.ChunkedFileReader(file, 1e7, this.onChunkTransferred.bind(this));
    this.jsonifiedProfile = "";
    const success = await fileReader.read(this);
    if (!success) {
      this.onError(fileReader);
      return new Error(i18nString7(UIStrings7.failedToReadFile));
    }
    this.updateStatus(i18nString7(UIStrings7.parsing), true);
    let error = null;
    try {
      this.profile = JSON.parse(this.jsonifiedProfile);
      this.setProfile(this.profile);
      this.updateStatus(i18nString7(UIStrings7.loaded), false);
    } catch (e) {
      error = e;
      this.profileType().removeProfile(this);
    }
    this.jsonifiedProfile = null;
    if (this.profileType().profileBeingRecorded() === this) {
      this.profileType().setProfileBeingRecorded(null);
    }
    return error;
  }
  setProtocolProfile(profile) {
    this.setProfile(profile);
    this.protocolProfileInternal = profile;
    this.tempFile = new Bindings.TempFile.TempFile();
    this.tempFile.write([JSON.stringify(profile)]);
    this.#profileReceivedPromise.resolve();
  }
};

// gen/front_end/panels/profiler/HeapDetachedElementsView.js
var UIStrings8 = {
  /**
   * @description Button text to obtain the detached elements retained by JS
   */
  startDetachedElements: "Obtain detached elements",
  /**
   * @description The title for the collection of profiles that are gathered from various snapshots of the heap, using a sampling (e.g. every 1/100) technique.
   */
  detachedElementsTitle: "Detached elements",
  /**
   * @description Description in Heap Profile View of a profiler tool
   */
  detachedElementsDescription: "Detached elements shows objects that are retained by a JS reference.",
  /**
   * @description Name of a profile
   * @example {2} PH1
   */
  detachedElementProfile: "Detached elements {PH1}"
};
var str_8 = i18n16.i18n.registerUIStrings("panels/profiler/HeapDetachedElementsView.ts", UIStrings8);
var i18nString8 = i18n16.i18n.getLocalizedString.bind(void 0, str_8);
var DetachedElementsProfileView = class extends UI9.View.SimpleView {
  selectedSizeText;
  dataGrid;
  profile;
  parentDataDisplayDelegate;
  constructor(dataDisplayDelegate, profile) {
    super({
      title: i18nString8(UIStrings8.detachedElementsTitle),
      viewId: "detached-elements"
    });
    this.element.classList.add("detached-elements-view");
    this.profile = profile;
    this.parentDataDisplayDelegate = dataDisplayDelegate;
    this.selectedSizeText = new UI9.Toolbar.ToolbarText();
    this.dataGrid = new HeapDetachedElementsDataGrid();
    this.populateElementsGrid(profile.detachedElements);
    this.dataGrid.asWidget().show(this.element);
  }
  showProfile(profile) {
    return this.parentDataDisplayDelegate.showProfile(profile);
  }
  showObject(objectId, perspectiveName) {
    this.parentDataDisplayDelegate.showObject(objectId, perspectiveName);
  }
  async linkifyObject() {
    return null;
  }
  populateElementsGrid(detachedElements) {
    if (!detachedElements) {
      return;
    }
    const heapProfilerModel = this.profile.heapProfilerModel();
    const domModel = heapProfilerModel?.target().model(SDK4.DOMModel.DOMModel);
    if (!domModel) {
      return;
    }
    for (const detachedElement of detachedElements) {
      this.dataGrid.rootNode().appendChild(new HeapDetachedElementsDataGridNode(detachedElement, domModel));
    }
  }
  async toolbarItems() {
    return [...await super.toolbarItems(), this.selectedSizeText];
  }
};
var DetachedElementsProfileType = class extends Common7.ObjectWrapper.eventMixin(ProfileType) {
  constructor(typeId, description) {
    super(typeId || i18nString8(UIStrings8.detachedElementsTitle), description || i18nString8(UIStrings8.detachedElementsTitle));
  }
  profileBeingRecorded() {
    return super.profileBeingRecorded();
  }
  get buttonTooltip() {
    return i18nString8(UIStrings8.startDetachedElements);
  }
  buttonClicked() {
    void this.getDetachedElements();
    return false;
  }
  async getDetachedElements() {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = UI9.Context.Context.instance().flavor(SDK4.HeapProfilerModel.HeapProfilerModel);
    const target = heapProfilerModel?.target();
    const domModel = target?.model(SDK4.DOMModel.DOMModel);
    if (!heapProfilerModel || !target || !domModel) {
      return;
    }
    const animationModel = target?.model(SDK4.AnimationModel.AnimationModel);
    if (animationModel) {
      await animationModel.releaseAllAnimations();
    }
    const data = await domModel.getDetachedDOMNodes();
    const profile = new DetachedElementsProfileHeader(heapProfilerModel, this, data);
    this.addProfile(profile);
    this.dispatchEventToListeners("profile-complete", profile);
  }
  get treeItemTitle() {
    return i18nString8(UIStrings8.detachedElementsTitle);
  }
  get description() {
    return i18nString8(UIStrings8.detachedElementsDescription);
  }
  isInstantProfile() {
    return true;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TypeId = "DetachedElements";
};
var DetachedElementsProfileHeader = class extends WritableProfileHeader {
  #heapProfilerModel;
  detachedElements;
  constructor(heapProfilerModel, type, detachedElements, title) {
    super(heapProfilerModel?.debuggerModel() ?? null, type, title || i18nString8(UIStrings8.detachedElementProfile, { PH1: type.nextProfileUid() }));
    this.detachedElements = detachedElements;
    this.#heapProfilerModel = heapProfilerModel;
  }
  createView(dataDisplayDelegate) {
    return new DetachedElementsProfileView(dataDisplayDelegate, this);
  }
  heapProfilerModel() {
    return this.#heapProfilerModel;
  }
  profileType() {
    return super.profileType();
  }
};

// gen/front_end/panels/profiler/HeapProfileView.js
var HeapProfileView_exports = {};
__export(HeapProfileView_exports, {
  HeapFlameChartDataProvider: () => HeapFlameChartDataProvider,
  HeapProfileView: () => HeapProfileView,
  NodeFormatter: () => NodeFormatter,
  SamplingHeapProfileHeader: () => SamplingHeapProfileHeader,
  SamplingHeapProfileModel: () => SamplingHeapProfileModel,
  SamplingHeapProfileNode: () => SamplingHeapProfileNode,
  SamplingHeapProfileType: () => SamplingHeapProfileType,
  SamplingHeapProfileTypeBase: () => SamplingHeapProfileTypeBase
});
import * as Common9 from "./../../core/common/common.js";
import * as i18n19 from "./../../core/i18n/i18n.js";
import * as Platform6 from "./../../core/platform/platform.js";
import * as Root from "./../../core/root/root.js";
import * as SDK5 from "./../../core/sdk/sdk.js";
import * as CPUProfile from "./../../models/cpu_profile/cpu_profile.js";
import * as PerfUI4 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as Components2 from "./../../ui/legacy/components/utils/utils.js";
import * as UI11 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/HeapTimelineOverview.js
var HeapTimelineOverview_exports = {};
__export(HeapTimelineOverview_exports, {
  HeapTimelineOverview: () => HeapTimelineOverview,
  OverviewCalculator: () => OverviewCalculator2,
  Samples: () => Samples,
  SmoothScale: () => SmoothScale
});
import * as Common8 from "./../../core/common/common.js";
import * as i18n18 from "./../../core/i18n/i18n.js";
import * as Platform5 from "./../../core/platform/platform.js";
import * as PerfUI3 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as UI10 from "./../../ui/legacy/legacy.js";
import * as ThemeSupport from "./../../ui/legacy/theme_support/theme_support.js";
import * as VisualLogging3 from "./../../ui/visual_logging/visual_logging.js";
var HeapTimelineOverview = class extends Common8.ObjectWrapper.eventMixin(UI10.Widget.VBox) {
  overviewCalculator;
  overviewContainer;
  overviewGrid;
  overviewCanvas;
  windowLeftRatio;
  windowRightRatio;
  yScale;
  xScale;
  profileSamples;
  running;
  updateOverviewCanvas;
  updateGridTimerId;
  updateTimerId;
  windowWidthRatio;
  constructor() {
    super({ jslog: `${VisualLogging3.section("heap-tracking-overview")}` });
    this.element.id = "heap-recording-view";
    this.element.classList.add("heap-tracking-overview");
    this.overviewCalculator = new OverviewCalculator2();
    this.overviewContainer = this.element.createChild("div", "heap-overview-container");
    this.overviewGrid = new PerfUI3.OverviewGrid.OverviewGrid("heap-recording", this.overviewCalculator);
    this.overviewGrid.element.classList.add("fill");
    this.overviewCanvas = this.overviewContainer.createChild("canvas", "heap-recording-overview-canvas");
    this.overviewContainer.appendChild(this.overviewGrid.element);
    this.overviewGrid.addEventListener("WindowChanged", this.onWindowChanged, this);
    this.windowLeftRatio = 0;
    this.windowRightRatio = 1;
    this.overviewGrid.setWindowRatio(this.windowLeftRatio, this.windowRightRatio);
    this.yScale = new SmoothScale();
    this.xScale = new SmoothScale();
    this.profileSamples = new Samples();
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => this.update());
  }
  start() {
    this.running = true;
    const drawFrame = () => {
      this.update();
      if (this.running) {
        this.element.window().requestAnimationFrame(drawFrame);
      }
    };
    drawFrame();
  }
  stop() {
    this.running = false;
  }
  setSamples(samples) {
    this.profileSamples = samples;
    if (!this.running) {
      this.update();
    }
  }
  drawOverviewCanvas(width, height) {
    if (!this.profileSamples) {
      return;
    }
    const profileSamples = this.profileSamples;
    const sizes = profileSamples.sizes;
    const topSizes = profileSamples.max;
    const timestamps = profileSamples.timestamps;
    const startTime = timestamps[0];
    const scaleFactor = this.xScale.nextScale(width / profileSamples.totalTime);
    let maxSize = 0;
    function aggregateAndCall(sizes2, callback) {
      let size = 0;
      let currentX = 0;
      for (let i = 1; i < timestamps.length; ++i) {
        const x = Math.floor((timestamps[i] - startTime) * scaleFactor);
        if (x !== currentX) {
          if (size) {
            callback(currentX, size);
          }
          size = 0;
          currentX = x;
        }
        size += sizes2[i];
      }
      callback(currentX, size);
    }
    function maxSizeCallback(_x, size) {
      maxSize = Math.max(maxSize, size);
    }
    aggregateAndCall(sizes, maxSizeCallback);
    const yScaleFactor = this.yScale.nextScale(maxSize ? height / (maxSize * 1.1) : 0);
    this.overviewCanvas.width = width * window.devicePixelRatio;
    this.overviewCanvas.height = height * window.devicePixelRatio;
    this.overviewCanvas.style.width = width + "px";
    this.overviewCanvas.style.height = height + "px";
    const maybeContext = this.overviewCanvas.getContext("2d");
    if (!maybeContext) {
      throw new Error("Failed to get canvas context");
    }
    const context = maybeContext;
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    if (this.running) {
      context.beginPath();
      context.lineWidth = 2;
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-neutral-outline");
      const currentX = (Date.now() - startTime) * scaleFactor;
      context.moveTo(currentX, height - 1);
      context.lineTo(currentX, 0);
      context.stroke();
      context.closePath();
    }
    let gridY = 0;
    let gridValue;
    const gridLabelHeight = 14;
    if (yScaleFactor) {
      const maxGridValue = (height - gridLabelHeight) / yScaleFactor;
      gridValue = Math.pow(1024, Math.floor(Math.log(maxGridValue) / Math.log(1024)));
      gridValue *= Math.pow(10, Math.floor(Math.log(maxGridValue / gridValue) / Math.LN10));
      if (gridValue * 5 <= maxGridValue) {
        gridValue *= 5;
      }
      gridY = Math.round(height - gridValue * yScaleFactor - 0.5) + 0.5;
      context.beginPath();
      context.lineWidth = 1;
      context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-on-surface-subtle");
      context.moveTo(0, gridY);
      context.lineTo(width, gridY);
      context.stroke();
      context.closePath();
    }
    function drawBarCallback(x, size) {
      context.moveTo(x, height - 1);
      context.lineTo(x, Math.round(height - size * yScaleFactor - 1));
    }
    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-neutral-outline");
    aggregateAndCall(topSizes, drawBarCallback);
    context.stroke();
    context.closePath();
    context.beginPath();
    context.lineWidth = 2;
    context.strokeStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-primary-bright");
    aggregateAndCall(sizes, drawBarCallback);
    context.stroke();
    context.closePath();
    if (gridValue) {
      const label = i18n18.ByteUtilities.bytesToString(gridValue);
      const labelPadding = 4;
      const labelX = 0;
      const labelY = gridY - 0.5;
      const labelWidth = 2 * labelPadding + context.measureText(label).width;
      context.beginPath();
      context.textBaseline = "bottom";
      context.font = "10px " + window.getComputedStyle(this.element, null).getPropertyValue("font-family");
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--color-background-opacity-80");
      context.fillRect(labelX, labelY - gridLabelHeight, labelWidth, gridLabelHeight);
      context.fillStyle = ThemeSupport.ThemeSupport.instance().getComputedValue("--sys-color-on-surface-subtle");
      context.fillText(label, labelX + labelPadding, labelY);
      context.fill();
      context.closePath();
    }
  }
  onResize() {
    this.updateOverviewCanvas = true;
    this.scheduleUpdate();
  }
  onWindowChanged() {
    if (!this.updateGridTimerId) {
      this.updateGridTimerId = window.setTimeout(this.updateGrid.bind(this), 10);
    }
  }
  scheduleUpdate() {
    if (this.updateTimerId) {
      return;
    }
    this.updateTimerId = window.setTimeout(this.update.bind(this), 10);
  }
  updateBoundaries() {
    this.windowLeftRatio = this.overviewGrid.windowLeftRatio();
    this.windowRightRatio = this.overviewGrid.windowRightRatio();
    this.windowWidthRatio = this.windowRightRatio - this.windowLeftRatio;
  }
  update() {
    this.updateTimerId = null;
    if (!this.isShowing()) {
      return;
    }
    this.updateBoundaries();
    this.overviewCalculator.updateBoundaries(this);
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.drawOverviewCanvas(this.overviewContainer.clientWidth, this.overviewContainer.clientHeight - 20);
  }
  updateGrid() {
    this.updateGridTimerId = 0;
    this.updateBoundaries();
    const ids = this.profileSamples.ids;
    if (!ids.length) {
      return;
    }
    const timestamps = this.profileSamples.timestamps;
    const sizes = this.profileSamples.sizes;
    const startTime = timestamps[0];
    const totalTime = this.profileSamples.totalTime;
    const timeLeft = startTime + totalTime * this.windowLeftRatio;
    const timeRight = startTime + totalTime * this.windowRightRatio;
    const minIndex = Platform5.ArrayUtilities.lowerBound(timestamps, timeLeft, Platform5.ArrayUtilities.DEFAULT_COMPARATOR);
    const maxIndex = Platform5.ArrayUtilities.upperBound(timestamps, timeRight, Platform5.ArrayUtilities.DEFAULT_COMPARATOR);
    let size = 0;
    for (let i = minIndex; i < maxIndex; ++i) {
      size += sizes[i];
    }
    const minId = minIndex > 0 ? ids[minIndex - 1] : 0;
    const maxId = maxIndex < ids.length ? ids[maxIndex] : Infinity;
    this.dispatchEventToListeners("IdsRangeChanged", { minId, maxId, size });
  }
};
var SmoothScale = class {
  lastUpdate;
  currentScale;
  constructor() {
    this.lastUpdate = 0;
    this.currentScale = 0;
  }
  nextScale(target) {
    target = target || this.currentScale;
    if (this.currentScale) {
      const now = Date.now();
      const timeDeltaMs = now - this.lastUpdate;
      this.lastUpdate = now;
      const maxChangePerSec = 20;
      const maxChangePerDelta = Math.pow(maxChangePerSec, timeDeltaMs / 1e3);
      const scaleChange = target / this.currentScale;
      this.currentScale *= Platform5.NumberUtilities.clamp(scaleChange, 1 / maxChangePerDelta, maxChangePerDelta);
    } else {
      this.currentScale = target;
    }
    return this.currentScale;
  }
};
var Samples = class {
  sizes;
  ids;
  timestamps;
  max;
  totalTime;
  constructor() {
    this.sizes = [];
    this.ids = [];
    this.timestamps = [];
    this.max = [];
    this.totalTime = 3e4;
  }
};
var OverviewCalculator2 = class {
  maximumBoundaries;
  minimumBoundaries;
  xScaleFactor;
  constructor() {
    this.maximumBoundaries = 0;
    this.minimumBoundaries = 0;
    this.xScaleFactor = 0;
  }
  updateBoundaries(chart) {
    this.minimumBoundaries = 0;
    this.maximumBoundaries = chart.profileSamples.totalTime;
    this.xScaleFactor = chart.overviewContainer.clientWidth / this.maximumBoundaries;
  }
  computePosition(time) {
    return (time - this.minimumBoundaries) * this.xScaleFactor;
  }
  formatValue(value2, precision) {
    return i18n18.TimeUtilities.secondsToString(value2 / 1e3, Boolean(precision));
  }
  maximumBoundary() {
    return this.maximumBoundaries;
  }
  minimumBoundary() {
    return this.minimumBoundaries;
  }
  zeroTime() {
    return this.minimumBoundaries;
  }
  boundarySpan() {
    return this.maximumBoundaries - this.minimumBoundaries;
  }
};

// gen/front_end/panels/profiler/HeapProfileView.js
var UIStrings9 = {
  /**
   * @description The reported total size used in the selected time frame of the allocation sampling profile
   * @example {3 MB} PH1
   */
  selectedSizeS: "Selected size: {PH1}",
  /**
   * @description Name of column header that reports the size (in terms of bytes) used for a particular part of the heap, excluding the size of the children nodes of this part of the heap
   */
  selfSizeBytes: "Self size",
  /**
   * @description Name of column header that reports the total size (in terms of bytes) used for a particular part of the heap
   */
  totalSizeBytes: "Total size",
  /**
   * @description Button text to stop profiling the heap
   */
  stopHeapProfiling: "Stop heap profiling",
  /**
   * @description Button text to start profiling the heap
   */
  startHeapProfiling: "Start heap profiling",
  /**
   * @description Progress update that the profiler is recording the contents of the heap
   */
  recording: "Recording\u2026",
  /**
   * @description Icon title in Heap Profile View of a profiler tool
   */
  heapProfilerIsRecording: "Heap profiler is recording",
  /**
   * @description Progress update that the profiler is in the process of stopping its recording of the heap
   */
  stopping: "Stopping\u2026",
  /**
   * @description Sampling category to only profile allocations happening on the heap
   */
  allocationSampling: "Allocation sampling",
  /**
   * @description The title for the collection of profiles that are gathered from various snapshots of the heap, using a sampling (e.g. every 1/100) technique.
   */
  samplingProfiles: "Sampling profiles",
  /**
   * @description Description in Heap Profile View of a profiler tool
   */
  recordMemoryAllocations: "Approximate memory allocations by sampling long operations with minimal overhead and get a breakdown by JavaScript execution stack",
  /**
   * @description Name of a profile
   * @example {2} PH1
   */
  profileD: "Profile {PH1}",
  /**
   * @description Accessible text for the value in bytes in memory allocation or coverage view.
   * @example {12345} PH1
   */
  sBytes: "{PH1} bytes",
  /**
   * @description Text in CPUProfile View of a profiler tool
   * @example {21.33} PH1
   */
  formatPercent: "{PH1}\xA0%",
  /**
   * @description The formatted size in kilobytes, abbreviated to kB
   * @example {1,021} PH1
   */
  skb: "{PH1}\xA0kB",
  /**
   * @description Text for the name of something
   */
  name: "Name",
  /**
   * @description Tooltip of a cell that reports the size used for a particular part of the heap, excluding the size of the children nodes of this part of the heap
   */
  selfSize: "Self size",
  /**
   * @description Tooltip of a cell that reports the total size used for a particular part of the heap
   */
  totalSize: "Total size",
  /**
   * @description Text for web URLs
   */
  url: "URL"
};
var str_9 = i18n19.i18n.registerUIStrings("panels/profiler/HeapProfileView.ts", UIStrings9);
var i18nString9 = i18n19.i18n.getLocalizedString.bind(void 0, str_9);
function convertToSamplingHeapProfile(profileHeader) {
  return profileHeader.profile || profileHeader.protocolProfile();
}
var HeapProfileView = class extends ProfileView {
  profileHeader;
  profileType;
  adjustedTotal;
  selectedSizeText;
  timestamps;
  sizes;
  max;
  ordinals;
  totalTime;
  lastOrdinal;
  timelineOverview;
  constructor(profileHeader) {
    super();
    this.profileHeader = profileHeader;
    this.profileType = profileHeader.profileType();
    this.initialize(new NodeFormatter(this));
    const profile = new SamplingHeapProfileModel(convertToSamplingHeapProfile(profileHeader));
    this.adjustedTotal = profile.total;
    this.setProfile(profile);
    this.selectedSizeText = new UI11.Toolbar.ToolbarText();
    this.timestamps = [];
    this.sizes = [];
    this.max = [];
    this.ordinals = [];
    this.totalTime = 0;
    this.lastOrdinal = 0;
    this.timelineOverview = new HeapTimelineOverview();
    if (Root.Runtime.experiments.isEnabled("sampling-heap-profiler-timeline")) {
      this.timelineOverview.addEventListener("IdsRangeChanged", this.onIdsRangeChanged.bind(this));
      this.timelineOverview.show(this.element, this.element.firstChild);
      this.timelineOverview.start();
      this.profileType.addEventListener("StatsUpdate", this.onStatsUpdate, this);
      void this.profileType.once(
        "profile-complete"
        /* ProfileEvents.PROFILE_COMPLETE */
      ).then(() => {
        this.profileType.removeEventListener("StatsUpdate", this.onStatsUpdate, this);
        this.timelineOverview.stop();
        this.timelineOverview.updateGrid();
      });
    }
  }
  async toolbarItems() {
    return [...await super.toolbarItems(), this.selectedSizeText];
  }
  onIdsRangeChanged(event) {
    const { minId, maxId } = event.data;
    this.selectedSizeText.setText(i18nString9(UIStrings9.selectedSizeS, { PH1: i18n19.ByteUtilities.bytesToString(event.data.size) }));
    this.setSelectionRange(minId, maxId);
  }
  setSelectionRange(minId, maxId) {
    const profileData = convertToSamplingHeapProfile(this.profileHeader);
    const profile = new SamplingHeapProfileModel(profileData, minId, maxId);
    this.adjustedTotal = profile.total;
    this.setProfile(profile);
  }
  onStatsUpdate(event) {
    const profile = event.data;
    if (!this.totalTime) {
      this.timestamps = [];
      this.sizes = [];
      this.max = [];
      this.ordinals = [];
      this.totalTime = 3e4;
      this.lastOrdinal = 0;
    }
    this.sizes.fill(0);
    this.sizes.push(0);
    this.timestamps.push(Date.now());
    this.ordinals.push(this.lastOrdinal + 1);
    for (const sample of profile?.samples ?? []) {
      this.lastOrdinal = Math.max(this.lastOrdinal, sample.ordinal);
      const bucket = Platform6.ArrayUtilities.upperBound(this.ordinals, sample.ordinal, Platform6.ArrayUtilities.DEFAULT_COMPARATOR) - 1;
      this.sizes[bucket] += sample.size;
    }
    this.max.push(this.sizes[this.sizes.length - 1]);
    const lastTimestamp = this.timestamps[this.timestamps.length - 1];
    if (lastTimestamp - this.timestamps[0] > this.totalTime) {
      this.totalTime *= 2;
    }
    const samples = {
      sizes: this.sizes,
      max: this.max,
      ids: this.ordinals,
      timestamps: this.timestamps,
      totalTime: this.totalTime
    };
    this.timelineOverview.setSamples(samples);
  }
  columnHeader(columnId) {
    switch (columnId) {
      case "self":
        return i18nString9(UIStrings9.selfSizeBytes);
      case "total":
        return i18nString9(UIStrings9.totalSizeBytes);
    }
    return Common9.UIString.LocalizedEmptyString;
  }
  createFlameChartDataProvider() {
    return new HeapFlameChartDataProvider(this.profile(), this.profileHeader.heapProfilerModel());
  }
};
var SamplingHeapProfileTypeBase = class extends Common9.ObjectWrapper.eventMixin(ProfileType) {
  recording;
  clearedDuringRecording;
  constructor(typeId, description) {
    super(typeId, description);
    this.recording = false;
    this.clearedDuringRecording = false;
  }
  profileBeingRecorded() {
    return super.profileBeingRecorded();
  }
  typeName() {
    return "Heap";
  }
  fileExtension() {
    return ".heapprofile";
  }
  get buttonTooltip() {
    return this.recording ? i18nString9(UIStrings9.stopHeapProfiling) : i18nString9(UIStrings9.startHeapProfiling);
  }
  buttonClicked() {
    if (this.recording) {
      void this.stopRecordingProfile();
    } else {
      void this.startRecordingProfile();
    }
    return this.recording;
  }
  async startRecordingProfile() {
    const heapProfilerModel = UI11.Context.Context.instance().flavor(SDK5.HeapProfilerModel.HeapProfilerModel);
    if (this.profileBeingRecorded() || !heapProfilerModel) {
      return;
    }
    const profileHeader = new SamplingHeapProfileHeader(heapProfilerModel, this);
    this.setProfileBeingRecorded(profileHeader);
    this.addProfile(profileHeader);
    profileHeader.updateStatus(i18nString9(UIStrings9.recording));
    const warnings = [i18nString9(UIStrings9.heapProfilerIsRecording)];
    UI11.InspectorView.InspectorView.instance().setPanelWarnings("heap-profiler", warnings);
    this.recording = true;
    const target = heapProfilerModel.target();
    const animationModel = target.model(SDK5.AnimationModel.AnimationModel);
    if (animationModel) {
      await animationModel.releaseAllAnimations();
    }
    this.startSampling();
  }
  async stopRecordingProfile() {
    this.recording = false;
    const recordedProfile = this.profileBeingRecorded();
    if (!recordedProfile?.heapProfilerModel()) {
      return;
    }
    recordedProfile.updateStatus(i18nString9(UIStrings9.stopping));
    const profile = await this.stopSampling();
    if (recordedProfile) {
      console.assert(profile !== void 0);
      recordedProfile.setProtocolProfile(profile);
      recordedProfile.updateStatus("");
      this.setProfileBeingRecorded(null);
    }
    UI11.InspectorView.InspectorView.instance().setPanelWarnings("heap-profiler", []);
    const wasClearedDuringRecording = this.clearedDuringRecording;
    this.clearedDuringRecording = false;
    if (wasClearedDuringRecording) {
      return;
    }
    this.dispatchEventToListeners("profile-complete", recordedProfile);
  }
  createProfileLoadedFromFile(title) {
    return new SamplingHeapProfileHeader(null, this, title);
  }
  profileBeingRecordedRemoved() {
    this.clearedDuringRecording = true;
    void this.stopRecordingProfile();
  }
  startSampling() {
    throw new Error("Not implemented");
  }
  stopSampling() {
    throw new Error("Not implemented");
  }
};
var samplingHeapProfileTypeInstance;
var SamplingHeapProfileType = class _SamplingHeapProfileType extends SamplingHeapProfileTypeBase {
  updateTimer;
  updateIntervalMs;
  constructor() {
    super(_SamplingHeapProfileType.TypeId, i18nString9(UIStrings9.allocationSampling));
    if (!samplingHeapProfileTypeInstance) {
      samplingHeapProfileTypeInstance = this;
    }
    this.updateTimer = 0;
    this.updateIntervalMs = 200;
  }
  static get instance() {
    return samplingHeapProfileTypeInstance;
  }
  get treeItemTitle() {
    return i18nString9(UIStrings9.samplingProfiles);
  }
  get description() {
    const formattedDescription = [i18nString9(UIStrings9.recordMemoryAllocations)];
    return formattedDescription.join("\n");
  }
  hasTemporaryView() {
    return Root.Runtime.experiments.isEnabled("sampling-heap-profiler-timeline");
  }
  startSampling() {
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }
    void heapProfilerModel.startSampling();
    if (Root.Runtime.experiments.isEnabled("sampling-heap-profiler-timeline")) {
      this.updateTimer = window.setTimeout(() => {
        void this.updateStats();
      }, this.updateIntervalMs);
    }
  }
  obtainRecordingProfile() {
    const recordingProfile = this.profileBeingRecorded();
    if (recordingProfile) {
      const heapProfilerModel = recordingProfile.heapProfilerModel();
      return heapProfilerModel;
    }
    return null;
  }
  async stopSampling() {
    window.clearTimeout(this.updateTimer);
    this.updateTimer = 0;
    this.dispatchEventToListeners(
      "RecordingStopped"
      /* SamplingHeapProfileType.Events.RECORDING_STOPPED */
    );
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      throw new Error("No heap profiler model");
    }
    const samplingProfile = await heapProfilerModel.stopSampling();
    if (!samplingProfile) {
      throw new Error("No sampling profile found");
    }
    return samplingProfile;
  }
  async updateStats() {
    const heapProfilerModel = this.obtainRecordingProfile();
    if (!heapProfilerModel) {
      return;
    }
    const profile = await heapProfilerModel.getSamplingProfile();
    if (!this.updateTimer) {
      return;
    }
    this.dispatchEventToListeners("StatsUpdate", profile);
    this.updateTimer = window.setTimeout(() => {
      void this.updateStats();
    }, this.updateIntervalMs);
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TypeId = "SamplingHeap";
};
var SamplingHeapProfileHeader = class extends WritableProfileHeader {
  heapProfilerModelInternal;
  protocolProfileInternal;
  constructor(heapProfilerModel, type, title) {
    super(heapProfilerModel?.debuggerModel() ?? null, type, title || i18nString9(UIStrings9.profileD, { PH1: type.nextProfileUid() }));
    this.heapProfilerModelInternal = heapProfilerModel;
    this.protocolProfileInternal = {
      head: {
        callFrame: {
          functionName: "",
          scriptId: "",
          url: "",
          lineNumber: 0,
          columnNumber: 0
        },
        children: [],
        selfSize: 0,
        id: 0
      },
      samples: [],
      startTime: 0,
      endTime: 0,
      nodes: []
    };
  }
  createView() {
    return new HeapProfileView(this);
  }
  protocolProfile() {
    return this.protocolProfileInternal;
  }
  heapProfilerModel() {
    return this.heapProfilerModelInternal;
  }
  profileType() {
    return super.profileType();
  }
};
var SamplingHeapProfileNode = class extends CPUProfile.ProfileTreeModel.ProfileNode {
  self;
  constructor(node) {
    const callFrame = node.callFrame || {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      functionName: node["functionName"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      scriptId: node["scriptId"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      url: node["url"],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      lineNumber: node["lineNumber"] - 1,
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      columnNumber: node["columnNumber"] - 1
    };
    super(callFrame);
    this.self = node.selfSize;
  }
};
var SamplingHeapProfileModel = class extends CPUProfile.ProfileTreeModel.ProfileTreeModel {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules;
  constructor(profile, minOrdinal, maxOrdinal) {
    super();
    this.modules = profile.modules || [];
    let nodeIdToSizeMap = null;
    if (minOrdinal || maxOrdinal) {
      nodeIdToSizeMap = /* @__PURE__ */ new Map();
      minOrdinal = minOrdinal || 0;
      maxOrdinal = maxOrdinal || Infinity;
      for (const sample of profile.samples) {
        if (sample.ordinal < minOrdinal || sample.ordinal > maxOrdinal) {
          continue;
        }
        const size = nodeIdToSizeMap.get(sample.nodeId) || 0;
        nodeIdToSizeMap.set(sample.nodeId, size + sample.size);
      }
    }
    this.initialize(translateProfileTree(profile.head));
    function translateProfileTree(root) {
      const resultRoot = new SamplingHeapProfileNode(root);
      const sourceNodeStack = [root];
      const targetNodeStack = [resultRoot];
      while (sourceNodeStack.length) {
        const sourceNode = sourceNodeStack.pop();
        const targetNode = targetNodeStack.pop();
        targetNode.children = sourceNode.children.map((child) => {
          const targetChild = new SamplingHeapProfileNode(child);
          if (nodeIdToSizeMap) {
            targetChild.self = nodeIdToSizeMap.get(child.id) || 0;
          }
          return targetChild;
        });
        sourceNodeStack.push(...sourceNode.children);
        targetNodeStack.push(...targetNode.children);
      }
      pruneEmptyBranches(resultRoot);
      return resultRoot;
    }
    function pruneEmptyBranches(node) {
      node.children = node.children.filter(pruneEmptyBranches);
      return Boolean(node.children.length || node.self);
    }
  }
};
var NodeFormatter = class {
  profileView;
  constructor(profileView) {
    this.profileView = profileView;
  }
  formatValue(value2) {
    return i18n19.ByteUtilities.bytesToString(value2);
  }
  formatValueAccessibleText(value2) {
    return i18nString9(UIStrings9.sBytes, { PH1: value2 });
  }
  formatPercent(value2, _node) {
    return i18nString9(UIStrings9.formatPercent, { PH1: value2.toFixed(2) });
  }
  linkifyNode(node) {
    const heapProfilerModel = this.profileView.profileHeader.heapProfilerModel();
    const target = heapProfilerModel ? heapProfilerModel.target() : null;
    const options = {
      className: "profile-node-file",
      inlineFrameIndex: 0
    };
    return this.profileView.linkifier().maybeLinkifyConsoleCallFrame(target, node.profileNode.callFrame, options);
  }
};
var HeapFlameChartDataProvider = class extends ProfileFlameChartDataProvider {
  profile;
  heapProfilerModel;
  constructor(profile, heapProfilerModel) {
    super();
    this.profile = profile;
    this.heapProfilerModel = heapProfilerModel;
  }
  minimumBoundary() {
    return 0;
  }
  totalTime() {
    return this.profile.root.total;
  }
  entryHasDeoptReason(_entryIndex) {
    return false;
  }
  formatValue(value2, _precision) {
    return i18nString9(UIStrings9.skb, { PH1: Platform6.NumberUtilities.withThousandsSeparator(value2 / 1e3) });
  }
  calculateTimelineData() {
    function nodesCount(node) {
      return node.children.reduce((count2, node2) => count2 + nodesCount(node2), 1);
    }
    const count = nodesCount(this.profile.root);
    const entryNodes = new Array(count);
    const entryLevels = new Uint16Array(count);
    const entryTotalTimes = new Float32Array(count);
    const entryStartTimes = new Float64Array(count);
    let depth = 0;
    let maxDepth = 0;
    let position = 0;
    let index = 0;
    function addNode(node) {
      const start = position;
      entryNodes[index] = node;
      entryLevels[index] = depth;
      entryTotalTimes[index] = node.total;
      entryStartTimes[index] = position;
      ++index;
      ++depth;
      node.children.forEach(addNode);
      --depth;
      maxDepth = Math.max(maxDepth, depth);
      position = start + node.total;
    }
    addNode(this.profile.root);
    this.maxStackDepthInternal = maxDepth + 1;
    this.entryNodes = entryNodes;
    this.timelineDataInternal = PerfUI4.FlameChart.FlameChartTimelineData.create({ entryLevels, entryTotalTimes, entryStartTimes, groups: null });
    return this.timelineDataInternal;
  }
  preparePopoverElement(entryIndex) {
    const node = this.entryNodes[entryIndex];
    if (!node) {
      return null;
    }
    const popoverInfo = [];
    function pushRow(title, value2) {
      popoverInfo.push({ title, value: value2 });
    }
    pushRow(i18nString9(UIStrings9.name), UI11.UIUtils.beautifyFunctionName(node.functionName));
    pushRow(i18nString9(UIStrings9.selfSize), i18n19.ByteUtilities.bytesToString(node.self));
    pushRow(i18nString9(UIStrings9.totalSize), i18n19.ByteUtilities.bytesToString(node.total));
    const linkifier = new Components2.Linkifier.Linkifier();
    const link = linkifier.maybeLinkifyConsoleCallFrame(this.heapProfilerModel ? this.heapProfilerModel.target() : null, node.callFrame);
    if (link) {
      pushRow(i18nString9(UIStrings9.url), link.textContent);
    }
    linkifier.dispose();
    return ProfileView.buildPopoverTable(popoverInfo);
  }
};

// gen/front_end/panels/profiler/HeapSnapshotView.js
var HeapSnapshotView_exports = {};
__export(HeapSnapshotView_exports, {
  AllocationPerspective: () => AllocationPerspective,
  ComparisonPerspective: () => ComparisonPerspective,
  ContainmentPerspective: () => ContainmentPerspective,
  HeapAllocationStackView: () => HeapAllocationStackView,
  HeapProfileHeader: () => HeapProfileHeader,
  HeapSnapshotProfileType: () => HeapSnapshotProfileType,
  HeapSnapshotStatisticsView: () => HeapSnapshotStatisticsView,
  HeapSnapshotView: () => HeapSnapshotView,
  Perspective: () => Perspective,
  StatisticsPerspective: () => StatisticsPerspective,
  SummaryPerspective: () => SummaryPerspective,
  TrackingHeapSnapshotProfileType: () => TrackingHeapSnapshotProfileType
});
import * as Common13 from "./../../core/common/common.js";
import * as Host2 from "./../../core/host/host.js";
import * as i18n27 from "./../../core/i18n/i18n.js";
import * as Platform8 from "./../../core/platform/platform.js";
import * as Root2 from "./../../core/root/root.js";
import * as SDK7 from "./../../core/sdk/sdk.js";
import * as Bindings2 from "./../../models/bindings/bindings.js";
import * as HeapSnapshotModel5 from "./../../models/heap_snapshot_model/heap_snapshot_model.js";
import * as DataGrid11 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as ObjectUI from "./../../ui/legacy/components/object_ui/object_ui.js";
import * as PerfUI5 from "./../../ui/legacy/components/perf_ui/perf_ui.js";
import * as SettingsUI from "./../../ui/legacy/components/settings_ui/settings_ui.js";
import * as Components4 from "./../../ui/legacy/components/utils/utils.js";
import * as UI14 from "./../../ui/legacy/legacy.js";
import * as VisualLogging5 from "./../../ui/visual_logging/visual_logging.js";

// gen/front_end/panels/profiler/HeapSnapshotDataGrids.js
var HeapSnapshotDataGrids_exports = {};
__export(HeapSnapshotDataGrids_exports, {
  AllocationDataGrid: () => AllocationDataGrid,
  HeapSnapshotConstructorsDataGrid: () => HeapSnapshotConstructorsDataGrid,
  HeapSnapshotContainmentDataGrid: () => HeapSnapshotContainmentDataGrid,
  HeapSnapshotDiffDataGrid: () => HeapSnapshotDiffDataGrid,
  HeapSnapshotRetainmentDataGrid: () => HeapSnapshotRetainmentDataGrid,
  HeapSnapshotRetainmentDataGridEvents: () => HeapSnapshotRetainmentDataGridEvents,
  HeapSnapshotSortableDataGrid: () => HeapSnapshotSortableDataGrid,
  HeapSnapshotSortableDataGridEvents: () => HeapSnapshotSortableDataGridEvents,
  HeapSnapshotViewportDataGrid: () => HeapSnapshotViewportDataGrid
});
import * as Common11 from "./../../core/common/common.js";
import * as i18n23 from "./../../core/i18n/i18n.js";
import * as HeapSnapshotModel3 from "./../../models/heap_snapshot_model/heap_snapshot_model.js";
import * as DataGrid9 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as Components3 from "./../../ui/legacy/components/utils/utils.js";
import * as UI13 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/HeapSnapshotGridNodes.js
var HeapSnapshotGridNodes_exports = {};
__export(HeapSnapshotGridNodes_exports, {
  AllocationGridNode: () => AllocationGridNode,
  HeapSnapshotConstructorNode: () => HeapSnapshotConstructorNode,
  HeapSnapshotDiffNode: () => HeapSnapshotDiffNode,
  HeapSnapshotDiffNodesProvider: () => HeapSnapshotDiffNodesProvider,
  HeapSnapshotGenericObjectNode: () => HeapSnapshotGenericObjectNode,
  HeapSnapshotGridNode: () => HeapSnapshotGridNode,
  HeapSnapshotInstanceNode: () => HeapSnapshotInstanceNode,
  HeapSnapshotObjectNode: () => HeapSnapshotObjectNode,
  HeapSnapshotRetainingObjectNode: () => HeapSnapshotRetainingObjectNode
});
import * as Common10 from "./../../core/common/common.js";
import * as i18n21 from "./../../core/i18n/i18n.js";
import * as Platform7 from "./../../core/platform/platform.js";
import * as SDK6 from "./../../core/sdk/sdk.js";
import * as HeapSnapshotModel from "./../../models/heap_snapshot_model/heap_snapshot_model.js";
import * as IconButton3 from "./../../ui/components/icon_button/icon_button.js";
import * as DataGrid7 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI12 from "./../../ui/legacy/legacy.js";
import * as VisualLogging4 from "./../../ui/visual_logging/visual_logging.js";
var UIStrings10 = {
  /**
   * @description Generic text with two placeholders separated by a comma
   * @example {1 613 680} PH1
   * @example {44 %} PH2
   */
  genericStringsTwoPlaceholders: "{PH1}, {PH2}",
  /**
   * @description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  internalArray: "(internal array)[]",
  /**
   * @description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  userObjectReachableFromWindow: "User object reachable from window",
  /**
   * @description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  detachedFromDomTree: "Detached from DOM tree",
  /**
   * @description Text in Heap Snapshot Grid Nodes of a profiler tool
   */
  previewIsNotAvailable: "Preview is not available",
  /**
   * @description A context menu item in the Heap Profiler Panel of a profiler tool
   */
  revealInSummaryView: "Reveal in Summary view",
  /**
   * @description Text for the summary view
   */
  summary: "Summary",
  /**
   * @description A context menu item in the Heap Profiler Panel of a profiler tool
   * @example {SomeClassConstructor} PH1
   * @example {12345} PH2
   */
  revealObjectSWithIdSInSummary: "Reveal object ''{PH1}'' with id @{PH2} in Summary view",
  /**
   * @description Text to store an HTML element or JavaScript variable or expression result as a global variable
   */
  storeAsGlobalVariable: "Store as global variable",
  /**
   * @description Text to ignore an object shown in the Retainers pane
   */
  ignoreThisRetainer: "Ignore this retainer",
  /**
   * @description Text to undo the "Ignore this retainer" action
   */
  stopIgnoringThisRetainer: "Stop ignoring this retainer",
  /**
   * @description Text indicating that a node has been ignored with the "Ignore this retainer" action
   */
  ignored: "ignored",
  /**
   * @description Text in Heap Snapshot Grid Nodes of a profiler tool that indicates an element contained in another
   * element.
   */
  inElement: "in",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#compiled-code
   */
  compiledCodeSummary: "Internal data which V8 uses to run functions defined by JavaScript or WebAssembly.",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#concatenated-string
   */
  concatenatedStringSummary: "A string which represents the contents of two other strings joined together.",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#system-context
   */
  contextSummary: "An internal object containing variables from a JavaScript scope which may be needed by a function created within that scope.",
  /**
   * @description A short description of the data type internal type DescriptorArray, which is described more fully at https://v8.dev/blog/fast-properties
   */
  descriptorArraySummary: "A list of the property names used by a JavaScript Object.",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  internalArraySummary: "An internal array-like data structure (not a JavaScript Array).",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#internal-node
   */
  internalNodeSummary: "An object allocated by a component other than V8, such as C++ objects defined by Blink.",
  /**
   * @description A short description of the data type "system / Map" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#object-shape
   */
  mapSummary: "An internal object representing the shape of a JavaScript Object (not a JavaScript Map).",
  /**
   * @description A short summary of the "(object elements)[]" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  objectElementsSummary: "An internal object which stores the indexed properties in a JavaScript Object, such as the contents of an Array.",
  /**
   * @description A short summary of the "(object properties)[]" described at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#array
   */
  objectPropertiesSummary: "An internal object which stores the named properties in a JavaScript Object.",
  /**
   * @description A short summary of the text at https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#sliced-string
   */
  slicedStringSummary: "A string which represents some of the characters from another string."
};
var str_10 = i18n21.i18n.registerUIStrings("panels/profiler/HeapSnapshotGridNodes.ts", UIStrings10);
var i18nString10 = i18n21.i18n.getLocalizedString.bind(void 0, str_10);
var HeapSnapshotGridNodeBase = class extends DataGrid7.DataGrid.DataGridNode {
};
var HeapSnapshotGridNode = class _HeapSnapshotGridNode extends Common10.ObjectWrapper.eventMixin(HeapSnapshotGridNodeBase) {
  dataGridInternal;
  instanceCount;
  savedChildren;
  retrievedChildrenRanges;
  providerObject;
  reachableFromWindow;
  populated;
  constructor(tree, hasChildren) {
    super(null, hasChildren);
    this.dataGridInternal = tree;
    this.instanceCount = 0;
    this.savedChildren = /* @__PURE__ */ new Map();
    this.retrievedChildrenRanges = [];
    this.providerObject = null;
    this.reachableFromWindow = false;
  }
  get name() {
    return void 0;
  }
  createProvider() {
    throw new Error("Not implemented.");
  }
  comparator() {
    throw new Error("Not implemented.");
  }
  getHash() {
    throw new Error("Not implemented.");
  }
  createChildNode(_item) {
    throw new Error("Not implemented.");
  }
  retainersDataSource() {
    return null;
  }
  provider() {
    if (!this.providerObject) {
      this.providerObject = this.createProvider();
    }
    return this.providerObject;
  }
  createCell(columnId) {
    return super.createCell(columnId);
  }
  collapse() {
    super.collapse();
    this.dataGridInternal.updateVisibleNodes(true);
  }
  expand() {
    super.expand();
    this.dataGridInternal.updateVisibleNodes(true);
  }
  dispose() {
    if (this.providerObject) {
      this.providerObject.dispose();
    }
    for (let node = this.children[0]; node; node = node.traverseNextNode(true, this, true)) {
      node.dispose();
    }
  }
  queryObjectContent(_heapProfilerModel, _objectGroupName) {
    throw new Error("Not implemented.");
  }
  tryQueryObjectContent(_heapProfilerModel, _objectGroupName) {
    throw new Error("Not implemented.");
  }
  populateContextMenu(_contextMenu, _dataDisplayDelegate, _heapProfilerModel) {
  }
  toPercentString(num) {
    return num.toFixed(0) + "\xA0%";
  }
  toUIDistance(distance) {
    const baseSystemDistance = HeapSnapshotModel.HeapSnapshotModel.baseSystemDistance;
    return distance >= 0 && distance < baseSystemDistance ? distance.toString() : "\u2212";
  }
  allChildren() {
    return this.dataGridInternal.allChildren(this);
  }
  removeChildByIndex(index) {
    this.dataGridInternal.removeChildByIndex(this, index);
  }
  childForPosition(nodePosition) {
    let indexOfFirstChildInRange = 0;
    for (let i = 0; i < this.retrievedChildrenRanges.length; i++) {
      const range = this.retrievedChildrenRanges[i];
      if (range.from <= nodePosition && nodePosition < range.to) {
        const childIndex = indexOfFirstChildInRange + nodePosition - range.from;
        return this.allChildren()[childIndex];
      }
      indexOfFirstChildInRange += range.to - range.from + 1;
    }
    return null;
  }
  createValueCell(columnId) {
    const jslog = VisualLogging4.tableCell("numeric-column").track({ click: true });
    const cell = UI12.Fragment.html`<td class="numeric-column" jslog=${jslog} />`;
    const dataGrid = this.dataGrid;
    if (dataGrid.snapshot && dataGrid.snapshot.totalSize !== 0) {
      const div = document.createElement("div");
      const valueSpan = UI12.Fragment.html`<span>${this.data[columnId]}</span>`;
      div.appendChild(valueSpan);
      const percentColumn = columnId + "-percent";
      if (percentColumn in this.data) {
        const percentSpan = UI12.Fragment.html`<span class="percent-column">${this.data[percentColumn]}</span>`;
        div.appendChild(percentSpan);
        div.classList.add("profile-multiple-values");
        UI12.ARIAUtils.setHidden(valueSpan, true);
        UI12.ARIAUtils.setHidden(percentSpan, true);
        this.setCellAccessibleName(i18nString10(UIStrings10.genericStringsTwoPlaceholders, { PH1: this.data[columnId], PH2: this.data[percentColumn] }), cell, columnId);
      }
      cell.appendChild(div);
    }
    return cell;
  }
  populate() {
    if (this.populated) {
      return;
    }
    this.populated = true;
    void this.provider().sortAndRewind(this.comparator()).then(() => this.populateChildren());
  }
  expandWithoutPopulate() {
    this.populated = true;
    this.expand();
    return this.provider().sortAndRewind(this.comparator());
  }
  childHashForEntity(entity) {
    if ("edgeIndex" in entity) {
      return entity.edgeIndex;
    }
    return entity.id;
  }
  populateChildren(fromPosition, toPosition) {
    return new Promise((resolve) => {
      fromPosition = fromPosition || 0;
      toPosition = toPosition || fromPosition + this.dataGridInternal.defaultPopulateCount();
      let firstNotSerializedPosition = fromPosition;
      serializeNextChunk.call(this, toPosition);
      function serializeNextChunk(toPosition2) {
        if (firstNotSerializedPosition >= toPosition2) {
          return;
        }
        const end = Math.min(firstNotSerializedPosition + this.dataGridInternal.defaultPopulateCount(), toPosition2);
        void this.provider().serializeItemsRange(firstNotSerializedPosition, end).then((itemsRange) => childrenRetrieved.call(this, itemsRange, toPosition2));
        firstNotSerializedPosition = end;
      }
      function insertRetrievedChild(item, insertionIndex) {
        if (this.savedChildren) {
          const hash = this.childHashForEntity(item);
          const child = this.savedChildren.get(hash);
          if (child) {
            this.dataGridInternal.insertChild(this, child, insertionIndex);
            return;
          }
        }
        this.dataGridInternal.insertChild(this, this.createChildNode(item), insertionIndex);
      }
      function insertShowMoreButton(from, to, insertionIndex) {
        const button = new DataGrid7.ShowMoreDataGridNode.ShowMoreDataGridNode(this.populateChildren.bind(this), from, to, this.dataGridInternal.defaultPopulateCount());
        this.dataGridInternal.insertChild(this, button, insertionIndex);
      }
      function childrenRetrieved(itemsRange, toPosition2) {
        let itemIndex = 0;
        let itemPosition = itemsRange.startPosition;
        const items = itemsRange.items;
        let insertionIndex = 0;
        if (!this.retrievedChildrenRanges.length) {
          if (itemsRange.startPosition > 0) {
            this.retrievedChildrenRanges.push({ from: 0, to: 0 });
            insertShowMoreButton.call(this, 0, itemsRange.startPosition, insertionIndex++);
          }
          this.retrievedChildrenRanges.push({ from: itemsRange.startPosition, to: itemsRange.endPosition });
          for (let i = 0, l = items.length; i < l; ++i) {
            insertRetrievedChild.call(this, items[i], insertionIndex++);
          }
          if (itemsRange.endPosition < itemsRange.totalLength) {
            insertShowMoreButton.call(this, itemsRange.endPosition, itemsRange.totalLength, insertionIndex++);
          }
        } else {
          let rangeIndex = 0;
          let found = false;
          let range = { from: 0, to: 0 };
          while (rangeIndex < this.retrievedChildrenRanges.length) {
            range = this.retrievedChildrenRanges[rangeIndex];
            if (range.to >= itemPosition) {
              found = true;
              break;
            }
            insertionIndex += range.to - range.from;
            if (range.to < itemsRange.totalLength) {
              insertionIndex += 1;
            }
            ++rangeIndex;
          }
          if (!found || itemsRange.startPosition < range.from) {
            const button = this.allChildren()[insertionIndex - 1];
            button.setEndPosition(itemsRange.startPosition);
            insertShowMoreButton.call(this, itemsRange.startPosition, found ? range.from : itemsRange.totalLength, insertionIndex);
            range = { from: itemsRange.startPosition, to: itemsRange.startPosition };
            if (!found) {
              rangeIndex = this.retrievedChildrenRanges.length;
            }
            this.retrievedChildrenRanges.splice(rangeIndex, 0, range);
          } else {
            insertionIndex += itemPosition - range.from;
          }
          while (range.to < itemsRange.endPosition) {
            const skipCount = range.to - itemPosition;
            insertionIndex += skipCount;
            itemIndex += skipCount;
            itemPosition = range.to;
            const nextRange = this.retrievedChildrenRanges[rangeIndex + 1];
            let newEndOfRange = nextRange ? nextRange.from : itemsRange.totalLength;
            if (newEndOfRange > itemsRange.endPosition) {
              newEndOfRange = itemsRange.endPosition;
            }
            while (itemPosition < newEndOfRange) {
              insertRetrievedChild.call(this, items[itemIndex++], insertionIndex++);
              ++itemPosition;
            }
            if (nextRange && newEndOfRange === nextRange.from) {
              range.to = nextRange.to;
              this.removeChildByIndex(insertionIndex);
              this.retrievedChildrenRanges.splice(rangeIndex + 1, 1);
            } else {
              range.to = newEndOfRange;
              if (newEndOfRange === itemsRange.totalLength) {
                this.removeChildByIndex(insertionIndex);
              } else {
                this.allChildren()[insertionIndex].setStartPosition(itemsRange.endPosition);
              }
            }
          }
        }
        this.instanceCount += items.length;
        if (firstNotSerializedPosition < toPosition2 && firstNotSerializedPosition < itemsRange.totalLength) {
          serializeNextChunk.call(this, toPosition2);
          return;
        }
        if (this.expanded) {
          this.dataGridInternal.updateVisibleNodes(true);
        }
        resolve();
        this.dispatchEventToListeners(_HeapSnapshotGridNode.Events.PopulateComplete);
      }
    });
  }
  saveChildren() {
    this.savedChildren.clear();
    const children = this.allChildren();
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      if (!child.expanded) {
        continue;
      }
      this.savedChildren.set(child.getHash(), child);
    }
  }
  async sort() {
    this.dataGridInternal.recursiveSortingEnter();
    await this.provider().sortAndRewind(this.comparator());
    this.saveChildren();
    this.dataGridInternal.removeAllChildren(this);
    this.retrievedChildrenRanges = [];
    const instanceCount = this.instanceCount;
    this.instanceCount = 0;
    await this.populateChildren(0, instanceCount);
    for (const child of this.allChildren()) {
      if (child.expanded) {
        void child.sort();
      }
    }
    this.dataGridInternal.recursiveSortingLeave();
  }
};
(function(HeapSnapshotGridNode2) {
  let Events;
  (function(Events2) {
    Events2["PopulateComplete"] = "PopulateComplete";
  })(Events = HeapSnapshotGridNode2.Events || (HeapSnapshotGridNode2.Events = {}));
})(HeapSnapshotGridNode || (HeapSnapshotGridNode = {}));
var HeapSnapshotGenericObjectNode = class extends HeapSnapshotGridNode {
  referenceName;
  nameInternal;
  type;
  distance;
  shallowSize;
  retainedSize;
  snapshotNodeId;
  snapshotNodeIndex;
  detachedDOMTreeNode;
  linkElement;
  constructor(dataGrid, node) {
    super(dataGrid, false);
    if (!node) {
      return;
    }
    this.referenceName = null;
    this.nameInternal = node.name;
    this.type = node.type;
    this.distance = node.distance;
    this.shallowSize = node.selfSize;
    this.retainedSize = node.retainedSize;
    this.snapshotNodeId = node.id;
    this.snapshotNodeIndex = node.nodeIndex;
    if (this.type === "string") {
      this.reachableFromWindow = true;
    } else if (this.type === "object" && this.nameInternal.startsWith("Window")) {
      this.nameInternal = this.shortenWindowURL(this.nameInternal, false);
      this.reachableFromWindow = true;
    } else if (node.canBeQueried) {
      this.reachableFromWindow = true;
    }
    if (node.detachedDOMTreeNode) {
      this.detachedDOMTreeNode = true;
    }
    const snapshot = dataGrid.snapshot;
    const shallowSizePercent = this.shallowSize / snapshot.totalSize * 100;
    const retainedSizePercent = this.retainedSize / snapshot.totalSize * 100;
    this.data = {
      distance: this.toUIDistance(this.distance),
      shallowSize: i18n21.ByteUtilities.formatBytesToKb(this.shallowSize),
      retainedSize: i18n21.ByteUtilities.formatBytesToKb(this.retainedSize),
      "shallowSize-percent": this.toPercentString(shallowSizePercent),
      "retainedSize-percent": this.toPercentString(retainedSizePercent)
    };
  }
  get name() {
    return this.nameInternal;
  }
  retainersDataSource() {
    return this.snapshotNodeIndex === void 0 ? null : {
      snapshot: this.dataGridInternal.snapshot,
      snapshotNodeIndex: this.snapshotNodeIndex,
      snapshotNodeId: this.snapshotNodeId
    };
  }
  createCell(columnId) {
    const cell = columnId !== "object" ? this.createValueCell(columnId) : this.createObjectCell();
    return cell;
  }
  createObjectCell() {
    let value2 = this.nameInternal;
    let valueStyle = "object";
    switch (this.type) {
      case "concatenated string":
      case "string":
        value2 = `"${value2}"`;
        valueStyle = "string";
        break;
      case "regexp":
        value2 = `/${value2}/`;
        valueStyle = "string";
        break;
      case "closure":
        value2 = `${value2}()`;
        valueStyle = "function";
        break;
      case "bigint":
        valueStyle = "bigint";
        break;
      case "number":
        valueStyle = "number";
        break;
      case "hidden":
      case "object shape":
        valueStyle = "null";
        break;
      case "array":
        value2 = value2 ? `${value2}[]` : i18nString10(UIStrings10.internalArray);
        break;
    }
    return this.createObjectCellWithValue(valueStyle, value2 || "");
  }
  createObjectCellWithValue(valueStyle, value2) {
    const jslog = VisualLogging4.tableCell("object-column").track({ click: true });
    const fragment = UI12.Fragment.Fragment.build`
  <td class="object-column disclosure" jslog=${jslog}>
  <div class="source-code event-properties" style="overflow: visible;" $="container">
  <span class="value object-value-${valueStyle}">${value2}</span>
  <span class="object-value-id">@${this.snapshotNodeId}</span>
  </div>
  </td>`;
    const div = fragment.$("container");
    this.prefixObjectCell(div);
    if (this.reachableFromWindow) {
      const frameIcon = IconButton3.Icon.create("frame", "heap-object-tag");
      UI12.Tooltip.Tooltip.install(frameIcon, i18nString10(UIStrings10.userObjectReachableFromWindow));
      div.appendChild(frameIcon);
    }
    if (this.detachedDOMTreeNode) {
      const frameIcon = IconButton3.Icon.create("scissors", "heap-object-tag");
      UI12.Tooltip.Tooltip.install(frameIcon, i18nString10(UIStrings10.detachedFromDomTree));
      div.appendChild(frameIcon);
    }
    void this.appendSourceLocation(div);
    const cell = fragment.element();
    if (this.depth) {
      cell.style.setProperty("padding-left", this.depth * this.dataGrid.indentWidth + "px");
    }
    return cell;
  }
  prefixObjectCell(_div) {
  }
  async appendSourceLocation(div) {
    const linkContainer = UI12.Fragment.html`<span class="heap-object-source-link" />`;
    div.appendChild(linkContainer);
    const link = await this.dataGridInternal.dataDisplayDelegate().linkifyObject(this.snapshotNodeIndex);
    if (link) {
      link.setAttribute("tabindex", "0");
      linkContainer.appendChild(link);
      this.linkElement = link;
    } else {
      linkContainer.remove();
    }
  }
  async queryObjectContent(heapProfilerModel, objectGroupName) {
    const remoteObject = await this.tryQueryObjectContent(heapProfilerModel, objectGroupName);
    return remoteObject || this.tryGetTooltipDescription() || heapProfilerModel.runtimeModel().createRemoteObjectFromPrimitiveValue(i18nString10(UIStrings10.previewIsNotAvailable));
  }
  async tryQueryObjectContent(heapProfilerModel, objectGroupName) {
    if (this.type === "string") {
      return heapProfilerModel.runtimeModel().createRemoteObjectFromPrimitiveValue(this.nameInternal);
    }
    return await heapProfilerModel.objectForSnapshotObjectId(String(this.snapshotNodeId), objectGroupName);
  }
  tryGetTooltipDescription() {
    const baseLink = "https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots#";
    switch (this.type) {
      case "code":
        return { description: i18nString10(UIStrings10.compiledCodeSummary), link: baseLink + "compiled-code" };
      case "concatenated string":
        return { description: i18nString10(UIStrings10.concatenatedStringSummary), link: baseLink + "concatenated-string" };
      case "sliced string":
        return { description: i18nString10(UIStrings10.slicedStringSummary), link: baseLink + "sliced-string" };
    }
    switch (this.type + ":" + this.nameInternal) {
      case "array:":
        return { description: i18nString10(UIStrings10.internalArraySummary), link: baseLink + "array" };
      case "array:(object elements)":
        return { description: i18nString10(UIStrings10.objectElementsSummary), link: baseLink + "array" };
      case "array:(object properties)":
      case "hidden:system / PropertyArray":
        return { description: i18nString10(UIStrings10.objectPropertiesSummary), link: baseLink + "array" };
      case "object:system / Context":
        return { description: i18nString10(UIStrings10.contextSummary), link: baseLink + "system-context" };
      case "object shape:system / DescriptorArray":
        return { description: i18nString10(UIStrings10.descriptorArraySummary), link: baseLink + "object-shape" };
      case "object shape:system / Map":
        return { description: i18nString10(UIStrings10.mapSummary), link: baseLink + "object-shape" };
      case "native:InternalNode":
        return { description: i18nString10(UIStrings10.internalNodeSummary), link: baseLink + "internal-node" };
    }
    return void 0;
  }
  async updateHasChildren() {
    const isEmpty = await this.provider().isEmpty();
    this.setHasChildren(!isEmpty);
  }
  shortenWindowURL(fullName, hasObjectId) {
    const startPos = fullName.indexOf("/");
    const endPos = hasObjectId ? fullName.indexOf("@") : fullName.length;
    if (startPos === -1 || endPos === -1) {
      return fullName;
    }
    const fullURL = fullName.substring(startPos + 1, endPos).trimLeft();
    let url = Platform7.StringUtilities.trimURL(fullURL);
    if (url.length > 40) {
      url = Platform7.StringUtilities.trimMiddle(url, 40);
    }
    return fullName.substr(0, startPos + 2) + url + fullName.substr(endPos);
  }
  populateContextMenu(contextMenu, dataDisplayDelegate, heapProfilerModel) {
    if (this.shallowSize !== 0) {
      contextMenu.revealSection().appendItem(i18nString10(UIStrings10.revealInSummaryView), () => {
        dataDisplayDelegate.showObject(String(this.snapshotNodeId), i18nString10(UIStrings10.summary));
      }, { jslogContext: "reveal-in-summary" });
    }
    if (this.referenceName) {
      for (const match of this.referenceName.matchAll(/\((?<objectName>[^@)]*) @(?<snapshotNodeId>\d+)\)/g)) {
        const { objectName, snapshotNodeId } = match.groups;
        contextMenu.revealSection().appendItem(i18nString10(UIStrings10.revealObjectSWithIdSInSummary, { PH1: objectName, PH2: snapshotNodeId }), () => {
          dataDisplayDelegate.showObject(snapshotNodeId, i18nString10(UIStrings10.summary));
        }, { jslogContext: "reveal-in-summary" });
      }
    }
    if (heapProfilerModel) {
      contextMenu.revealSection().appendItem(i18nString10(UIStrings10.storeAsGlobalVariable), async () => {
        const remoteObject = await this.tryQueryObjectContent(heapProfilerModel, "");
        if (!remoteObject) {
          Common10.Console.Console.instance().error(i18nString10(UIStrings10.previewIsNotAvailable));
        } else {
          const consoleModel = heapProfilerModel.target().model(SDK6.ConsoleModel.ConsoleModel);
          await consoleModel?.saveToTempVariable(UI12.Context.Context.instance().flavor(SDK6.RuntimeModel.ExecutionContext), remoteObject);
        }
      }, { jslogContext: "store-as-global-variable" });
    }
  }
};
var HeapSnapshotObjectNode = class _HeapSnapshotObjectNode extends HeapSnapshotGenericObjectNode {
  referenceName;
  referenceType;
  edgeIndex;
  snapshot;
  parentObjectNode;
  cycledWithAncestorGridNode;
  constructor(dataGrid, snapshot, edge, parentObjectNode) {
    super(dataGrid, edge.node);
    this.referenceName = edge.name;
    this.referenceType = edge.type;
    this.edgeIndex = edge.edgeIndex;
    this.snapshot = snapshot;
    this.parentObjectNode = parentObjectNode;
    this.cycledWithAncestorGridNode = this.findAncestorWithSameSnapshotNodeId();
    if (!this.cycledWithAncestorGridNode) {
      void this.updateHasChildren();
    }
    const data = this.data;
    data["count"] = "";
    data["addedCount"] = "";
    data["removedCount"] = "";
    data["countDelta"] = "";
    data["addedSize"] = "";
    data["removedSize"] = "";
    data["sizeDelta"] = "";
  }
  retainersDataSource() {
    return this.snapshotNodeIndex === void 0 ? null : { snapshot: this.snapshot, snapshotNodeIndex: this.snapshotNodeIndex, snapshotNodeId: this.snapshotNodeId };
  }
  createProvider() {
    if (this.snapshotNodeIndex === void 0) {
      throw new Error("Cannot create a provider on a root node");
    }
    return this.snapshot.createEdgesProvider(this.snapshotNodeIndex);
  }
  findAncestorWithSameSnapshotNodeId() {
    let ancestor = this.parentObjectNode;
    while (ancestor) {
      if (ancestor.snapshotNodeId === this.snapshotNodeId) {
        return ancestor;
      }
      ancestor = ancestor.parentObjectNode;
    }
    return null;
  }
  createChildNode(item) {
    return new _HeapSnapshotObjectNode(this.dataGridInternal, this.snapshot, item, this);
  }
  getHash() {
    return this.edgeIndex;
  }
  comparator() {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case "object":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", sortAscending, "retainedSize", false);
      case "count":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", true, "retainedSize", false);
      case "shallowSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "!edgeName", true);
      case "retainedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("retainedSize", sortAscending, "!edgeName", true);
      case "distance":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("distance", sortAscending, "name", true);
      default:
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", true, "retainedSize", false);
    }
  }
  prefixObjectCell(div) {
    let name = this.referenceName || "(empty)";
    let nameClass = "name";
    switch (this.referenceType) {
      case "context":
        nameClass = "object-value-number";
        break;
      case "internal":
      case "hidden":
      case "weak":
        nameClass = "object-value-null";
        break;
      case "element":
        name = `[${name}]`;
        break;
    }
    if (this.cycledWithAncestorGridNode) {
      div.classList.add("cycled-ancestor-node");
    }
    div.prepend(UI12.Fragment.html`<span class="property-name ${nameClass}">${name}</span>
  <span class="grayed">${this.edgeNodeSeparator()}</span>`);
  }
  edgeNodeSeparator() {
    return "::";
  }
};
var HeapSnapshotRetainingObjectNode = class _HeapSnapshotRetainingObjectNode extends HeapSnapshotObjectNode {
  #ignored;
  constructor(dataGrid, snapshot, edge, parentRetainingObjectNode) {
    super(dataGrid, snapshot, edge, parentRetainingObjectNode);
    this.#ignored = edge.node.ignored;
    if (this.#ignored) {
      this.data["distance"] = i18nString10(UIStrings10.ignored);
    }
  }
  createProvider() {
    if (this.snapshotNodeIndex === void 0) {
      throw new Error("Cannot create providers on root nodes");
    }
    return this.snapshot.createRetainingEdgesProvider(this.snapshotNodeIndex);
  }
  createChildNode(item) {
    return new _HeapSnapshotRetainingObjectNode(this.dataGridInternal, this.snapshot, item, this);
  }
  edgeNodeSeparator() {
    return i18nString10(UIStrings10.inElement);
  }
  expand() {
    this.expandRetainersChain(20);
  }
  populateContextMenu(contextMenu, dataDisplayDelegate, heapProfilerModel) {
    super.populateContextMenu(contextMenu, dataDisplayDelegate, heapProfilerModel);
    const snapshotNodeIndex = this.snapshotNodeIndex;
    if (snapshotNodeIndex === void 0) {
      return;
    }
    if (this.#ignored) {
      contextMenu.revealSection().appendItem(i18nString10(UIStrings10.stopIgnoringThisRetainer), async () => {
        await this.snapshot.unignoreNodeInRetainersView(snapshotNodeIndex);
        await this.dataGridInternal.dataSourceChanged();
      }, { jslogContext: "stop-ignoring-this-retainer" });
    } else {
      contextMenu.revealSection().appendItem(i18nString10(UIStrings10.ignoreThisRetainer), async () => {
        await this.snapshot.ignoreNodeInRetainersView(snapshotNodeIndex);
        await this.dataGridInternal.dataSourceChanged();
      }, { jslogContext: "ignore-this-retainer" });
    }
  }
  isReachable() {
    return (this.distance ?? 0) < HeapSnapshotModel.HeapSnapshotModel.baseUnreachableDistance;
  }
  prefixObjectCell(div) {
    super.prefixObjectCell(div);
    if (!this.isReachable()) {
      div.classList.add("unreachable-ancestor-node");
    }
  }
  expandRetainersChain(maxExpandLevels) {
    if (!this.populated) {
      void this.once(HeapSnapshotGridNode.Events.PopulateComplete).then(() => this.expandRetainersChain(maxExpandLevels));
      this.populate();
      return;
    }
    super.expand();
    if (--maxExpandLevels > 0 && this.children.length > 0) {
      const retainer = this.children[0];
      if ((retainer.distance || 0) > 1 && retainer.isReachable()) {
        retainer.expandRetainersChain(maxExpandLevels);
        return;
      }
    }
    this.dataGridInternal.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ExpandRetainersComplete);
  }
  comparator() {
    const result = super.comparator();
    if (result.fieldName1 === "distance") {
      result.fieldName1 = "!edgeDistance";
    }
    if (result.fieldName2 === "distance") {
      result.fieldName2 = "!edgeDistance";
    }
    return result;
  }
};
var HeapSnapshotInstanceNode = class extends HeapSnapshotGenericObjectNode {
  baseSnapshotOrSnapshot;
  isDeletedNode;
  constructor(dataGrid, snapshot, node, isDeletedNode) {
    super(dataGrid, node);
    this.baseSnapshotOrSnapshot = snapshot;
    this.isDeletedNode = isDeletedNode;
    void this.updateHasChildren();
    const data = this.data;
    data["count"] = "";
    data["countDelta"] = "";
    data["sizeDelta"] = "";
    if (this.isDeletedNode) {
      data["addedCount"] = "";
      data["addedSize"] = "";
      data["removedCount"] = "\u2022";
      data["removedSize"] = i18n21.ByteUtilities.formatBytesToKb(this.shallowSize || 0);
    } else {
      data["addedCount"] = "\u2022";
      data["addedSize"] = i18n21.ByteUtilities.formatBytesToKb(this.shallowSize || 0);
      data["removedCount"] = "";
      data["removedSize"] = "";
    }
  }
  retainersDataSource() {
    return this.snapshotNodeIndex === void 0 ? null : {
      snapshot: this.baseSnapshotOrSnapshot,
      snapshotNodeIndex: this.snapshotNodeIndex,
      snapshotNodeId: this.snapshotNodeId
    };
  }
  createProvider() {
    if (this.snapshotNodeIndex === void 0) {
      throw new Error("Cannot create providers on root nodes");
    }
    return this.baseSnapshotOrSnapshot.createEdgesProvider(this.snapshotNodeIndex);
  }
  createChildNode(item) {
    return new HeapSnapshotObjectNode(this.dataGridInternal, this.baseSnapshotOrSnapshot, item, null);
  }
  getHash() {
    if (this.snapshotNodeId === void 0) {
      throw new Error("Cannot hash root nodes");
    }
    return this.snapshotNodeId;
  }
  comparator() {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case "object":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", sortAscending, "retainedSize", false);
      case "distance":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("distance", sortAscending, "retainedSize", false);
      case "count":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", true, "retainedSize", false);
      case "addedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "!edgeName", true);
      case "removedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "!edgeName", true);
      case "shallowSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "!edgeName", true);
      case "retainedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("retainedSize", sortAscending, "!edgeName", true);
      default:
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("!edgeName", true, "retainedSize", false);
    }
  }
};
var HeapSnapshotConstructorNode = class extends HeapSnapshotGridNode {
  nameInternal;
  nodeFilter;
  distance;
  count;
  shallowSize;
  retainedSize;
  classKey;
  #numberFormatter = new Intl.NumberFormat(i18n21.DevToolsLocale.DevToolsLocale.instance().locale);
  constructor(dataGrid, classKey, aggregate, nodeFilter) {
    super(dataGrid, aggregate.count > 0);
    this.nameInternal = aggregate.name;
    this.nodeFilter = nodeFilter;
    this.distance = aggregate.distance;
    this.count = aggregate.count;
    this.shallowSize = aggregate.self;
    this.retainedSize = aggregate.maxRet;
    this.classKey = classKey;
    const snapshot = dataGrid.snapshot;
    const retainedSizePercent = this.retainedSize / snapshot.totalSize * 100;
    const shallowSizePercent = this.shallowSize / snapshot.totalSize * 100;
    this.data = {
      object: this.nameInternal,
      count: this.#numberFormatter.format(this.count),
      distance: this.toUIDistance(this.distance),
      shallowSize: i18n21.ByteUtilities.formatBytesToKb(this.shallowSize),
      retainedSize: i18n21.ByteUtilities.formatBytesToKb(this.retainedSize),
      "shallowSize-percent": this.toPercentString(shallowSizePercent),
      "retainedSize-percent": this.toPercentString(retainedSizePercent)
    };
  }
  get name() {
    return this.nameInternal;
  }
  createProvider() {
    return this.dataGridInternal.snapshot.createNodesProviderForClass(this.classKey, this.nodeFilter);
  }
  async populateNodeBySnapshotObjectId(snapshotObjectId) {
    this.dataGridInternal.resetNameFilter();
    await this.expandWithoutPopulate();
    const nodePosition = await this.provider().nodePosition(snapshotObjectId);
    if (nodePosition === -1) {
      this.collapse();
      return [];
    }
    await this.populateChildren(nodePosition, null);
    const node = this.childForPosition(nodePosition);
    return node ? [this, node] : [];
  }
  filteredOut(filterValue) {
    return this.nameInternal.toLowerCase().indexOf(filterValue) === -1;
  }
  createCell(columnId) {
    const cell = columnId === "object" ? super.createCell(columnId) : this.createValueCell(columnId);
    if (columnId === "object" && this.count > 1) {
      cell.appendChild(UI12.Fragment.html`<span class="objects-count">×${this.data.count}</span>`);
    }
    return cell;
  }
  createChildNode(item) {
    return new HeapSnapshotInstanceNode(this.dataGridInternal, this.dataGridInternal.snapshot, item, false);
  }
  comparator() {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case "object":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("name", sortAscending, "id", true);
      case "distance":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("distance", sortAscending, "retainedSize", false);
      case "shallowSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "id", true);
      case "retainedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("retainedSize", sortAscending, "id", true);
      default:
        throw new Error(`Invalid sort column id ${sortColumnId}`);
    }
  }
};
var HeapSnapshotDiffNodesProvider = class {
  addedNodesProvider;
  deletedNodesProvider;
  addedCount;
  removedCount;
  constructor(addedNodesProvider, deletedNodesProvider, addedCount, removedCount) {
    this.addedNodesProvider = addedNodesProvider;
    this.deletedNodesProvider = deletedNodesProvider;
    this.addedCount = addedCount;
    this.removedCount = removedCount;
  }
  dispose() {
    this.addedNodesProvider.dispose();
    this.deletedNodesProvider.dispose();
  }
  nodePosition(_snapshotObjectId) {
    throw new Error("Unreachable");
  }
  isEmpty() {
    return Promise.resolve(false);
  }
  async serializeItemsRange(beginPosition, endPosition) {
    let itemsRange;
    let addedItems;
    if (beginPosition < this.addedCount) {
      itemsRange = await this.addedNodesProvider.serializeItemsRange(beginPosition, endPosition);
      for (const item of itemsRange.items) {
        item.isAddedNotRemoved = true;
      }
      if (itemsRange.endPosition >= endPosition) {
        itemsRange.totalLength = this.addedCount + this.removedCount;
        return itemsRange;
      }
      addedItems = itemsRange;
      itemsRange = await this.deletedNodesProvider.serializeItemsRange(0, endPosition - itemsRange.endPosition);
    } else {
      addedItems = new HeapSnapshotModel.HeapSnapshotModel.ItemsRange(0, 0, 0, []);
      itemsRange = await this.deletedNodesProvider.serializeItemsRange(beginPosition - this.addedCount, endPosition - this.addedCount);
    }
    if (!addedItems.items.length) {
      addedItems.startPosition = this.addedCount + itemsRange.startPosition;
    }
    for (const item of itemsRange.items) {
      item.isAddedNotRemoved = false;
    }
    addedItems.items.push(...itemsRange.items);
    addedItems.endPosition = this.addedCount + itemsRange.endPosition;
    addedItems.totalLength = this.addedCount + this.removedCount;
    return addedItems;
  }
  async sortAndRewind(comparator) {
    await this.addedNodesProvider.sortAndRewind(comparator);
    await this.deletedNodesProvider.sortAndRewind(comparator);
  }
};
var HeapSnapshotDiffNode = class extends HeapSnapshotGridNode {
  nameInternal;
  addedCount;
  removedCount;
  countDelta;
  addedSize;
  removedSize;
  sizeDelta;
  deletedIndexes;
  classKey;
  constructor(dataGrid, classKey, diffForClass) {
    super(dataGrid, true);
    this.nameInternal = diffForClass.name;
    this.addedCount = diffForClass.addedCount;
    this.removedCount = diffForClass.removedCount;
    this.countDelta = diffForClass.countDelta;
    this.addedSize = diffForClass.addedSize;
    this.removedSize = diffForClass.removedSize;
    this.sizeDelta = diffForClass.sizeDelta;
    this.deletedIndexes = diffForClass.deletedIndexes;
    this.classKey = classKey;
    this.data = {
      object: this.nameInternal,
      addedCount: Platform7.NumberUtilities.withThousandsSeparator(this.addedCount),
      removedCount: Platform7.NumberUtilities.withThousandsSeparator(this.removedCount),
      countDelta: this.signForDelta(this.countDelta) + Platform7.NumberUtilities.withThousandsSeparator(Math.abs(this.countDelta)),
      addedSize: i18n21.ByteUtilities.bytesToString(this.addedSize),
      removedSize: i18n21.ByteUtilities.bytesToString(this.removedSize),
      sizeDelta: this.signForDelta(this.sizeDelta) + i18n21.ByteUtilities.bytesToString(Math.abs(this.sizeDelta))
    };
  }
  get name() {
    return this.nameInternal;
  }
  createProvider() {
    const tree = this.dataGridInternal;
    if (tree.snapshot === null || tree.baseSnapshot?.uid === void 0) {
      throw new Error("Data sources have not been set correctly");
    }
    const addedNodesProvider = tree.snapshot.createAddedNodesProvider(tree.baseSnapshot.uid, this.classKey);
    const deletedNodesProvider = tree.baseSnapshot.createDeletedNodesProvider(this.deletedIndexes);
    if (!addedNodesProvider || !deletedNodesProvider) {
      throw new Error("Failed to create node providers");
    }
    return new HeapSnapshotDiffNodesProvider(addedNodesProvider, deletedNodesProvider, this.addedCount, this.removedCount);
  }
  createCell(columnId) {
    const cell = super.createCell(columnId);
    if (columnId !== "object") {
      cell.classList.add("numeric-column");
    }
    return cell;
  }
  createChildNode(item) {
    const dataGrid = this.dataGridInternal;
    if (item.isAddedNotRemoved) {
      if (dataGrid.snapshot === null) {
        throw new Error("Data sources have not been set correctly");
      }
      return new HeapSnapshotInstanceNode(this.dataGridInternal, dataGrid.snapshot, item, false);
    }
    if (dataGrid.baseSnapshot === void 0) {
      throw new Error("Data sources have not been set correctly");
    }
    return new HeapSnapshotInstanceNode(this.dataGridInternal, dataGrid.baseSnapshot, item, true);
  }
  comparator() {
    const sortAscending = this.dataGridInternal.isSortOrderAscending();
    const sortColumnId = this.dataGridInternal.sortColumnId();
    switch (sortColumnId) {
      case "object":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("name", sortAscending, "id", true);
      case "addedCount":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("name", true, "id", true);
      case "removedCount":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("name", true, "id", true);
      case "countDelta":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("name", true, "id", true);
      case "addedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "id", true);
      case "removedSize":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "id", true);
      case "sizeDelta":
        return new HeapSnapshotModel.HeapSnapshotModel.ComparatorConfig("selfSize", sortAscending, "id", true);
      default:
        throw new Error(`Invalid sort column ${sortColumnId}`);
    }
  }
  filteredOut(filterValue) {
    return this.nameInternal.toLowerCase().indexOf(filterValue) === -1;
  }
  signForDelta(delta) {
    if (delta === 0) {
      return "";
    }
    if (delta > 0) {
      return "+";
    }
    return "\u2212";
  }
};
var AllocationGridNode = class _AllocationGridNode extends HeapSnapshotGridNode {
  populated;
  allocationNode;
  constructor(dataGrid, data) {
    super(dataGrid, data.hasChildren);
    this.populated = false;
    this.allocationNode = data;
    this.data = {
      liveCount: Platform7.NumberUtilities.withThousandsSeparator(data.liveCount),
      count: Platform7.NumberUtilities.withThousandsSeparator(data.count),
      liveSize: i18n21.ByteUtilities.bytesToString(data.liveSize),
      size: i18n21.ByteUtilities.bytesToString(data.size),
      name: data.name
    };
  }
  populate() {
    if (this.populated) {
      return;
    }
    void this.doPopulate();
  }
  async doPopulate() {
    this.populated = true;
    const callers = await this.dataGridInternal.snapshot.allocationNodeCallers(this.allocationNode.id);
    const callersChain = callers.nodesWithSingleCaller;
    let parentNode = this;
    const dataGrid = this.dataGridInternal;
    for (const caller of callersChain) {
      const child = new _AllocationGridNode(dataGrid, caller);
      dataGrid.appendNode(parentNode, child);
      parentNode = child;
      parentNode.populated = true;
      if (this.expanded) {
        parentNode.expand();
      }
    }
    const callersBranch = callers.branchingCallers;
    callersBranch.sort(this.dataGridInternal.createComparator());
    for (const caller of callersBranch) {
      dataGrid.appendNode(parentNode, new _AllocationGridNode(dataGrid, caller));
    }
    dataGrid.updateVisibleNodes(true);
  }
  expand() {
    super.expand();
    if (this.children.length === 1) {
      this.children[0].expand();
    }
  }
  createCell(columnId) {
    if (columnId !== "name") {
      return this.createValueCell(columnId);
    }
    const cell = super.createCell(columnId);
    const allocationNode = this.allocationNode;
    const heapProfilerModel = this.dataGridInternal.heapProfilerModel();
    if (allocationNode.scriptId) {
      const linkifier = this.dataGridInternal.linkifier;
      const urlElement = linkifier.linkifyScriptLocation(heapProfilerModel ? heapProfilerModel.target() : null, String(allocationNode.scriptId), allocationNode.scriptName, allocationNode.line - 1, {
        columnNumber: allocationNode.column - 1,
        inlineFrameIndex: 0,
        className: "profile-node-file"
      });
      urlElement.style.maxWidth = "75%";
      cell.insertBefore(urlElement, cell.firstChild);
    }
    return cell;
  }
  allocationNodeId() {
    return this.allocationNode.id;
  }
};

// gen/front_end/panels/profiler/HeapSnapshotDataGrids.js
var UIStrings11 = {
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  distanceFromWindowObject: "Distance from window object",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  sizeOfTheObjectItselfInBytes: "Size of the object itself in bytes",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  sizeOfTheObjectPlusTheGraphIt: "Size of the object plus the graph it retains in bytes",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  object: "Object",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  distance: "Distance",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool. Shallow size is the size of just this node, not including children/retained size.
   */
  shallowSize: "Shallow Size",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  retainedSize: "Retained Size",
  /**
   * @description Title for a section in the Heap Snapshot view. This title is for a table which
   * shows retaining relationships between JavaScript objects. One object retains another if it holds
   * a reference to it, keeping it alive.
   */
  heapSnapshotRetainment: "Heap Snapshot Retainment",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  constructorString: "Constructor",
  /**
   * @description Data grid name for Heap Snapshot Constructors data grids
   */
  heapSnapshotConstructors: "Heap Snapshot Constructors",
  /**
   * @description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is number of new objects in snapshot #2 compared to snapshot #1.
   */
  New: "# New",
  /**
   * @description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is number of deleted objects in snapshot #2 compared to snapshot #1.
   */
  Deleted: "# Deleted",
  /**
   * @description Column header in a table displaying the diff between two Heap Snapshots. This
   * column is the difference (delta) between the # New and # Deleted objects in the snapshot.
   */
  Delta: "# Delta",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  allocSize: "Alloc. Size",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  freedSize: "Freed Size",
  /**
   * @description Title of a column in a table in the Heap Snapshot tool. 'Delta' here means
   * difference, so the whole string means 'difference in size'.
   */
  sizeDelta: "Size Delta",
  /**
   * @description Data grid name for Heap Snapshot Diff data grids
   */
  heapSnapshotDiff: "Heap Snapshot Diff",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  liveCount: "Live Count",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  count: "Count",
  /**
   * @description Text in Heap Snapshot Data Grids of a profiler tool
   */
  liveSize: "Live Size",
  /**
   * @description Text for the size of something
   */
  size: "Size",
  /**
   * @description Text for a programming function
   */
  function: "Function",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allocation: "Allocation"
};
var str_11 = i18n23.i18n.registerUIStrings("panels/profiler/HeapSnapshotDataGrids.ts", UIStrings11);
var i18nString11 = i18n23.i18n.getLocalizedString.bind(void 0, str_11);
var adjacencyMap = /* @__PURE__ */ new WeakMap();
var HeapSnapshotSortableDataGridBase = class extends DataGrid9.DataGrid.DataGridImpl {
};
var HeapSnapshotSortableDataGrid = class extends Common11.ObjectWrapper.eventMixin(HeapSnapshotSortableDataGridBase) {
  snapshot;
  selectedNode;
  heapProfilerModelInternal;
  dataDisplayDelegateInternal;
  recursiveSortingDepth;
  populatedAndSorted;
  nameFilter;
  nodeFilterInternal;
  lastSortColumnId;
  lastSortAscending;
  constructor(heapProfilerModel, dataDisplayDelegate, dataGridParameters) {
    super(dataGridParameters);
    this.snapshot = null;
    this.selectedNode = null;
    this.heapProfilerModelInternal = heapProfilerModel;
    this.dataDisplayDelegateInternal = dataDisplayDelegate;
    const tooltips = [
      ["distance", i18nString11(UIStrings11.distanceFromWindowObject)],
      ["shallowSize", i18nString11(UIStrings11.sizeOfTheObjectItselfInBytes)],
      ["retainedSize", i18nString11(UIStrings11.sizeOfTheObjectPlusTheGraphIt)]
    ];
    for (const info of tooltips) {
      const headerCell = this.headerTableHeader(info[0]);
      if (headerCell) {
        headerCell.setAttribute("title", info[1]);
      }
    }
    this.recursiveSortingDepth = 0;
    this.populatedAndSorted = false;
    this.nameFilter = null;
    this.nodeFilterInternal = new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter();
    this.addEventListener(HeapSnapshotSortableDataGridEvents.SortingComplete, this.sortingComplete, this);
    this.addEventListener("SortingChanged", this.sortingChanged, this);
    this.setRowContextMenuCallback(this.populateContextMenu.bind(this));
  }
  async setDataSource(_snapshot, _nodeIndex) {
  }
  isFilteredOut(node) {
    const nameFilterValue = this.nameFilter ? this.nameFilter.value().toLowerCase() : "";
    if (nameFilterValue && (node instanceof HeapSnapshotDiffNode || node instanceof HeapSnapshotConstructorNode) && node.filteredOut(nameFilterValue)) {
      return true;
    }
    return false;
  }
  heapProfilerModel() {
    return this.heapProfilerModelInternal;
  }
  dataDisplayDelegate() {
    return this.dataDisplayDelegateInternal;
  }
  nodeFilter() {
    return this.nodeFilterInternal;
  }
  setNameFilter(nameFilter) {
    this.nameFilter = nameFilter;
  }
  defaultPopulateCount() {
    return 100;
  }
  disposeAllNodes() {
    const children = this.topLevelNodes();
    for (let i = 0, l = children.length; i < l; ++i) {
      children[i].dispose();
    }
  }
  wasShown() {
    super.wasShown();
    if (this.nameFilter) {
      this.nameFilter.addEventListener("TextChanged", this.onNameFilterChanged, this);
      this.updateVisibleNodes(true);
    }
    if (this.populatedAndSorted) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ContentShown, this);
    }
  }
  sortingComplete() {
    this.removeEventListener(HeapSnapshotSortableDataGridEvents.SortingComplete, this.sortingComplete, this);
    this.populatedAndSorted = true;
    this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.ContentShown, this);
  }
  willHide() {
    super.willHide();
    if (this.nameFilter) {
      this.nameFilter.removeEventListener("TextChanged", this.onNameFilterChanged, this);
    }
  }
  populateContextMenu(contextMenu, gridNode) {
    const node = gridNode;
    node.populateContextMenu(contextMenu, this.dataDisplayDelegateInternal, this.heapProfilerModel());
    if (node instanceof HeapSnapshotGenericObjectNode && node.linkElement) {
      contextMenu.appendApplicableItems(node.linkElement);
    }
  }
  resetSortingCache() {
    delete this.lastSortColumnId;
    delete this.lastSortAscending;
  }
  topLevelNodes() {
    return this.rootNode().children;
  }
  revealObjectByHeapSnapshotId(_heapSnapshotObjectId) {
    return Promise.resolve(null);
  }
  resetNameFilter() {
    if (this.nameFilter) {
      this.nameFilter.setValue("");
    }
  }
  onNameFilterChanged() {
    this.updateVisibleNodes(true);
    this.deselectFilteredNodes();
  }
  deselectFilteredNodes() {
    let currentNode = this.selectedNode;
    while (currentNode) {
      if (this.selectedNode && this.isFilteredOut(currentNode)) {
        this.selectedNode.deselect();
        this.selectedNode = null;
        return;
      }
      currentNode = currentNode.parent;
    }
  }
  sortFields(_sortColumnId, _ascending) {
    throw new Error("Not implemented");
  }
  sortingChanged() {
    const sortAscending = this.isSortOrderAscending();
    const sortColumnId = this.sortColumnId();
    if (this.lastSortColumnId === sortColumnId && this.lastSortAscending === sortAscending) {
      return;
    }
    this.lastSortColumnId = sortColumnId;
    this.lastSortAscending = sortAscending;
    const sortFields = this.sortFields(sortColumnId || "", sortAscending);
    function sortByTwoFields(nodeA, nodeB) {
      let field1 = nodeA[sortFields.fieldName1];
      let field2 = nodeB[sortFields.fieldName1];
      let result = field1 < field2 ? -1 : field1 > field2 ? 1 : 0;
      if (!sortFields.ascending1) {
        result = -result;
      }
      if (result !== 0) {
        return result;
      }
      field1 = nodeA[sortFields.fieldName2];
      field2 = nodeB[sortFields.fieldName2];
      result = field1 < field2 ? -1 : field1 > field2 ? 1 : 0;
      if (!sortFields.ascending2) {
        result = -result;
      }
      return result;
    }
    this.performSorting(sortByTwoFields);
  }
  performSorting(sortFunction) {
    this.recursiveSortingEnter();
    const children = this.allChildren(this.rootNode());
    this.rootNode().removeChildren();
    children.sort(sortFunction);
    for (let i = 0, l = children.length; i < l; ++i) {
      const child = children[i];
      this.appendChildAfterSorting(child);
      if (child.populated) {
        void child.sort();
      }
    }
    this.recursiveSortingLeave();
  }
  appendChildAfterSorting(child) {
    const revealed = child.revealed;
    this.rootNode().appendChild(child);
    child.revealed = revealed;
  }
  recursiveSortingEnter() {
    ++this.recursiveSortingDepth;
  }
  recursiveSortingLeave() {
    if (!this.recursiveSortingDepth) {
      return;
    }
    if (--this.recursiveSortingDepth) {
      return;
    }
    this.updateVisibleNodes(true);
    this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.SortingComplete);
  }
  updateVisibleNodes(_force) {
  }
  allChildren(parent) {
    return parent.children;
  }
  insertChild(parent, node, index) {
    parent.insertChild(node, index);
  }
  removeChildByIndex(parent, index) {
    parent.removeChild(parent.children[index]);
  }
  removeAllChildren(parent) {
    parent.removeChildren();
  }
  async dataSourceChanged() {
    throw new Error("Not implemented");
  }
};
var HeapSnapshotSortableDataGridEvents;
(function(HeapSnapshotSortableDataGridEvents2) {
  HeapSnapshotSortableDataGridEvents2["ContentShown"] = "ContentShown";
  HeapSnapshotSortableDataGridEvents2["SortingComplete"] = "SortingComplete";
  HeapSnapshotSortableDataGridEvents2["ExpandRetainersComplete"] = "ExpandRetainersComplete";
})(HeapSnapshotSortableDataGridEvents || (HeapSnapshotSortableDataGridEvents = {}));
var HeapSnapshotViewportDataGrid = class extends HeapSnapshotSortableDataGrid {
  topPaddingHeight;
  bottomPaddingHeight;
  selectedNode;
  scrollToResolveCallback;
  constructor(heapProfilerModel, dataDisplayDelegate, dataGridParameters) {
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
    this.scrollContainer.addEventListener("scroll", this.onScroll.bind(this), true);
    this.topPaddingHeight = 0;
    this.bottomPaddingHeight = 0;
    this.selectedNode = null;
  }
  topLevelNodes() {
    return this.allChildren(this.rootNode());
  }
  appendChildAfterSorting(_child) {
  }
  updateVisibleNodes(force) {
    const guardZoneHeight = 40;
    const scrollHeight = this.scrollContainer.scrollHeight;
    let scrollTop = this.scrollContainer.scrollTop;
    let scrollBottom = scrollHeight - scrollTop - this.scrollContainer.offsetHeight;
    scrollTop = Math.max(0, scrollTop - guardZoneHeight);
    scrollBottom = Math.max(0, scrollBottom - guardZoneHeight);
    let viewPortHeight = scrollHeight - scrollTop - scrollBottom;
    if (!force && scrollTop >= this.topPaddingHeight && scrollBottom >= this.bottomPaddingHeight) {
      return;
    }
    const hysteresisHeight = 500;
    scrollTop -= hysteresisHeight;
    viewPortHeight += 2 * hysteresisHeight;
    const selectedNode = this.selectedNode;
    this.rootNode().removeChildren();
    this.topPaddingHeight = 0;
    this.bottomPaddingHeight = 0;
    this.addVisibleNodes(this.rootNode(), scrollTop, scrollTop + viewPortHeight);
    this.setVerticalPadding(this.topPaddingHeight, this.bottomPaddingHeight);
    if (selectedNode) {
      if (selectedNode.parent) {
        selectedNode.select(true);
      } else {
        this.selectedNode = selectedNode;
      }
    }
  }
  addVisibleNodes(parentNode, topBound, bottomBound) {
    if (!parentNode.expanded) {
      return 0;
    }
    const children = this.allChildren(parentNode);
    let topPadding = 0;
    let i = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      const newTop = topPadding + this.nodeHeight(child);
      if (newTop > topBound) {
        break;
      }
      topPadding = newTop;
    }
    let position = topPadding;
    for (; i < children.length && position < bottomBound; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      const hasChildren = child.hasChildren();
      child.removeChildren();
      child.setHasChildren(hasChildren);
      parentNode.appendChild(child);
      position += child.nodeSelfHeight();
      position += this.addVisibleNodes(child, topBound - position, bottomBound - position);
    }
    let bottomPadding = 0;
    for (; i < children.length; ++i) {
      const child = children[i];
      if (this.isFilteredOut(child)) {
        continue;
      }
      bottomPadding += this.nodeHeight(child);
    }
    this.topPaddingHeight += topPadding;
    this.bottomPaddingHeight += bottomPadding;
    return position + bottomPadding;
  }
  nodeHeight(node) {
    let result = node.nodeSelfHeight();
    if (!node.expanded) {
      return result;
    }
    const children = this.allChildren(node);
    for (let i = 0; i < children.length; i++) {
      result += this.nodeHeight(children[i]);
    }
    return result;
  }
  revealTreeNode(pathToReveal) {
    const height = this.calculateOffset(pathToReveal);
    const node = pathToReveal[pathToReveal.length - 1];
    const scrollTop = this.scrollContainer.scrollTop;
    const scrollBottom = scrollTop + this.scrollContainer.offsetHeight;
    if (height >= scrollTop && height < scrollBottom) {
      return Promise.resolve(node);
    }
    const scrollGap = 40;
    this.scrollContainer.scrollTop = Math.max(0, height - scrollGap);
    return new Promise((resolve) => {
      console.assert(!this.scrollToResolveCallback);
      this.scrollToResolveCallback = resolve.bind(null, node);
      this.scrollContainer.window().requestAnimationFrame(() => {
        if (!this.scrollToResolveCallback) {
          return;
        }
        this.scrollToResolveCallback();
        this.scrollToResolveCallback = null;
      });
    });
  }
  calculateOffset(pathToReveal) {
    let parentNode = this.rootNode();
    let height = 0;
    if (pathToReveal.length === 0) {
      return 0;
    }
    for (let i = 0; i < pathToReveal.length; ++i) {
      const node = pathToReveal[i];
      const children = this.allChildren(parentNode);
      for (let j = 0; j < children.length; ++j) {
        const child = children[j];
        if (node === child) {
          height += node.nodeSelfHeight();
          break;
        }
        height += this.nodeHeight(child);
      }
      parentNode = node;
    }
    return height - pathToReveal[pathToReveal.length - 1].nodeSelfHeight();
  }
  allChildren(parent) {
    const children = adjacencyMap.get(parent) || [];
    if (!adjacencyMap.has(parent)) {
      adjacencyMap.set(parent, children);
    }
    return children;
  }
  appendNode(parent, node) {
    this.allChildren(parent).push(node);
  }
  insertChild(parent, node, index) {
    this.allChildren(parent).splice(index, 0, node);
  }
  removeChildByIndex(parent, index) {
    this.allChildren(parent).splice(index, 1);
  }
  removeAllChildren(parent) {
    adjacencyMap.delete(parent);
  }
  removeTopLevelNodes() {
    this.disposeAllNodes();
    this.rootNode().removeChildren();
    this.removeAllChildren(this.rootNode());
  }
  onResize() {
    super.onResize();
    this.updateVisibleNodes(false);
  }
  onScroll(_event) {
    this.updateVisibleNodes(false);
    if (this.scrollToResolveCallback) {
      this.scrollToResolveCallback();
      this.scrollToResolveCallback = null;
    }
  }
};
var HeapSnapshotContainmentDataGrid = class extends HeapSnapshotSortableDataGrid {
  constructor(heapProfilerModel, dataDisplayDelegate, displayName, columns) {
    columns = columns || [
      { id: "object", title: i18nString11(UIStrings11.object), disclosure: true, sortable: true },
      { id: "distance", title: i18nString11(UIStrings11.distance), width: "70px", sortable: true, fixedWidth: true },
      {
        id: "shallowSize",
        title: i18nString11(UIStrings11.shallowSize),
        width: "110px",
        sortable: true,
        fixedWidth: true
      },
      {
        id: "retainedSize",
        title: i18nString11(UIStrings11.retainedSize),
        width: "110px",
        sortable: true,
        fixedWidth: true,
        sort: DataGrid9.DataGrid.Order.Descending
      }
    ];
    const dataGridParameters = { displayName, columns };
    super(heapProfilerModel, dataDisplayDelegate, dataGridParameters);
  }
  async setDataSource(snapshot, nodeIndex, nodeId) {
    this.snapshot = snapshot;
    const node = new HeapSnapshotModel3.HeapSnapshotModel.Node(nodeId ?? -1, "root", 0, nodeIndex || snapshot.rootNodeIndex, 0, 0, "");
    this.setRootNode(this.createRootNode(snapshot, node));
    void this.rootNode().sort();
  }
  createRootNode(snapshot, node) {
    const fakeEdge = new HeapSnapshotModel3.HeapSnapshotModel.Edge("", node, "", -1);
    return new HeapSnapshotObjectNode(this, snapshot, fakeEdge, null);
  }
  sortingChanged() {
    const rootNode = this.rootNode();
    if (rootNode.hasChildren()) {
      void rootNode.sort();
    }
  }
};
var HeapSnapshotRetainmentDataGrid = class extends HeapSnapshotContainmentDataGrid {
  resetRetainersButton;
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = [
      { id: "object", title: i18nString11(UIStrings11.object), disclosure: true, sortable: true },
      {
        id: "distance",
        title: i18nString11(UIStrings11.distance),
        width: "70px",
        sortable: true,
        fixedWidth: true,
        sort: DataGrid9.DataGrid.Order.Ascending
      },
      { id: "shallowSize", title: i18nString11(UIStrings11.shallowSize), width: "110px", sortable: true, fixedWidth: true },
      { id: "retainedSize", title: i18nString11(UIStrings11.retainedSize), width: "110px", sortable: true, fixedWidth: true }
    ];
    super(heapProfilerModel, dataDisplayDelegate, i18nString11(UIStrings11.heapSnapshotRetainment), columns);
  }
  createRootNode(snapshot, node) {
    const fakeEdge = new HeapSnapshotModel3.HeapSnapshotModel.Edge("", node, "", -1);
    return new HeapSnapshotRetainingObjectNode(this, snapshot, fakeEdge, null);
  }
  sortFields(sortColumn, sortAscending) {
    switch (sortColumn) {
      case "object":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("name", sortAscending, "count", false);
      case "count":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("count", sortAscending, "name", true);
      case "shallowSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("shallowSize", sortAscending, "name", true);
      case "retainedSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("retainedSize", sortAscending, "name", true);
      case "distance":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("distance", sortAscending, "name", true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }
  reset() {
    this.rootNode().removeChildren();
    this.resetSortingCache();
  }
  updateResetButtonVisibility() {
    void this.snapshot?.areNodesIgnoredInRetainersView().then((value2) => {
      this.resetRetainersButton?.setVisible(value2);
    });
  }
  async setDataSource(snapshot, nodeIndex, nodeId) {
    await super.setDataSource(snapshot, nodeIndex, nodeId);
    this.rootNode().expand();
    this.updateResetButtonVisibility();
  }
  async dataSourceChanged() {
    this.reset();
    await this.rootNode().sort();
    this.rootNode().expand();
    this.updateResetButtonVisibility();
  }
};
var HeapSnapshotRetainmentDataGridEvents;
(function(HeapSnapshotRetainmentDataGridEvents2) {
  HeapSnapshotRetainmentDataGridEvents2["ExpandRetainersComplete"] = "ExpandRetainersComplete";
})(HeapSnapshotRetainmentDataGridEvents || (HeapSnapshotRetainmentDataGridEvents = {}));
var HeapSnapshotConstructorsDataGrid = class extends HeapSnapshotViewportDataGrid {
  profileIndex;
  objectIdToSelect;
  nextRequestedFilter;
  lastFilter;
  filterInProgress;
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = [
      { id: "object", title: i18nString11(UIStrings11.constructorString), disclosure: true, sortable: true },
      { id: "distance", title: i18nString11(UIStrings11.distance), width: "70px", sortable: true, fixedWidth: true },
      { id: "shallowSize", title: i18nString11(UIStrings11.shallowSize), width: "110px", sortable: true, fixedWidth: true },
      {
        id: "retainedSize",
        title: i18nString11(UIStrings11.retainedSize),
        width: "110px",
        sort: DataGrid9.DataGrid.Order.Descending,
        sortable: true,
        fixedWidth: true
      }
    ];
    super(heapProfilerModel, dataDisplayDelegate, { displayName: i18nString11(UIStrings11.heapSnapshotConstructors).toString(), columns });
    this.profileIndex = -1;
    this.objectIdToSelect = null;
    this.nextRequestedFilter = null;
  }
  sortFields(sortColumn, sortAscending) {
    switch (sortColumn) {
      case "object":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("name", sortAscending, "retainedSize", false);
      case "distance":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("distance", sortAscending, "retainedSize", false);
      case "shallowSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("shallowSize", sortAscending, "name", true);
      case "retainedSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("retainedSize", sortAscending, "name", true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }
  async revealObjectByHeapSnapshotId(id) {
    if (!this.snapshot) {
      this.objectIdToSelect = id;
      return null;
    }
    const classKey = await this.snapshot.nodeClassKey(parseInt(id, 10));
    if (!classKey) {
      return null;
    }
    const topLevelNodes = this.topLevelNodes();
    const parent = topLevelNodes.find((classNode) => classNode.classKey === classKey);
    if (!parent) {
      return null;
    }
    const nodes = await parent.populateNodeBySnapshotObjectId(parseInt(id, 10));
    return nodes.length ? await this.revealTreeNode(nodes) : null;
  }
  clear() {
    this.nextRequestedFilter = null;
    this.lastFilter = null;
    this.removeTopLevelNodes();
  }
  async setDataSource(snapshot, _nodeIndex) {
    this.snapshot = snapshot;
    if (this.profileIndex === -1) {
      void this.populateChildren();
    }
    if (this.objectIdToSelect) {
      void this.revealObjectByHeapSnapshotId(this.objectIdToSelect);
      this.objectIdToSelect = null;
    }
  }
  setSelectionRange(minNodeId, maxNodeId) {
    this.nodeFilterInternal = new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    void this.populateChildren(this.nodeFilterInternal);
  }
  setAllocationNodeId(allocationNodeId) {
    this.nodeFilterInternal = new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter();
    this.nodeFilterInternal.allocationNodeId = allocationNodeId;
    void this.populateChildren(this.nodeFilterInternal);
  }
  aggregatesReceived(nodeFilter, aggregates) {
    this.filterInProgress = null;
    if (this.nextRequestedFilter && this.snapshot) {
      void this.snapshot.aggregatesWithFilter(this.nextRequestedFilter).then(this.aggregatesReceived.bind(this, this.nextRequestedFilter));
      this.filterInProgress = this.nextRequestedFilter;
      this.nextRequestedFilter = null;
    }
    this.removeTopLevelNodes();
    this.resetSortingCache();
    for (const classKey in aggregates) {
      this.appendNode(this.rootNode(), new HeapSnapshotConstructorNode(this, classKey, aggregates[classKey], nodeFilter));
    }
    this.sortingChanged();
    this.lastFilter = nodeFilter;
  }
  async populateChildren(maybeNodeFilter) {
    const nodeFilter = maybeNodeFilter || new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter();
    if (this.filterInProgress) {
      this.nextRequestedFilter = this.filterInProgress.equals(nodeFilter) ? null : nodeFilter;
      return;
    }
    if (this.lastFilter?.equals(nodeFilter)) {
      return;
    }
    this.filterInProgress = nodeFilter;
    if (this.snapshot) {
      const aggregates = await this.snapshot.aggregatesWithFilter(nodeFilter);
      this.aggregatesReceived(nodeFilter, aggregates);
    }
  }
  filterSelectIndexChanged(profiles, profileIndex, filterName) {
    this.profileIndex = profileIndex;
    this.nodeFilterInternal = void 0;
    if (profileIndex !== -1) {
      const minNodeId = profileIndex > 0 ? profiles[profileIndex - 1].maxJSObjectId : 0;
      const maxNodeId = profiles[profileIndex].maxJSObjectId;
      this.nodeFilterInternal = new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter(minNodeId, maxNodeId);
    } else if (filterName !== void 0) {
      this.nodeFilterInternal = new HeapSnapshotModel3.HeapSnapshotModel.NodeFilter();
      this.nodeFilterInternal.filterName = filterName;
    }
    void this.populateChildren(this.nodeFilterInternal);
  }
};
var HeapSnapshotDiffDataGrid = class extends HeapSnapshotViewportDataGrid {
  baseSnapshot;
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = [
      { id: "object", title: i18nString11(UIStrings11.constructorString), disclosure: true, sortable: true },
      { id: "addedCount", title: i18nString11(UIStrings11.New), width: "75px", sortable: true, fixedWidth: true },
      { id: "removedCount", title: i18nString11(UIStrings11.Deleted), width: "75px", sortable: true, fixedWidth: true },
      { id: "countDelta", title: i18nString11(UIStrings11.Delta), width: "65px", sortable: true, fixedWidth: true },
      {
        id: "addedSize",
        title: i18nString11(UIStrings11.allocSize),
        width: "75px",
        sortable: true,
        fixedWidth: true,
        sort: DataGrid9.DataGrid.Order.Descending
      },
      { id: "removedSize", title: i18nString11(UIStrings11.freedSize), width: "75px", sortable: true, fixedWidth: true },
      { id: "sizeDelta", title: i18nString11(UIStrings11.sizeDelta), width: "75px", sortable: true, fixedWidth: true }
    ];
    super(heapProfilerModel, dataDisplayDelegate, { displayName: i18nString11(UIStrings11.heapSnapshotDiff).toString(), columns });
  }
  defaultPopulateCount() {
    return 50;
  }
  sortFields(sortColumn, sortAscending) {
    switch (sortColumn) {
      case "object":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("name", sortAscending, "count", false);
      case "addedCount":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("addedCount", sortAscending, "name", true);
      case "removedCount":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("removedCount", sortAscending, "name", true);
      case "countDelta":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("countDelta", sortAscending, "name", true);
      case "addedSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("addedSize", sortAscending, "name", true);
      case "removedSize":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("removedSize", sortAscending, "name", true);
      case "sizeDelta":
        return new HeapSnapshotModel3.HeapSnapshotModel.ComparatorConfig("sizeDelta", sortAscending, "name", true);
      default:
        throw new Error(`Unknown column ${sortColumn}`);
    }
  }
  async setDataSource(snapshot, _nodeIndex) {
    this.snapshot = snapshot;
  }
  setBaseDataSource(baseSnapshot) {
    this.baseSnapshot = baseSnapshot;
    this.removeTopLevelNodes();
    this.resetSortingCache();
    if (this.baseSnapshot === this.snapshot) {
      this.dispatchEventToListeners(HeapSnapshotSortableDataGridEvents.SortingComplete);
      return;
    }
    void this.populateChildren();
  }
  async populateChildren() {
    if (this.snapshot === null || this.baseSnapshot?.uid === void 0) {
      throw new Error("Data sources have not been set correctly");
    }
    const interfaceDefinitions = await this.snapshot.interfaceDefinitions();
    const aggregatesForDiff = await this.baseSnapshot.aggregatesForDiff(interfaceDefinitions);
    const diffByClassKey = await this.snapshot.calculateSnapshotDiff(this.baseSnapshot.uid, aggregatesForDiff);
    for (const classKey in diffByClassKey) {
      const diff = diffByClassKey[classKey];
      this.appendNode(this.rootNode(), new HeapSnapshotDiffNode(this, classKey, diff));
    }
    this.sortingChanged();
  }
};
var AllocationDataGrid = class extends HeapSnapshotViewportDataGrid {
  linkifierInternal;
  topNodes;
  constructor(heapProfilerModel, dataDisplayDelegate) {
    const columns = [
      { id: "liveCount", title: i18nString11(UIStrings11.liveCount), width: "75px", sortable: true, fixedWidth: true },
      { id: "count", title: i18nString11(UIStrings11.count), width: "65px", sortable: true, fixedWidth: true },
      { id: "liveSize", title: i18nString11(UIStrings11.liveSize), width: "75px", sortable: true, fixedWidth: true },
      {
        id: "size",
        title: i18nString11(UIStrings11.size),
        width: "75px",
        sortable: true,
        fixedWidth: true,
        sort: DataGrid9.DataGrid.Order.Descending
      },
      { id: "name", title: i18nString11(UIStrings11.function), disclosure: true, sortable: true }
    ];
    super(heapProfilerModel, dataDisplayDelegate, { displayName: i18nString11(UIStrings11.allocation).toString(), columns });
    this.linkifierInternal = new Components3.Linkifier.Linkifier();
  }
  get linkifier() {
    return this.linkifierInternal;
  }
  dispose() {
    this.linkifierInternal.reset();
  }
  async setDataSource(snapshot, _nodeIndex) {
    this.snapshot = snapshot;
    this.topNodes = await this.snapshot.allocationTracesTops();
    this.populateChildren();
  }
  populateChildren() {
    this.removeTopLevelNodes();
    const root = this.rootNode();
    const tops = this.topNodes || [];
    for (const top of tops) {
      this.appendNode(root, new AllocationGridNode(this, top));
    }
    this.updateVisibleNodes(true);
  }
  sortingChanged() {
    if (this.topNodes !== void 0) {
      this.topNodes.sort(this.createComparator());
      this.rootNode().removeChildren();
      this.populateChildren();
    }
  }
  createComparator() {
    const fieldName = this.sortColumnId();
    const compareResult = this.sortOrder() === DataGrid9.DataGrid.Order.Ascending ? 1 : -1;
    function compare(a, b) {
      if (a[fieldName] > b[fieldName]) {
        return compareResult;
      }
      if (a[fieldName] < b[fieldName]) {
        return -compareResult;
      }
      return 0;
    }
    return compare;
  }
};

// gen/front_end/panels/profiler/HeapSnapshotProxy.js
var HeapSnapshotProxy_exports = {};
__export(HeapSnapshotProxy_exports, {
  HeapSnapshotLoaderProxy: () => HeapSnapshotLoaderProxy,
  HeapSnapshotProviderProxy: () => HeapSnapshotProviderProxy,
  HeapSnapshotProxy: () => HeapSnapshotProxy,
  HeapSnapshotProxyObject: () => HeapSnapshotProxyObject,
  HeapSnapshotWorkerProxy: () => HeapSnapshotWorkerProxy
});
import * as Common12 from "./../../core/common/common.js";
import * as i18n25 from "./../../core/i18n/i18n.js";
var UIStrings12 = {
  /**
   * @description Text in Heap Snapshot Proxy of a profiler tool
   * @example {functionName} PH1
   */
  anErrorOccurredWhenACallToMethod: "An error occurred when a call to method ''{PH1}'' was requested"
};
var str_12 = i18n25.i18n.registerUIStrings("panels/profiler/HeapSnapshotProxy.ts", UIStrings12);
var i18nString12 = i18n25.i18n.getLocalizedString.bind(void 0, str_12);
var HeapSnapshotWorkerProxy = class extends Common12.ObjectWrapper.ObjectWrapper {
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventHandler;
  nextObjectId;
  nextCallId;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callbacks;
  previousCallbacks;
  worker;
  interval;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(eventHandler) {
    super();
    this.eventHandler = eventHandler;
    this.nextObjectId = 1;
    this.nextCallId = 1;
    this.callbacks = /* @__PURE__ */ new Map();
    this.previousCallbacks = /* @__PURE__ */ new Set();
    this.worker = Common12.Worker.WorkerWrapper.fromURL(new URL("../../entrypoints/heap_snapshot_worker/heap_snapshot_worker-entrypoint.js", import.meta.url));
    this.worker.onmessage = this.messageReceived.bind(this);
  }
  createLoader(profileUid, snapshotReceivedCallback) {
    const objectId = this.nextObjectId++;
    const proxy = new HeapSnapshotLoaderProxy(this, objectId, profileUid, snapshotReceivedCallback);
    this.postMessage({
      callId: this.nextCallId++,
      disposition: "createLoader",
      objectId
    });
    return proxy;
  }
  dispose() {
    this.worker.terminate();
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
  disposeObject(objectId) {
    this.postMessage({ callId: this.nextCallId++, disposition: "dispose", objectId });
  }
  evaluateForTest(script, callback) {
    const callId = this.nextCallId++;
    this.callbacks.set(callId, callback);
    this.postMessage({ callId, disposition: "evaluateForTest", source: script });
  }
  callFactoryMethod(callback, objectId, methodName, proxyConstructor, transfer, ...methodArguments) {
    const callId = this.nextCallId++;
    const newObjectId = this.nextObjectId++;
    if (callback) {
      this.callbacks.set(callId, (remoteResult) => {
        callback(remoteResult ? new proxyConstructor(this, newObjectId) : null);
      });
      this.postMessage({
        callId,
        disposition: "factory",
        objectId,
        methodName,
        methodArguments,
        newObjectId
      }, transfer);
      return null;
    }
    this.postMessage({
      callId,
      disposition: "factory",
      objectId,
      methodName,
      methodArguments,
      newObjectId
    }, transfer);
    return new proxyConstructor(this, newObjectId);
  }
  callMethod(callback, objectId, methodName, ...methodArguments) {
    const callId = this.nextCallId++;
    if (callback) {
      this.callbacks.set(callId, callback);
    }
    this.postMessage({
      callId,
      disposition: "method",
      objectId,
      methodName,
      methodArguments
    });
  }
  startCheckingForLongRunningCalls() {
    if (this.interval) {
      return;
    }
    this.checkLongRunningCalls();
    this.interval = window.setInterval(this.checkLongRunningCalls.bind(this), 300);
  }
  checkLongRunningCalls() {
    for (const callId of this.previousCallbacks) {
      if (!this.callbacks.has(callId)) {
        this.previousCallbacks.delete(callId);
      }
    }
    const hasLongRunningCalls = Boolean(this.previousCallbacks.size);
    this.dispatchEventToListeners("Wait", hasLongRunningCalls);
    for (const callId of this.callbacks.keys()) {
      this.previousCallbacks.add(callId);
    }
  }
  setupForSecondaryInit(port) {
    const callId = this.nextCallId++;
    const done = new Promise((resolve) => {
      this.callbacks.set(callId, resolve);
    });
    this.postMessage({
      callId,
      disposition: "setupForSecondaryInit",
      objectId: this.nextObjectId++
    }, [port]);
    return done;
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messageReceived(event) {
    const data = event.data;
    if (data.eventName) {
      if (this.eventHandler) {
        this.eventHandler(data.eventName, data.data);
      }
      return;
    }
    if (data.error) {
      if (data.errorMethodName) {
        Common12.Console.Console.instance().error(i18nString12(UIStrings12.anErrorOccurredWhenACallToMethod, { PH1: data.errorMethodName }));
      }
      Common12.Console.Console.instance().error(data["errorCallStack"]);
      this.callbacks.delete(data.callId);
      return;
    }
    const callback = this.callbacks.get(data.callId);
    if (!callback) {
      return;
    }
    this.callbacks.delete(data.callId);
    callback(data.result);
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  postMessage(message, transfer) {
    this.worker.postMessage(message, transfer);
  }
};
var HeapSnapshotProxyObject = class {
  worker;
  objectId;
  constructor(worker, objectId) {
    this.worker = worker;
    this.objectId = objectId;
  }
  dispose() {
    this.worker.disposeObject(this.objectId);
  }
  callFactoryMethod(methodName, proxyConstructor, ...args) {
    return this.worker.callFactoryMethod(null, String(this.objectId), methodName, proxyConstructor, [], ...args);
  }
  callFactoryMethodPromise(methodName, proxyConstructor, transfer, ...args) {
    return new Promise((resolve) => this.worker.callFactoryMethod(resolve, String(this.objectId), methodName, proxyConstructor, transfer, ...args));
  }
  callMethodPromise(methodName, ...args) {
    return new Promise((resolve) => this.worker.callMethod(resolve, String(this.objectId), methodName, ...args));
  }
};
var HeapSnapshotLoaderProxy = class extends HeapSnapshotProxyObject {
  profileUid;
  snapshotReceivedCallback;
  constructor(worker, objectId, profileUid, snapshotReceivedCallback) {
    super(worker, objectId);
    this.profileUid = profileUid;
    this.snapshotReceivedCallback = snapshotReceivedCallback;
  }
  async write(chunk) {
    await this.callMethodPromise("write", chunk);
  }
  async close() {
    await this.callMethodPromise("close");
    const secondWorker = new HeapSnapshotWorkerProxy(() => {
    });
    const channel = new MessageChannel();
    await secondWorker.setupForSecondaryInit(channel.port2);
    const snapshotProxy = await this.callFactoryMethodPromise("buildSnapshot", HeapSnapshotProxy, [channel.port1]);
    secondWorker.dispose();
    this.dispose();
    snapshotProxy.setProfileUid(this.profileUid);
    await snapshotProxy.updateStaticData();
    this.snapshotReceivedCallback(snapshotProxy);
  }
};
var HeapSnapshotProxy = class extends HeapSnapshotProxyObject {
  staticData;
  profileUid;
  constructor(worker, objectId) {
    super(worker, objectId);
    this.staticData = null;
  }
  search(searchConfig, filter) {
    return this.callMethodPromise("search", searchConfig, filter);
  }
  interfaceDefinitions() {
    return this.callMethodPromise("interfaceDefinitions");
  }
  aggregatesWithFilter(filter) {
    return this.callMethodPromise("aggregatesWithFilter", filter);
  }
  aggregatesForDiff(interfaceDefinitions) {
    return this.callMethodPromise("aggregatesForDiff", interfaceDefinitions);
  }
  calculateSnapshotDiff(baseSnapshotId, baseSnapshotAggregates) {
    return this.callMethodPromise("calculateSnapshotDiff", baseSnapshotId, baseSnapshotAggregates);
  }
  nodeClassKey(snapshotObjectId) {
    return this.callMethodPromise("nodeClassKey", snapshotObjectId);
  }
  createEdgesProvider(nodeIndex) {
    return this.callFactoryMethod("createEdgesProvider", HeapSnapshotProviderProxy, nodeIndex);
  }
  createRetainingEdgesProvider(nodeIndex) {
    return this.callFactoryMethod("createRetainingEdgesProvider", HeapSnapshotProviderProxy, nodeIndex);
  }
  createAddedNodesProvider(baseSnapshotId, classKey) {
    return this.callFactoryMethod("createAddedNodesProvider", HeapSnapshotProviderProxy, baseSnapshotId, classKey);
  }
  createDeletedNodesProvider(nodeIndexes) {
    return this.callFactoryMethod("createDeletedNodesProvider", HeapSnapshotProviderProxy, nodeIndexes);
  }
  createNodesProvider(filter) {
    return this.callFactoryMethod("createNodesProvider", HeapSnapshotProviderProxy, filter);
  }
  createNodesProviderForClass(classKey, nodeFilter) {
    return this.callFactoryMethod("createNodesProviderForClass", HeapSnapshotProviderProxy, classKey, nodeFilter);
  }
  allocationTracesTops() {
    return this.callMethodPromise("allocationTracesTops");
  }
  allocationNodeCallers(nodeId) {
    return this.callMethodPromise("allocationNodeCallers", nodeId);
  }
  allocationStack(nodeIndex) {
    return this.callMethodPromise("allocationStack", nodeIndex);
  }
  dispose() {
    throw new Error("Should never be called");
  }
  get nodeCount() {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.nodeCount;
  }
  get rootNodeIndex() {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.rootNodeIndex;
  }
  async updateStaticData() {
    this.staticData = await this.callMethodPromise("updateStaticData");
  }
  getStatistics() {
    return this.callMethodPromise("getStatistics");
  }
  getLocation(nodeIndex) {
    return this.callMethodPromise("getLocation", nodeIndex);
  }
  getSamples() {
    return this.callMethodPromise("getSamples");
  }
  ignoreNodeInRetainersView(nodeIndex) {
    return this.callMethodPromise("ignoreNodeInRetainersView", nodeIndex);
  }
  unignoreNodeInRetainersView(nodeIndex) {
    return this.callMethodPromise("unignoreNodeInRetainersView", nodeIndex);
  }
  unignoreAllNodesInRetainersView() {
    return this.callMethodPromise("unignoreAllNodesInRetainersView");
  }
  areNodesIgnoredInRetainersView() {
    return this.callMethodPromise("areNodesIgnoredInRetainersView");
  }
  get totalSize() {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.totalSize;
  }
  get uid() {
    return this.profileUid;
  }
  setProfileUid(profileUid) {
    this.profileUid = profileUid;
  }
  maxJSObjectId() {
    if (!this.staticData) {
      return 0;
    }
    return this.staticData.maxJSObjectId;
  }
};
var HeapSnapshotProviderProxy = class extends HeapSnapshotProxyObject {
  nodePosition(snapshotObjectId) {
    return this.callMethodPromise("nodePosition", snapshotObjectId);
  }
  isEmpty() {
    return this.callMethodPromise("isEmpty");
  }
  serializeItemsRange(startPosition, endPosition) {
    return this.callMethodPromise("serializeItemsRange", startPosition, endPosition);
  }
  async sortAndRewind(comparator) {
    await this.callMethodPromise("sortAndRewind", comparator);
  }
};

// gen/front_end/panels/profiler/ModuleUIStrings.js
var UIStrings13 = {
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  buildingEdgeIndexes: "Building edge indexes\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  buildingRetainers: "Building retainers\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  propagatingDomState: "Propagating DOM state\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane. Flag here
   * refers to the programming concept for a piece of binary data (yes/no).
   */
  calculatingNodeFlags: "Calculating node flags\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  calculatingDistances: "Calculating distances\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  calculatingShallowSizes: "Calculating shallow sizes\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  calculatingRetainedSizes: "Calculating retained sizes\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  buildingDominatedNodes: "Building dominated nodes\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane.
   * During this step, names are assigned to objects in the heap snapshot.
   */
  calculatingObjectNames: "Calculating object names\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  calculatingStatistics: "Calculating statistics\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  calculatingSamples: "Calculating samples\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  buildingLocations: "Building locations\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  finishedProcessing: "Finished processing.",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  buildingAllocationStatistics: "Building allocation statistics\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  done: "Done",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   */
  processingSnapshot: "Processing snapshot\u2026",
  /**
   * @description Text to indicate the status of a heap snapshot in the Performance Pane
   */
  parsingStrings: "Parsing strings\u2026",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   */
  loadingSnapshotInfo: "Loading snapshot info\u2026",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   * @example {38} PH1
   */
  loadingNodesD: "Loading nodes\u2026 {PH1}%",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   * @example {30} PH1
   */
  loadingEdgesD: "Loading edges\u2026 {PH1}%",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   * @example {30} PH1
   */
  loadingAllocationTracesD: "Loading allocation traces\u2026 {PH1}%",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   */
  loadingSamples: "Loading samples\u2026",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   */
  loadingLocations: "Loading locations\u2026",
  /**
   * @description Text in Heap Snapshot Loader of the Memory panel when taking a heap snapshot
   */
  loadingStrings: "Loading strings\u2026"
};

// gen/front_end/panels/profiler/HeapSnapshotView.js
var UIStrings14 = {
  /**
   * @description Text to find an item
   */
  find: "Find",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  containment: "Containment",
  /**
   * @description Retaining paths title text content in Heap Snapshot View of a profiler tool
   */
  retainers: "Retainers",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allocationStack: "Allocation stack",
  /**
   * @description Screen reader label for a select box that chooses the perspective in the Memory panel when viewing a Heap Snapshot
   */
  perspective: "Perspective",
  /**
   * @description Screen reader label for a select box that chooses the snapshot to use as a base in the Memory panel when viewing a Heap Snapshot
   */
  baseSnapshot: "Base snapshot",
  /**
   * @description Text to filter result items
   */
  filter: "Filter",
  /**
   * @description Placeholder text in the filter bar to filter by JavaScript class names for a heap
   */
  filterByClass: "Filter by class",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  code: "Code",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  strings: "Strings",
  /**
   * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  jsArrays: "JS arrays",
  /**
   * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  typedArrays: "Typed arrays",
  /**
   * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  systemObjects: "System objects",
  /**
   * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  otherJSObjects: "Other JS objects",
  /**
   * @description Label on a pie chart in the statistics view for the Heap Snapshot tool
   */
  otherNonJSObjects: "Other non-JS objects (such as HTML and CSS)",
  /**
   * @description The reported total size used in the selected time frame of the allocation sampling profile
   * @example {3 MB} PH1
   */
  selectedSizeS: "Selected size: {PH1}",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allObjects: "All objects",
  /**
   * @description Title in Heap Snapshot View of a profiler tool
   * @example {Profile 2} PH1
   */
  objectsAllocatedBeforeS: "Objects allocated before {PH1}",
  /**
   * @description Title in Heap Snapshot View of a profiler tool
   * @example {Profile 1} PH1
   * @example {Profile 2} PH2
   */
  objectsAllocatedBetweenSAndS: "Objects allocated between {PH1} and {PH2}",
  /**
   * @description An option which will filter the heap snapshot to show only
   * strings which exactly match at least one other string
   */
  duplicatedStrings: "Duplicated strings",
  /**
   * @description An option which will filter the heap snapshot to show only
   * detached DOM nodes and other objects kept alive by detached DOM nodes
   */
  objectsRetainedByDetachedDomNodes: "Objects retained by detached DOM nodes",
  /**
   * @description An option which will filter the heap snapshot to show only
   * objects kept alive by the DevTools console
   */
  objectsRetainedByConsole: "Objects retained by DevTools Console",
  /**
   * @description An option which will filter the heap snapshot to show only
   * objects retained by event handlers
   */
  objectsRetainedByEventHandlers: "Objects retained by Event Handlers",
  /**
   * @description Text for the summary view
   */
  summary: "Summary",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  comparison: "Comparison",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allocation: "Allocation",
  /**
   * @description Title text content in Heap Snapshot View of a profiler tool
   */
  liveObjects: "Live objects",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  statistics: "Statistics",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshot: "Heap snapshot",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  takeHeapSnapshot: "Take heap snapshot",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshots: "Heap snapshots",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  heapSnapshotProfilesShowMemory: "See the memory distribution of JavaScript objects and related DOM nodes",
  /**
   * @description Label for a checkbox in the heap snapshot view of the profiler tool. The "heap snapshot" contains the
   * current state of JavaScript memory. With this checkbox enabled, the snapshot also includes internal data that is
   * specific to Chrome (hence implementation-specific).
   */
  exposeInternals: "Internals with implementation details",
  /**
   * @description Progress update that the profiler is capturing a snapshot of the heap
   */
  snapshotting: "Snapshotting\u2026",
  /**
   * @description Profile title in Heap Snapshot View of a profiler tool
   * @example {1} PH1
   */
  snapshotD: "Snapshot {PH1}",
  /**
   * @description Text for a percentage value
   * @example {13.0} PH1
   */
  percentagePlaceholder: "{PH1}%",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allocationInstrumentationOn: "Allocations on timeline",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  stopRecordingHeapProfile: "Stop recording heap profile",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  startRecordingHeapProfile: "Start recording heap profile",
  /**
   * @description Text in Heap Snapshot View of a profiler tool.
   * A stack trace is a list of functions that were called.
   * This option turns on recording of a stack trace at each allocation.
   * The recording itself is a somewhat expensive operation, so turning this option on, the website's performance may be affected negatively (e.g. everything becomes slower).
   */
  recordAllocationStacksExtra: "Allocation stack traces (more overhead)",
  /**
   * @description Text in CPUProfile View of a profiler tool
   */
  recording: "Recording\u2026",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  allocationTimelines: "Allocation timelines",
  /**
   * @description Description for the 'Allocation timeline' tool in the Memory panel.
   */
  AllocationTimelinesShowInstrumented: "Record memory allocations over time and isolate memory leaks by selecting intervals with allocations that are still alive",
  /**
   * @description Text when something is loading
   */
  loading: "Loading\u2026",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   * @example {30} PH1
   */
  savingD: "Saving\u2026 {PH1}%",
  /**
   * @description Text in Heap Snapshot View of a profiler tool
   */
  heapMemoryUsage: "Heap memory usage",
  /**
   * @description Text of a DOM element in Heap Snapshot View of a profiler tool
   */
  stackWasNotRecordedForThisObject: "Stack wasn't recorded for this object because it had been allocated before this profile recording started.",
  /**
   * @description Text in Heap Snapshot View of a profiler tool.
   * This text is on a button to undo all previous "Ignore this retainer" actions.
   */
  restoreIgnoredRetainers: "Restore ignored retainers"
};
var str_13 = i18n27.i18n.registerUIStrings("panels/profiler/HeapSnapshotView.ts", UIStrings14);
var i18nString13 = i18n27.i18n.getLocalizedString.bind(void 0, str_13);
var moduleUIstr_ = i18n27.i18n.registerUIStrings("panels/profiler/ModuleUIStrings.ts", UIStrings13);
var moduleI18nString = i18n27.i18n.getLocalizedString.bind(void 0, moduleUIstr_);
var HeapSnapshotView = class _HeapSnapshotView extends UI14.View.SimpleView {
  searchResults;
  profile;
  linkifier;
  parentDataDisplayDelegate;
  searchableViewInternal;
  splitWidget;
  containmentDataGrid;
  containmentWidget;
  statisticsView;
  constructorsDataGrid;
  constructorsWidget;
  diffDataGrid;
  diffWidget;
  allocationDataGrid;
  allocationWidget;
  allocationStackView;
  tabbedPane;
  retainmentDataGrid;
  retainmentWidget;
  objectDetailsView;
  perspectives;
  comparisonPerspective;
  perspectiveSelect;
  baseSelect;
  filterSelect;
  classNameFilter;
  selectedSizeText;
  resetRetainersButton;
  popoverHelper;
  currentPerspectiveIndex;
  currentPerspective;
  dataGrid;
  searchThrottler;
  baseProfile;
  trackingOverviewGrid;
  currentSearchResultIndex = -1;
  currentSearch;
  get currentQuery() {
    return this.currentSearch?.query;
  }
  set currentQuery(value2) {
    if (this.currentSearch) {
      this.currentSearch.query = value2;
    }
  }
  constructor(dataDisplayDelegate, profile) {
    super({
      title: i18nString13(UIStrings14.heapSnapshot),
      viewId: "heap-snapshot"
    });
    this.searchResults = [];
    this.element.classList.add("heap-snapshot-view");
    this.profile = profile;
    this.linkifier = new Components4.Linkifier.Linkifier();
    const profileType = profile.profileType();
    profileType.addEventListener("SnapshotReceived", this.onReceiveSnapshot, this);
    profileType.addEventListener("remove-profile-header", this.onProfileHeaderRemoved, this);
    const isHeapTimeline = profileType.id === TrackingHeapSnapshotProfileType.TypeId;
    if (isHeapTimeline) {
      this.createOverview();
    }
    const hasAllocationStacks = instance.trackingHeapSnapshotProfileType.recordAllocationStacksSetting().get();
    this.parentDataDisplayDelegate = dataDisplayDelegate;
    this.searchableViewInternal = new UI14.SearchableView.SearchableView(this, null);
    this.searchableViewInternal.setPlaceholder(i18nString13(UIStrings14.find), i18nString13(UIStrings14.find));
    this.searchableViewInternal.show(this.element);
    this.splitWidget = new UI14.SplitWidget.SplitWidget(false, true, "heap-snapshot-split-view-state", 200, 200);
    this.splitWidget.show(this.searchableViewInternal.element);
    const heapProfilerModel = profile.heapProfilerModel();
    this.containmentDataGrid = new HeapSnapshotContainmentDataGrid(
      heapProfilerModel,
      this,
      /* displayName */
      i18nString13(UIStrings14.containment)
    );
    this.containmentDataGrid.addEventListener("SelectedNode", this.selectionChanged, this);
    this.containmentWidget = this.containmentDataGrid.asWidget();
    this.containmentWidget.setMinimumSize(50, 25);
    this.statisticsView = new HeapSnapshotStatisticsView();
    this.constructorsDataGrid = new HeapSnapshotConstructorsDataGrid(heapProfilerModel, this);
    this.constructorsDataGrid.addEventListener("SelectedNode", this.selectionChanged, this);
    this.constructorsWidget = this.constructorsDataGrid.asWidget();
    this.constructorsWidget.setMinimumSize(50, 25);
    this.constructorsWidget.element.setAttribute("jslog", `${VisualLogging5.pane("heap-snapshot.constructors-view").track({ resize: true })}`);
    this.diffDataGrid = new HeapSnapshotDiffDataGrid(heapProfilerModel, this);
    this.diffDataGrid.addEventListener("SelectedNode", this.selectionChanged, this);
    this.diffWidget = this.diffDataGrid.asWidget();
    this.diffWidget.setMinimumSize(50, 25);
    this.allocationDataGrid = null;
    if (isHeapTimeline && hasAllocationStacks) {
      this.allocationDataGrid = new AllocationDataGrid(heapProfilerModel, this);
      this.allocationDataGrid.addEventListener("SelectedNode", this.onSelectAllocationNode, this);
      this.allocationWidget = this.allocationDataGrid.asWidget();
      this.allocationWidget.setMinimumSize(50, 25);
      this.allocationStackView = new HeapAllocationStackView(heapProfilerModel);
      this.allocationStackView.setMinimumSize(50, 25);
      this.tabbedPane = new UI14.TabbedPane.TabbedPane();
    }
    this.retainmentDataGrid = new HeapSnapshotRetainmentDataGrid(heapProfilerModel, this);
    this.retainmentWidget = this.retainmentDataGrid.asWidget();
    this.retainmentWidget.setMinimumSize(50, 21);
    this.retainmentWidget.element.classList.add("retaining-paths-view");
    this.retainmentWidget.element.setAttribute("jslog", `${VisualLogging5.pane("heap-snapshot.retaining-paths-view").track({ resize: true })}`);
    let splitWidgetResizer;
    if (this.allocationStackView) {
      this.tabbedPane = new UI14.TabbedPane.TabbedPane();
      this.tabbedPane.appendTab("retainers", i18nString13(UIStrings14.retainers), this.retainmentWidget);
      this.tabbedPane.appendTab("allocation-stack", i18nString13(UIStrings14.allocationStack), this.allocationStackView);
      splitWidgetResizer = this.tabbedPane.headerElement();
      this.objectDetailsView = this.tabbedPane;
    } else {
      const retainmentViewHeader = document.createElement("div");
      retainmentViewHeader.classList.add("heap-snapshot-view-resizer");
      const retainingPathsTitleDiv = retainmentViewHeader.createChild("div", "title");
      retainmentViewHeader.createChild("div", "verticalResizerIcon");
      const retainingPathsTitle = retainingPathsTitleDiv.createChild("span");
      retainingPathsTitle.textContent = i18nString13(UIStrings14.retainers);
      splitWidgetResizer = retainmentViewHeader;
      this.objectDetailsView = new UI14.Widget.VBox();
      this.objectDetailsView.element.appendChild(retainmentViewHeader);
      this.retainmentWidget.show(this.objectDetailsView.element);
    }
    this.splitWidget.hideDefaultResizer();
    this.splitWidget.installResizer(splitWidgetResizer);
    this.retainmentDataGrid.addEventListener("SelectedNode", this.inspectedObjectChanged, this);
    this.retainmentDataGrid.reset();
    this.perspectives = [];
    this.comparisonPerspective = new ComparisonPerspective();
    this.perspectives.push(new SummaryPerspective());
    if (profile.profileType() !== instance.trackingHeapSnapshotProfileType) {
      this.perspectives.push(this.comparisonPerspective);
    }
    this.perspectives.push(new ContainmentPerspective());
    if (this.allocationWidget) {
      this.perspectives.push(new AllocationPerspective());
    }
    this.perspectives.push(new StatisticsPerspective());
    this.perspectiveSelect = new UI14.Toolbar.ToolbarComboBox(this.onSelectedPerspectiveChanged.bind(this), i18nString13(UIStrings14.perspective), void 0, "profiler.heap-snapshot-perspective");
    this.updatePerspectiveOptions();
    this.baseSelect = new UI14.Toolbar.ToolbarComboBox(this.changeBase.bind(this), i18nString13(UIStrings14.baseSnapshot), void 0, "profiler.heap-snapshot-base");
    this.baseSelect.setVisible(false);
    this.updateBaseOptions();
    this.filterSelect = new UI14.Toolbar.ToolbarComboBox(this.changeFilter.bind(this), i18nString13(UIStrings14.filter), void 0, "profiler.heap-snapshot-filter");
    this.filterSelect.setVisible(false);
    this.updateFilterOptions();
    this.classNameFilter = new UI14.Toolbar.ToolbarFilter(i18nString13(UIStrings14.filterByClass));
    this.classNameFilter.setVisible(false);
    this.constructorsDataGrid.setNameFilter(this.classNameFilter);
    this.diffDataGrid.setNameFilter(this.classNameFilter);
    this.selectedSizeText = new UI14.Toolbar.ToolbarText();
    const restoreIgnoredRetainers = i18nString13(UIStrings14.restoreIgnoredRetainers);
    this.resetRetainersButton = new UI14.Toolbar.ToolbarButton(restoreIgnoredRetainers, "clear-list", restoreIgnoredRetainers);
    this.resetRetainersButton.setVisible(false);
    this.resetRetainersButton.addEventListener("Click", async () => {
      await this.retainmentDataGrid.snapshot?.unignoreAllNodesInRetainersView();
      await this.retainmentDataGrid.dataSourceChanged();
    });
    this.retainmentDataGrid.resetRetainersButton = this.resetRetainersButton;
    this.popoverHelper = new UI14.PopoverHelper.PopoverHelper(this.element, this.getPopoverRequest.bind(this), "profiler.heap-snapshot-object");
    this.popoverHelper.setDisableOnClick(true);
    this.element.addEventListener("scroll", this.popoverHelper.hidePopover.bind(this.popoverHelper), true);
    this.currentPerspectiveIndex = 0;
    this.currentPerspective = this.perspectives[0];
    this.currentPerspective.activate(this);
    this.dataGrid = this.currentPerspective.masterGrid(this);
    void this.populate();
    this.searchThrottler = new Common13.Throttler.Throttler(0);
    for (const existingProfile of this.profiles()) {
      existingProfile.addEventListener("ProfileTitleChanged", this.updateControls, this);
    }
  }
  createOverview() {
    const profileType = this.profile.profileType();
    this.trackingOverviewGrid = new HeapTimelineOverview();
    this.trackingOverviewGrid.addEventListener("IdsRangeChanged", this.onIdsRangeChanged.bind(this));
    if (!this.profile.fromFile() && profileType.profileBeingRecorded() === this.profile) {
      profileType.addEventListener("HeapStatsUpdate", this.onHeapStatsUpdate, this);
      profileType.addEventListener("TrackingStopped", this.onStopTracking, this);
      this.trackingOverviewGrid.start();
    }
  }
  onStopTracking() {
    const profileType = this.profile.profileType();
    profileType.removeEventListener("HeapStatsUpdate", this.onHeapStatsUpdate, this);
    profileType.removeEventListener("TrackingStopped", this.onStopTracking, this);
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.stop();
    }
  }
  onHeapStatsUpdate({ data: samples }) {
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.setSamples(samples);
    }
  }
  searchableView() {
    return this.searchableViewInternal;
  }
  showProfile(profile) {
    return this.parentDataDisplayDelegate.showProfile(profile);
  }
  showObject(snapshotObjectId, perspectiveName) {
    if (Number(snapshotObjectId) <= this.profile.maxJSObjectId) {
      void this.selectLiveObject(perspectiveName, snapshotObjectId);
    } else {
      this.parentDataDisplayDelegate.showObject(snapshotObjectId, perspectiveName);
    }
  }
  async linkifyObject(nodeIndex) {
    const heapProfilerModel = this.profile.heapProfilerModel();
    if (!heapProfilerModel) {
      return null;
    }
    const location = await this.profile.getLocation(nodeIndex);
    if (!location) {
      return null;
    }
    const debuggerModel = heapProfilerModel.runtimeModel().debuggerModel();
    const rawLocation = debuggerModel.createRawLocationByScriptId(String(location.scriptId), location.lineNumber, location.columnNumber);
    if (!rawLocation) {
      return null;
    }
    const script = rawLocation.script();
    const sourceURL = script?.sourceURL;
    return sourceURL && this.linkifier ? this.linkifier.linkifyRawLocation(rawLocation, sourceURL) : null;
  }
  async populate() {
    const heapSnapshotProxy = await this.profile.loadPromise;
    void this.retrieveStatistics(heapSnapshotProxy);
    if (this.dataGrid) {
      void this.dataGrid.setDataSource(heapSnapshotProxy, 0);
    }
    if (this.profile.profileType().id === TrackingHeapSnapshotProfileType.TypeId && this.profile.fromFile()) {
      const samples = await heapSnapshotProxy.getSamples();
      if (samples) {
        console.assert(Boolean(samples.timestamps.length));
        const profileSamples = new Samples();
        profileSamples.sizes = samples.sizes;
        profileSamples.ids = samples.lastAssignedIds;
        profileSamples.timestamps = samples.timestamps;
        profileSamples.max = samples.sizes;
        profileSamples.totalTime = Math.max(samples.timestamps[samples.timestamps.length - 1] || 0, 1e4);
        if (this.trackingOverviewGrid) {
          this.trackingOverviewGrid.setSamples(profileSamples);
        }
      }
    }
    const list = this.profiles();
    const profileIndex = list.indexOf(this.profile);
    this.baseSelect.setSelectedIndex(Math.max(0, profileIndex - 1));
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.updateGrid();
    }
  }
  async retrieveStatistics(heapSnapshotProxy) {
    const statistics = await heapSnapshotProxy.getStatistics();
    const { v8heap, native } = statistics;
    const otherJSObjectsSize = v8heap.total - v8heap.code - v8heap.strings - v8heap.jsArrays - v8heap.system;
    const records = [
      { value: v8heap.code, color: "var(--app-color-code)", title: i18nString13(UIStrings14.code) },
      { value: v8heap.strings, color: "var(--app-color-strings)", title: i18nString13(UIStrings14.strings) },
      { value: v8heap.jsArrays, color: "var(--app-color-js-arrays)", title: i18nString13(UIStrings14.jsArrays) },
      { value: native.typedArrays, color: "var(--app-color-typed-arrays)", title: i18nString13(UIStrings14.typedArrays) },
      { value: v8heap.system, color: "var(--app-color-system)", title: i18nString13(UIStrings14.systemObjects) },
      {
        value: otherJSObjectsSize,
        color: "var(--app-color-other-js-objects)",
        title: i18nString13(UIStrings14.otherJSObjects)
      },
      {
        value: native.total - native.typedArrays,
        color: "var(--app-color-other-non-js-objects)",
        title: i18nString13(UIStrings14.otherNonJSObjects)
      }
    ];
    this.statisticsView.setTotalAndRecords(statistics.total, records);
    return statistics;
  }
  onIdsRangeChanged(event) {
    const { minId, maxId } = event.data;
    this.selectedSizeText.setText(i18nString13(UIStrings14.selectedSizeS, { PH1: i18n27.ByteUtilities.bytesToString(event.data.size) }));
    if (this.constructorsDataGrid.snapshot) {
      this.constructorsDataGrid.setSelectionRange(minId, maxId);
    }
  }
  async toolbarItems() {
    const result = [this.perspectiveSelect, this.classNameFilter];
    if (this.profile.profileType() !== instance.trackingHeapSnapshotProfileType) {
      result.push(this.baseSelect, this.filterSelect);
    }
    result.push(this.selectedSizeText);
    result.push(this.resetRetainersButton);
    return result;
  }
  willHide() {
    super.willHide();
    this.currentSearchResultIndex = -1;
    this.popoverHelper.hidePopover();
  }
  supportsCaseSensitiveSearch() {
    return true;
  }
  supportsWholeWordSearch() {
    return false;
  }
  supportsRegexSearch() {
    return false;
  }
  onSearchCanceled() {
    this.currentSearchResultIndex = -1;
    this.searchResults = [];
  }
  selectRevealedNode(node) {
    if (node) {
      node.select();
    }
  }
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    const nextQuery = new HeapSnapshotModel5.HeapSnapshotModel.SearchConfig(searchConfig.query.trim(), searchConfig.caseSensitive, searchConfig.wholeWord, searchConfig.isRegex, shouldJump, jumpBackwards || false);
    void this.searchThrottler.schedule(this.performSearchInternal.bind(this, nextQuery));
  }
  async performSearchInternal(nextQuery) {
    this.onSearchCanceled();
    if (!this.currentPerspective.supportsSearch()) {
      return;
    }
    this.currentSearch = nextQuery;
    const query = nextQuery.query.trim();
    if (!query) {
      return;
    }
    if (query.charAt(0) === "@") {
      const snapshotNodeId = parseInt(query.substring(1), 10);
      if (isNaN(snapshotNodeId)) {
        return;
      }
      if (!this.dataGrid) {
        return;
      }
      const node = await this.dataGrid.revealObjectByHeapSnapshotId(String(snapshotNodeId));
      this.selectRevealedNode(node);
      return;
    }
    if (!this.profile.snapshotProxy || !this.dataGrid) {
      return;
    }
    const filter = this.dataGrid.nodeFilter();
    this.searchResults = filter ? await this.profile.snapshotProxy.search(this.currentSearch, filter) : [];
    this.searchableViewInternal.updateSearchMatchesCount(this.searchResults.length);
    if (this.searchResults.length) {
      this.currentSearchResultIndex = nextQuery.jumpBackward ? this.searchResults.length - 1 : 0;
    }
    await this.jumpToSearchResult(this.currentSearchResultIndex);
  }
  jumpToNextSearchResult() {
    if (!this.searchResults.length) {
      return;
    }
    this.currentSearchResultIndex = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
  }
  jumpToPreviousSearchResult() {
    if (!this.searchResults.length) {
      return;
    }
    this.currentSearchResultIndex = (this.currentSearchResultIndex + this.searchResults.length - 1) % this.searchResults.length;
    void this.searchThrottler.schedule(this.jumpToSearchResult.bind(this, this.currentSearchResultIndex));
  }
  async jumpToSearchResult(searchResultIndex) {
    this.searchableViewInternal.updateCurrentMatchIndex(searchResultIndex);
    if (searchResultIndex === -1) {
      return;
    }
    if (!this.dataGrid) {
      return;
    }
    const node = await this.dataGrid.revealObjectByHeapSnapshotId(String(this.searchResults[searchResultIndex]));
    this.selectRevealedNode(node);
  }
  refreshVisibleData() {
    if (!this.dataGrid) {
      return;
    }
    let child = this.dataGrid.rootNode().children[0];
    while (child) {
      child.refresh();
      child = child.traverseNextNode(false, null, true);
    }
  }
  changeBase() {
    if (this.baseProfile === this.profiles()[this.baseSelect.selectedIndex()]) {
      return;
    }
    this.baseProfile = this.profiles()[this.baseSelect.selectedIndex()];
    const dataGrid = this.dataGrid;
    if (dataGrid.snapshot) {
      void this.baseProfile.loadPromise.then(dataGrid.setBaseDataSource.bind(dataGrid));
    }
    if (!this.currentSearch || !this.searchResults) {
      return;
    }
    this.performSearch(this.currentSearch, false);
  }
  static ALWAYS_AVAILABLE_FILTERS = [
    { uiName: i18nString13(UIStrings14.duplicatedStrings), filterName: "duplicatedStrings" },
    { uiName: i18nString13(UIStrings14.objectsRetainedByDetachedDomNodes), filterName: "objectsRetainedByDetachedDomNodes" },
    { uiName: i18nString13(UIStrings14.objectsRetainedByConsole), filterName: "objectsRetainedByConsole" },
    { uiName: i18nString13(UIStrings14.objectsRetainedByEventHandlers), filterName: "objectsRetainedByEventHandlers" }
  ];
  changeFilter() {
    let selectedIndex = this.filterSelect.selectedIndex();
    let filterName = void 0;
    const indexOfFirstAlwaysAvailableFilter = this.filterSelect.size() - _HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS.length;
    if (selectedIndex >= indexOfFirstAlwaysAvailableFilter) {
      filterName = _HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS[selectedIndex - indexOfFirstAlwaysAvailableFilter].filterName;
      selectedIndex = 0;
    }
    const profileIndex = selectedIndex - 1;
    if (!this.dataGrid) {
      return;
    }
    this.dataGrid.filterSelectIndexChanged(this.profiles(), profileIndex, filterName);
    if (!this.currentSearch || !this.searchResults) {
      return;
    }
    this.performSearch(this.currentSearch, false);
  }
  profiles() {
    return this.profile.profileType().getProfiles();
  }
  selectionChanged(event) {
    const selectedNode = event.data;
    this.setSelectedNodeForDetailsView(selectedNode);
    this.inspectedObjectChanged(event);
  }
  onSelectAllocationNode(event) {
    const selectedNode = event.data;
    this.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
    this.setSelectedNodeForDetailsView(null);
  }
  inspectedObjectChanged(event) {
    const selectedNode = event.data;
    const heapProfilerModel = this.profile.heapProfilerModel();
    if (heapProfilerModel && selectedNode instanceof HeapSnapshotGenericObjectNode) {
      void heapProfilerModel.addInspectedHeapObject(String(selectedNode.snapshotNodeId));
    }
  }
  setSelectedNodeForDetailsView(nodeItem) {
    const dataSource = nodeItem?.retainersDataSource();
    if (dataSource) {
      void this.retainmentDataGrid.setDataSource(dataSource.snapshot, dataSource.snapshotNodeIndex, dataSource.snapshotNodeId);
      if (this.allocationStackView) {
        void this.allocationStackView.setAllocatedObject(dataSource.snapshot, dataSource.snapshotNodeIndex);
      }
    } else {
      if (this.allocationStackView) {
        this.allocationStackView.clear();
      }
      this.retainmentDataGrid.reset();
    }
  }
  async changePerspectiveAndWait(perspectiveTitle) {
    const perspectiveIndex = this.perspectives.findIndex((perspective) => perspective.title() === perspectiveTitle);
    if (perspectiveIndex === -1 || this.currentPerspectiveIndex === perspectiveIndex) {
      return;
    }
    const dataGrid = this.perspectives[perspectiveIndex].masterGrid(this);
    if (!dataGrid) {
      return;
    }
    const promise = dataGrid.once(HeapSnapshotSortableDataGridEvents.ContentShown);
    const option = this.perspectiveSelect.options().find((option2) => option2.value === String(perspectiveIndex));
    this.perspectiveSelect.select(option);
    this.changePerspective(perspectiveIndex);
    await promise;
  }
  async updateDataSourceAndView() {
    const dataGrid = this.dataGrid;
    if (!dataGrid || dataGrid.snapshot) {
      return;
    }
    const snapshotProxy = await this.profile.loadPromise;
    if (this.dataGrid !== dataGrid) {
      return;
    }
    if (dataGrid.snapshot !== snapshotProxy) {
      void dataGrid.setDataSource(snapshotProxy, 0);
    }
    if (dataGrid !== this.diffDataGrid) {
      return;
    }
    if (!this.baseProfile) {
      this.baseProfile = this.profiles()[this.baseSelect.selectedIndex()];
    }
    const baseSnapshotProxy = await this.baseProfile.loadPromise;
    if (this.diffDataGrid.baseSnapshot !== baseSnapshotProxy) {
      this.diffDataGrid.setBaseDataSource(baseSnapshotProxy);
    }
  }
  onSelectedPerspectiveChanged(event) {
    this.changePerspective(Number(event.target.selectedOptions[0].value));
  }
  changePerspective(selectedIndex) {
    if (selectedIndex === this.currentPerspectiveIndex) {
      return;
    }
    this.currentPerspectiveIndex = selectedIndex;
    this.currentPerspective.deactivate(this);
    const perspective = this.perspectives[selectedIndex];
    this.currentPerspective = perspective;
    this.dataGrid = perspective.masterGrid(this);
    perspective.activate(this);
    this.refreshVisibleData();
    if (this.dataGrid) {
      this.dataGrid.updateWidths();
    }
    void this.updateDataSourceAndView();
    if (!this.currentSearch || !this.searchResults) {
      return;
    }
    this.performSearch(this.currentSearch, false);
  }
  async selectLiveObject(perspectiveName, snapshotObjectId) {
    await this.changePerspectiveAndWait(perspectiveName);
    if (!this.dataGrid) {
      return;
    }
    const node = await this.dataGrid.revealObjectByHeapSnapshotId(snapshotObjectId);
    if (node) {
      node.select();
    } else {
      Common13.Console.Console.instance().error("Cannot find corresponding heap snapshot node");
    }
  }
  getPopoverRequest(event) {
    const span = UI14.UIUtils.enclosingNodeOrSelfWithNodeName(event.target, "span");
    const row = UI14.UIUtils.enclosingNodeOrSelfWithNodeName(event.target, "tr");
    if (!row) {
      return null;
    }
    if (!this.dataGrid) {
      return null;
    }
    const node = this.dataGrid.dataGridNodeFromNode(row) || this.containmentDataGrid.dataGridNodeFromNode(row) || this.constructorsDataGrid.dataGridNodeFromNode(row) || this.diffDataGrid.dataGridNodeFromNode(row) || this.allocationDataGrid?.dataGridNodeFromNode(row) || this.retainmentDataGrid.dataGridNodeFromNode(row);
    const heapProfilerModel = this.profile.heapProfilerModel();
    if (!node || !span || !heapProfilerModel) {
      return null;
    }
    let objectPopoverHelper;
    return {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
      // @ts-expect-error
      box: span.boxInWindow(),
      show: async (popover) => {
        if (!heapProfilerModel) {
          return false;
        }
        const remoteObject = await node.queryObjectContent(heapProfilerModel, "popover");
        if (remoteObject instanceof SDK7.RemoteObject.RemoteObject) {
          objectPopoverHelper = await ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildObjectPopover(remoteObject, popover);
        } else {
          objectPopoverHelper = ObjectUI.ObjectPopoverHelper.ObjectPopoverHelper.buildDescriptionPopover(remoteObject.description, remoteObject.link, popover);
        }
        if (!objectPopoverHelper) {
          heapProfilerModel.runtimeModel().releaseObjectGroup("popover");
          return false;
        }
        return true;
      },
      hide: () => {
        heapProfilerModel.runtimeModel().releaseObjectGroup("popover");
        if (objectPopoverHelper) {
          objectPopoverHelper.dispose();
        }
      }
    };
  }
  updatePerspectiveOptions() {
    const multipleSnapshots = this.profiles().length > 1;
    this.perspectiveSelect.removeOptions();
    this.perspectives.forEach((perspective, index) => {
      if (multipleSnapshots || perspective !== this.comparisonPerspective) {
        const option = this.perspectiveSelect.createOption(perspective.title(), String(index));
        if (perspective === this.currentPerspective) {
          this.perspectiveSelect.select(option);
        }
      }
    });
  }
  updateBaseOptions() {
    const list = this.profiles();
    const selectedIndex = this.baseSelect.selectedIndex();
    this.baseSelect.removeOptions();
    for (const item of list) {
      this.baseSelect.createOption(item.title);
    }
    if (selectedIndex > -1) {
      this.baseSelect.setSelectedIndex(selectedIndex);
    }
  }
  updateFilterOptions() {
    const list = this.profiles();
    const selectedIndex = this.filterSelect.selectedIndex();
    const originalSize = this.filterSelect.size();
    this.filterSelect.removeOptions();
    this.filterSelect.createOption(i18nString13(UIStrings14.allObjects));
    for (let i = 0; i < list.length; ++i) {
      let title;
      if (!i) {
        title = i18nString13(UIStrings14.objectsAllocatedBeforeS, { PH1: list[i].title });
      } else {
        title = i18nString13(UIStrings14.objectsAllocatedBetweenSAndS, { PH1: list[i - 1].title, PH2: list[i].title });
      }
      this.filterSelect.createOption(title);
    }
    const dividerIndex = this.filterSelect.size();
    const divider = this.filterSelect.createOption("\u2014".repeat(18));
    divider.disabled = true;
    for (const filter of _HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS) {
      this.filterSelect.createOption(filter.uiName);
    }
    const newSize = this.filterSelect.size();
    if (selectedIndex > -1) {
      const distanceFromEnd = originalSize - selectedIndex;
      if (distanceFromEnd <= _HeapSnapshotView.ALWAYS_AVAILABLE_FILTERS.length) {
        this.filterSelect.setSelectedIndex(newSize - distanceFromEnd);
      } else if (selectedIndex >= dividerIndex) {
        this.filterSelect.setSelectedIndex(-1);
      } else {
        this.filterSelect.setSelectedIndex(selectedIndex);
      }
    }
  }
  updateControls() {
    this.updatePerspectiveOptions();
    this.updateBaseOptions();
    this.updateFilterOptions();
  }
  onReceiveSnapshot(event) {
    this.updateControls();
    const profile = event.data;
    profile.addEventListener("ProfileTitleChanged", this.updateControls, this);
  }
  onProfileHeaderRemoved(event) {
    const profile = event.data;
    profile.removeEventListener("ProfileTitleChanged", this.updateControls, this);
    if (this.profile === profile) {
      this.detach();
      this.profile.profileType().removeEventListener("SnapshotReceived", this.onReceiveSnapshot, this);
      this.profile.profileType().removeEventListener("remove-profile-header", this.onProfileHeaderRemoved, this);
      this.dispose();
    } else {
      this.updateControls();
    }
  }
  dispose() {
    this.linkifier.dispose();
    this.popoverHelper.dispose();
    if (this.allocationStackView) {
      this.allocationStackView.clear();
      if (this.allocationDataGrid) {
        this.allocationDataGrid.dispose();
      }
    }
    this.onStopTracking();
    if (this.trackingOverviewGrid) {
      this.trackingOverviewGrid.removeEventListener("IdsRangeChanged", this.onIdsRangeChanged.bind(this));
    }
  }
};
var Perspective = class {
  titleInternal;
  constructor(title) {
    this.titleInternal = title;
  }
  activate(_heapSnapshotView) {
  }
  deactivate(heapSnapshotView) {
    heapSnapshotView.baseSelect.setVisible(false);
    heapSnapshotView.filterSelect.setVisible(false);
    heapSnapshotView.classNameFilter.setVisible(false);
    if (heapSnapshotView.trackingOverviewGrid) {
      heapSnapshotView.trackingOverviewGrid.detach();
    }
    if (heapSnapshotView.allocationWidget) {
      heapSnapshotView.allocationWidget.detach();
    }
    if (heapSnapshotView.statisticsView) {
      heapSnapshotView.statisticsView.detach();
    }
    heapSnapshotView.splitWidget.detach();
    heapSnapshotView.splitWidget.detachChildWidgets();
  }
  masterGrid(_heapSnapshotView) {
    return null;
  }
  title() {
    return this.titleInternal;
  }
  supportsSearch() {
    return false;
  }
};
var SummaryPerspective = class extends Perspective {
  constructor() {
    super(i18nString13(UIStrings14.summary));
  }
  activate(heapSnapshotView) {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.constructorsWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
    heapSnapshotView.filterSelect.setVisible(true);
    heapSnapshotView.classNameFilter.setVisible(true);
    if (!heapSnapshotView.trackingOverviewGrid) {
      return;
    }
    heapSnapshotView.trackingOverviewGrid.show(heapSnapshotView.searchableViewInternal.element, heapSnapshotView.splitWidget.element);
    heapSnapshotView.trackingOverviewGrid.update();
    heapSnapshotView.trackingOverviewGrid.updateGrid();
  }
  masterGrid(heapSnapshotView) {
    return heapSnapshotView.constructorsDataGrid;
  }
  supportsSearch() {
    return true;
  }
};
var ComparisonPerspective = class extends Perspective {
  constructor() {
    super(i18nString13(UIStrings14.comparison));
  }
  activate(heapSnapshotView) {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.diffWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
    heapSnapshotView.baseSelect.setVisible(true);
    heapSnapshotView.classNameFilter.setVisible(true);
  }
  masterGrid(heapSnapshotView) {
    return heapSnapshotView.diffDataGrid;
  }
  supportsSearch() {
    return true;
  }
};
var ContainmentPerspective = class extends Perspective {
  constructor() {
    super(i18nString13(UIStrings14.containment));
  }
  activate(heapSnapshotView) {
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.containmentWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    heapSnapshotView.splitWidget.show(heapSnapshotView.searchableViewInternal.element);
  }
  masterGrid(heapSnapshotView) {
    return heapSnapshotView.containmentDataGrid;
  }
};
var AllocationPerspective = class extends Perspective {
  allocationSplitWidget;
  constructor() {
    super(i18nString13(UIStrings14.allocation));
    this.allocationSplitWidget = new UI14.SplitWidget.SplitWidget(false, true, "heap-snapshot-allocation-split-view-state", 200, 200);
    this.allocationSplitWidget.setSidebarWidget(new UI14.Widget.VBox());
  }
  activate(heapSnapshotView) {
    if (heapSnapshotView.allocationWidget) {
      this.allocationSplitWidget.setMainWidget(heapSnapshotView.allocationWidget);
    }
    heapSnapshotView.splitWidget.setMainWidget(heapSnapshotView.constructorsWidget);
    heapSnapshotView.splitWidget.setSidebarWidget(heapSnapshotView.objectDetailsView);
    const allocatedObjectsView = new UI14.Widget.VBox();
    const resizer = document.createElement("div");
    resizer.classList.add("heap-snapshot-view-resizer");
    const title = resizer.createChild("div", "title").createChild("span");
    resizer.createChild("div", "verticalResizerIcon");
    title.textContent = i18nString13(UIStrings14.liveObjects);
    this.allocationSplitWidget.hideDefaultResizer();
    this.allocationSplitWidget.installResizer(resizer);
    allocatedObjectsView.element.appendChild(resizer);
    heapSnapshotView.splitWidget.show(allocatedObjectsView.element);
    this.allocationSplitWidget.setSidebarWidget(allocatedObjectsView);
    this.allocationSplitWidget.show(heapSnapshotView.searchableViewInternal.element);
    heapSnapshotView.constructorsDataGrid.clear();
    if (heapSnapshotView.allocationDataGrid) {
      const selectedNode = heapSnapshotView.allocationDataGrid.selectedNode;
      if (selectedNode) {
        heapSnapshotView.constructorsDataGrid.setAllocationNodeId(selectedNode.allocationNodeId());
      }
    }
  }
  deactivate(heapSnapshotView) {
    this.allocationSplitWidget.detach();
    super.deactivate(heapSnapshotView);
  }
  masterGrid(heapSnapshotView) {
    return heapSnapshotView.allocationDataGrid;
  }
};
var StatisticsPerspective = class extends Perspective {
  constructor() {
    super(i18nString13(UIStrings14.statistics));
  }
  activate(heapSnapshotView) {
    heapSnapshotView.statisticsView.show(heapSnapshotView.searchableViewInternal.element);
  }
  masterGrid(_heapSnapshotView) {
    return null;
  }
};
var HeapSnapshotProfileType = class _HeapSnapshotProfileType extends Common13.ObjectWrapper.eventMixin(ProfileType) {
  exposeInternals;
  customContentInternal;
  constructor(id, title) {
    super(id || _HeapSnapshotProfileType.TypeId, title || i18nString13(UIStrings14.heapSnapshot));
    SDK7.TargetManager.TargetManager.instance().observeModels(SDK7.HeapProfilerModel.HeapProfilerModel, this);
    SDK7.TargetManager.TargetManager.instance().addModelListener(SDK7.HeapProfilerModel.HeapProfilerModel, "ResetProfiles", this.resetProfiles, this);
    SDK7.TargetManager.TargetManager.instance().addModelListener(SDK7.HeapProfilerModel.HeapProfilerModel, "AddHeapSnapshotChunk", this.addHeapSnapshotChunk, this);
    SDK7.TargetManager.TargetManager.instance().addModelListener(SDK7.HeapProfilerModel.HeapProfilerModel, "ReportHeapSnapshotProgress", this.reportHeapSnapshotProgress, this);
    this.exposeInternals = Common13.Settings.Settings.instance().createSetting("expose-internals", false);
    this.customContentInternal = null;
  }
  modelAdded(heapProfilerModel) {
    void heapProfilerModel.enable();
  }
  modelRemoved(_heapProfilerModel) {
  }
  getProfiles() {
    return super.getProfiles();
  }
  fileExtension() {
    return ".heapsnapshot";
  }
  get buttonTooltip() {
    return i18nString13(UIStrings14.takeHeapSnapshot);
  }
  isInstantProfile() {
    return true;
  }
  buttonClicked() {
    void this.takeHeapSnapshot();
    Host2.userMetrics.actionTaken(Host2.UserMetrics.Action.ProfilesHeapProfileTaken);
    return false;
  }
  get treeItemTitle() {
    return i18nString13(UIStrings14.heapSnapshots);
  }
  get description() {
    return i18nString13(UIStrings14.heapSnapshotProfilesShowMemory);
  }
  customContent() {
    const showOptionToExposeInternalsInHeapSnapshot = Root2.Runtime.experiments.isEnabled("show-option-tp-expose-internals-in-heap-snapshot");
    const exposeInternalsInHeapSnapshotCheckbox = SettingsUI.SettingsUI.createSettingCheckbox(i18nString13(UIStrings14.exposeInternals), this.exposeInternals);
    this.customContentInternal = exposeInternalsInHeapSnapshotCheckbox;
    return showOptionToExposeInternalsInHeapSnapshot ? exposeInternalsInHeapSnapshotCheckbox : null;
  }
  setCustomContentEnabled(enable) {
    if (this.customContentInternal) {
      this.customContentInternal.disabled = !enable;
    }
  }
  createProfileLoadedFromFile(title) {
    return new HeapProfileHeader(null, this, title);
  }
  async takeHeapSnapshot() {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = UI14.Context.Context.instance().flavor(SDK7.HeapProfilerModel.HeapProfilerModel);
    if (!heapProfilerModel) {
      return;
    }
    let profile = new HeapProfileHeader(heapProfilerModel, this);
    this.setProfileBeingRecorded(profile);
    this.addProfile(profile);
    profile.updateStatus(i18nString13(UIStrings14.snapshotting));
    const animationModel = heapProfilerModel.target().model(SDK7.AnimationModel.AnimationModel);
    if (animationModel) {
      await animationModel.releaseAllAnimations();
    }
    await heapProfilerModel.takeHeapSnapshot({
      reportProgress: true,
      captureNumericValue: true,
      exposeInternals: this.exposeInternals.get()
    });
    profile = this.profileBeingRecorded();
    if (!profile) {
      return;
    }
    profile.title = i18nString13(UIStrings14.snapshotD, { PH1: profile.uid });
    profile.finishLoad();
    this.setProfileBeingRecorded(null);
    this.dispatchEventToListeners("profile-complete", profile);
  }
  addHeapSnapshotChunk(event) {
    const profile = this.profileBeingRecorded();
    if (!profile) {
      return;
    }
    profile.transferChunk(event.data);
  }
  reportHeapSnapshotProgress(event) {
    const profile = this.profileBeingRecorded();
    if (!profile) {
      return;
    }
    const { done, total, finished } = event.data;
    profile.updateStatus(i18nString13(UIStrings14.percentagePlaceholder, { PH1: (done / total * 100).toFixed(0) }), true);
    if (finished) {
      profile.prepareToLoad();
    }
  }
  resetProfiles(event) {
    const heapProfilerModel = event.data;
    for (const profile of this.getProfiles()) {
      if (profile.heapProfilerModel() === heapProfilerModel) {
        this.removeProfile(profile);
      }
    }
  }
  snapshotReceived(profile) {
    if (this.profileBeingRecorded() === profile) {
      this.setProfileBeingRecorded(null);
    }
    this.dispatchEventToListeners("SnapshotReceived", profile);
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TypeId = "HEAP";
  // TODO(crbug.com/1228674): Remove event string once its no longer used in web tests.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static SnapshotReceived = "SnapshotReceived";
};
var TrackingHeapSnapshotProfileType = class _TrackingHeapSnapshotProfileType extends Common13.ObjectWrapper.eventMixin(HeapSnapshotProfileType) {
  recordAllocationStacksSettingInternal;
  customContentInternal;
  recording;
  profileSamples;
  constructor() {
    super(_TrackingHeapSnapshotProfileType.TypeId, i18nString13(UIStrings14.allocationInstrumentationOn));
    this.recordAllocationStacksSettingInternal = Common13.Settings.Settings.instance().createSetting("record-allocation-stacks", false);
    this.customContentInternal = null;
    this.recording = false;
  }
  modelAdded(heapProfilerModel) {
    super.modelAdded(heapProfilerModel);
    heapProfilerModel.addEventListener("HeapStatsUpdate", this.heapStatsUpdate, this);
    heapProfilerModel.addEventListener("LastSeenObjectId", this.lastSeenObjectId, this);
  }
  modelRemoved(heapProfilerModel) {
    super.modelRemoved(heapProfilerModel);
    heapProfilerModel.removeEventListener("HeapStatsUpdate", this.heapStatsUpdate, this);
    heapProfilerModel.removeEventListener("LastSeenObjectId", this.lastSeenObjectId, this);
  }
  heapStatsUpdate(event) {
    if (!this.profileSamples) {
      return;
    }
    const samples = event.data;
    let index;
    for (let i = 0; i < samples.length; i += 3) {
      index = samples[i];
      const size = samples[i + 2];
      this.profileSamples.sizes[index] = size;
      if (!this.profileSamples.max[index]) {
        this.profileSamples.max[index] = size;
      }
    }
  }
  lastSeenObjectId(event) {
    const profileSamples = this.profileSamples;
    if (!profileSamples) {
      return;
    }
    const { lastSeenObjectId, timestamp } = event.data;
    const currentIndex = Math.max(profileSamples.ids.length, profileSamples.max.length - 1);
    profileSamples.ids[currentIndex] = lastSeenObjectId;
    if (!profileSamples.max[currentIndex]) {
      profileSamples.max[currentIndex] = 0;
      profileSamples.sizes[currentIndex] = 0;
    }
    profileSamples.timestamps[currentIndex] = timestamp;
    if (profileSamples.totalTime < timestamp - profileSamples.timestamps[0]) {
      profileSamples.totalTime *= 2;
    }
    if (this.profileSamples) {
      this.dispatchEventToListeners("HeapStatsUpdate", this.profileSamples);
    }
    const profile = this.profileBeingRecorded();
    if (profile) {
      profile.updateStatus(null, true);
    }
  }
  hasTemporaryView() {
    return true;
  }
  get buttonTooltip() {
    return this.recording ? i18nString13(UIStrings14.stopRecordingHeapProfile) : i18nString13(UIStrings14.startRecordingHeapProfile);
  }
  isInstantProfile() {
    return false;
  }
  buttonClicked() {
    return this.toggleRecording();
  }
  async startRecordingProfile() {
    if (this.profileBeingRecorded()) {
      return;
    }
    const heapProfilerModel = this.addNewProfile();
    if (!heapProfilerModel) {
      return;
    }
    const animationModel = heapProfilerModel.target().model(SDK7.AnimationModel.AnimationModel);
    if (animationModel) {
      await animationModel.releaseAllAnimations();
    }
    void heapProfilerModel.startTrackingHeapObjects(this.recordAllocationStacksSettingInternal.get());
  }
  customContent() {
    const checkboxSetting = SettingsUI.SettingsUI.createSettingCheckbox(i18nString13(UIStrings14.recordAllocationStacksExtra), this.recordAllocationStacksSettingInternal);
    this.customContentInternal = checkboxSetting;
    return checkboxSetting;
  }
  setCustomContentEnabled(enable) {
    if (this.customContentInternal) {
      this.customContentInternal.disabled = !enable;
    }
  }
  recordAllocationStacksSetting() {
    return this.recordAllocationStacksSettingInternal;
  }
  addNewProfile() {
    const heapProfilerModel = UI14.Context.Context.instance().flavor(SDK7.HeapProfilerModel.HeapProfilerModel);
    if (!heapProfilerModel) {
      return null;
    }
    this.setProfileBeingRecorded(new HeapProfileHeader(heapProfilerModel, this, void 0));
    this.profileSamples = new Samples();
    this.profileBeingRecorded()._profileSamples = this.profileSamples;
    this.recording = true;
    this.addProfile(this.profileBeingRecorded());
    this.profileBeingRecorded().updateStatus(i18nString13(UIStrings14.recording));
    this.dispatchEventToListeners(
      "TrackingStarted"
      /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STARTED */
    );
    return heapProfilerModel;
  }
  async stopRecordingProfile() {
    let profile = this.profileBeingRecorded();
    profile.updateStatus(i18nString13(UIStrings14.snapshotting));
    const stopPromise = profile.heapProfilerModel().stopTrackingHeapObjects(true);
    this.recording = false;
    this.dispatchEventToListeners(
      "TrackingStopped"
      /* TrackingHeapSnapshotProfileTypeEvents.TRACKING_STOPPED */
    );
    await stopPromise;
    profile = this.profileBeingRecorded();
    if (!profile) {
      return;
    }
    profile.finishLoad();
    this.profileSamples = null;
    this.setProfileBeingRecorded(null);
    this.dispatchEventToListeners("profile-complete", profile);
  }
  toggleRecording() {
    if (this.recording) {
      void this.stopRecordingProfile();
    } else {
      void this.startRecordingProfile();
    }
    return this.recording;
  }
  fileExtension() {
    return ".heaptimeline";
  }
  get treeItemTitle() {
    return i18nString13(UIStrings14.allocationTimelines);
  }
  get description() {
    return i18nString13(UIStrings14.AllocationTimelinesShowInstrumented);
  }
  resetProfiles(event) {
    const wasRecording = this.recording;
    this.setProfileBeingRecorded(null);
    super.resetProfiles(event);
    this.profileSamples = null;
    if (wasRecording) {
      this.addNewProfile();
    }
  }
  profileBeingRecordedRemoved() {
    void this.stopRecordingProfile();
    this.profileSamples = null;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TypeId = "HEAP-RECORD";
  // TODO(crbug.com/1228674): Remove event strings once they are no longer used in web tests.
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static HeapStatsUpdate = "HeapStatsUpdate";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TrackingStarted = "TrackingStarted";
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static TrackingStopped = "TrackingStopped";
};
var HeapProfileHeader = class extends ProfileHeader {
  heapProfilerModelInternal;
  maxJSObjectId;
  workerProxy;
  receiver;
  snapshotProxy;
  loadPromise;
  fulfillLoad;
  totalNumberOfChunks;
  bufferedWriter;
  onTempFileReady;
  failedToCreateTempFile;
  wasDisposed;
  fileName;
  constructor(heapProfilerModel, type, title) {
    super(type, title || i18nString13(UIStrings14.snapshotD, { PH1: type.nextProfileUid() }));
    this.heapProfilerModelInternal = heapProfilerModel;
    this.maxJSObjectId = -1;
    this.workerProxy = null;
    this.receiver = null;
    this.snapshotProxy = null;
    const { promise, resolve } = Promise.withResolvers();
    this.loadPromise = promise;
    this.fulfillLoad = resolve;
    this.totalNumberOfChunks = 0;
    this.bufferedWriter = null;
    this.onTempFileReady = null;
  }
  heapProfilerModel() {
    return this.heapProfilerModelInternal;
  }
  async getLocation(nodeIndex) {
    if (!this.snapshotProxy) {
      return null;
    }
    return await this.snapshotProxy.getLocation(nodeIndex);
  }
  createSidebarTreeElement(dataDisplayDelegate) {
    return new ProfileSidebarTreeElement(dataDisplayDelegate, this, "heap-snapshot-sidebar-tree-item");
  }
  createView(dataDisplayDelegate) {
    return new HeapSnapshotView(dataDisplayDelegate, this);
  }
  prepareToLoad() {
    console.assert(!this.receiver, "Already loading");
    this.setupWorker();
    this.updateStatus(i18nString13(UIStrings14.loading), true);
  }
  finishLoad() {
    if (!this.wasDisposed && this.receiver) {
      void this.receiver.close();
    }
    if (!this.bufferedWriter) {
      return;
    }
    this.didWriteToTempFile(this.bufferedWriter);
  }
  didWriteToTempFile(tempFile) {
    if (this.wasDisposed) {
      if (tempFile) {
        tempFile.remove();
      }
      return;
    }
    this.tempFile = tempFile;
    if (!tempFile) {
      this.failedToCreateTempFile = true;
    }
    if (this.onTempFileReady) {
      this.onTempFileReady();
      this.onTempFileReady = null;
    }
  }
  setupWorker() {
    console.assert(!this.workerProxy, "HeapSnapshotWorkerProxy already exists");
    this.workerProxy = new HeapSnapshotWorkerProxy(this.handleWorkerEvent.bind(this));
    this.workerProxy.addEventListener("Wait", (event) => {
      this.updateStatus(null, event.data);
    }, this);
    this.receiver = this.workerProxy.createLoader(this.uid, this.snapshotReceived.bind(this));
  }
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleWorkerEvent(eventName, data) {
    if (HeapSnapshotModel5.HeapSnapshotModel.HeapSnapshotProgressEvent.BrokenSnapshot === eventName) {
      const error = data;
      Common13.Console.Console.instance().error(error);
      return;
    }
    if (HeapSnapshotModel5.HeapSnapshotModel.HeapSnapshotProgressEvent.Update !== eventName) {
      return;
    }
    const serializedMessage = data;
    const messageObject = i18n27.i18n.deserializeUIString(serializedMessage);
    this.updateStatus(moduleI18nString(messageObject.string, messageObject.values));
  }
  dispose() {
    if (this.workerProxy) {
      this.workerProxy.dispose();
    }
    this.removeTempFile();
    this.wasDisposed = true;
  }
  didCompleteSnapshotTransfer() {
    if (!this.snapshotProxy) {
      return;
    }
    this.updateStatus(i18n27.ByteUtilities.bytesToString(this.snapshotProxy.totalSize), false);
  }
  transferChunk(chunk) {
    if (!this.bufferedWriter) {
      this.bufferedWriter = new Bindings2.TempFile.TempFile();
    }
    this.bufferedWriter.write([chunk]);
    ++this.totalNumberOfChunks;
    if (this.receiver) {
      void this.receiver.write(chunk);
    }
  }
  snapshotReceived(snapshotProxy) {
    if (this.wasDisposed) {
      return;
    }
    this.receiver = null;
    this.snapshotProxy = snapshotProxy;
    this.maxJSObjectId = snapshotProxy.maxJSObjectId();
    this.didCompleteSnapshotTransfer();
    if (this.workerProxy) {
      this.workerProxy.startCheckingForLongRunningCalls();
    }
    this.notifySnapshotReceived();
  }
  notifySnapshotReceived() {
    if (this.snapshotProxy) {
      this.fulfillLoad(this.snapshotProxy);
    }
    this.profileType().snapshotReceived(this);
  }
  canSaveToFile() {
    return !this.fromFile();
  }
  async saveToFile() {
    await this.loadPromise;
    const fileOutputStream = new Bindings2.FileUtils.FileOutputStream();
    this.fileName = this.fileName || "Heap-" + Platform8.DateUtilities.toISO8601Compact(/* @__PURE__ */ new Date()) + this.profileType().fileExtension();
    const onOpen = async (accepted) => {
      if (!accepted) {
        return;
      }
      if (this.failedToCreateTempFile) {
        Common13.Console.Console.instance().error("Failed to open temp file with heap snapshot");
        void fileOutputStream.close();
        return;
      }
      if (this.tempFile) {
        const error = await this.tempFile.copyToOutputStream(fileOutputStream, this.onChunkTransferred.bind(this));
        if (error) {
          Common13.Console.Console.instance().error("Failed to read heap snapshot from temp file: " + error.message);
        }
        this.didCompleteSnapshotTransfer();
        return;
      }
      this.onTempFileReady = () => {
        void onOpen(accepted);
      };
      this.updateSaveProgress(0, 1);
    };
    await fileOutputStream.open(this.fileName).then(onOpen.bind(this));
  }
  onChunkTransferred(reader) {
    this.updateSaveProgress(reader.loadedSize(), reader.fileSize());
  }
  updateSaveProgress(value2, total) {
    const percentValue = ((total && value2 / total) * 100).toFixed(0);
    this.updateStatus(i18nString13(UIStrings14.savingD, { PH1: percentValue }));
  }
  async loadFromFile(file) {
    this.updateStatus(i18nString13(UIStrings14.loading), true);
    this.setupWorker();
    const reader = new Bindings2.FileUtils.ChunkedFileReader(file, 1e7);
    const success = await reader.read(this.receiver);
    if (!success) {
      const error = reader.error();
      if (error) {
        this.updateStatus(error.message);
      }
    }
    return success ? null : reader.error();
  }
  profileType() {
    return super.profileType();
  }
};
var HeapSnapshotStatisticsView = class _HeapSnapshotStatisticsView extends UI14.Widget.VBox {
  pieChart;
  constructor() {
    super();
    this.element.classList.add("heap-snapshot-statistics-view");
    this.element.setAttribute("jslog", `${VisualLogging5.pane("profiler.heap-snapshot-statistics-view").track({ resize: true })}`);
    this.pieChart = new PerfUI5.PieChart.PieChart();
    this.setTotalAndRecords(0, []);
    this.pieChart.classList.add("heap-snapshot-stats-pie-chart");
    this.element.appendChild(this.pieChart);
  }
  static valueFormatter(value2) {
    const formatter = new Intl.NumberFormat(i18n27.DevToolsLocale.DevToolsLocale.instance().locale, {
      style: "unit",
      unit: "kilobyte"
    });
    return formatter.format(Math.round(value2 / 1e3));
  }
  setTotalAndRecords(total, records) {
    this.pieChart.data = {
      chartName: i18nString13(UIStrings14.heapMemoryUsage),
      size: 150,
      formatter: _HeapSnapshotStatisticsView.valueFormatter,
      showLegend: true,
      total,
      slices: records
    };
  }
};
var HeapAllocationStackView = class extends UI14.Widget.Widget {
  heapProfilerModel;
  linkifier;
  frameElements;
  constructor(heapProfilerModel) {
    super();
    this.heapProfilerModel = heapProfilerModel;
    this.linkifier = new Components4.Linkifier.Linkifier();
    this.frameElements = [];
  }
  onContextMenu(link, event) {
    const contextMenu = new UI14.ContextMenu.ContextMenu(event);
    contextMenu.appendApplicableItems(link);
    void contextMenu.show();
    event.consume(true);
  }
  onStackViewKeydown(event) {
    const target = event.target;
    if (!target) {
      return;
    }
    if (event.key === "Enter") {
      const link = stackFrameToURLElement.get(target);
      if (!link) {
        return;
      }
      const linkInfo = Components4.Linkifier.Linkifier.linkInfo(link);
      if (!linkInfo) {
        return;
      }
      if (Components4.Linkifier.Linkifier.invokeFirstAction(linkInfo)) {
        event.consume(true);
      }
      return;
    }
    let navDown;
    const keyboardEvent = event;
    if (keyboardEvent.key === "ArrowUp") {
      navDown = false;
    } else if (keyboardEvent.key === "ArrowDown") {
      navDown = true;
    } else {
      return;
    }
    const index = this.frameElements.indexOf(target);
    if (index === -1) {
      return;
    }
    const nextIndex = navDown ? index + 1 : index - 1;
    if (nextIndex < 0 || nextIndex >= this.frameElements.length) {
      return;
    }
    const nextFrame = this.frameElements[nextIndex];
    nextFrame.tabIndex = 0;
    target.tabIndex = -1;
    nextFrame.focus();
    event.consume(true);
  }
  async setAllocatedObject(snapshot, snapshotNodeIndex) {
    this.clear();
    const frames = await snapshot.allocationStack(snapshotNodeIndex);
    if (!frames) {
      const stackDiv2 = this.element.createChild("div", "no-heap-allocation-stack");
      UI14.UIUtils.createTextChild(stackDiv2, i18nString13(UIStrings14.stackWasNotRecordedForThisObject));
      return;
    }
    const stackDiv = this.element.createChild("div", "heap-allocation-stack");
    stackDiv.addEventListener("keydown", this.onStackViewKeydown.bind(this), false);
    for (const frame of frames) {
      const frameDiv = stackDiv.createChild("div", "stack-frame");
      this.frameElements.push(frameDiv);
      frameDiv.tabIndex = -1;
      const name = frameDiv.createChild("div");
      name.textContent = UI14.UIUtils.beautifyFunctionName(frame.functionName);
      if (!frame.scriptId) {
        continue;
      }
      const target = this.heapProfilerModel ? this.heapProfilerModel.target() : null;
      const options = { columnNumber: frame.column - 1, inlineFrameIndex: 0 };
      const urlElement = this.linkifier.linkifyScriptLocation(target, String(frame.scriptId), frame.scriptName, frame.line - 1, options);
      frameDiv.appendChild(urlElement);
      stackFrameToURLElement.set(frameDiv, urlElement);
      frameDiv.addEventListener("contextmenu", this.onContextMenu.bind(this, urlElement));
    }
    this.frameElements[0].tabIndex = 0;
  }
  clear() {
    this.element.removeChildren();
    this.frameElements = [];
    this.linkifier.reset();
  }
};
var stackFrameToURLElement = /* @__PURE__ */ new WeakMap();

// gen/front_end/panels/profiler/ProfileTypeRegistry.js
var ProfileTypeRegistry = class {
  heapSnapshotProfileType;
  samplingHeapProfileType;
  trackingHeapSnapshotProfileType;
  detachedElementProfileType;
  constructor() {
    this.heapSnapshotProfileType = new HeapSnapshotProfileType();
    this.samplingHeapProfileType = new SamplingHeapProfileType();
    this.trackingHeapSnapshotProfileType = new TrackingHeapSnapshotProfileType();
    this.detachedElementProfileType = new DetachedElementsProfileType();
  }
};
var instance = new ProfileTypeRegistry();

// gen/front_end/panels/profiler/HeapProfilerPanel.js
var UIStrings15 = {
  /**
   * @description A context menu item in the Heap Profiler Panel of a profiler tool
   */
  revealInSummaryView: "Reveal in Summary view"
};
var str_14 = i18n29.i18n.registerUIStrings("panels/profiler/HeapProfilerPanel.ts", UIStrings15);
var i18nString14 = i18n29.i18n.getLocalizedString.bind(void 0, str_14);
var heapProfilerPanelInstance;
var HeapProfilerPanel = class _HeapProfilerPanel extends ProfilesPanel {
  constructor() {
    const registry = instance;
    const profileTypes = [
      registry.heapSnapshotProfileType,
      registry.trackingHeapSnapshotProfileType,
      registry.samplingHeapProfileType,
      registry.detachedElementProfileType
    ];
    super("heap-profiler", profileTypes, "profiler.heap-toggle-recording");
  }
  static instance() {
    if (!heapProfilerPanelInstance) {
      heapProfilerPanelInstance = new _HeapProfilerPanel();
    }
    return heapProfilerPanelInstance;
  }
  appendApplicableItems(_event, contextMenu, object) {
    if (!this.isShowing()) {
      return;
    }
    if (!object.objectId) {
      return;
    }
    const objectId = object.objectId;
    const heapProfiles = instance.heapSnapshotProfileType.getProfiles();
    if (!heapProfiles.length) {
      return;
    }
    const heapProfilerModel = object.runtimeModel().heapProfilerModel();
    if (!heapProfilerModel) {
      return;
    }
    function revealInView(viewName) {
      void heapProfilerModel.snapshotObjectIdForObjectId(objectId).then((result) => {
        if (this.isShowing() && result) {
          this.showObject(result, viewName);
        }
      });
    }
    contextMenu.revealSection().appendItem(i18nString14(UIStrings15.revealInSummaryView), revealInView.bind(this, "Summary"), { jslogContext: "reveal-in-summary" });
  }
  handleAction(_context, _actionId) {
    const panel = UI15.Context.Context.instance().flavor(_HeapProfilerPanel);
    console.assert(Boolean(panel) && panel instanceof _HeapProfilerPanel);
    if (panel) {
      panel.toggleRecord();
    }
    return true;
  }
  wasShown() {
    super.wasShown();
    UI15.Context.Context.instance().setFlavor(_HeapProfilerPanel, this);
    Host3.userMetrics.panelLoaded("heap-profiler", "DevTools.Launch.HeapProfiler");
  }
  willHide() {
    UI15.Context.Context.instance().setFlavor(_HeapProfilerPanel, null);
    super.willHide();
  }
  showObject(snapshotObjectId, perspectiveName) {
    const registry = instance;
    const heapProfiles = registry.heapSnapshotProfileType.getProfiles();
    for (let i = 0; i < heapProfiles.length; i++) {
      const profile = heapProfiles[i];
      if (profile.maxJSObjectId >= parseInt(snapshotObjectId, 10)) {
        this.showProfile(profile);
        const view = this.viewForProfile(profile);
        void view.selectLiveObject(perspectiveName, snapshotObjectId);
        break;
      }
    }
  }
};

// gen/front_end/panels/profiler/LiveHeapProfileView.js
var LiveHeapProfileView_exports = {};
__export(LiveHeapProfileView_exports, {
  ActionDelegate: () => ActionDelegate2,
  GridNode: () => GridNode,
  LiveHeapProfileView: () => LiveHeapProfileView
});
import "./../../ui/legacy/legacy.js";
import * as Common14 from "./../../core/common/common.js";
import * as i18n31 from "./../../core/i18n/i18n.js";
import * as Platform9 from "./../../core/platform/platform.js";
import * as SDK8 from "./../../core/sdk/sdk.js";
import * as Workspace from "./../../models/workspace/workspace.js";
import * as DataGrid12 from "./../../ui/legacy/components/data_grid/data_grid.js";
import * as UI16 from "./../../ui/legacy/legacy.js";

// gen/front_end/panels/profiler/liveHeapProfile.css.js
var liveHeapProfile_css_default = `/*
 * Copyright 2019 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.data-grid {
  border: none;
}

.data-grid td .size-units {
  margin-left: 4px;
  font-size: 75%;
}

.data-grid tr:not(.selected) td .size-units {
  color: var(--sys-color-token-subtle);
}

devtools-toolbar {
  border-bottom: 1px solid var(--sys-color-divider);
}

/*# sourceURL=${import.meta.resolve("./liveHeapProfile.css")} */`;

// gen/front_end/panels/profiler/LiveHeapProfileView.js
var UIStrings16 = {
  /**
   * @description Text for a heap profile type
   */
  jsHeap: "JS Heap",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   */
  allocatedJsHeapSizeCurrentlyIn: "Allocated JS heap size currently in use",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   */
  vms: "VMs",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   */
  numberOfVmsSharingTheSameScript: "Number of VMs sharing the same script source",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   */
  scriptUrl: "Script URL",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   */
  urlOfTheScriptSource: "URL of the script source",
  /**
   * @description Data grid name for Heap Profile data grids
   */
  heapProfile: "Heap Profile",
  /**
   * @description Text in Live Heap Profile View of a profiler tool
   * @example {1} PH1
   */
  anonymousScriptS: "(Anonymous Script {PH1})",
  /**
   * @description A unit
   */
  kb: "kB"
};
var str_15 = i18n31.i18n.registerUIStrings("panels/profiler/LiveHeapProfileView.ts", UIStrings16);
var i18nString15 = i18n31.i18n.getLocalizedString.bind(void 0, str_15);
var liveHeapProfileViewInstance;
var LiveHeapProfileView = class _LiveHeapProfileView extends UI16.Widget.VBox {
  gridNodeByUrl;
  setting;
  toggleRecordAction;
  toggleRecordButton;
  startWithReloadButton;
  dataGrid;
  currentPollId;
  constructor() {
    super({ useShadowDom: true });
    this.gridNodeByUrl = /* @__PURE__ */ new Map();
    this.registerRequiredCSS(liveHeapProfile_css_default);
    this.setting = Common14.Settings.Settings.instance().moduleSetting("memory-live-heap-profile");
    const toolbar2 = this.contentElement.createChild("devtools-toolbar", "live-heap-profile-toolbar");
    this.toggleRecordAction = UI16.ActionRegistry.ActionRegistry.instance().getAction("live-heap-profile.toggle-recording");
    this.toggleRecordButton = UI16.Toolbar.Toolbar.createActionButton(this.toggleRecordAction);
    this.toggleRecordButton.setToggled(this.setting.get());
    toolbar2.appendToolbarItem(this.toggleRecordButton);
    const mainTarget = SDK8.TargetManager.TargetManager.instance().primaryPageTarget();
    if (mainTarget?.model(SDK8.ResourceTreeModel.ResourceTreeModel)) {
      const startWithReloadAction = UI16.ActionRegistry.ActionRegistry.instance().getAction("live-heap-profile.start-with-reload");
      this.startWithReloadButton = UI16.Toolbar.Toolbar.createActionButton(startWithReloadAction);
      toolbar2.appendToolbarItem(this.startWithReloadButton);
    }
    this.dataGrid = this.createDataGrid();
    this.dataGrid.asWidget().show(this.contentElement);
    this.currentPollId = 0;
  }
  static instance() {
    if (!liveHeapProfileViewInstance) {
      liveHeapProfileViewInstance = new _LiveHeapProfileView();
    }
    return liveHeapProfileViewInstance;
  }
  createDataGrid() {
    const defaultColumnConfig = {
      id: "",
      title: Common14.UIString.LocalizedEmptyString,
      width: void 0,
      fixedWidth: true,
      sortable: true,
      align: "right",
      sort: DataGrid12.DataGrid.Order.Descending,
      titleDOMFragment: void 0,
      editable: void 0,
      nonSelectable: void 0,
      longText: void 0,
      disclosure: void 0,
      weight: void 0,
      allowInSortByEvenWhenHidden: void 0,
      dataType: void 0,
      defaultWeight: void 0
    };
    const columns = [
      {
        ...defaultColumnConfig,
        id: "size",
        title: i18nString15(UIStrings16.jsHeap),
        width: "72px",
        fixedWidth: true,
        sortable: true,
        align: "right",
        sort: DataGrid12.DataGrid.Order.Descending,
        tooltip: i18nString15(UIStrings16.allocatedJsHeapSizeCurrentlyIn)
      },
      {
        ...defaultColumnConfig,
        id: "isolates",
        title: i18nString15(UIStrings16.vms),
        width: "40px",
        fixedWidth: true,
        align: "right",
        tooltip: i18nString15(UIStrings16.numberOfVmsSharingTheSameScript)
      },
      {
        ...defaultColumnConfig,
        id: "url",
        title: i18nString15(UIStrings16.scriptUrl),
        fixedWidth: false,
        sortable: true,
        tooltip: i18nString15(UIStrings16.urlOfTheScriptSource)
      }
    ];
    const dataGrid = new DataGrid12.SortableDataGrid.SortableDataGrid({
      displayName: i18nString15(UIStrings16.heapProfile),
      columns,
      deleteCallback: void 0,
      refreshCallback: void 0
    });
    dataGrid.setResizeMethod(
      "last"
      /* DataGrid.DataGrid.ResizeMethod.LAST */
    );
    dataGrid.element.classList.add("flex-auto");
    dataGrid.element.addEventListener("keydown", this.onKeyDown.bind(this), false);
    dataGrid.addEventListener("OpenedNode", this.revealSourceForSelectedNode, this);
    dataGrid.addEventListener("SortingChanged", this.sortingChanged, this);
    for (const info of columns) {
      const headerCell = dataGrid.headerTableHeader(info.id);
      if (headerCell) {
        headerCell.setAttribute("title", info.tooltip);
      }
    }
    return dataGrid;
  }
  wasShown() {
    super.wasShown();
    void this.poll();
    this.setting.addChangeListener(this.settingChanged, this);
  }
  willHide() {
    super.willHide();
    ++this.currentPollId;
    this.setting.removeChangeListener(this.settingChanged, this);
  }
  settingChanged(value2) {
    this.toggleRecordButton.setToggled(value2.data);
  }
  async poll() {
    const pollId = this.currentPollId;
    do {
      const isolates = Array.from(SDK8.IsolateManager.IsolateManager.instance().isolates());
      const profiles = await Promise.all(isolates.map((isolate) => {
        const heapProfilerModel = isolate.heapProfilerModel();
        if (!heapProfilerModel) {
          return null;
        }
        return heapProfilerModel.getSamplingProfile();
      }));
      if (this.currentPollId !== pollId) {
        return;
      }
      this.update(isolates, profiles);
      await new Promise((r) => window.setTimeout(r, 3e3));
    } while (this.currentPollId === pollId);
  }
  update(isolates = [], profiles = []) {
    const dataByUrl = /* @__PURE__ */ new Map();
    profiles.forEach((profile, index) => {
      if (profile) {
        processNodeTree(isolates[index], "", profile.head);
      }
    });
    const rootNode = this.dataGrid.rootNode();
    const existingNodes = /* @__PURE__ */ new Set();
    for (const pair of dataByUrl) {
      const url = pair[0];
      const size = pair[1].size;
      const isolateCount = pair[1].isolates.size;
      if (!url) {
        console.info(`Node with empty URL: ${size} bytes`);
        continue;
      }
      let node = this.gridNodeByUrl.get(url);
      if (node) {
        node.updateNode(size, isolateCount);
      } else {
        node = new GridNode(url, size, isolateCount);
        this.gridNodeByUrl.set(url, node);
        rootNode.appendChild(node);
      }
      existingNodes.add(node);
    }
    for (const node of rootNode.children.slice()) {
      const gridNode = node;
      if (!existingNodes.has(gridNode)) {
        gridNode.remove();
      }
      this.gridNodeByUrl.delete(gridNode.url);
    }
    this.sortingChanged();
    function processNodeTree(isolate, parentUrl, node) {
      const url = node.callFrame.url || parentUrl || systemNodeName(node) || anonymousScriptName(node);
      node.children.forEach(processNodeTree.bind(null, isolate, url));
      if (!node.selfSize) {
        return;
      }
      let data = dataByUrl.get(url);
      if (!data) {
        data = { size: 0, isolates: /* @__PURE__ */ new Set() };
        dataByUrl.set(url, data);
      }
      data.size += node.selfSize;
      data.isolates.add(isolate);
    }
    function systemNodeName(node) {
      const name = node.callFrame.functionName;
      return name.startsWith("(") && name !== "(root)" ? name : "";
    }
    function anonymousScriptName(node) {
      return Number(node.callFrame.scriptId) ? i18nString15(UIStrings16.anonymousScriptS, { PH1: node.callFrame.scriptId }) : "";
    }
  }
  onKeyDown(event) {
    if (!(event.key === "Enter")) {
      return;
    }
    event.consume(true);
    this.revealSourceForSelectedNode();
  }
  revealSourceForSelectedNode() {
    const node = this.dataGrid.selectedNode;
    if (!node?.url) {
      return;
    }
    const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(node.url);
    if (sourceCode) {
      void Common14.Revealer.reveal(sourceCode);
    }
  }
  sortingChanged() {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    function sortByUrl(a, b) {
      return b.url.localeCompare(a.url);
    }
    function sortBySize(a, b) {
      return b.size - a.size;
    }
    const sortFunction = columnId === "url" ? sortByUrl : sortBySize;
    this.dataGrid.sortNodes(sortFunction, this.dataGrid.isSortOrderAscending());
  }
  toggleRecording() {
    const enable = !this.setting.get();
    if (enable) {
      this.startRecording(false);
    } else {
      void this.stopRecording();
    }
  }
  startRecording(reload) {
    this.setting.set(true);
    if (!reload) {
      return;
    }
    const mainTarget = SDK8.TargetManager.TargetManager.instance().primaryPageTarget();
    if (!mainTarget) {
      return;
    }
    const resourceTreeModel = mainTarget.model(SDK8.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.reloadPage();
    }
  }
  async stopRecording() {
    this.setting.set(false);
  }
};
var GridNode = class extends DataGrid12.SortableDataGrid.SortableDataGridNode {
  url;
  size;
  isolateCount;
  constructor(url, size, isolateCount) {
    super();
    this.url = url;
    this.size = size;
    this.isolateCount = isolateCount;
  }
  updateNode(size, isolateCount) {
    if (this.size === size && this.isolateCount === isolateCount) {
      return;
    }
    this.size = size;
    this.isolateCount = isolateCount;
    this.refresh();
  }
  createCell(columnId) {
    const cell = this.createTD(columnId);
    switch (columnId) {
      case "url":
        cell.textContent = this.url;
        break;
      case "size":
        cell.textContent = Platform9.NumberUtilities.withThousandsSeparator(Math.round(this.size / 1e3));
        cell.createChild("span", "size-units").textContent = i18nString15(UIStrings16.kb);
        break;
      case "isolates":
        cell.textContent = `${this.isolateCount}`;
        break;
    }
    return cell;
  }
};
var ActionDelegate2 = class {
  handleAction(_context, actionId) {
    void (async () => {
      const profileViewId = "live-heap-profile";
      await UI16.ViewManager.ViewManager.instance().showView(profileViewId);
      const view = UI16.ViewManager.ViewManager.instance().view(profileViewId);
      if (view) {
        const widget = await view.widget();
        this.innerHandleAction(widget, actionId);
      }
    })();
    return true;
  }
  innerHandleAction(profilerView, actionId) {
    switch (actionId) {
      case "live-heap-profile.toggle-recording":
        profilerView.toggleRecording();
        break;
      case "live-heap-profile.start-with-reload":
        profilerView.startRecording(true);
        break;
      default:
        console.assert(false, `Unknown action: ${actionId}`);
    }
  }
};
export {
  BottomUpProfileDataGrid_exports as BottomUpProfileDataGrid,
  ChildrenProvider_exports as ChildrenProvider,
  HeapProfileView_exports as HeapProfileView,
  HeapProfilerPanel_exports as HeapProfilerPanel,
  HeapSnapshotDataGrids_exports as HeapSnapshotDataGrids,
  HeapSnapshotGridNodes_exports as HeapSnapshotGridNodes,
  HeapSnapshotProxy_exports as HeapSnapshotProxy,
  HeapSnapshotView_exports as HeapSnapshotView,
  HeapTimelineOverview_exports as HeapTimelineOverview,
  IsolateSelector_exports as IsolateSelector,
  LiveHeapProfileView_exports as LiveHeapProfileView,
  ProfileDataGrid_exports as ProfileDataGrid,
  ProfileFlameChartDataProvider_exports as ProfileFlameChart,
  ProfileHeader_exports as ProfileHeader,
  ProfileLauncherView_exports as ProfileLauncherView,
  ProfileSidebarTreeElement_exports as ProfileSidebarTreeElement,
  ProfileTypeRegistry_exports as ProfileTypeRegistry,
  ProfileView_exports as ProfileView,
  ProfilesPanel_exports as ProfilesPanel,
  TopDownProfileDataGrid_exports as TopDownProfileDataGrid
};
//# sourceMappingURL=profiler.js.map
