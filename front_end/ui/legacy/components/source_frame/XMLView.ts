// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../../core/i18n/i18n.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Lit from '../../../lit/lit.js';
import * as UI from '../../legacy.js';

import xmlTreeStyles from './xmlTree.css.js';
import xmlViewStyles from './xmlView.css.js';

const UIStrings = {
  /**
   * @description Text to find an item
   */
  find: 'Find',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/XMLView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {render, html} = Lit;
function* attributes(element: Element): Generator<Attr> {
  for (let i = 0; i < element.attributes.length; ++i) {
    const attributeNode = element.attributes.item(i);
    if (attributeNode) {
      yield attributeNode;
    }
  }
}

function hasNonTextChildren(node: Node): boolean {
  return node.childNodes.length !== node.childTextNodes.length;
}

function textView(treeNode: XMLTreeViewNode, closeTag: boolean): string {
  const {node} = treeNode;

  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (node instanceof Element) {
        const tag = node.tagName;
        return closeTag ?
            hasNonTextChildren(node) || node.textContent ? '</' + tag + '>' : '' :
            `${'<' + tag}${
                attributes(node)
                    .map(attributeNode => `${'\xA0'}${attributeNode.name}${'="'}${attributeNode.value}${'"'}`)
                    .toArray()
                    .join('')}${
                hasNonTextChildren(node) ? '' :
                    node.textContent     ? `${'>'}${node.textContent}${'</' + tag}` :
                                           `${' /'}`}${'>'}`;
      }
      return '';
    case Node.TEXT_NODE:
      return node.nodeValue && !closeTag ? `${node.nodeValue}` : '';
    case Node.CDATA_SECTION_NODE:
      return node.nodeValue && !closeTag ? `${'<![CDATA['}${node.nodeValue}${']]>'}` : '';
    case Node.PROCESSING_INSTRUCTION_NODE:
      return node.nodeValue && !closeTag ? `${'<?' + node.nodeName + ' ' + node.nodeValue + '?>'}` : '';
    case Node.COMMENT_NODE:
      return !closeTag ? `${'<!--' + node.nodeValue + '-->'}` : '';
  }
  return '';
}

