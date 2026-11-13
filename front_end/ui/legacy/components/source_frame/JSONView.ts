// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */

import * as i18n from '../../../../core/i18n/i18n.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import {html, render} from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import * as ObjectUI from '../object_ui/object_ui.js';

import jsonViewStyles from './jsonView.css.js';

const UIStrings = {
  /**
   * @description Placeholder text for the search input in the json view.
   */
  find: 'Find',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/JSONView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree;
  parsedJSON: ParsedJSON;
}

export type ViewOutput = undefined;

const DEFAULT_VIEW = (input: ViewInput, _output: ViewOutput, target: HTMLElement): void => {
  const obj = SDK.RemoteObject.RemoteObject.fromLocalObject(input.parsedJSON.data);
  const titleText = input.parsedJSON.prefix + obj.description + input.parsedJSON.suffix;
  const title = html`<span>${titleText}</span>`;
  render(html`
    <style>${jsonViewStyles}</style>
    ${UI.Widget.widget(ObjectUI.ObjectPropertiesSection.ObjectPropertiesSectionWidget, {
           objectTree: input.objectTree,
           title,
         })}
  `,
         target, {

           container: {
             classes: ['json-view'],
             attributes: {
               jslog: VisualLogging.section('json-view'),
             },
           },
         });
};

type View = typeof DEFAULT_VIEW;

export class JSONView extends UI.Widget.VBox implements UI.SearchableView.Searchable {
  #parsedJSON: ParsedJSON;
  private readonly startCollapsed: boolean;
  private searchableView: UI.SearchableView.SearchableView|null = null;
  private objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree|null = null;
  private readonly search: UI.TreeOutline.TreeSearch<ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase>;
  private readonly view: View;

  constructor(parsedJSON: ParsedJSON, startCollapsed?: boolean, element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.#parsedJSON = parsedJSON;
    this.startCollapsed = Boolean(startCollapsed);
    this.search = new UI.TreeOutline.TreeSearch();
    this.view = view;
  }

