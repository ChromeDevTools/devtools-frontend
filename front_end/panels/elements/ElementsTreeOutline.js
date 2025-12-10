// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
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
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Elements from '../../models/elements/elements.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AdoptedStyleSheetTreeElement } from './AdoptedStyleSheetTreeElement.js';
import { getElementIssueDetails } from './ElementIssueUtils.js';
import { ElementsPanel } from './ElementsPanel.js';
import { ElementsTreeElement, InitialChildrenLimit, isOpeningTag } from './ElementsTreeElement.js';
import elementsTreeOutlineStyles from './elementsTreeOutline.css.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { ShortcutTreeElement } from './ShortcutTreeElement.js';
import { TopLayerContainer } from './TopLayerContainer.js';
const UIStrings = {
    /**
     * @description ARIA accessible name in Elements Tree Outline of the Elements panel
     */
    pageDom: 'Page DOM',
    /**
     * @description A context menu item to store a value as a global variable the Elements Panel
     */
    storeAsGlobalVariable: 'Store as global variable',
    /**
     * @description Tree element expand all button element button text content in Elements Tree Outline of the Elements panel
     * @example {3} PH1
     */
    showAllNodesDMore: 'Show all nodes ({PH1} more)',
    /**
     * @description Text for popover that directs to Issues panel
     */
    viewIssue: 'View Issue:',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsTreeOutline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const elementsTreeOutlineByDOMModel = new WeakMap();
const populatedTreeElements = new Set();
export const DEFAULT_VIEW = (input, output, target) => {
    if (!output.elementsTreeOutline) {
        // FIXME: this is basically a ref to existing imperative
        // implementation. Once this is declarative the ref should not be
        // needed.
        output.elementsTreeOutline = new ElementsTreeOutline(input.omitRootDOMNode, input.selectEnabled, input.hideGutter);
        output.elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, input.onSelectedNodeChanged, this);
        output.elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.ElementsTreeUpdated, input.onElementsTreeUpdated, this);
        output.elementsTreeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, input.onElementExpanded, this);
        output.elementsTreeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, input.onElementCollapsed, this);
        target.appendChild(output.elementsTreeOutline.element);
    }
    if (input.visibleWidth !== undefined) {
        output.elementsTreeOutline.setVisibleWidth(input.visibleWidth);
    }
    if (input.visible !== undefined) {
        output.elementsTreeOutline.setVisible(input.visible);
    }
    output.elementsTreeOutline.setWordWrap(input.wrap);
    output.elementsTreeOutline.setShowSelectionOnKeyboardFocus(input.showSelectionOnKeyboardFocus, input.preventTabOrder);
    if (input.deindentSingleNode) {
        output.elementsTreeOutline.deindentSingleNode();
    }
    // Node highlighting logic. FIXME: express as a lit template.
    const previousHighlightedNode = output.highlightedTreeElement?.node() ?? null;
    if (previousHighlightedNode !== input.currentHighlightedNode) {
        output.isUpdatingHighlights = true;
        let treeElement = null;
        if (output.highlightedTreeElement) {
            let currentTreeElement = output.highlightedTreeElement;
            while (currentTreeElement && currentTreeElement !== output.alreadyExpandedParentTreeElement) {
                if (currentTreeElement.expanded) {
                    currentTreeElement.collapse();
                }
                const parent = currentTreeElement.parent;
                currentTreeElement = parent instanceof ElementsTreeElement ? parent : null;
            }
        }
        output.highlightedTreeElement = null;
        output.alreadyExpandedParentTreeElement = null;
        if (input.currentHighlightedNode) {
            let deepestExpandedParent = input.currentHighlightedNode;
            const treeElementByNode = output.elementsTreeOutline.treeElementByNode;
            const treeIsNotExpanded = (deepestExpandedParent) => {
                const element = treeElementByNode.get(deepestExpandedParent);
                return element ? !element.expanded : true;
            };
            while (deepestExpandedParent && treeIsNotExpanded(deepestExpandedParent)) {
                deepestExpandedParent = deepestExpandedParent.parentNode;
            }
            output.alreadyExpandedParentTreeElement =
                (deepestExpandedParent ? treeElementByNode.get(deepestExpandedParent) :
                    output.elementsTreeOutline.rootElement());
            treeElement = output.elementsTreeOutline.createTreeElementFor(input.currentHighlightedNode);
        }
        output.highlightedTreeElement = treeElement;
        output.elementsTreeOutline.setHoverEffect(treeElement);
        treeElement?.reveal(true);
        output.isUpdatingHighlights = false;
    }
};
/**
 * The main goal of this presenter is to wrap ElementsTreeOutline until
 * ElementsTreeOutline can be fully integrated into DOMTreeWidget.
 *
 * FIXME: once TreeOutline is declarative, this file needs to be renamed
 * to DOMTreeWidget.ts.
 */