function htmlView(treeNode: XMLTreeViewNode): Lit.LitTemplate {
  const {node} = treeNode;

  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      if (node instanceof Element) {
        const tag = node.tagName;
        return html`<span part='shadow-xml-view-tag'>${'<' + tag}</span>${
            attributes(node).map(attributeNode => html`<span part='shadow-xml-view-tag'>${'\xA0'}</span>
                <span part='shadow-xml-view-attribute-name'>${attributeNode.name}</span>
                <span part='shadow-xml-view-tag'>${'="'}</span>
                <span part='shadow-xml-view-attribute-value'>${attributeNode.value}</span>
                <span part='shadow-xml-view-tag'>${'"'}</span>`)}
                <span ?hidden=${treeNode.expanded}>${
            hasNonTextChildren(node) ? html`<span part='shadow-xml-view-tag'>${'>'}</span>
                  <span part='shadow-xml-view-comment'>${'…'}</span>
                  <span part='shadow-xml-view-tag'>${'</' + tag}</span>` :
                node.textContent ? html`<span part='shadow-xml-view-tag'>${'>'}</span>
                  <span part='shadow-xml-view-text'>${node.textContent}</span>
                  <span part='shadow-xml-view-tag'>${'</' + tag}</span>` :
                                   html`<span part='shadow-xml-view-tag'>${' /'}</span>`}</span>
                <span part='shadow-xml-view-tag'>${'>'}</span>`;
      }
      return Lit.nothing;
    case Node.TEXT_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-text'>${node.nodeValue}</span>` : Lit.nothing;
    case Node.CDATA_SECTION_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-cdata'>${'<![CDATA['}</span>
          <span part='shadow-xml-view-text'>${node.nodeValue}</span>
          <span part='shadow-xml-view-cdata'>${']]>'}</span>` :
                              Lit.nothing;
    case Node.PROCESSING_INSTRUCTION_NODE:
      return node.nodeValue ? html`<span part='shadow-xml-view-processing-instruction'>${
                                  '<?' + node.nodeName + ' ' + node.nodeValue + '?>'}</span>` :
                              Lit.nothing;
    case Node.COMMENT_NODE:
      return html`<span part='shadow-xml-view-comment'>${'<!--' + node.nodeValue + '-->'}</span>`;
  }
  return Lit.nothing;
}

interface ViewInput {
  onExpand(node: XMLTreeViewNode, expanded: boolean): void;
  xml: XMLTreeViewNode;
  search: UI.TreeOutline.TreeSearch<XMLTreeViewNode, SearchResult>|undefined;
  jumpToNextSearchResult: SearchResult|undefined;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  function highlight(node: XMLTreeViewNode, closeTag: boolean): ReturnType<typeof Lit.Directives.ref> {
    if (!input.search) {
      return Lit.nothing;
    }
    const entries = input.search.getResults(node);
    const highlights = [];
    let selected = undefined;
    for (const entry of entries ?? []) {
      if (entry.isPostOrderMatch === closeTag) {
        const range = new TextUtils.TextRange.SourceRange(entry.match.index, entry.match[0].length);
        if (entry === input.jumpToNextSearchResult) {
          selected = range;
        } else {
          highlights.push(range);
        }
      }
    }
    return input.search.highlight(highlights, selected);
  }

  function layOutNode(node: XMLTreeViewNode, populateSubtrees = false): Lit.LitTemplate {
    const onExpand = (event: UI.TreeOutline.TreeViewElement.ExpandEvent): void =>
        input.onExpand(node, event.detail.expanded);

    // clang-format off
    return html`
    <li
      ${highlight(node, /* closeTag=*/ false)}
      role="treeitem"
      ?selected=${input.jumpToNextSearchResult?.node === node}
      @expand=${onExpand}>
        ${htmlView(node)}${populateSubtrees || input.search ? subtree(node) : Lit.nothing}
    </li>`;
    // clang-format on
  }

  function subtree(treeNode: XMLTreeViewNode): Lit.LitTemplate {
    const children = treeNode.children();
    if (children.length === 0) {
      return Lit.nothing;
    }
    // clang-format off
    return html`<ul role="group" ?hidden=${!treeNode.expanded}>
      ${children.map(child => layOutNode(child, treeNode.expanded))}
      ${treeNode.node instanceof Element
          ? html`<li
                  ${highlight(treeNode, /* closeTag=*/ true)}
                  role="treeitem"><span part='shadow-xml-view-close-tag'>${'</' + treeNode.node.tagName + '>'}</span
                 ></li>`
          : Lit.nothing}
        </ul>`;
    // clang-format on
  }

  // clang-format off
  render(
      html`
    <style>${xmlViewStyles}</style>
    <style>${xmlTreeStyles}</style>
    <devtools-tree
      class="shadow-xml-view source-code"
      .template=${html`
        <ul role="tree">
          ${input.xml.children().map(node => layOutNode(node, /* populateSubtrees=*/ true))}
        </ul>`}
      ></devtools-tree>`,
      // clang-format on
      target);
};

function* children(xmlNode: Node|ParentNode|undefined): Generator<Node> {
  if (!xmlNode || !hasNonTextChildren(xmlNode)) {
    return;
  }
  let node: (ChildNode|null) = xmlNode?.firstChild;
  while (node) {
    const currentNode = node;
    node = node.nextSibling;
    const nodeType = currentNode.nodeType;
    // ignore empty TEXT
    if (nodeType === Node.TEXT_NODE && currentNode.nodeValue?.match(/\s+/)) {
      continue;
    }
    // ignore ATTRIBUTE, ENTITY_REFERENCE, ENTITY, DOCUMENT, DOCUMENT_TYPE, DOCUMENT_FRAGMENT, NOTATION
    if ((nodeType !== Node.ELEMENT_NODE) && (nodeType !== Node.TEXT_NODE) && (nodeType !== Node.CDATA_SECTION_NODE) &&
        (nodeType !== Node.PROCESSING_INSTRUCTION_NODE) && (nodeType !== Node.COMMENT_NODE)) {
      continue;
    }
    yield currentNode;
  }
}

export class XMLTreeViewNode {
  readonly node: Node|ParentNode;
  expanded = false;
  #children?: XMLTreeViewNode[];

  constructor(node: Node|ParentNode) {
    this.node = node;
  }

  children(): XMLTreeViewNode[] {
    if (!this.#children) {
      this.#children = children(this.node).map(node => new XMLTreeViewNode(node)).toArray();
    }
    return this.#children;
  }

  match(regex: RegExp, closeTag: boolean): RegExpStringIterator<RegExpExecArray> {
    return textView(this, closeTag).matchAll(regex);
  }
}

export class XMLTreeViewModel {
  readonly xmlDocument: Document;
  readonly root: XMLTreeViewNode;

  constructor(parsedXML: Document) {
    this.xmlDocument = parsedXML;
    this.root = new XMLTreeViewNode(parsedXML);
    this.root.expanded = true;
  }
}

interface SearchResult extends UI.TreeOutline.TreeSearchResult<XMLTreeViewNode> {
  match: RegExpExecArray;
}

export class XMLView extends UI.Widget.Widget implements UI.SearchableView.Searchable {
  private searchableView: UI.SearchableView.SearchableView|null = null;
  #search: UI.TreeOutline.TreeSearch<XMLTreeViewNode, SearchResult>|undefined;
  #treeViewModel: XMLTreeViewModel|undefined;
  readonly #view: View;
  #nextJump: SearchResult|undefined;

  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(target, {jslog: 'xml-view', classes: ['shadow-xml-view', 'source-code']});
    this.#view = view;
  }

  set parsedXML(parsedXML: Document) {
    if (this.#treeViewModel?.xmlDocument !== parsedXML) {
      this.#treeViewModel = new XMLTreeViewModel(parsedXML);
      this.requestUpdate();
    }
  }

  override performUpdate(): void {
    if (this.#treeViewModel) {
      const onExpand = (node: XMLTreeViewNode, expanded: boolean): void => {
        node.expanded = expanded;
        this.requestUpdate();
      };
      this.#view(
          {xml: this.#treeViewModel.root, onExpand, search: this.#search, jumpToNextSearchResult: this.#nextJump}, {},
          this.contentElement);
    }
  }

  static createSearchableView(parsedXML: Document): UI.SearchableView.SearchableView {
    const xmlView = new XMLView();
    xmlView.parsedXML = parsedXML;
    const searchableView = new UI.SearchableView.SearchableView(xmlView, null);
    searchableView.setPlaceholder(i18nString(UIStrings.find));
    xmlView.searchableView = searchableView;
    xmlView.show(searchableView.element);
    return searchableView;
  }

  static parseXML(text: string, mimeType: string): Document|null {
    let parsedXML;
    try {
      switch (mimeType) {
        case 'application/xhtml+xml':
        case 'application/xml':
        case 'image/svg+xml':
        case 'text/html':
        case 'text/xml':
          parsedXML = (new DOMParser()).parseFromString(text, mimeType);
      }
    } catch {
      return null;
    }
    if (!parsedXML || parsedXML.body) {
      return null;
    }
    return parsedXML;
  }

  onSearchCanceled(): void {
    this.#search = undefined;
    this.searchableView?.updateSearchMatchesCount(0);
    this.searchableView?.updateCurrentMatchIndex(0);
  }

  performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void {
    if (!this.#treeViewModel || !this.searchableView) {
      return;
    }
    const {regex} = searchConfig.toSearchRegex(true);
    if (!this.#search) {
      this.#search = new UI.TreeOutline.TreeSearch();
    }
    this.#search.search(
        this.#treeViewModel.root, jumpBackwards ?? false,
        (node, closeTag) =>
            node.match(regex, closeTag)
                .map((match, matchIndexInNode) => ({node, matchIndexInNode, isPostOrderMatch: closeTag, match}))
                .toArray());
    this.#nextJump = shouldJump ? this.#search.currentMatch() : undefined;
    this.#search.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }

  jumpToNextSearchResult(): void {
    this.#nextJump = this.#search?.next();
    this.searchableView && this.#search?.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }

  jumpToPreviousSearchResult(): void {
    this.#nextJump = this.#search?.prev();
    this.searchableView && this.#search?.updateSearchableView(this.searchableView);
    this.requestUpdate();
  }

  supportsCaseSensitiveSearch(): boolean {
    return true;
  }

  supportsRegexSearch(): boolean {
    return true;
  }
}
