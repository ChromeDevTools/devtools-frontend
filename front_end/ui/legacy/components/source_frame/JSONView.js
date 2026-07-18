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
     * @description Text to find an item
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
    ${ObjectUI.ObjectPropertiesSection.renderObjectPropertiesSection(input.objectTree, title)}
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
    set parsedJSON(parsedJSON) {
        if (this.objectTree) {
            this.objectTree.removeEventListener("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */, this.#onChildrenChanged, this);
        }
        this.#parsedJSON = parsedJSON;
        this.objectTree = null;
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
        }
        this.objectTree.addEventListener("children-changed" /* ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED */, this.#onChildrenChanged, this);
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
    jumpToMatch() {
        if (this.searchableView) {
            this.search.updateSearchableView(this.searchableView);
        }
        const currentMatch = this.search.currentMatch();
        if (currentMatch) {
            let current = currentMatch.node.parent;
            while (current) {
                current.expanded = true;
                current = current.parent;
            }
        }
    }
    onSearchCanceled() {
        this.search.reset();
        if (this.searchableView) {
            this.search.updateSearchableView(this.searchableView);
        }
    }
    performSearch(searchConfig, shouldJump, jumpBackwards) {
        this.initialize();
        this.onSearchCanceled();
        const searchRegex = searchConfig.toSearchRegex(true).regex;
        if (!this.objectTree) {
            return;
        }
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
        this.#jsonView.parsedJSON = new ParsedJSON(obj, '', '');
        this.searchProvider = this.#jsonView;
        this.#jsonView.show(this.element);
        this.requestUpdate();
    }
}
//# sourceMappingURL=JSONView.js.map