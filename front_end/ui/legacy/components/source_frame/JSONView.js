// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import { html, render } from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import * as ObjectUI from '../object_ui/object_ui.js';
import jsonViewStyles from './jsonView.css.js';
const UIStrings = {
    /**
     * @description Placeholder text for the search input in the json view.
     */
    find: 'Find',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/JSONView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const DEFAULT_VIEW = (input, _output, target) => {
    const obj = SDK.RemoteObject.RemoteObject.fromLocalObject(input.parsedJSON.data);
    const titleText = input.parsedJSON.prefix + obj.description + input.parsedJSON.suffix;
    const title = html `<span>${titleText}</span>`;
    render(html `
    <style>${jsonViewStyles}</style>
    ${UI.Widget.widget(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, {
        objectTree: input.objectTree,
        title,
    })}
  `, target, {
        container: {
            classes: ['json-view'],
            attributes: {
                jslog: VisualLogging.section('json-view'),
            },
        },
    });
};
export class JSONView extends UI.Widget.VBox {
    #parsedJSON;
    startCollapsed;
    searchableView = null;
    objectTree = null;
    search;
    view;
    constructor(parsedJSON, startCollapsed, element, view = DEFAULT_VIEW) {
        super(element);
        this.#parsedJSON = parsedJSON;
        this.startCollapsed = Boolean(startCollapsed);
        this.search = new UI.TreeOutline.TreeSearch();
        this.view = view;
    }
    static async createView(content) {
        // We support non-strict JSON parsing by parsing an AST tree which is why we offload it to a worker.
        const parsedJSON = await JSONView.parseJSON(content);
        if (!parsedJSON || typeof parsedJSON.data !== 'object') {
            return null;
        }
        const jsonView = new JSONView(parsedJSON);
        const searchableView = new UI.SearchableView.SearchableView(jsonView, null);
        searchableView.setPlaceholder(i18nString(UIStrings.find));
        jsonView.searchableView = searchableView;
        jsonView.show(searchableView.element);
        return searchableView;
    }
    static createViewSync(obj, element) {
        const jsonView = new JSONView(new ParsedJSON(obj, '', ''));
        const searchableView = new UI.SearchableView.SearchableView(jsonView, null, undefined, element);
        searchableView.setPlaceholder(i18nString(UIStrings.find));
        jsonView.searchableView = searchableView;
        jsonView.show(searchableView.element);
        jsonView.element.tabIndex = 0;
        return searchableView;
    }
    get parsedJSON() {
        return this.#parsedJSON;
    }
    set parsedJSON(parsedJSON) {
        if (this.#parsedJSON === parsedJSON) {
            return;
        }
        if (this.objectTree) {
            this.objectTree.removeEventListener("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */, this.#onChildrenChanged, this);
            this.objectTree.removeEventListener("expanded-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.EXPANDED_CHANGED */, this.#onChildrenChanged, this);
        }
        this.#parsedJSON = parsedJSON;
        this.objectTree = null;
        this.#autoExpandCanceled = false;
        this.onSearchCanceled();
        this.requestUpdate();
    }
    setSearchableView(searchableView) {
        this.searchableView = searchableView;
    }
    static parseJSON(text) {
        let returnObj = null;
        if (text) {
            returnObj = JSONView.extractJSON(text);
        }
        if (!returnObj) {
            return Promise.resolve(null);
        }
        try {
            const json = JSON.parse(returnObj.data);
            if (!json) {
                return Promise.resolve(null);
            }
            returnObj.data = json;
        }
        catch {
            returnObj = null;
        }
        return Promise.resolve(returnObj);
    }
    static extractJSON(text) {
        // Do not treat HTML as JSON.
        if (text.startsWith('<')) {
            return null;
        }
        let inner = JSONView.findBrackets(text, '{', '}');
        const inner2 = JSONView.findBrackets(text, '[', ']');
        inner = inner2.length > inner.length ? inner2 : inner;
        // Return on blank payloads or on payloads significantly smaller than original text.
        if (inner.length === -1 || text.length - inner.length > 80) {
            return null;
        }
        const prefix = text.substring(0, inner.start);
        const suffix = text.substring(inner.end + 1);
        text = text.substring(inner.start, inner.end + 1);
        // Only process valid JSONP.
        if (suffix.trim().length && !(suffix.trim().startsWith(')') && prefix.trim().endsWith('('))) {
            return null;
        }
        return new ParsedJSON(text, prefix, suffix);
    }
    static findBrackets(text, open, close) {
        const start = text.indexOf(open);
        const end = text.lastIndexOf(close);
        let length = end - start - 1;
        if (start === -1 || end === -1 || end < start) {
            length = -1;
        }
        return { start, end, length };
    }
    wasShown() {
        super.wasShown();
        this.initialize();
        this.requestUpdate();
    }
    initialize() {
        if (this.objectTree) {
            return;
        }
        const obj = SDK.RemoteObject.RemoteObject.fromLocalObject(this.#parsedJSON.data);
        this.objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(obj, {
            readOnly: true,
            propertiesMode: 1 /* ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED */,
            search: this.search,
        });
        if (!this.startCollapsed) {
            this.objectTree.expanded = true;
            void this.#autoExpandInitial(this.objectTree);
        }
        this.objectTree.addEventListener("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */, this.#onChildrenChanged, this);
        this.objectTree.addEventListener("expanded-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.EXPANDED_CHANGED */, this.#onChildrenChanged, this);
    }
    static #AUTO_EXPAND_ROW_BUDGET = 30;
    static #AUTO_EXPAND_MAX_DEPTH = 4;
    #autoExpandCanceled = false;
    async #autoExpandInitial(tree) {
        await tree.populateChildrenIfNeeded();
        if (this.objectTree !== tree || !tree.expanded || this.#autoExpandCanceled) {
            return;
        }
        const rootChildren = Array.from(tree.treeNodeChildren());
        let visibleRows = Math.max(rootChildren.length, tree.arrayLength);
        let frontier = rootChildren.filter(n => n.hasChildren && n.canExpandRecursively);
        for (let depth = 1; depth < JSONView.#AUTO_EXPAND_MAX_DEPTH && frontier.length > 0; depth++) {
            // Rule 1: always unwrap a single-child wrapper chain (e.g. {data: {user: ...}}).
            if (frontier.length === 1 && visibleRows <= JSONView.#AUTO_EXPAND_ROW_BUDGET) {
                const only = frontier[0];
                await only.populateChildrenIfNeeded();
                if (this.objectTree !== tree || !tree.expanded || this.#autoExpandCanceled) {
                    return;
                }
                const onlyChildren = Array.from(only.treeNodeChildren());
                const added = Math.max(onlyChildren.length, only.arrayLength);
                if (added > 1 && visibleRows + added > JSONView.#AUTO_EXPAND_ROW_BUDGET) {
                    break;
                }
                only.expanded = true;
                visibleRows += added;
                frontier = onlyChildren.filter(n => n.hasChildren && n.canExpandRecursively);
                continue;
            }
            // Rule 2: level-atomic expansion — expand every node at this depth or none.
            let addedRows = 0;
            for (const node of frontier) {
                await node.populateChildrenIfNeeded();
                if (this.objectTree !== tree || !tree.expanded || this.#autoExpandCanceled) {
                    return;
                }
                const nodeChildren = Array.from(node.treeNodeChildren());
                addedRows += Math.max(nodeChildren.length, node.arrayLength);
                if (visibleRows + addedRows > JSONView.#AUTO_EXPAND_ROW_BUDGET) {
                    break;
                }
            }
            if (visibleRows + addedRows > JSONView.#AUTO_EXPAND_ROW_BUDGET) {
                break;
            }
            const nextFrontier = [];
            for (const node of frontier) {
                node.expanded = true;
                for (const child of node.treeNodeChildren()) {
                    if (child.hasChildren && child.canExpandRecursively) {
                        nextFrontier.push(child);
                    }
                }
            }
            visibleRows += addedRows;
            frontier = nextFrontier;
        }
        tree.dispatchEventToListeners("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */);
        this.requestUpdate();
    }
    #onChildrenChanged() {
        this.requestUpdate();
    }
    performUpdate() {
        this.initialize();
        if (!this.objectTree) {
            return;
        }
        this.view({ objectTree: this.objectTree, parsedJSON: this.#parsedJSON }, undefined, this.contentElement);
    }
    static #MAX_SEARCH_NODES = 10000;
    async #populateForSearch(root) {
        const queue = [root];
        let visited = 0;
        while (queue.length > 0 && visited < JSONView.#MAX_SEARCH_NODES) {
            const node = queue.shift();
            if (!node || !node.canExpandRecursively) {
                continue;
            }
            visited++;
            await node.populateChildrenIfNeeded();
            for (const child of node.treeNodeChildren()) {
                if (child.hasChildren) {
                    queue.push(child);
                }
            }
        }
    }
    jumpToMatch() {
        if (this.searchableView) {
            this.search.updateSearchableView(this.searchableView);
        }
        const currentMatch = this.search.currentMatch();
        if (currentMatch) {
            let current = currentMatch.node.parent;
            while (current) {
                if (current instanceof ObjectUI.ObjectPropertiesSection.ObjectTreeNode) {
                    current.showAllChildren = true;
                }
                current.expanded = true;
                current = current.parent;
            }
            this.requestUpdate();
        }
    }
    onSearchCanceled() {
        this.search.reset();
        if (this.searchableView) {
            this.search.updateSearchableView(this.searchableView);
        }
    }
    async performSearch(searchConfig, shouldJump, jumpBackwards) {
        this.initialize();
        this.#autoExpandCanceled = true;
        this.onSearchCanceled();
        const searchRegex = searchConfig.toSearchRegex(true).regex;
        if (!this.objectTree) {
            return;
        }
        await this.#populateForSearch(this.objectTree);
        this.search.search(this.objectTree, jumpBackwards ?? false, (node, closeTag) => {
            if (closeTag || !searchRegex) {
                return [];
            }
            return node.match(searchRegex);
        });
        if (shouldJump) {
            this.jumpToMatch();
        }
        else if (this.searchableView) {
            this.search.updateSearchableView(this.searchableView);
        }
    }
    jumpToNextSearchResult() {
        this.search.next();
        this.jumpToMatch();
    }
    jumpToPreviousSearchResult() {
        this.search.prev();
        this.jumpToMatch();
    }
    supportsCaseSensitiveSearch() {
        return true;
    }
    supportsWholeWordSearch() {
        return true;
    }
    supportsRegexSearch() {
        return true;
    }
}
export class ParsedJSON {
    data;
    prefix;
    suffix;
    constructor(data, prefix, suffix) {
        this.data = data;
        this.prefix = prefix;
        this.suffix = suffix;
    }
}
export class SearchableJsonView extends UI.SearchableView.SearchableView {
    #jsonView;
    constructor(element) {
        const jsonView = new JSONView(new ParsedJSON('', '', ''));
        super(jsonView, null, undefined, element);
        this.#jsonView = jsonView;
        this.setPlaceholder(i18nString(UIStrings.find));
        jsonView.setSearchableView(this);
        jsonView.show(this.element);
        jsonView.element.tabIndex = 0;
    }
    set jsonObject(obj) {
        this.parsedJSON = new ParsedJSON(obj, '', '');
    }
    get parsedJSON() {
        return this.#jsonView.parsedJSON;
    }
    set parsedJSON(parsedJSON) {
        if (this.#jsonView.parsedJSON === parsedJSON) {
            return;
        }
        this.#jsonView.parsedJSON = parsedJSON;
        this.searchProvider = this.#jsonView;
        this.#jsonView.show(this.element);
        this.requestUpdate();
    }
}
//# sourceMappingURL=JSONView.js.map