  static async createView(content: string): Promise<UI.SearchableView.SearchableView|null> {
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

  static createViewSync(obj: Object|null, element?: HTMLElement): UI.SearchableView.SearchableView {
    const jsonView = new JSONView(new ParsedJSON(obj, '', ''));
    const searchableView = new UI.SearchableView.SearchableView(jsonView, null, undefined, element);
    searchableView.setPlaceholder(i18nString(UIStrings.find));
    jsonView.searchableView = searchableView;
    jsonView.show(searchableView.element);
    jsonView.element.tabIndex = 0;
    return searchableView;
  }

  get parsedJSON(): ParsedJSON {
    return this.#parsedJSON;
  }

  set parsedJSON(parsedJSON: ParsedJSON) {
    if (this.#parsedJSON === parsedJSON) {
      return;
    }
    if (this.objectTree) {
      this.objectTree.removeEventListener(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED,
                                          this.#onChildrenChanged, this);
      this.objectTree.removeEventListener(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.EXPANDED_CHANGED,
                                          this.#onChildrenChanged, this);
    }
    this.#parsedJSON = parsedJSON;
    this.objectTree = null;
    this.#autoExpandCanceled = false;
    this.onSearchCanceled();
    this.requestUpdate();
  }

  setSearchableView(searchableView: UI.SearchableView.SearchableView): void {
    this.searchableView = searchableView;
  }

  static parseJSON(text: string|null): Promise<ParsedJSON|null> {
    let returnObj: ParsedJSON<string>|null = null;
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
    } catch {
      returnObj = null;
    }

    return Promise.resolve(returnObj);
  }

  private static extractJSON(text: string): ParsedJSON<string>|null {
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

  private static findBrackets(text: string, open: string, close: string): {
    start: number,
    end: number,
    length: number,
  } {
    const start = text.indexOf(open);
    const end = text.lastIndexOf(close);
    let length: -1|number = end - start - 1;
    if (start === -1 || end === -1 || end < start) {
      length = -1;
    }
    return {start, end, length};
  }

  override wasShown(): void {
    super.wasShown();
    this.initialize();
    this.requestUpdate();
  }

  private initialize(): void {
    if (this.objectTree) {
      return;
    }
    const obj = SDK.RemoteObject.RemoteObject.fromLocalObject(this.#parsedJSON.data);
    this.objectTree = new ObjectUI.ObjectPropertiesSection.ObjectTree(obj, {
      readOnly: true,
      propertiesMode: ObjectUI.ObjectPropertiesSection.ObjectPropertiesMode.OWN_AND_INTERNAL_AND_INHERITED,
      search: this.search,
    });
    if (!this.startCollapsed) {
      this.objectTree.expanded = true;
      void this.#autoExpandInitial(this.objectTree);
    }
    this.objectTree.addEventListener(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED,
                                     this.#onChildrenChanged, this);
    this.objectTree.addEventListener(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.EXPANDED_CHANGED,
                                     this.#onChildrenChanged, this);
  }

  static readonly #AUTO_EXPAND_ROW_BUDGET = 30;
  static readonly #AUTO_EXPAND_MAX_DEPTH = 4;
  #autoExpandCanceled = false;

  async #autoExpandInitial(tree: ObjectUI.ObjectPropertiesSection.ObjectTree): Promise<void> {
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

      const nextFrontier: ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase[] = [];
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

    tree.dispatchEventToListeners(ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase.Events.CHILDREN_CHANGED);
    this.requestUpdate();
  }

  #onChildrenChanged(): void {
    this.requestUpdate();
  }

  override performUpdate(): void {
    this.initialize();
    if (!this.objectTree) {
      return;
    }
    this.view({objectTree: this.objectTree, parsedJSON: this.#parsedJSON}, undefined, this.contentElement);
  }

  static readonly #MAX_SEARCH_NODES = 10000;

  async #populateForSearch(root: ObjectUI.ObjectPropertiesSection.ObjectTree): Promise<void> {
    const queue: ObjectUI.ObjectPropertiesSection.ObjectTreeNodeBase[] = [root];
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

  private jumpToMatch(): void {
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

  onSearchCanceled(): void {
    this.search.reset();
    if (this.searchableView) {
      this.search.updateSearchableView(this.searchableView);
    }
  }

  async performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean,
                      jumpBackwards?: boolean): Promise<void> {
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
    } else if (this.searchableView) {
      this.search.updateSearchableView(this.searchableView);
    }
  }

  jumpToNextSearchResult(): void {
    this.search.next();
    this.jumpToMatch();
  }

  jumpToPreviousSearchResult(): void {
    this.search.prev();
    this.jumpToMatch();
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsWholeWordSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }
}

export class ParsedJSON<T extends unknown = unknown> {
  data: T;
  prefix: string;
  suffix: string;

  constructor(data: T, prefix: string, suffix: string) {
    this.data = data;
    this.prefix = prefix;
    this.suffix = suffix;
  }
}

export class SearchableJsonView extends UI.SearchableView.SearchableView {
  #jsonView: JSONView;

  constructor(element: HTMLElement) {
    const jsonView = new JSONView(new ParsedJSON('', '', ''));
    super(jsonView, null, undefined, element);
    this.#jsonView = jsonView;
    this.setPlaceholder(i18nString(UIStrings.find));
    jsonView.setSearchableView(this);
    jsonView.show(this.element);
    jsonView.element.tabIndex = 0;
  }

  set jsonObject(obj: Object|null|undefined) {
    this.parsedJSON = new ParsedJSON(obj, '', '');
  }

  get parsedJSON(): ParsedJSON {
    return this.#jsonView.parsedJSON;
  }

  set parsedJSON(parsedJSON: ParsedJSON) {
    if (this.#jsonView.parsedJSON === parsedJSON) {
      return;
    }
    this.#jsonView.parsedJSON = parsedJSON;
    this.searchProvider = this.#jsonView;
    this.#jsonView.show(this.element);
    this.requestUpdate();
  }
}