export class DOMTreeWidget extends UI.Widget.Widget {
    omitRootDOMNode = false;
    selectEnabled = false;
    hideGutter = false;
    showSelectionOnKeyboardFocus = false;
    preventTabOrder = false;
    deindentSingleNode = false;
    onSelectedNodeChanged = () => { };
    onElementsTreeUpdated = () => { };
    onDocumentUpdated = () => { };
    onElementExpanded = () => { };
    onElementCollapsed = () => { };
    #visible = false;
    #visibleWidth;
    #wrap = false;
    set visibleWidth(width) {
        this.#visibleWidth = width;
        this.performUpdate();
    }
    // FIXME: this is not declarative because ElementsTreeOutline can
    // change root node internally.
    set rootDOMNode(node) {
        this.performUpdate();
        if (!this.#viewOutput.elementsTreeOutline) {
            throw new Error('Unexpected: missing elementsTreeOutline');
        }
        this.#viewOutput.elementsTreeOutline.rootDOMNode = node;
        this.performUpdate();
    }
    get rootDOMNode() {
        return this.#viewOutput.elementsTreeOutline?.rootDOMNode ?? null;
    }
    #currentHighlightedNode = null;
    #view;
    #viewOutput = {
        highlightedTreeElement: null,
        alreadyExpandedParentTreeElement: null,
        isUpdatingHighlights: false,
    };
    #highlightThrottler = new Common.Throttler.Throttler(100);
    constructor(element, view) {
        super(element, {
            useShadowDom: false,
            delegatesFocus: false,
        });
        this.#view = view ?? DEFAULT_VIEW;
        if (Common.Settings.Settings.instance().moduleSetting('highlight-node-on-hover-in-overlay').get()) {
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "HighlightNodeRequested" /* SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED */, this.#highlightNode, this, { scoped: true });
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "InspectModeWillBeToggled" /* SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED */, this.#clearHighlightedNode, this, { scoped: true });
        }
    }
    #highlightNode(event) {
        void this.#highlightThrottler.schedule(() => {
            this.#currentHighlightedNode = event.data;
            this.requestUpdate();
        });
    }
    #clearHighlightedNode() {
        // Highlighting an element via tree outline will emit the
        // INSPECT_MODE_WILL_BE_TOGGLED event, therefore, we skip it if the view
        // informed us that it is updating the element.
        if (this.#viewOutput.isUpdatingHighlights) {
            return;
        }
        this.#currentHighlightedNode = null;
        this.performUpdate();
    }
    selectDOMNode(node, focus) {
        this.#viewOutput?.elementsTreeOutline?.selectDOMNode(node, focus);
    }
    highlightNodeAttribute(node, attribute) {
        this.#viewOutput?.elementsTreeOutline?.highlightNodeAttribute(node, attribute);
    }
    setWordWrap(wrap) {
        this.#wrap = wrap;
        this.performUpdate();
    }
    selectedDOMNode() {
        return this.#viewOutput.elementsTreeOutline?.selectedDOMNode() ?? null;
    }
    /**
     * FIXME: this is called to re-render everything from scratch, for
     * example, if global settings changed. Instead, the setting values
     * should be the input for the view function.
     */
    reload() {
        this.#viewOutput.elementsTreeOutline?.update();
    }
    /**
     * Used by layout tests.
     */
    getTreeOutlineForTesting() {
        return this.#viewOutput.elementsTreeOutline;
    }
    treeElementForNode(node) {
        return this.#viewOutput.elementsTreeOutline?.findTreeElement(node) || null;
    }
    performUpdate() {
        this.#view({
            omitRootDOMNode: this.omitRootDOMNode,
            selectEnabled: this.selectEnabled,
            hideGutter: this.hideGutter,
            visibleWidth: this.#visibleWidth,
            visible: this.#visible,
            wrap: this.#wrap,
            showSelectionOnKeyboardFocus: this.showSelectionOnKeyboardFocus,
            preventTabOrder: this.preventTabOrder,
            deindentSingleNode: this.deindentSingleNode,
            currentHighlightedNode: this.#currentHighlightedNode,
            onElementsTreeUpdated: this.onElementsTreeUpdated.bind(this),
            onSelectedNodeChanged: event => {
                this.#clearHighlightedNode();
                this.onSelectedNodeChanged(event);
            },
            onElementCollapsed: () => {
                this.#clearHighlightedNode();
                this.onElementCollapsed();
            },
            onElementExpanded: () => {
                this.#clearHighlightedNode();
                this.onElementExpanded();
            },
        }, this.#viewOutput, this.contentElement);
    }
    modelAdded(domModel) {
        this.performUpdate();
        if (!this.#viewOutput.elementsTreeOutline) {
            throw new Error('Unexpected: missing elementsTreeOutline');
        }
        this.#viewOutput.elementsTreeOutline.wireToDOMModel(domModel);
        this.performUpdate();
    }
    modelRemoved(domModel) {
        this.#viewOutput.elementsTreeOutline?.unwireFromDOMModel(domModel);
        this.performUpdate();
    }
    /**
     * FIXME: which node is expanded should be part of the view input.
     */
    expand() {
        if (this.#viewOutput.elementsTreeOutline?.selectedTreeElement) {
            this.#viewOutput.elementsTreeOutline.selectedTreeElement.expand();
        }
    }
    /**
     * FIXME: which node is selected should be part of the view input.
     */
    selectDOMNodeWithoutReveal(node) {
        this.#viewOutput.elementsTreeOutline?.findTreeElement(node)?.select();
    }
    /**
     * FIXME: adorners should be part of the view input.
     */
    updateNodeAdorners(node) {
        const element = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        void element?.updateStyleAdorners();
        void element?.updateAdorners();
    }
    highlightMatch(node, query) {
        const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        if (!treeElement) {
            return;
        }
        if (query) {
            treeElement.highlightSearchResults(query);
        }
        treeElement.reveal();
        const matches = treeElement.listItemElement.getElementsByClassName(Highlighting.highlightedSearchResultClassName);
        if (matches.length) {
            matches[0].scrollIntoViewIfNeeded(false);
        }
        treeElement.select(/* omitFocus */ true);
    }
    hideMatchHighlights(node) {
        const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        if (!treeElement) {
            return;
        }
        treeElement.hideSearchHighlights();
    }
    toggleHideElement(node) {
        void this.#viewOutput.elementsTreeOutline?.toggleHideElement(node);
    }
    toggleEditAsHTML(node) {
        this.#viewOutput.elementsTreeOutline?.toggleEditAsHTML(node);
    }
    duplicateNode(node) {
        this.#viewOutput.elementsTreeOutline?.duplicateNode(node);
    }
    copyStyles(node) {
        void this.#viewOutput.elementsTreeOutline?.findTreeElement(node)?.copyStyles();
    }
    /**
     * FIXME: used to determine focus state, probably we can have a better
     * way to do it.
     */
    empty() {
        return !this.#viewOutput.elementsTreeOutline;
    }
    focus() {
        super.focus();
        this.#viewOutput.elementsTreeOutline?.focus();
    }
    wasShown() {
        super.wasShown();
        this.#visible = true;
        this.performUpdate();
    }
    detach(overrideHideOnDetach) {
        super.detach(overrideHideOnDetach);
        this.#visible = false;
        this.performUpdate();
    }
    show(parentElement, insertBefore, suppressOrphanWidgetError = false) {
        this.performUpdate();
        const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, { scoped: true });
        for (const domModel of domModels) {
            if (domModel.parentModel()) {
                continue;
            }
            if (!this.rootDOMNode || this.rootDOMNode.domModel() !== domModel) {
                if (domModel.existingDocument()) {
                    this.rootDOMNode = domModel.existingDocument();
                    this.onDocumentUpdated(domModel);
                }
                else {
                    void domModel.requestDocument();
                }
            }
        }
        super.show(parentElement, insertBefore, suppressOrphanWidgetError);
    }
}
export class ElementsTreeOutline extends Common.ObjectWrapper.eventMixin(UI.TreeOutline.TreeOutline) {
    treeElementByNode;
    shadowRoot;
    elementInternal;
    includeRootDOMNode;
    selectEnabled;
    rootDOMNodeInternal;
    selectedDOMNodeInternal;
    visible;
    imagePreviewPopover;
    updateRecords;
    treeElementsBeingUpdated;
    decoratorExtensions;
    showHTMLCommentsSetting;
    multilineEditing;
    visibleWidthInternal;
    clipboardNodeData;
    isXMLMimeTypeInternal;
    suppressRevealAndSelect = false;
    previousHoveredElement;
    treeElementBeingDragged;
    dragOverTreeElement;
    updateModifiedNodesTimeout;
    #topLayerContainerByDocument = new WeakMap();
    #issuesManager;
    #popupHelper;
    #nodeElementToIssues = new Map();
    constructor(omitRootDOMNode, selectEnabled, hideGutter) {
        super();
        this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
        this.#issuesManager.addEventListener("IssueAdded" /* IssuesManager.IssuesManager.Events.ISSUE_ADDED */, this.#onIssueAdded, this);
        this.treeElementByNode = new WeakMap();
        const shadowContainer = document.createElement('div');
        this.shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(shadowContainer, { cssFile: [elementsTreeOutlineStyles, CodeHighlighter.codeHighlighterStyles] });
        const outlineDisclosureElement = this.shadowRoot.createChild('div', 'elements-disclosure');
        this.elementInternal = this.element;
        this.elementInternal.classList.add('elements-tree-outline', 'source-code');
        if (hideGutter) {
            this.elementInternal.classList.add('elements-hide-gutter');
        }
        UI.ARIAUtils.setLabel(this.elementInternal, i18nString(UIStrings.pageDom));
        this.elementInternal.addEventListener('focusout', this.onfocusout.bind(this), false);
        this.elementInternal.addEventListener('mousedown', this.onmousedown.bind(this), false);
        this.elementInternal.addEventListener('mousemove', this.onmousemove.bind(this), false);
        this.elementInternal.addEventListener('mouseleave', this.onmouseleave.bind(this), false);
        this.elementInternal.addEventListener('dragstart', this.ondragstart.bind(this), false);
        this.elementInternal.addEventListener('dragover', this.ondragover.bind(this), false);
        this.elementInternal.addEventListener('dragleave', this.ondragleave.bind(this), false);
        this.elementInternal.addEventListener('drop', this.ondrop.bind(this), false);
        this.elementInternal.addEventListener('dragend', this.ondragend.bind(this), false);
        this.elementInternal.addEventListener('contextmenu', this.contextMenuEventFired.bind(this), false);
        this.elementInternal.addEventListener('clipboard-beforecopy', this.onBeforeCopy.bind(this), false);
        this.elementInternal.addEventListener('clipboard-copy', this.onCopyOrCut.bind(this, false), false);
        this.elementInternal.addEventListener('clipboard-cut', this.onCopyOrCut.bind(this, true), false);
        this.elementInternal.addEventListener('clipboard-paste', this.onPaste.bind(this), false);
        this.elementInternal.addEventListener('keydown', this.onKeyDown.bind(this), false);
        outlineDisclosureElement.appendChild(this.elementInternal);
        this.element = shadowContainer;
        this.contentElement.setAttribute('jslog', `${VisualLogging.tree('elements')}`);
        this.includeRootDOMNode = !omitRootDOMNode;
        this.selectEnabled = selectEnabled;
        this.rootDOMNodeInternal = null;
        this.selectedDOMNodeInternal = null;
        this.visible = false;
        this.imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
            let link = event.target;
            while (link && !ImagePreviewPopover.getImageURL(link)) {
                link = link.parentElementOrShadowHost();
            }
            return link;
        }, link => {
            const listItem = UI.UIUtils.enclosingNodeOrSelfWithNodeName(link, 'li');
            if (!listItem) {
                return null;
            }
            const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem);
            if (!treeElement) {
                return null;
            }
            return treeElement.node();
        });
        this.updateRecords = new Map();
        this.treeElementsBeingUpdated = new Set();
        this.decoratorExtensions = null;
        this.showHTMLCommentsSetting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
        this.showHTMLCommentsSetting.addChangeListener(this.onShowHTMLCommentsChange.bind(this));
        this.setUseLightSelectionColor(true);
        // TODO(changhaohan): refactor the popover to use tooltip component.
        this.#popupHelper = new UI.PopoverHelper.PopoverHelper(this.elementInternal, event => {
            const hoveredNode = event.composedPath()[0];
            if (!hoveredNode?.matches('.violating-element')) {
                return null;
            }
            const issues = this.#nodeElementToIssues.get(hoveredNode);
            if (!issues) {
                return null;
            }
            return {
                box: hoveredNode.boxInWindow(),
                show: async (popover) => {
                    popover.setIgnoreLeftMargin(true);
                    // clang-format off
                    render(html `
            <div class="squiggles-content">
              ${issues.map(issue => {
                        const elementIssueDetails = getElementIssueDetails(issue);
                        if (!elementIssueDetails) {
                            // This shouldn't happen, but add this if check to pass ts check.
                            return nothing;
                        }
                        const issueKindIconName = IssueCounter.IssueCounter.getIssueKindIconName(issue.getKind());
                        const openIssueEvent = () => Common.Revealer.reveal(issue);
                        return html `
                  <div class="squiggles-content-item">
                  <devtools-icon .name=${issueKindIconName} @click=${openIssueEvent}></devtools-icon>
                  <x-link class="link" @click=${openIssueEvent}>${i18nString(UIStrings.viewIssue)}</x-link>
                  <span>${elementIssueDetails.tooltip}</span>
                  </div>`;
                    })}
            </div>`, popover.contentElement);
                    // clang-format on
                    return true;
                },
            };
        }, 'elements.issue');
        this.#popupHelper.setTimeout(300);
    }
    static forDOMModel(domModel) {
        return elementsTreeOutlineByDOMModel.get(domModel) || null;
    }
    #onIssueAdded(event) {
        void this.#addTreeElementIssue(event.data.issue);
    }
    #addAllElementIssues() {
        if (!this.#issuesManager) {
            return;
        }
        for (const issue of this.#issuesManager.issues()) {
            void this.#addTreeElementIssue(issue);
        }
    }
    async #addTreeElementIssue(issue) {
        const elementIssueDetails = getElementIssueDetails(issue);
        if (!elementIssueDetails) {
            return;
        }
        const { nodeId } = elementIssueDetails;
        if (!this.rootDOMNode || !nodeId) {
            return;
        }
        const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(this.rootDOMNode.domModel().target(), nodeId);
        const node = await deferredDOMNode.resolvePromise();
        if (!node) {
            return;
        }
        const treeElement = this.findTreeElement(node);
        if (treeElement) {
            treeElement.addIssue(issue);
            const treeElementNodeElementsToIssues = treeElement.issuesByNodeElement;
            // This element could be the treeElement tags name or an attribute.
            for (const [element, issues] of treeElementNodeElementsToIssues) {
                this.#nodeElementToIssues.set(element, issues);
            }
        }
    }
    deindentSingleNode() {
        const firstChild = this.firstChild();
        if (!firstChild || (firstChild && !firstChild.isExpandable())) {
            this.shadowRoot.querySelector('.elements-disclosure')?.classList.add('single-node');
        }
    }
    updateNodeElementToIssue(element, issues) {
        this.#nodeElementToIssues.set(element, issues);
    }
    onShowHTMLCommentsChange() {
        const selectedNode = this.selectedDOMNode();
        if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.showHTMLCommentsSetting.get()) {
            this.selectDOMNode(selectedNode.parentNode);
        }
        this.update();
    }
    setWordWrap(wrap) {
        this.elementInternal.classList.toggle('elements-tree-nowrap', !wrap);
    }
    setMultilineEditing(multilineEditing) {
        this.multilineEditing = multilineEditing;
    }
    visibleWidth() {
        return this.visibleWidthInternal || 0;
    }
    setVisibleWidth(width) {
        this.visibleWidthInternal = width;
        if (this.multilineEditing) {
            this.multilineEditing.resize();
        }
    }
    setClipboardData(data) {
        if (this.clipboardNodeData) {
            const treeElement = this.findTreeElement(this.clipboardNodeData.node);
            if (treeElement) {
                treeElement.setInClipboard(false);
            }
            delete this.clipboardNodeData;
        }
        if (data) {
            const treeElement = this.findTreeElement(data.node);
            if (treeElement) {
                treeElement.setInClipboard(true);
            }
            this.clipboardNodeData = data;
        }
    }
    resetClipboardIfNeeded(removedNode) {
        if (this.clipboardNodeData?.node === removedNode) {
            this.setClipboardData(null);
        }
    }
    onBeforeCopy(event) {
        event.handled = true;
    }
    onCopyOrCut(isCut, event) {
        this.setClipboardData(null);
        // @ts-expect-error this bound in the main entry point
        const originalEvent = event['original'];
        if (!originalEvent?.target) {
            return;
        }
        // Don't prevent the normal copy if the user has a selection.
        if (originalEvent.target instanceof Node && originalEvent.target.hasSelection()) {
            return;
        }
        // Do not interfere with text editing.
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const targetNode = this.selectedDOMNode();
        if (!targetNode) {
            return;
        }
        if (!originalEvent.clipboardData) {
            return;
        }
        originalEvent.clipboardData.clearData();
        event.handled = true;
        this.performCopyOrCut(isCut, targetNode);
    }
    performCopyOrCut(isCut, node, includeShadowRoots = false) {
        if (!node) {
            return;
        }
        if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
            return;
        }
        void node.getOuterHTML(includeShadowRoots).then(outerHTML => {
            if (outerHTML !== null) {
                UI.UIUtils.copyTextToClipboard(outerHTML);
            }
        });
        this.setClipboardData({ node, isCut });
    }
    canPaste(targetNode) {
        if (targetNode.isShadowRoot() || targetNode.ancestorUserAgentShadowRoot()) {
            return false;
        }
        if (!this.clipboardNodeData) {
            return false;
        }
        const node = this.clipboardNodeData.node;
        if (this.clipboardNodeData.isCut && (node === targetNode || node.isAncestor(targetNode))) {
            return false;
        }
        if (targetNode.domModel() !== node.domModel()) {
            return false;
        }
        return true;
    }
    pasteNode(targetNode) {
        if (this.canPaste(targetNode)) {
            this.performPaste(targetNode);
        }
    }
    duplicateNode(targetNode) {
        this.performDuplicate(targetNode);
    }
    onPaste(event) {
        // Do not interfere with text editing.
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const targetNode = this.selectedDOMNode();
        if (!targetNode || !this.canPaste(targetNode)) {
            return;
        }
        event.handled = true;
        this.performPaste(targetNode);
    }
    performPaste(targetNode) {
        if (!this.clipboardNodeData) {
            return;
        }
        if (this.clipboardNodeData.isCut) {
            this.clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
            this.setClipboardData(null);
        }
        else {
            this.clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
        }
        function expandCallback(error, pastedNode) {
            if (error || !pastedNode) {
                return;
            }
            this.selectDOMNode(pastedNode);
        }
    }
    performDuplicate(targetNode) {
        if (targetNode.isInShadowTree()) {
            return;
        }
        const parentNode = targetNode.parentNode ? targetNode.parentNode : targetNode;
        if (parentNode.nodeName() === '#document') {
            return;
        }
        targetNode.copyTo(parentNode, targetNode.nextSibling);
    }
    setVisible(visible) {
        if (visible === this.visible) {
            return;
        }
        this.visible = visible;
        if (!this.visible) {
            this.imagePreviewPopover.hide();
            if (this.multilineEditing) {
                this.multilineEditing.cancel();
            }
            return;
        }
        this.runPendingUpdates();
        if (this.selectedDOMNodeInternal) {
            this.revealAndSelectNode(this.selectedDOMNodeInternal, false);
        }
    }
    get rootDOMNode() {
        return this.rootDOMNodeInternal;
    }
    set rootDOMNode(x) {
        if (this.rootDOMNodeInternal === x) {
            return;
        }
        this.rootDOMNodeInternal = x;
        this.isXMLMimeTypeInternal = x?.isXMLNode();
        this.update();
    }
    get isXMLMimeType() {
        return Boolean(this.isXMLMimeTypeInternal);
    }
    selectedDOMNode() {
        return this.selectedDOMNodeInternal;
    }
    selectDOMNode(node, focus) {
        if (this.selectedDOMNodeInternal === node) {
            this.revealAndSelectNode(node, !focus);
            return;
        }
        this.selectedDOMNodeInternal = node;
        this.revealAndSelectNode(node, !focus);
        // The revealAndSelectNode() method might find a different element if there is inlined text,
        // and the select() call would change the selectedDOMNode and reenter this setter. So to
        // avoid calling selectedNodeChanged() twice, first check if selectedDOMNodeInternal is the same
        // node as the one passed in.
        if (this.selectedDOMNodeInternal === node) {
            this.selectedNodeChanged(Boolean(focus));
        }
    }
    editing() {
        const node = this.selectedDOMNode();
        if (!node) {
            return false;
        }
        const treeElement = this.findTreeElement(node);
        if (!treeElement) {
            return false;
        }
        return treeElement.isEditing() || false;
    }
    update() {
        const selectedNode = this.selectedDOMNode();
        this.removeChildren();
        if (!this.rootDOMNode) {
            return;
        }
        if (this.includeRootDOMNode) {
            const treeElement = this.createElementTreeElement(this.rootDOMNode);
            this.appendChild(treeElement);
        }
        else {
            // FIXME: this could use findTreeElement to reuse a tree element if it already exists
            const children = this.visibleChildren(this.rootDOMNode);
            for (const child of children) {
                const treeElement = this.createElementTreeElement(child);
                this.appendChild(treeElement);
            }
        }
        if (this.rootDOMNode instanceof SDK.DOMModel.DOMDocument) {
            void this.createTopLayerContainer(this.rootElement(), this.rootDOMNode);
        }
        if (selectedNode) {
            this.revealAndSelectNode(selectedNode, true);
        }
    }
    selectedNodeChanged(focus) {
        this.dispatchEventToListeners(ElementsTreeOutline.Events.SelectedNodeChanged, { node: this.selectedDOMNodeInternal, focus });
    }
    fireElementsTreeUpdated(nodes) {
        this.dispatchEventToListeners(ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
    }
    findTreeElement(node) {
        if (node instanceof SDK.DOMModel.AdoptedStyleSheet) {
            return null;
        }
        let treeElement = this.lookUpTreeElement(node);
        if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
            // The text node might have been inlined if it was short, so try to find the parent element.
            treeElement = this.lookUpTreeElement(node.parentNode);
        }
        return treeElement;
    }
    lookUpTreeElement(node) {
        if (!node) {
            return null;
        }
        const cachedElement = this.treeElementByNode.get(node);
        if (cachedElement) {
            return cachedElement;
        }
        // Walk up the parent pointers from the desired node
        const ancestors = [];
        let currentNode;
        for (currentNode = node.parentNode; currentNode; currentNode = currentNode.parentNode) {
            ancestors.push(currentNode);
            if (this.treeElementByNode.has(currentNode)) { // stop climbing as soon as we hit
                break;
            }
        }
        if (!currentNode) {
            return null;
        }
        // Walk down to populate each ancestor's children, to fill in the tree and the cache.
        for (let i = ancestors.length - 1; i >= 0; --i) {
            const child = ancestors[i - 1] || node;
            const treeElement = this.treeElementByNode.get(ancestors[i]);
            if (treeElement) {
                void treeElement.onpopulate(); // fill the cache with the children of treeElement
                if (child.index && child.index >= treeElement.expandedChildrenLimit()) {
                    this.setExpandedChildrenLimit(treeElement, child.index + 1);
                }
            }
        }
        return this.treeElementByNode.get(node) || null;
    }
    createTreeElementFor(node) {
        let treeElement = this.findTreeElement(node);
        if (treeElement) {
            return treeElement;
        }
        if (!node.parentNode) {
            return null;
        }
        treeElement = this.createTreeElementFor(node.parentNode);
        return treeElement ? this.showChild(treeElement, node) : null;
    }
    revealAndSelectNode(node, omitFocus) {
        if (this.suppressRevealAndSelect) {
            return;
        }
        if (!this.includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode) {
            node = this.rootDOMNode.firstChild;
        }
        if (!node) {
            return;
        }
        const treeElement = this.createTreeElementFor(node);
        if (!treeElement) {
            return;
        }
        treeElement.revealAndSelect(omitFocus);
    }
    highlightNodeAttribute(node, attribute) {
        const treeElement = this.findTreeElement(node);
        if (!treeElement) {
            return;
        }
        treeElement.reveal();
        treeElement.highlightAttribute(attribute);
    }
    treeElementFromEventInternal(event) {
        const scrollContainer = this.element.parentElement;
        if (!scrollContainer) {
            return null;
        }
        const x = event.pageX;
        const y = event.pageY;
        // Our list items have 1-pixel cracks between them vertically. We avoid
        // the cracks by checking slightly above and slightly below the mouse
        // and seeing if we hit the same element each time.
        const elementUnderMouse = this.treeElementFromPoint(x, y);
        const elementAboveMouse = this.treeElementFromPoint(x, y - 2);
        let element;
        if (elementUnderMouse === elementAboveMouse) {
            element = elementUnderMouse;
        }
        else {
            element = this.treeElementFromPoint(x, y + 2);
        }
        return element;
    }
    onfocusout(_event) {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    onmousedown(event) {
        const element = this.treeElementFromEventInternal(event);
        if (element) {
            element.select();
        }
    }
    setHoverEffect(treeElement) {
        if (this.previousHoveredElement === treeElement) {
            return;
        }
        if (this.previousHoveredElement instanceof ElementsTreeElement) {
            this.previousHoveredElement.hovered = false;
            delete this.previousHoveredElement;
        }
        if (treeElement instanceof ElementsTreeElement) {
            treeElement.hovered = true;
            this.previousHoveredElement = treeElement;
        }
    }
    onmousemove(event) {
        const element = this.treeElementFromEventInternal(event);
        if (element && this.previousHoveredElement === element) {
            return;
        }
        this.setHoverEffect(element);
        this.highlightTreeElement(element, !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event));
    }
    highlightTreeElement(element, showInfo) {
        if (element instanceof ElementsTreeElement) {
            element.node().domModel().overlayModel().highlightInOverlay({ node: element.node(), selectorList: undefined }, 'all', showInfo);
            return;
        }
        if (element instanceof ShortcutTreeElement) {
            element.domModel().overlayModel().highlightInOverlay({ deferredNode: element.deferredNode(), selectorList: undefined }, 'all', showInfo);
        }
    }
    onmouseleave(_event) {
        this.setHoverEffect(null);
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    }
    ondragstart(event) {
        const node = event.target;
        if (!node || node.hasSelection()) {
            return false;
        }
        if (node.nodeName === 'A') {
            return false;
        }
        const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
        if (!treeElement) {
            return false;
        }
        if (treeElement.node().nodeName() === 'BODY' || treeElement.node().nodeName() === 'HEAD') {
            return false;
        }
        if (!event.dataTransfer || !treeElement.listItemElement.textContent) {
            return;
        }
        event.dataTransfer.setData('text/plain', treeElement.listItemElement.textContent.replace(/\u200b/g, ''));
        event.dataTransfer.effectAllowed = 'copyMove';
        this.treeElementBeingDragged = treeElement;
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        return true;
    }
    ondragover(event) {
        if (!this.treeElementBeingDragged) {
            return false;
        }
        const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
        if (!treeElement) {
            return false;
        }
        let node = treeElement.node();
        while (node) {
            if (node === this.treeElementBeingDragged.nodeInternal) {
                return false;
            }
            node = node.parentNode;
        }
        treeElement.listItemElement.classList.add('elements-drag-over');
        this.dragOverTreeElement = treeElement;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        return false;
    }
    ondragleave(event) {
        this.clearDragOverTreeElementMarker();
        event.preventDefault();
        return false;
    }
    validDragSourceOrTarget(treeElement) {
        if (!treeElement) {
            return null;
        }
        if (!(treeElement instanceof ElementsTreeElement)) {
            return null;
        }
        const elementsTreeElement = (treeElement);
        const node = elementsTreeElement.node();
        if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
            return null;
        }
        return elementsTreeElement;
    }
    ondrop(event) {
        event.preventDefault();
        const treeElement = this.treeElementFromEventInternal(event);
        if (treeElement instanceof ElementsTreeElement) {
            this.doMove(treeElement);
        }
    }
    doMove(treeElement) {
        if (!this.treeElementBeingDragged) {
            return;
        }
        let parentNode;
        let anchorNode;
        if (treeElement.isClosingTag()) {
            // Drop onto closing tag -> insert as last child.
            parentNode = treeElement.node();
            anchorNode = null;
        }
        else {
            const dragTargetNode = treeElement.node();
            parentNode = dragTargetNode.parentNode;
            anchorNode = dragTargetNode;
        }
        if (!parentNode) {
            return;
        }
        const wasExpanded = this.treeElementBeingDragged.expanded;
        this.treeElementBeingDragged.nodeInternal.moveTo(parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));
        delete this.treeElementBeingDragged;
    }
    ondragend(event) {
        event.preventDefault();
        this.clearDragOverTreeElementMarker();
        delete this.treeElementBeingDragged;
    }
    clearDragOverTreeElementMarker() {
        if (this.dragOverTreeElement) {
            this.dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');
            delete this.dragOverTreeElement;
        }
    }
    contextMenuEventFired(event) {
        const treeElement = this.treeElementFromEventInternal(event);
        if (treeElement instanceof ElementsTreeElement) {
            void this.showContextMenu(treeElement, event);
        }
    }
    async showContextMenu(treeElement, event) {
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const node = event.target;
        if (!node) {
            return;
        }
        // The context menu construction may be async. In order to
        // make sure that no other (default) context menu shows up, we need
        // to stop propagating and prevent the default action.
        event.stopPropagation();
        event.preventDefault();
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const isPseudoElement = Boolean(treeElement.node().pseudoType());
        const isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
        let textNode = node.enclosingNodeOrSelfWithClass('webkit-html-text-node');
        if (textNode?.classList.contains('bogus')) {
            textNode = null;
        }
        const commentNode = node.enclosingNodeOrSelfWithClass('webkit-html-comment');
        contextMenu.saveSection().appendItem(i18nString(UIStrings.storeAsGlobalVariable), this.saveNodeToTempVariable.bind(this, treeElement.node()), { jslogContext: 'store-as-global-variable' });
        if (textNode) {
            await treeElement.populateTextContextMenu(contextMenu, textNode);
        }
        else if (isTag) {
            await treeElement.populateTagContextMenu(contextMenu, event);
        }
        else if (commentNode) {
            await treeElement.populateNodeContextMenu(contextMenu);
        }
        else if (isPseudoElement) {
            treeElement.populatePseudoElementContextMenu(contextMenu);
        }
        ElementsPanel.instance().populateAdornerSettingsContextMenu(contextMenu);
        contextMenu.appendApplicableItems(treeElement.node());
        void contextMenu.show();
    }
    async saveNodeToTempVariable(node) {
        const remoteObjectForConsole = await node.resolveToObject();
        const consoleModel = remoteObjectForConsole?.runtimeModel().target()?.model(SDK.ConsoleModel.ConsoleModel);
        await consoleModel?.saveToTempVariable(UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), remoteObjectForConsole);
    }
    runPendingUpdates() {
        this.updateModifiedNodes();
    }
    onKeyDown(event) {
        const keyboardEvent = event;
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const node = this.selectedDOMNode();
        if (!node) {
            return;
        }
        const treeElement = this.treeElementByNode.get(node);
        if (!treeElement) {
            return;
        }
        if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(keyboardEvent) && node.parentNode) {
            if (keyboardEvent.key === 'ArrowUp' && node.previousSibling) {
                node.moveTo(node.parentNode, node.previousSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
                keyboardEvent.consume(true);
                return;
            }
            if (keyboardEvent.key === 'ArrowDown' && node.nextSibling) {
                node.moveTo(node.parentNode, node.nextSibling.nextSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
                keyboardEvent.consume(true);
                return;
            }
        }
    }
    toggleEditAsHTML(node, startEditing, callback) {
        const treeElement = this.treeElementByNode.get(node);
        if (!treeElement?.hasEditableNode()) {
            return;
        }
        if (node.pseudoType()) {
            return;
        }
        const parentNode = node.parentNode;
        const index = node.index;
        const wasExpanded = treeElement.expanded;
        treeElement.toggleEditAsHTML(editingFinished.bind(this), startEditing);
        function editingFinished(success) {
            if (callback) {
                callback();
            }
            if (!success) {
                return;
            }
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
            // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
            this.runPendingUpdates();
            if (!index) {
                return;
            }
            const children = parentNode?.children();
            const newNode = children ? children[index] || parentNode : parentNode;
            if (!newNode) {
                return;
            }
            this.selectDOMNode(newNode, true);
            if (wasExpanded) {
                const newTreeItem = this.findTreeElement(newNode);
                if (newTreeItem) {
                    newTreeItem.expand();
                }
            }
        }
    }
    selectNodeAfterEdit(wasExpanded, error, newNode) {
        if (error) {
            return null;
        }
        // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
        this.runPendingUpdates();
        if (!newNode) {
            return null;
        }
        this.selectDOMNode(newNode, true);
        const newTreeItem = this.findTreeElement(newNode);
        if (wasExpanded) {
            if (newTreeItem) {
                newTreeItem.expand();
            }
        }
        return newTreeItem;
    }
    /**
     * Runs a script on the node's remote object that toggles a class name on
     * the node and injects a stylesheet into the head of the node's document
     * containing a rule to set "visibility: hidden" on the class and all it's
     * ancestors.
     */
    async toggleHideElement(node) {
        let pseudoElementName = node.pseudoType() ? node.nodeName() : null;
        if (pseudoElementName && node.pseudoIdentifier()) {
            pseudoElementName += `(${node.pseudoIdentifier()})`;
        }
        let effectiveNode = node;
        while (effectiveNode?.pseudoType()) {
            if (effectiveNode !== node && effectiveNode.pseudoType() === 'column') {
                // Ideally we would select the specific column pseudo element, but
                // we don't have a way to do that at the moment.
                pseudoElementName = '::column' + pseudoElementName;
            }
            effectiveNode = effectiveNode.parentNode;
        }
        if (!effectiveNode) {
            return;
        }
        const hidden = node.marker('hidden-marker');
        const object = await effectiveNode.resolveToObject('');
        if (!object) {
            return;
        }
        await object.callFunction(toggleClassAndInjectStyleRule, [{ value: pseudoElementName }, { value: !hidden }]);
        object.release();
        node.setMarker('hidden-marker', hidden ? null : true);
        function toggleClassAndInjectStyleRule(pseudoElementName, hidden) {
            const classNamePrefix = '__web-inspector-hide';
            const classNameSuffix = '-shortcut__';
            const styleTagId = '__web-inspector-hide-shortcut-style__';
            const pseudoElementNameEscaped = pseudoElementName ? pseudoElementName.replace(/[\(\)\:]/g, '_') : '';
            const className = classNamePrefix + pseudoElementNameEscaped + classNameSuffix;
            this.classList.toggle(className, hidden);
            let localRoot = this;
            while (localRoot.parentNode) {
                localRoot = localRoot.parentNode;
            }
            if (localRoot.nodeType === Node.DOCUMENT_NODE) {
                localRoot = document.head;
            }
            let style = localRoot.querySelector('style#' + styleTagId);
            if (!style) {
                const selectors = [];
                selectors.push('.__web-inspector-hide-shortcut__');
                selectors.push('.__web-inspector-hide-shortcut__ *');
                const selector = selectors.join(', ');
                const ruleBody = '    visibility: hidden !important;';
                const rule = '\n' + selector + '\n{\n' + ruleBody + '\n}\n';
                style = document.createElement('style');
                style.id = styleTagId;
                style.textContent = rule;
                localRoot.appendChild(style);
            }
            // In addition to putting them on the element we want to hide, we will
            // also add pseudo element classes to the style element to keep track of
            // which pseudo elements we have style rules for.
            if (pseudoElementName && !style.classList.contains(className)) {
                style.classList.add(className);
                style.textContent = `.${className}${pseudoElementName}, ${style.textContent}`;
            }
        }
    }
    isToggledToHidden(node) {
        return Boolean(node.marker('hidden-marker'));
    }
    reset() {
        this.rootDOMNode = null;
        this.selectDOMNode(null, false);
        this.imagePreviewPopover.hide();
        delete this.clipboardNodeData;
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
        this.updateRecords.clear();
    }
    wireToDOMModel(domModel) {
        elementsTreeOutlineByDOMModel.set(domModel, this);
        domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged, this.markersChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.NodeInserted, this.nodeInserted, this);
        domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
        domModel.addEventListener(SDK.DOMModel.Events.AttrModified, this.attributeModified, this);
        domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
        domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
        domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.ScrollableFlagUpdated, this.scrollableFlagUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.affectedByStartingStylesFlagUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.AdoptedStyleSheetsModified, this.adoptedStyleSheetsModified, this);
    }
    unwireFromDOMModel(domModel) {
        domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged, this.markersChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this.nodeInserted, this);
        domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, this.attributeModified, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
        domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
        domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.ScrollableFlagUpdated, this.scrollableFlagUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.affectedByStartingStylesFlagUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AdoptedStyleSheetsModified, this.adoptedStyleSheetsModified, this);
        elementsTreeOutlineByDOMModel.delete(domModel);
    }
    addUpdateRecord(node) {
        let record = this.updateRecords.get(node);
        if (!record) {
            record = new Elements.ElementUpdateRecord.ElementUpdateRecord();
            this.updateRecords.set(node, record);
        }
        return record;
    }
    updateRecordForHighlight(node) {
        if (!this.visible) {
            return null;
        }
        return this.updateRecords.get(node) || null;
    }
    documentUpdated(event) {
        const domModel = event.data;
        this.reset();
        if (domModel.existingDocument()) {
            this.rootDOMNode = domModel.existingDocument();
            this.#addAllElementIssues();
        }
    }
    attributeModified(event) {
        const { node } = event.data;
        this.addUpdateRecord(node).attributeModified(event.data.name);
        this.updateModifiedNodesSoon();
    }
    attributeRemoved(event) {
        const { node } = event.data;
        this.addUpdateRecord(node).attributeRemoved(event.data.name);
        this.updateModifiedNodesSoon();
    }
    characterDataModified(event) {
        const node = event.data;
        this.addUpdateRecord(node).charDataModified();
        // Text could be large and force us to render itself as the child in the tree outline.
        if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
            this.addUpdateRecord(node.parentNode).childrenModified();
        }
        this.updateModifiedNodesSoon();
    }
    nodeInserted(event) {
        const node = event.data;
        this.addUpdateRecord(node.parentNode).nodeInserted(node);
        this.updateModifiedNodesSoon();
    }
    nodeRemoved(event) {
        const { node, parent } = event.data;
        this.resetClipboardIfNeeded(node);
        this.addUpdateRecord(parent).nodeRemoved(node);
        this.updateModifiedNodesSoon();
    }
    childNodeCountUpdated(event) {
        const node = event.data;
        this.addUpdateRecord(node).childrenModified();
        this.updateModifiedNodesSoon();
    }
    distributedNodesChanged(event) {
        const node = event.data;
        this.addUpdateRecord(node).childrenModified();
        this.updateModifiedNodesSoon();
    }
    adoptedStyleSheetsModified(event) {
        const node = event.data;
        this.addUpdateRecord(node).childrenModified();
        this.updateModifiedNodesSoon();
    }
    updateModifiedNodesSoon() {
        if (!this.updateRecords.size) {
            return;
        }
        if (this.updateModifiedNodesTimeout) {
            return;
        }
        this.updateModifiedNodesTimeout = window.setTimeout(this.updateModifiedNodes.bind(this), 50);
    }
    /**
     * TODO: this is made public for unit tests until the ElementsTreeOutline is
     * migrated into DOMTreeWidget and highlights are declarative.
     */
    updateModifiedNodes() {
        if (this.updateModifiedNodesTimeout) {
            clearTimeout(this.updateModifiedNodesTimeout);
            delete this.updateModifiedNodesTimeout;
        }
        const updatedNodes = [...this.updateRecords.keys()];
        const hidePanelWhileUpdating = updatedNodes.length > 10;
        let treeOutlineContainerElement;
        let originalScrollTop;
        if (hidePanelWhileUpdating) {
            treeOutlineContainerElement = this.element.parentNode;
            originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
            this.elementInternal.classList.add('hidden');
        }
        const rootNodeUpdateRecords = this.rootDOMNodeInternal && this.updateRecords.get(this.rootDOMNodeInternal);
        if (rootNodeUpdateRecords?.hasChangedChildren()) {
            // Document's children have changed, perform total update.
            this.update();
        }
        else {
            for (const [node, record] of this.updateRecords) {
                if (record.hasChangedChildren()) {
                    this.updateModifiedParentNode((node));
                }
                else {
                    this.updateModifiedNode((node));
                }
            }
        }
        if (hidePanelWhileUpdating) {
            this.elementInternal.classList.remove('hidden');
            if (treeOutlineContainerElement && originalScrollTop) {
                treeOutlineContainerElement.scrollTop = originalScrollTop;
            }
        }
        this.updateRecords.clear();
        this.fireElementsTreeUpdated(updatedNodes);
    }
    updateModifiedNode(node) {
        const treeElement = this.findTreeElement(node);
        if (treeElement) {
            treeElement.updateTitle(this.updateRecordForHighlight(node));
        }
    }
    updateModifiedParentNode(node) {
        const parentTreeElement = this.findTreeElement(node);
        if (parentTreeElement) {
            parentTreeElement.setExpandable(this.hasVisibleChildren(node));
            parentTreeElement.updateTitle(this.updateRecordForHighlight(node));
            if (populatedTreeElements.has(parentTreeElement)) {
                this.updateChildren(parentTreeElement);
            }
        }
    }
    populateTreeElement(treeElement) {
        if (treeElement.childCount() || !treeElement.isExpandable()) {
            return Promise.resolve();
        }
        return new Promise(resolve => {
            treeElement.node().getChildNodes(() => {
                populatedTreeElements.add(treeElement);
                this.updateModifiedParentNode(treeElement.node());
                resolve();
            });
        });
    }
    createTopLayerContainer(parent, document) {
        if (!parent.treeOutline || !(parent.treeOutline instanceof ElementsTreeOutline)) {
            return;
        }
        const container = new TopLayerContainer(parent.treeOutline, document);
        this.#topLayerContainerByDocument.set(document, container);
        parent.appendChild(container);
    }
    revealInTopLayer(node) {
        const document = node.ownerDocument;
        if (!document) {
            return;
        }
        const container = this.#topLayerContainerByDocument.get(document);
        if (container) {
            container.revealInTopLayer(node);
        }
    }
    createElementTreeElement(node, isClosingTag) {
        if (node instanceof SDK.DOMModel.AdoptedStyleSheet) {
            return new AdoptedStyleSheetTreeElement(node);
        }
        const treeElement = new ElementsTreeElement(node, isClosingTag);
        treeElement.setExpandable(!isClosingTag && this.hasVisibleChildren(node));
        if (node.nodeType() === Node.ELEMENT_NODE && node.parentNode && node.parentNode.nodeType() === Node.DOCUMENT_NODE &&
            !node.parentNode.parentNode) {
            treeElement.setCollapsible(false);
        }
        if (node.hasAssignedSlot()) {
            treeElement.createSlotLink(node.assignedSlot);
        }
        treeElement.selectable = Boolean(this.selectEnabled);
        return treeElement;
    }
    showChild(treeElement, child) {
        if (treeElement.isClosingTag()) {
            return null;
        }
        const index = this.visibleChildren(treeElement.node()).indexOf(child);
        if (index === -1) {
            return null;
        }
        if (index >= treeElement.expandedChildrenLimit()) {
            this.setExpandedChildrenLimit(treeElement, index + 1);
        }
        return treeElement.childAt(index);
    }
    visibleChildren(node) {
        let visibleChildren = [...node.adoptedStyleSheetsForNode, ...ElementsTreeElement.visibleShadowRoots(node)];
        const contentDocument = node.contentDocument();
        if (contentDocument) {
            visibleChildren.push(contentDocument);
        }
        const templateContent = node.templateContent();
        if (templateContent) {
            visibleChildren.push(templateContent);
        }
        visibleChildren.push(...node.viewTransitionPseudoElements());
        const markerPseudoElement = node.markerPseudoElement();
        if (markerPseudoElement) {
            visibleChildren.push(markerPseudoElement);
        }
        const checkmarkPseudoElement = node.checkmarkPseudoElement();
        if (checkmarkPseudoElement) {
            visibleChildren.push(checkmarkPseudoElement);
        }
        const beforePseudoElement = node.beforePseudoElement();
        if (beforePseudoElement) {
            visibleChildren.push(beforePseudoElement);
        }
        visibleChildren.push(...node.carouselPseudoElements());
        if (node.childNodeCount()) {
            // Children may be stale when the outline is not wired to receive DOMModel updates.
            let children = node.children() || [];
            if (!this.showHTMLCommentsSetting.get()) {
                children = children.filter(n => n.nodeType() !== Node.COMMENT_NODE);
            }
            visibleChildren = visibleChildren.concat(children);
        }
        const afterPseudoElement = node.afterPseudoElement();
        if (afterPseudoElement) {
            visibleChildren.push(afterPseudoElement);
        }
        const pickerIconPseudoElement = node.pickerIconPseudoElement();
        if (pickerIconPseudoElement) {
            visibleChildren.push(pickerIconPseudoElement);
        }
        const backdropPseudoElement = node.backdropPseudoElement();
        if (backdropPseudoElement) {
            visibleChildren.push(backdropPseudoElement);
        }
        return visibleChildren;
    }
    hasVisibleChildren(node) {
        if (node.isIframe()) {
            return true;
        }
        if (node.contentDocument()) {
            return true;
        }
        if (node.templateContent()) {
            return true;
        }
        if (ElementsTreeElement.visibleShadowRoots(node).length) {
            return true;
        }
        if (node.hasPseudoElements()) {
            return true;
        }
        if (node.isInsertionPoint()) {
            return true;
        }
        return Boolean(node.childNodeCount()) && !ElementsTreeElement.canShowInlineText(node);
    }
    createExpandAllButtonTreeElement(treeElement) {
        const button = UI.UIUtils.createTextButton('', handleLoadAllChildren.bind(this));
        button.value = '';
        const expandAllButtonElement = new UI.TreeOutline.TreeElement(button);
        expandAllButtonElement.selectable = false;
        expandAllButtonElement.button = button;
        return expandAllButtonElement;
        function handleLoadAllChildren(event) {
            const visibleChildCount = this.visibleChildren(treeElement.node()).length;
            this.setExpandedChildrenLimit(treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + InitialChildrenLimit));
            event.consume();
        }
    }
    setExpandedChildrenLimit(treeElement, expandedChildrenLimit) {
        if (treeElement.expandedChildrenLimit() === expandedChildrenLimit) {
            return;
        }
        treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
        if (treeElement.treeOutline && !this.treeElementsBeingUpdated.has(treeElement)) {
            this.updateModifiedParentNode(treeElement.node());
        }
    }
    updateChildren(treeElement) {
        if (!treeElement.isExpandable()) {
            if (!treeElement.treeOutline) {
                return;
            }
            const selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
            if (selectedTreeElement?.hasAncestor(treeElement)) {
                treeElement.select(true);
            }
            treeElement.removeChildren();
            return;
        }
        console.assert(!treeElement.isClosingTag());
        this.#updateChildren(treeElement);
    }
    insertChildElement(treeElement, child, index, isClosingTag) {
        const newElement = this.createElementTreeElement(child, isClosingTag);
        treeElement.insertChild(newElement, index);
        return newElement;
    }
    moveChild(treeElement, child, targetIndex) {
        if (treeElement.indexOfChild(child) === targetIndex) {
            return;
        }
        const wasSelected = child.selected;
        if (child.parent) {
            child.parent.removeChild(child);
        }
        treeElement.insertChild(child, targetIndex);
        if (wasSelected) {
            child.select();
        }
    }
    #updateChildren(treeElement) {
        if (this.treeElementsBeingUpdated.has(treeElement)) {
            return;
        }
        this.treeElementsBeingUpdated.add(treeElement);
        const node = treeElement.node();
        const visibleChildren = this.visibleChildren(node);
        const visibleChildrenSet = new Set(visibleChildren);
        // Remove any tree elements that no longer have this node as their parent and save
        // all existing elements that could be reused. This also removes closing tag element.
        const existingTreeElements = new Map();
        for (let i = treeElement.childCount() - 1; i >= 0; --i) {
            const existingTreeElement = treeElement.childAt(i);
            if (!(existingTreeElement instanceof ElementsTreeElement)) {
                // Remove expand all button and shadow host toolbar.
                treeElement.removeChildAtIndex(i);
                continue;
            }
            const elementsTreeElement = (existingTreeElement);
            const existingNode = elementsTreeElement.node();
            if (visibleChildrenSet.has(existingNode)) {
                existingTreeElements.set(existingNode, existingTreeElement);
                continue;
            }
            treeElement.removeChildAtIndex(i);
        }
        // Insert child nodes.
        for (let i = 0; i < visibleChildren.length && i < treeElement.expandedChildrenLimit(); ++i) {
            const child = visibleChildren[i];
            const existingTreeElement = existingTreeElements.get(child) || this.findTreeElement(child);
            if (existingTreeElement && existingTreeElement !== treeElement) {
                // If an existing element was found, just move it.
                this.moveChild(treeElement, existingTreeElement, i);
            }
            else {
                // No existing element found, insert a new element.
                const newElement = this.insertChildElement(treeElement, child, i);
                if (this.updateRecordForHighlight(node) && treeElement.expanded && newElement instanceof ElementsTreeElement) {
                    ElementsTreeElement.animateOnDOMUpdate(newElement);
                }
                // If a node was inserted in the middle of existing list dynamically we might need to increase the limit.
                if (treeElement.childCount() > treeElement.expandedChildrenLimit()) {
                    this.setExpandedChildrenLimit(treeElement, treeElement.expandedChildrenLimit() + 1);
                }
            }
        }
        // Update expand all button.
        const expandedChildCount = treeElement.childCount();
        if (visibleChildren.length > expandedChildCount) {
            const targetButtonIndex = expandedChildCount;
            if (!treeElement.expandAllButtonElement) {
                treeElement.expandAllButtonElement = this.createExpandAllButtonTreeElement(treeElement);
            }
            treeElement.insertChild(treeElement.expandAllButtonElement, targetButtonIndex);
            treeElement.expandAllButtonElement.title =
                i18nString(UIStrings.showAllNodesDMore, { PH1: visibleChildren.length - expandedChildCount });
        }
        else if (treeElement.expandAllButtonElement) {
            treeElement.expandAllButtonElement = null;
        }
        // Insert shortcuts to distributed children.
        if (node.isInsertionPoint()) {
            for (const distributedNode of node.distributedNodes()) {
                treeElement.appendChild(new ShortcutTreeElement(distributedNode));
            }
        }
        // Insert close tag.
        if (node.nodeType() === Node.ELEMENT_NODE && !node.pseudoType() && treeElement.isExpandable()) {
            this.insertChildElement(treeElement, node, treeElement.childCount(), true);
        }
        if (node instanceof SDK.DOMModel.DOMDocument && !this.isXMLMimeType) {
            let topLayerContainer = this.#topLayerContainerByDocument.get(node);
            if (!topLayerContainer) {
                topLayerContainer = new TopLayerContainer(this, node);
                this.#topLayerContainerByDocument.set(node, topLayerContainer);
            }
            treeElement.appendChild(topLayerContainer);
        }
        this.treeElementsBeingUpdated.delete(treeElement);
    }
    markersChanged(event) {
        const node = event.data;
        const treeElement = this.treeElementByNode.get(node);
        if (treeElement) {
            treeElement.updateDecorations();
        }
    }
    scrollableFlagUpdated(event) {
        let { node } = event.data;
        if (node.nodeName() === '#document') {
            // We show the scroll badge of the document on the <html> element.
            if (!node.ownerDocument?.documentElement) {
                return;
            }
            node = node.ownerDocument.documentElement;
        }
        const treeElement = this.treeElementByNode.get(node);
        if (treeElement && isOpeningTag(treeElement.tagTypeContext)) {
            void treeElement.updateScrollAdorner();
        }
    }
    affectedByStartingStylesFlagUpdated(event) {
        const { node } = event.data;
        const treeElement = this.treeElementByNode.get(node);
        if (treeElement && isOpeningTag(treeElement.tagTypeContext)) {
            void treeElement.updateStyleAdorners();
            void treeElement.updateAdorners();
        }
    }
}
(function (ElementsTreeOutline) {
    let Events;
    (function (Events) {
        /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
        Events["SelectedNodeChanged"] = "SelectedNodeChanged";
        Events["ElementsTreeUpdated"] = "ElementsTreeUpdated";
        /* eslint-enable @typescript-eslint/naming-convention */
    })(Events = ElementsTreeOutline.Events || (ElementsTreeOutline.Events = {}));
})(ElementsTreeOutline || (ElementsTreeOutline = {}));
// clang-format off
export const MappedCharToEntity = new Map([
    ['\xA0', 'nbsp'],
    ['\xAD', 'shy'],
    ['\u2002', 'ensp'],
    ['\u2003', 'emsp'],
    ['\u2009', 'thinsp'],
    ['\u200A', 'hairsp'],
    ['\u200B', 'ZeroWidthSpace'],
    ['\u200C', 'zwnj'],
    ['\u200D', 'zwj'],
    ['\u200E', 'lrm'],
    ['\u200F', 'rlm'],
    ['\u202A', '#x202A'],
    ['\u202B', '#x202B'],
    ['\u202C', '#x202C'],
    ['\u202D', '#x202D'],
    ['\u202E', '#x202E'],
    ['\u2060', 'NoBreak'],
    ['\uFEFF', '#xFEFF'],
]);
//# sourceMappingURL=ElementsTreeOutline.js.map