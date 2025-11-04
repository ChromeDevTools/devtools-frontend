// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../../components/highlighting/highlighting.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Lit from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import xmlTreeStyles from './xmlTree.css.js';
import xmlViewStyles from './xmlView.css.js';
const UIStrings = {
    /**
     * @description Text to find an item
     */
    find: 'Find',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/XMLView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { render, html } = Lit;
function* attributes(element) {
    for (let i = 0; i < element.attributes.length; ++i) {
        const attributeNode = element.attributes.item(i);
        if (attributeNode) {
            yield attributeNode;
        }
    }
}
function hasNonTextChildren(node) {
    return Boolean(node.childNodes.values().find(node => node.nodeType !== Node.TEXT_NODE));
}
function textView(treeNode, closeTag) {
    const { node } = treeNode;
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            if (node instanceof Element) {
                const tag = node.tagName;
                return closeTag ?
                    hasNonTextChildren(node) || node.textContent ? '</' + tag + '>' : '' :
                    `${'<' + tag}${attributes(node)
                        .map(attributeNode => `${'\xA0'}${attributeNode.name}${'="'}${attributeNode.value}${'"'}`)
                        .toArray()
                        .join('')}${hasNonTextChildren(node) ? '' :
                        node.textContent ? `${'>'}${node.textContent}${'</' + tag}` :
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
function htmlView(treeNode) {
    const { node } = treeNode;
    switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            if (node instanceof Element) {
                const tag = node.tagName;
                return html `<span part='shadow-xml-view-tag'>${'<' + tag}</span>${attributes(node).map(attributeNode => html `<span part='shadow-xml-view-tag'>${'\xA0'}</span>
                <span part='shadow-xml-view-attribute-name'>${attributeNode.name}</span>
                <span part='shadow-xml-view-tag'>${'="'}</span>
                <span part='shadow-xml-view-attribute-value'>${attributeNode.value}</span>
                <span part='shadow-xml-view-tag'>${'"'}</span>`)}
                <span ?hidden=${treeNode.expanded}>${hasNonTextChildren(node) ? html `<span part='shadow-xml-view-tag'>${'>'}</span>
                  <span part='shadow-xml-view-comment'>${'…'}</span>
                  <span part='shadow-xml-view-tag'>${'</' + tag}</span>` :
                    node.textContent ? html `<span part='shadow-xml-view-tag'>${'>'}</span>
                  <span part='shadow-xml-view-text'>${node.textContent}</span>
                  <span part='shadow-xml-view-tag'>${'</' + tag}</span>` :
                        html `<span part='shadow-xml-view-tag'>${' /'}</span>`}</span>
                <span part='shadow-xml-view-tag'>${'>'}</span>`;
            }
            return Lit.nothing;
        case Node.TEXT_NODE:
            return node.nodeValue ? html `<span part='shadow-xml-view-text'>${node.nodeValue}</span>` : Lit.nothing;
        case Node.CDATA_SECTION_NODE:
            return node.nodeValue ? html `<span part='shadow-xml-view-cdata'>${'<![CDATA['}</span>
          <span part='shadow-xml-view-text'>${node.nodeValue}</span>
          <span part='shadow-xml-view-cdata'>${']]>'}</span>` :
                Lit.nothing;
        case Node.PROCESSING_INSTRUCTION_NODE:
            return node.nodeValue ? html `<span part='shadow-xml-view-processing-instruction'>${'<?' + node.nodeName + ' ' + node.nodeValue + '?>'}</span>` :
                Lit.nothing;
        case Node.COMMENT_NODE:
            return html `<span part='shadow-xml-view-comment'>${'<!--' + node.nodeValue + '-->'}</span>`;
    }
    return Lit.nothing;
}
export const DEFAULT_VIEW = (input, output, target) => {
    function highlight(node, closeTag) {
        let highlights = '';
        let selected = '';
        if (!input.search) {
            return { highlights, selected };
        }
        const entries = input.search.getResults(node);
        for (const entry of entries ?? []) {
            if (entry.isPostOrderMatch === closeTag) {
                const range = new TextUtils.TextRange.SourceRange(entry.match.index, entry.match[0].length);
                if (entry === input.jumpToNextSearchResult) {
                    selected = `${range.offset},${range.length}`;
                }
                else {
                    highlights += `${range.offset},${range.length} `;
                }
            }
        }
        return { highlights, selected };
    }
    function layOutNode(node, populateSubtrees = false) {
        const onExpand = (event) => input.onExpand(node, event.detail.expanded);
        const { highlights, selected } = highlight(node, /* closeTag=*/ false);
        // clang-format off
        return html `
      <li role="treeitem"
          ?selected=${input.jumpToNextSearchResult?.node === node}
          @expand=${onExpand}>
        <devtools-highlight ranges=${highlights} current-range=${selected}>
          ${htmlView(node)}
        </devtools-highlight>
        ${node.children().length ? html `
          <ul role="group" ?hidden=${!node.expanded && input.jumpToNextSearchResult?.node !== node}>
            ${populateSubtrees || input.search ? subtree(node) : Lit.nothing}
          </ul>` : Lit.nothing}
      </li>`;
        // clang-format on
    }
    function subtree(treeNode) {
        const children = treeNode.children();
        if (children.length === 0) {
            return Lit.nothing;
        }
        const { highlights, selected } = highlight(treeNode, /* closeTag=*/ true);
        // clang-format off
        return html `
      ${children.map(child => layOutNode(child, treeNode.expanded))}
      ${treeNode.node instanceof Element ? html `
        <li role="treeitem">
          <devtools-highlight ranges=${highlights} current-range=${selected}>
            <span part='shadow-xml-view-close-tag'>${'</' + treeNode.node.tagName + '>'}</span>
          </devtools-highlight>
        </li>` : Lit.nothing}`;
        // clang-format on
    }
    // clang-format off
    render(html `
    <style>${xmlViewStyles}</style>
    <style>${xmlTreeStyles}</style>
    <devtools-tree
      class="shadow-xml-view source-code"
      .template=${html `
        <ul role="tree">
          ${input.xml.children().map(node => layOutNode(node, /* populateSubtrees=*/ true))}
        </ul>`}
      ></devtools-tree>`, 
    // clang-format on
    target);
};
function* children(xmlNode) {
    if (!xmlNode || !hasNonTextChildren(xmlNode)) {
        return;
    }
    let node = xmlNode?.firstChild;
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
    node;
    expanded = false;
    #children;
    constructor(node) {
        this.node = node;
    }
    children() {
        if (!this.#children) {
            this.#children = children(this.node).map(node => new XMLTreeViewNode(node)).toArray();
        }
        return this.#children;
    }
    match(regex, closeTag) {
        return textView(this, closeTag).matchAll(regex);
    }
}
export class XMLTreeViewModel {
    xmlDocument;
    root;
    constructor(parsedXML) {
        this.xmlDocument = parsedXML;
        this.root = new XMLTreeViewNode(parsedXML);
        this.root.expanded = true;
    }
}
export class XMLView extends UI.Widget.Widget {
    searchableView = null;
    #search;
    #treeViewModel;
    #view;
    #nextJump;
    constructor(target, view = DEFAULT_VIEW) {
        super(target, { jslog: `${VisualLogging.pane('xml-view')}`, classes: ['shadow-xml-view', 'source-code'] });
        this.#view = view;
    }
    set parsedXML(parsedXML) {
        if (this.#treeViewModel?.xmlDocument !== parsedXML) {
            this.#treeViewModel = new XMLTreeViewModel(parsedXML);
            this.requestUpdate();
        }
    }
    performUpdate() {
        if (this.#treeViewModel) {
            const onExpand = (node, expanded) => {
                node.expanded = expanded;
                this.requestUpdate();
            };
            this.#view({ xml: this.#treeViewModel.root, onExpand, search: this.#search, jumpToNextSearchResult: this.#nextJump }, {}, this.contentElement);
        }
    }
    static createSearchableView(parsedXML) {
        const xmlView = new XMLView();
        xmlView.parsedXML = parsedXML;
        const searchableView = new UI.SearchableView.SearchableView(xmlView, null);
        searchableView.setPlaceholder(i18nString(UIStrings.find));
        xmlView.searchableView = searchableView;
        xmlView.show(searchableView.element);
        return searchableView;
    }
    static parseXML(text, mimeType) {
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
        }
        catch {
            return null;
        }
        if (!parsedXML || parsedXML.body) {
            return null;
        }
        return parsedXML;
    }
    onSearchCanceled() {
        this.#search = undefined;
        this.searchableView?.updateSearchMatchesCount(0);
        this.searchableView?.updateCurrentMatchIndex(0);
    }
    performSearch(searchConfig, shouldJump, jumpBackwards) {
        if (!this.#treeViewModel || !this.searchableView) {
            return;
        }
        const { regex } = searchConfig.toSearchRegex(true);
        if (!this.#search) {
            this.#search = new UI.TreeOutline.TreeSearch();
        }
        this.#search.search(this.#treeViewModel.root, jumpBackwards ?? false, (node, closeTag) => node.match(regex, closeTag)
            .map((match, matchIndexInNode) => ({ node, matchIndexInNode, isPostOrderMatch: closeTag, match }))
            .toArray());
        this.#nextJump = shouldJump ? this.#search.currentMatch() : undefined;
        this.#search.updateSearchableView(this.searchableView);
        this.requestUpdate();
    }
    jumpToNextSearchResult() {
        this.#nextJump = this.#search?.next();
        this.searchableView && this.#search?.updateSearchableView(this.searchableView);
        this.requestUpdate();
    }
    jumpToPreviousSearchResult() {
        this.#nextJump = this.#search?.prev();
        this.searchableView && this.#search?.updateSearchableView(this.searchableView);
        this.requestUpdate();
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
//# sourceMappingURL=XMLView.js.map