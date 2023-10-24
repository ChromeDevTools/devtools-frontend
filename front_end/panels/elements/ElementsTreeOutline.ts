// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Adorners from '../../ui/components/adorners/adorners.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import {IssuesPane} from '../issues/IssuesPane.js';

import * as ElementsComponents from './components/components.js';
import {ElementsPanel} from './ElementsPanel.js';
import {ElementsTreeElement, InitialChildrenLimit} from './ElementsTreeElement.js';
import elementsTreeOutlineStyles from './elementsTreeOutline.css.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {type MarkerDecoratorRegistration} from './MarkerDecorator.js';
import {TopLayerContainer} from './TopLayerContainer.js';

const UIStrings = {
  /**
   *@description ARIA accessible name in Elements Tree Outline of the Elements panel
   */
  pageDom: 'Page DOM',
  /**
   *@description A context menu item to store a value as a global variable the Elements Panel
   */
  storeAsGlobalVariable: 'Store as global variable',
  /**
   *@description Tree element expand all button element button text content in Elements Tree Outline of the Elements panel
   *@example {3} PH1
   */
  showAllNodesDMore: 'Show All Nodes ({PH1} More)',
  /**
   *@description Link text content in Elements Tree Outline of the Elements panel
   */
  reveal: 'reveal',
  /**
   * @description A context menu item to open the badge settings pane
   */
  adornerSettings: 'Badge settings\u2026',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsTreeOutline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const elementsTreeOutlineByDOMModel = new WeakMap<SDK.DOMModel.DOMModel, ElementsTreeOutline>();

const populatedTreeElements = new Set<ElementsTreeElement>();

export class ElementsTreeOutline extends
    Common.ObjectWrapper.eventMixin<ElementsTreeOutline.EventTypes, typeof UI.TreeOutline.TreeOutline>(
        UI.TreeOutline.TreeOutline) {
  treeElementByNode: WeakMap<SDK.DOMModel.DOMNode, ElementsTreeElement>;
  private readonly shadowRoot: ShadowRoot;
  readonly elementInternal: HTMLElement;
  private includeRootDOMNode: boolean;
  private selectEnabled: boolean|undefined;
  private rootDOMNodeInternal: SDK.DOMModel.DOMNode|null;
  selectedDOMNodeInternal: SDK.DOMModel.DOMNode|null;
  private visible: boolean;
  private readonly imagePreviewPopover: ImagePreviewPopover;
  private updateRecords: Map<SDK.DOMModel.DOMNode, UpdateRecord>;
  private treeElementsBeingUpdated: Set<ElementsTreeElement>;
  decoratorExtensions: MarkerDecoratorRegistration[]|null;
  private showHTMLCommentsSetting: Common.Settings.Setting<boolean>;
  private multilineEditing?: MultilineEditorController|null;
  private visibleWidthInternal?: number;
  private clipboardNodeData?: ClipboardData;
  private isXMLMimeTypeInternal?: boolean|null;
  suppressRevealAndSelect: boolean = false;
  private previousHoveredElement?: UI.TreeOutline.TreeElement;
  private treeElementBeingDragged?: ElementsTreeElement;
  private dragOverTreeElement?: ElementsTreeElement;
  private updateModifiedNodesTimeout?: number;
  #genericIssues: Array<IssuesManager.GenericIssue.GenericIssue> = [];
  #topLayerContainerByParent: Map<UI.TreeOutline.TreeElement, TopLayerContainer> = new Map();
  #issuesManager?: IssuesManager.IssuesManager.IssuesManager;
  #popupHelper?: UI.PopoverHelper.PopoverHelper;
  #nodeElementToIssue: Map<Element, IssuesManager.GenericIssue.GenericIssue> = new Map();

  constructor(omitRootDOMNode?: boolean, selectEnabled?: boolean, hideGutter?: boolean) {
    super();

    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HIGHLIGHT_ERRORS_ELEMENTS_PANEL)) {
      this.#issuesManager = IssuesManager.IssuesManager.IssuesManager.instance();
      this.#issuesManager.addEventListener(
          IssuesManager.IssuesManager.Events.IssueAdded, this.#onIssueEventReceived, this);
      for (const issue of this.#issuesManager.issues()) {
        if (issue instanceof IssuesManager.GenericIssue.GenericIssue) {
          this.#onIssueAdded(issue);
        }
      }
    }

    this.treeElementByNode = new WeakMap();
    const shadowContainer = document.createElement('div');
    this.shadowRoot = UI.Utils.createShadowRootWithCoreStyles(
        shadowContainer,
        {cssFile: [elementsTreeOutlineStyles, CodeHighlighter.Style.default], delegatesFocus: undefined});
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
    this.element.setAttribute('jslog', `${VisualLogging.elementsTreeOutline()}`);

    this.includeRootDOMNode = !omitRootDOMNode;
    this.selectEnabled = selectEnabled;
    this.rootDOMNodeInternal = null;
    this.selectedDOMNodeInternal = null;

    this.visible = false;

    this.imagePreviewPopover = new ImagePreviewPopover(
        this.contentElement,
        event => {
          let link: (Element|null) = (event.target as Element | null);
          while (link && !ImagePreviewPopover.getImageURL(link)) {
            link = link.parentElementOrShadowHost();
          }
          return link;
        },
        link => {
          const listItem = UI.UIUtils.enclosingNodeOrSelfWithNodeName(link, 'li');
          if (!listItem) {
            return null;
          }

          const treeElement =
              (UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(listItem) as ElementsTreeElement | undefined);
          if (!treeElement) {
            return null;
          }
          return treeElement.node();
        });

    this.updateRecords = new Map();
    this.treeElementsBeingUpdated = new Set();

    this.decoratorExtensions = null;

    this.showHTMLCommentsSetting = Common.Settings.Settings.instance().moduleSetting('showHTMLComments');
    this.showHTMLCommentsSetting.addChangeListener(this.onShowHTMLCommentsChange.bind(this));
    this.setUseLightSelectionColor(true);
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HIGHLIGHT_ERRORS_ELEMENTS_PANEL)) {
      this.#popupHelper = new UI.PopoverHelper.PopoverHelper(this.elementInternal, event => {
        const hoveredNode = event.composedPath()[0] as Element;
        if (!hoveredNode || !hoveredNode.matches('.violating-element')) {
          return null;
        }

        const issue = this.#nodeElementToIssue.get(hoveredNode);
        if (!issue) {
          return null;
        }
        const issueDetails = issue.details();

        const tooltipTitle = this.#issueCodeToTooltipTitle(issueDetails.errorType);
        const issueKindIcon = new IconButton.Icon.Icon();
        issueKindIcon.data = IssueCounter.IssueCounter.getIssueKindIconData(issue.getKind());
        issueKindIcon.style.cursor = 'pointer';
        const viewIssueElement = document.createElement('a');
        viewIssueElement.href = '#';
        viewIssueElement.textContent = 'View issue:';

        const issueTitle = document.createElement('span');
        issueTitle.textContent = tooltipTitle;

        const element = document.createElement('div');
        element.appendChild(issueKindIcon);
        element.appendChild(viewIssueElement);
        element.appendChild(issueTitle);
        element.style.display = 'flex';
        element.style.alignItems = 'center';
        element.style.gap = '5px';

        return {
          box: hoveredNode.boxInWindow(),
          show: async(popover: UI.GlassPane.GlassPane): Promise<boolean> => {
            popover.setIgnoreLeftMargin(true);
            const openIssueEvent = (): void => {
              void UI.ViewManager.ViewManager.instance().showView('issues-pane');
              void IssuesPane.instance().reveal(issue);
            };
            viewIssueElement.addEventListener('click', () => openIssueEvent());
            issueKindIcon.addEventListener('click', () => openIssueEvent());
            popover.contentElement.appendChild(element);
            return true;
          },
        };
      });
      this.#popupHelper.setTimeout(300);
      this.#popupHelper.setHasPadding(true);
    }
  }

  #issueCodeToTooltipTitle(errorType: Protocol.Audits.GenericIssueErrorType): string {
    switch (errorType) {
      case Protocol.Audits.GenericIssueErrorType.FormLabelForNameError:
        return 'Incorrect use of <label for=FORM_ELEMENT>';
      case Protocol.Audits.GenericIssueErrorType.FormDuplicateIdForInputError:
        return 'Duplicate form field id in the same form';
      case Protocol.Audits.GenericIssueErrorType.FormInputWithNoLabelError:
        return 'Form field without valid aria-labelledby attribute or associated label';
      case Protocol.Audits.GenericIssueErrorType.FormAutocompleteAttributeEmptyError:
        return 'Incorrect use of autocomplete attribute';
      case Protocol.Audits.GenericIssueErrorType.FormEmptyIdAndNameAttributesForInputError:
        return 'A form field element should have an id or name attribute';
      case Protocol.Audits.GenericIssueErrorType.FormAriaLabelledByToNonExistingId:
        return 'An aria-labelledby attribute doesn\'t match any element id';
      case Protocol.Audits.GenericIssueErrorType.FormInputAssignedAutocompleteValueToIdOrNameAttributeError:
        return 'An element doesn\'t have an autocomplete attribute';
      case Protocol.Audits.GenericIssueErrorType.FormLabelHasNeitherForNorNestedInput:
        return 'No label associated with a form field';
      case Protocol.Audits.GenericIssueErrorType.FormLabelForMatchesNonExistingIdError:
        return 'Incorrect use of <label for=FORM_ELEMENT>';
      case Protocol.Audits.GenericIssueErrorType.FormInputHasWrongButWellIntendedAutocompleteValueError:
        return 'Non-standard autocomplete attribute value';
      default:
        return '';
    }
  }

  static forDOMModel(domModel: SDK.DOMModel.DOMModel): ElementsTreeOutline|null {
    return elementsTreeOutlineByDOMModel.get(domModel) || null;
  }

  async #onIssueEventReceived(event: Common.EventTarget.EventTargetEvent<IssuesManager.IssuesManager.IssueAddedEvent>):
      Promise<void> {
    if (event.data.issue instanceof IssuesManager.GenericIssue.GenericIssue) {
      this.#onIssueAdded(event.data.issue);
      await this.#addTreeElementIssue(event.data.issue);
    }
  }

  #onIssueAdded(issue: IssuesManager.GenericIssue.GenericIssue): void {
    this.#genericIssues.push(issue);
  }

  #addAllElementIssues(): void {
    for (const issue of this.#genericIssues) {
      void this.#addTreeElementIssue(issue);
    }
  }

  async #addTreeElementIssue(issue: IssuesManager.GenericIssue.GenericIssue): Promise<void> {
    const issueDetails = issue.details();

    const tooltipTitle = this.#issueCodeToTooltipTitle(issueDetails.errorType);
    if (!tooltipTitle) {
      return;
    }
    if (!this.rootDOMNode || !issueDetails.violatingNodeId) {
      return;
    }
    const deferredDOMNode =
        new SDK.DOMModel.DeferredDOMNode(this.rootDOMNode.domModel().target(), issueDetails.violatingNodeId);
    const node = await deferredDOMNode.resolvePromise();

    if (!node) {
      return;
    }

    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.addIssue(issue);
      const treeElementNodeElementsToIssue = treeElement.issuesByNodeElement;
      // This element could be the treeElement tags name or an attribute.
      for (const [element, issue] of treeElementNodeElementsToIssue) {
        this.#nodeElementToIssue.set(element, issue);
      }
    }
  }

  private onShowHTMLCommentsChange(): void {
    const selectedNode = this.selectedDOMNode();
    if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.showHTMLCommentsSetting.get()) {
      this.selectDOMNode(selectedNode.parentNode);
    }
    this.update();
  }

  setWordWrap(wrap: boolean): void {
    this.elementInternal.classList.toggle('elements-tree-nowrap', !wrap);
  }

  setMultilineEditing(multilineEditing: MultilineEditorController|null): void {
    this.multilineEditing = multilineEditing;
  }

  visibleWidth(): number {
    return this.visibleWidthInternal || 0;
  }

  setVisibleWidth(width: number): void {
    this.visibleWidthInternal = width;
    if (this.multilineEditing) {
      this.multilineEditing.resize();
    }
  }

  private setClipboardData(data: ClipboardData|null): void {
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

  resetClipboardIfNeeded(removedNode: SDK.DOMModel.DOMNode): void {
    if (this.clipboardNodeData && this.clipboardNodeData.node === removedNode) {
      this.setClipboardData(null);
    }
  }

  private onBeforeCopy(event: Event): void {
    event.handled = true;
  }

  private onCopyOrCut(isCut: boolean, event: Event): void {
    this.setClipboardData(null);
    // @ts-ignore this bound in the main entry point
    const originalEvent = event['original'];

    if (!originalEvent || !originalEvent.target) {
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

  performCopyOrCut(isCut: boolean, node: SDK.DOMModel.DOMNode|null): void {
    if (!node) {
      return;
    }
    if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
      return;
    }

    void node.copyNode();
    this.setClipboardData({node: node, isCut: isCut});
  }

  canPaste(targetNode: SDK.DOMModel.DOMNode): boolean {
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

  pasteNode(targetNode: SDK.DOMModel.DOMNode): void {
    if (this.canPaste(targetNode)) {
      this.performPaste(targetNode);
    }
  }

  duplicateNode(targetNode: SDK.DOMModel.DOMNode): void {
    this.performDuplicate(targetNode);
  }

  private onPaste(event: Event): void {
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

  private performPaste(targetNode: SDK.DOMModel.DOMNode): void {
    if (!this.clipboardNodeData) {
      return;
    }
    if (this.clipboardNodeData.isCut) {
      this.clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
      this.setClipboardData(null);
    } else {
      this.clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
    }

    function expandCallback(
        this: ElementsTreeOutline, error: string|null, pastedNode: SDK.DOMModel.DOMNode|null): void {
      if (error || !pastedNode) {
        return;
      }
      this.selectDOMNode(pastedNode);
    }
  }

  private performDuplicate(targetNode: SDK.DOMModel.DOMNode): void {
    if (targetNode.isInShadowTree()) {
      return;
    }

    const parentNode = targetNode.parentNode ? targetNode.parentNode : targetNode;
    if (parentNode.nodeName() === '#document') {
      return;
    }

    targetNode.copyTo(parentNode, targetNode.nextSibling);
  }

  setVisible(visible: boolean): void {
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

  get rootDOMNode(): SDK.DOMModel.DOMNode|null {
    return this.rootDOMNodeInternal;
  }

  set rootDOMNode(x: SDK.DOMModel.DOMNode|null) {
    if (this.rootDOMNodeInternal === x) {
      return;
    }

    this.rootDOMNodeInternal = x;

    this.isXMLMimeTypeInternal = x && x.isXMLNode();

    this.update();
  }

  get isXMLMimeType(): boolean {
    return Boolean(this.isXMLMimeTypeInternal);
  }

  selectedDOMNode(): SDK.DOMModel.DOMNode|null {
    return this.selectedDOMNodeInternal;
  }

  selectDOMNode(node: SDK.DOMModel.DOMNode|null, focus?: boolean): void {
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

  editing(): boolean {
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

  update(): void {
    const selectedNode = this.selectedDOMNode();
    this.removeChildren();
    if (!this.rootDOMNode) {
      return;
    }

    if (this.includeRootDOMNode) {
      const treeElement = this.createElementTreeElement(this.rootDOMNode);
      this.appendChild(treeElement);
    } else {
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

  selectedNodeChanged(focus: boolean): void {
    this.dispatchEventToListeners(
        ElementsTreeOutline.Events.SelectedNodeChanged, {node: this.selectedDOMNodeInternal, focus: focus});
  }

  private fireElementsTreeUpdated(nodes: SDK.DOMModel.DOMNode[]): void {
    this.dispatchEventToListeners(ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
  }

  findTreeElement(node: SDK.DOMModel.DOMNode): ElementsTreeElement|null {
    let treeElement = this.lookUpTreeElement(node);
    if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
      // The text node might have been inlined if it was short, so try to find the parent element.
      treeElement = this.lookUpTreeElement(node.parentNode);
    }

    return treeElement as ElementsTreeElement | null;
  }

  private lookUpTreeElement(node: SDK.DOMModel.DOMNode|null): UI.TreeOutline.TreeElement|null {
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
      if (this.treeElementByNode.has(currentNode)) {  // stop climbing as soon as we hit
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
        void treeElement.onpopulate();  // fill the cache with the children of treeElement
        if (child.index && child.index >= treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, child.index + 1);
        }
      }
    }

    return this.treeElementByNode.get(node) || null;
  }

  createTreeElementFor(node: SDK.DOMModel.DOMNode): ElementsTreeElement|null {
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

  private revealAndSelectNode(node: SDK.DOMModel.DOMNode|null, omitFocus: boolean): void {
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

  treeElementFromEventInternal(event: MouseEvent): UI.TreeOutline.TreeElement|null {
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
    } else {
      element = this.treeElementFromPoint(x, y + 2);
    }

    return element;
  }

  private onfocusout(_event: Event): void {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  private onmousedown(event: MouseEvent): void {
    const element = this.treeElementFromEventInternal(event);
    if (element) {
      element.select();
    }
  }

  setHoverEffect(treeElement: UI.TreeOutline.TreeElement|null): void {
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

  private onmousemove(event: MouseEvent): void {
    const element = this.treeElementFromEventInternal(event);
    if (element && this.previousHoveredElement === element) {
      return;
    }

    this.setHoverEffect(element);
    this.highlightTreeElement(
        (element as UI.TreeOutline.TreeElement), !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event));
  }

  private highlightTreeElement(element: UI.TreeOutline.TreeElement, showInfo: boolean): void {
    if (element instanceof ElementsTreeElement) {
      element.node().domModel().overlayModel().highlightInOverlay(
          {node: element.node(), selectorList: undefined}, 'all', showInfo);
      return;
    }

    if (element instanceof ShortcutTreeElement) {
      element.domModel().overlayModel().highlightInOverlay(
          {deferredNode: element.deferredNode(), selectorList: undefined}, 'all', showInfo);
    }
  }

  private onmouseleave(_event: MouseEvent): void {
    this.setHoverEffect(null);
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  private ondragstart(event: DragEvent): boolean|undefined {
    const node = (event.target as Node | null);
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

  private ondragover(event: DragEvent): boolean {
    if (!this.treeElementBeingDragged) {
      return false;
    }

    const treeElement = this.validDragSourceOrTarget(this.treeElementFromEventInternal(event));
    if (!treeElement) {
      return false;
    }

    let node: (SDK.DOMModel.DOMNode|null) = (treeElement.node() as SDK.DOMModel.DOMNode | null);
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

  private ondragleave(event: DragEvent): boolean {
    this.clearDragOverTreeElementMarker();
    event.preventDefault();
    return false;
  }

  private validDragSourceOrTarget(treeElement: UI.TreeOutline.TreeElement|null): ElementsTreeElement|null {
    if (!treeElement) {
      return null;
    }

    if (!(treeElement instanceof ElementsTreeElement)) {
      return null;
    }
    const elementsTreeElement = (treeElement as ElementsTreeElement);

    const node = elementsTreeElement.node();
    if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
      return null;
    }

    return elementsTreeElement;
  }

  private ondrop(event: DragEvent): void {
    event.preventDefault();
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.doMove(treeElement);
    }
  }

  private doMove(treeElement: ElementsTreeElement): void {
    if (!this.treeElementBeingDragged) {
      return;
    }

    let parentNode;
    let anchorNode;

    if (treeElement.isClosingTag()) {
      // Drop onto closing tag -> insert as last child.
      parentNode = treeElement.node();
    } else {
      const dragTargetNode = treeElement.node();
      parentNode = dragTargetNode.parentNode;
      anchorNode = dragTargetNode;
    }

    if (!parentNode || !anchorNode) {
      return;
    }
    const wasExpanded = this.treeElementBeingDragged.expanded;
    this.treeElementBeingDragged.nodeInternal.moveTo(
        parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));

    delete this.treeElementBeingDragged;
  }

  private ondragend(event: DragEvent): void {
    event.preventDefault();
    this.clearDragOverTreeElementMarker();
    delete this.treeElementBeingDragged;
  }

  private clearDragOverTreeElementMarker(): void {
    if (this.dragOverTreeElement) {
      this.dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');
      delete this.dragOverTreeElement;
    }
  }

  private contextMenuEventFired(event: MouseEvent): void {
    const treeElement = this.treeElementFromEventInternal(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.showContextMenu(treeElement, event);
    }
  }

  showContextMenu(treeElement: ElementsTreeElement, event: Event): void {
    if (UI.UIUtils.isEditing()) {
      return;
    }

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const isPseudoElement = Boolean(treeElement.node().pseudoType());
    const isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
    const node = (event.target as Node | null);
    if (!node) {
      return;
    }
    let textNode: Element|null = node.enclosingNodeOrSelfWithClass('webkit-html-text-node');
    if (textNode && textNode.classList.contains('bogus')) {
      textNode = null;
    }
    const commentNode = node.enclosingNodeOrSelfWithClass('webkit-html-comment');
    contextMenu.saveSection().appendItem(
        i18nString(UIStrings.storeAsGlobalVariable), this.saveNodeToTempVariable.bind(this, treeElement.node()));
    if (textNode) {
      treeElement.populateTextContextMenu(contextMenu, textNode);
    } else if (isTag) {
      treeElement.populateTagContextMenu(contextMenu, event);
    } else if (commentNode) {
      treeElement.populateNodeContextMenu(contextMenu);
    } else if (isPseudoElement) {
      treeElement.populateScrollIntoView(contextMenu);
    }

    contextMenu.viewSection().appendItem(i18nString(UIStrings.adornerSettings), () => {
      ElementsPanel.instance().showAdornerSettingsPane();
    });

    contextMenu.appendApplicableItems(treeElement.node());
    void contextMenu.show();
  }

  private async saveNodeToTempVariable(node: SDK.DOMModel.DOMNode): Promise<void> {
    const remoteObjectForConsole = await node.resolveToObject();
    const consoleModel = remoteObjectForConsole?.runtimeModel().target()?.model(SDK.ConsoleModel.ConsoleModel);
    await consoleModel?.saveToTempVariable(
        UI.Context.Context.instance().flavor(SDK.RuntimeModel.ExecutionContext), remoteObjectForConsole);
  }

  runPendingUpdates(): void {
    this.updateModifiedNodes();
  }

  private onKeyDown(event: Event): void {
    const keyboardEvent = (event as KeyboardEvent);
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
        node.moveTo(
            node.parentNode, node.nextSibling.nextSibling, this.selectNodeAfterEdit.bind(this, treeElement.expanded));
        keyboardEvent.consume(true);
        return;
      }
    }
  }

  toggleEditAsHTML(node: SDK.DOMModel.DOMNode, startEditing?: boolean, callback?: (() => void)): void {
    const treeElement = this.treeElementByNode.get(node);
    if (!treeElement || !treeElement.hasEditableNode()) {
      return;
    }

    if (node.pseudoType()) {
      return;
    }

    const parentNode = node.parentNode;
    const index = node.index;
    const wasExpanded = treeElement.expanded;

    treeElement.toggleEditAsHTML(editingFinished.bind(this), startEditing);

    function editingFinished(this: ElementsTreeOutline, success: boolean): void {
      if (callback) {
        callback();
      }
      if (!success) {
        return;
      }

      // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
      this.runPendingUpdates();

      if (!index) {
        return;
      }

      const children = parentNode && parentNode.children();
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

  selectNodeAfterEdit(wasExpanded: boolean, error: string|null, newNode: SDK.DOMModel.DOMNode|null): ElementsTreeElement
      |null {
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
  async toggleHideElement(node: SDK.DOMModel.DOMNode): Promise<void> {
    const pseudoType = node.pseudoType();
    const effectiveNode = pseudoType ? node.parentNode : node;
    if (!effectiveNode) {
      return;
    }

    const hidden = node.marker('hidden-marker');
    const object = await effectiveNode.resolveToObject('');

    if (!object) {
      return;
    }

    await object.callFunction(
        (toggleClassAndInjectStyleRule as (this: Object, ...arg1: unknown[]) => void),
        [{value: pseudoType}, {value: !hidden}]);
    object.release();
    node.setMarker('hidden-marker', hidden ? null : true);

    function toggleClassAndInjectStyleRule(this: Element, pseudoType: string|null, hidden: boolean): void {
      const classNamePrefix = '__web-inspector-hide';
      const classNameSuffix = '-shortcut__';
      const styleTagId = '__web-inspector-hide-shortcut-style__';
      const selectors = [];
      selectors.push('.__web-inspector-hide-shortcut__');
      selectors.push('.__web-inspector-hide-shortcut__ *');
      selectors.push('.__web-inspector-hidebefore-shortcut__::before');
      selectors.push('.__web-inspector-hideafter-shortcut__::after');
      const selector = selectors.join(', ');
      const ruleBody = '    visibility: hidden !important;';
      const rule = '\n' + selector + '\n{\n' + ruleBody + '\n}\n';
      const className = classNamePrefix + (pseudoType || '') + classNameSuffix;
      this.classList.toggle(className, hidden);

      let localRoot: Element|HTMLHeadElement = this;
      while (localRoot.parentNode) {
        localRoot = (localRoot.parentNode as Element);
      }
      if (localRoot.nodeType === Node.DOCUMENT_NODE) {
        localRoot = document.head;
      }

      let style = localRoot.querySelector('style#' + styleTagId);
      if (style) {
        return;
      }

      style = document.createElement('style');
      style.id = styleTagId;
      style.textContent = rule;

      localRoot.appendChild(style);
    }
  }

  isToggledToHidden(node: SDK.DOMModel.DOMNode): boolean {
    return Boolean(node.marker('hidden-marker'));
  }

  private reset(): void {
    this.rootDOMNode = null;
    this.selectDOMNode(null, false);
    this.imagePreviewPopover.hide();
    delete this.clipboardNodeData;
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    this.updateRecords.clear();
  }

  wireToDOMModel(domModel: SDK.DOMModel.DOMModel): void {
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
    domModel.addEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
  }

  unwireFromDOMModel(domModel: SDK.DOMModel.DOMModel): void {
    domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged, this.markersChanged, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this.nodeInserted, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved, this.nodeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, this.attributeModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved, this.attributeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified, this.characterDataModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.documentUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
    domModel.removeEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.topLayerElementsChanged, this);
    elementsTreeOutlineByDOMModel.delete(domModel);
  }

  private addUpdateRecord(node: SDK.DOMModel.DOMNode): UpdateRecord {
    let record = this.updateRecords.get(node);
    if (!record) {
      record = new UpdateRecord();
      this.updateRecords.set(node, record);
    }
    return record;
  }

  private updateRecordForHighlight(node: SDK.DOMModel.DOMNode): UpdateRecord|null {
    if (!this.visible) {
      return null;
    }
    return this.updateRecords.get(node) || null;
  }

  private documentUpdated(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMModel>): void {
    const domModel = event.data;
    this.reset();
    if (domModel.existingDocument()) {
      this.rootDOMNode = domModel.existingDocument();
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.HIGHLIGHT_ERRORS_ELEMENTS_PANEL)) {
        this.#addAllElementIssues();
      }
    }
  }

  private attributeModified(event: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}>):
      void {
    const {node} = event.data;
    this.addUpdateRecord(node).attributeModified(event.data.name);
    this.updateModifiedNodesSoon();
  }

  private attributeRemoved(event: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode, name: string}>):
      void {
    const {node} = event.data;
    this.addUpdateRecord(node).attributeRemoved(event.data.name);
    this.updateModifiedNodesSoon();
  }

  private characterDataModified(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    this.addUpdateRecord(node).charDataModified();
    // Text could be large and force us to render itself as the child in the tree outline.
    if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
      this.addUpdateRecord(node.parentNode).childrenModified();
    }
    this.updateModifiedNodesSoon();
  }

  private nodeInserted(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    this.addUpdateRecord((node.parentNode as SDK.DOMModel.DOMNode)).nodeInserted(node);
    this.updateModifiedNodesSoon();
  }

  private nodeRemoved(
      event: Common.EventTarget.EventTargetEvent<{node: SDK.DOMModel.DOMNode, parent: SDK.DOMModel.DOMNode}>): void {
    const {node, parent} = event.data;
    this.resetClipboardIfNeeded(node);
    this.addUpdateRecord(parent).nodeRemoved(node);
    this.updateModifiedNodesSoon();
  }

  private childNodeCountUpdated(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }

  private distributedNodesChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    this.addUpdateRecord(node).childrenModified();
    this.updateModifiedNodesSoon();
  }

  private updateModifiedNodesSoon(): void {
    if (!this.updateRecords.size) {
      return;
    }
    if (this.updateModifiedNodesTimeout) {
      return;
    }
    this.updateModifiedNodesTimeout = window.setTimeout(this.updateModifiedNodes.bind(this), 50);
  }

  private updateModifiedNodes(): void {
    if (this.updateModifiedNodesTimeout) {
      clearTimeout(this.updateModifiedNodesTimeout);
      delete this.updateModifiedNodesTimeout;
    }

    const updatedNodes = [...this.updateRecords.keys()];
    const hidePanelWhileUpdating = updatedNodes.length > 10;

    let treeOutlineContainerElement;
    let originalScrollTop;
    if (hidePanelWhileUpdating) {
      treeOutlineContainerElement = (this.element.parentNode as Element | null);
      originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
      this.elementInternal.classList.add('hidden');
    }
    const rootNodeUpdateRecords = this.rootDOMNodeInternal && this.updateRecords.get(this.rootDOMNodeInternal);
    if (rootNodeUpdateRecords && rootNodeUpdateRecords.hasChangedChildren()) {
      // Document's children have changed, perform total update.
      this.update();
    } else {
      for (const [node, record] of this.updateRecords) {
        if (record.hasChangedChildren()) {
          this.updateModifiedParentNode((node as SDK.DOMModel.DOMNode));
        } else {
          this.updateModifiedNode((node as SDK.DOMModel.DOMNode));
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

  private updateModifiedNode(node: SDK.DOMModel.DOMNode): void {
    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.updateTitle(this.updateRecordForHighlight(node));
    }
  }

  private updateModifiedParentNode(node: SDK.DOMModel.DOMNode): void {
    const parentTreeElement = this.findTreeElement(node);
    if (parentTreeElement) {
      parentTreeElement.setExpandable(this.hasVisibleChildren(node));
      parentTreeElement.updateTitle(this.updateRecordForHighlight(node));
      if (populatedTreeElements.has(parentTreeElement)) {
        this.updateChildren(parentTreeElement);
      }
    }
  }

  populateTreeElement(treeElement: ElementsTreeElement): Promise<void> {
    if (treeElement.childCount() || !treeElement.isExpandable()) {
      return Promise.resolve();
    }

    return new Promise<void>(resolve => {
      treeElement.node().getChildNodes(() => {
        populatedTreeElements.add(treeElement);
        this.updateModifiedParentNode(treeElement.node());
        resolve();
      });
    });
  }

  async createTopLayerContainer(parent: UI.TreeOutline.TreeElement, document: SDK.DOMModel.DOMDocument): Promise<void> {
    if (!parent.treeOutline || !(parent.treeOutline instanceof ElementsTreeOutline)) {
      return;
    }
    const container = new TopLayerContainer(parent.treeOutline, document);
    await container.throttledUpdateTopLayerElements();
    if (container.currentTopLayerDOMNodes.size > 0) {
      parent.appendChild(container);
    }
    this.#topLayerContainerByParent.set(parent, container);
  }

  private createElementTreeElement(node: SDK.DOMModel.DOMNode, isClosingTag?: boolean): ElementsTreeElement {
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

  private showChild(treeElement: ElementsTreeElement, child: SDK.DOMModel.DOMNode): ElementsTreeElement|null {
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
    return treeElement.childAt(index) as ElementsTreeElement;
  }

  private visibleChildren(node: SDK.DOMModel.DOMNode): SDK.DOMModel.DOMNode[] {
    let visibleChildren = ElementsTreeElement.visibleShadowRoots(node);

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

    const beforePseudoElement = node.beforePseudoElement();
    if (beforePseudoElement) {
      visibleChildren.push(beforePseudoElement);
    }

    if (node.childNodeCount()) {
      // Children may be stale when the outline is not wired to receive DOMModel updates.
      let children: SDK.DOMModel.DOMNode[] = node.children() || [];
      if (!this.showHTMLCommentsSetting.get()) {
        children = children.filter(n => n.nodeType() !== Node.COMMENT_NODE);
      }
      visibleChildren = visibleChildren.concat(children);
    }

    const afterPseudoElement = node.afterPseudoElement();
    if (afterPseudoElement) {
      visibleChildren.push(afterPseudoElement);
    }

    const backdropPseudoElement = node.backdropPseudoElement();
    if (backdropPseudoElement) {
      visibleChildren.push(backdropPseudoElement);
    }

    return visibleChildren;
  }

  private hasVisibleChildren(node: SDK.DOMModel.DOMNode): boolean {
    if (node.isIframe()) {
      return true;
    }
    if (node.isPortal()) {
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

  private createExpandAllButtonTreeElement(treeElement: ElementsTreeElement): UI.TreeOutline.TreeElement {
    const button = UI.UIUtils.createTextButton('', handleLoadAllChildren.bind(this));
    button.value = '';
    const expandAllButtonElement = new UI.TreeOutline.TreeElement(button);
    expandAllButtonElement.selectable = false;
    expandAllButtonElement.button = button;
    return expandAllButtonElement;

    function handleLoadAllChildren(this: ElementsTreeOutline, event: Event): void {
      const visibleChildCount = this.visibleChildren(treeElement.node()).length;
      this.setExpandedChildrenLimit(
          treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + InitialChildrenLimit));
      event.consume();
    }
  }

  setExpandedChildrenLimit(treeElement: ElementsTreeElement, expandedChildrenLimit: number): void {
    if (treeElement.expandedChildrenLimit() === expandedChildrenLimit) {
      return;
    }

    treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
    if (treeElement.treeOutline && !this.treeElementsBeingUpdated.has(treeElement)) {
      this.updateModifiedParentNode(treeElement.node());
    }
  }

  private updateChildren(treeElement: ElementsTreeElement): void {
    if (!treeElement.isExpandable()) {
      if (!treeElement.treeOutline) {
        return;
      }
      const selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
      if (selectedTreeElement && selectedTreeElement.hasAncestor(treeElement)) {
        treeElement.select(true);
      }
      treeElement.removeChildren();
      return;
    }

    console.assert(!treeElement.isClosingTag());

    this.innerUpdateChildren(treeElement);
  }

  insertChildElement(
      treeElement: ElementsTreeElement|TopLayerContainer, child: SDK.DOMModel.DOMNode, index: number,
      isClosingTag?: boolean): ElementsTreeElement {
    const newElement = this.createElementTreeElement(child, isClosingTag);
    treeElement.insertChild(newElement, index);
    if (child instanceof SDK.DOMModel.DOMDocument) {
      void this.createTopLayerContainer(newElement, child);
    }
    return newElement;
  }

  private moveChild(treeElement: ElementsTreeElement, child: ElementsTreeElement, targetIndex: number): void {
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

  private innerUpdateChildren(treeElement: ElementsTreeElement): void {
    if (this.treeElementsBeingUpdated.has(treeElement)) {
      return;
    }

    this.treeElementsBeingUpdated.add(treeElement);

    const node = treeElement.node();
    const visibleChildren = this.visibleChildren(node);
    const visibleChildrenSet = new Set<SDK.DOMModel.DOMNode>(visibleChildren);

    // Remove any tree elements that no longer have this node as their parent and save
    // all existing elements that could be reused. This also removes closing tag element.
    const existingTreeElements = new Map<SDK.DOMModel.DOMNode, UI.TreeOutline.TreeElement&ElementsTreeElement>();
    for (let i = treeElement.childCount() - 1; i >= 0; --i) {
      const existingTreeElement = treeElement.childAt(i);
      if (!(existingTreeElement instanceof ElementsTreeElement)) {
        // Remove expand all button and shadow host toolbar.
        treeElement.removeChildAtIndex(i);
        continue;
      }
      const elementsTreeElement = (existingTreeElement as ElementsTreeElement);
      const existingNode = elementsTreeElement.node();

      if (visibleChildrenSet.has(existingNode)) {
        existingTreeElements.set(existingNode, existingTreeElement);
        continue;
      }

      treeElement.removeChildAtIndex(i);
    }

    for (let i = 0; i < visibleChildren.length && i < treeElement.expandedChildrenLimit(); ++i) {
      const child = visibleChildren[i];
      const existingTreeElement = existingTreeElements.get(child) || this.findTreeElement(child);
      if (existingTreeElement && existingTreeElement !== treeElement) {
        // If an existing element was found, just move it.
        this.moveChild(treeElement, existingTreeElement, i);
      } else {
        // No existing element found, insert a new element.
        const newElement = this.insertChildElement(treeElement, child, i);
        if (this.updateRecordForHighlight(node) && treeElement.expanded) {
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
          i18nString(UIStrings.showAllNodesDMore, {PH1: visibleChildren.length - expandedChildCount});
    } else if (treeElement.expandAllButtonElement) {
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

    this.treeElementsBeingUpdated.delete(treeElement);
  }

  private markersChanged(event: Common.EventTarget.EventTargetEvent<SDK.DOMModel.DOMNode>): void {
    const node = event.data;
    const treeElement = this.treeElementByNode.get(node);
    if (treeElement) {
      treeElement.updateDecorations();
    }
  }

  private async topLayerElementsChanged(): Promise<void> {
    for (const [parent, container] of this.#topLayerContainerByParent) {
      await container.throttledUpdateTopLayerElements();
      if (container.currentTopLayerDOMNodes.size > 0 && container.parent !== parent) {
        parent.appendChild(container);
      }
      container.hidden = container.currentTopLayerDOMNodes.size === 0;
    }
  }

  private static treeOutlineSymbol = Symbol('treeOutline');
}

export namespace ElementsTreeOutline {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    SelectedNodeChanged = 'SelectedNodeChanged',
    ElementsTreeUpdated = 'ElementsTreeUpdated',
  }

  export type EventTypes = {
    [Events.SelectedNodeChanged]: {node: SDK.DOMModel.DOMNode|null, focus: boolean},
    [Events.ElementsTreeUpdated]: SDK.DOMModel.DOMNode[],
  };
}

// clang-format off
export const MappedCharToEntity = new Map<string, string>([
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
// clang-format on

export class UpdateRecord {
  private modifiedAttributes?: Set<string>;
  private removedAttributes?: Set<string>;
  private hasChangedChildrenInternal?: boolean;
  private hasRemovedChildrenInternal?: boolean;
  private charDataModifiedInternal?: boolean;

  attributeModified(attrName: string): void {
    if (this.removedAttributes && this.removedAttributes.has(attrName)) {
      this.removedAttributes.delete(attrName);
    }
    if (!this.modifiedAttributes) {
      this.modifiedAttributes = (new Set() as Set<string>);
    }
    this.modifiedAttributes.add(attrName);
  }

  attributeRemoved(attrName: string): void {
    if (this.modifiedAttributes && this.modifiedAttributes.has(attrName)) {
      this.modifiedAttributes.delete(attrName);
    }
    if (!this.removedAttributes) {
      this.removedAttributes = (new Set() as Set<string>);
    }
    this.removedAttributes.add(attrName);
  }

  nodeInserted(_node: SDK.DOMModel.DOMNode): void {
    this.hasChangedChildrenInternal = true;
  }

  nodeRemoved(_node: SDK.DOMModel.DOMNode): void {
    this.hasChangedChildrenInternal = true;
    this.hasRemovedChildrenInternal = true;
  }

  charDataModified(): void {
    this.charDataModifiedInternal = true;
  }

  childrenModified(): void {
    this.hasChangedChildrenInternal = true;
  }

  isAttributeModified(attributeName: string): boolean {
    return this.modifiedAttributes !== null && this.modifiedAttributes !== undefined &&
        this.modifiedAttributes.has(attributeName);
  }

  hasRemovedAttributes(): boolean {
    return this.removedAttributes !== null && this.removedAttributes !== undefined &&
        Boolean(this.removedAttributes.size);
  }

  isCharDataModified(): boolean {
    return Boolean(this.charDataModifiedInternal);
  }

  hasChangedChildren(): boolean {
    return Boolean(this.hasChangedChildrenInternal);
  }

  hasRemovedChildren(): boolean {
    return Boolean(this.hasRemovedChildrenInternal);
  }
}

let rendererInstance: Renderer;

export class Renderer implements UI.UIUtils.Renderer {
  static instance(opts: {
    forceNew: boolean|null,
  } = {forceNew: null}): Renderer {
    const {forceNew} = opts;
    if (!rendererInstance || forceNew) {
      rendererInstance = new Renderer();
    }
    return rendererInstance;
  }

  async render(object: Object): Promise<{
    node: Node,
    tree: UI.TreeOutline.TreeOutline|null,
  }|null> {
    let node: SDK.DOMModel.DOMNode|(SDK.DOMModel.DOMNode | null)|null = null;

    if (object instanceof SDK.DOMModel.DOMNode) {
      node = (object as SDK.DOMModel.DOMNode);
    } else if (object instanceof SDK.DOMModel.DeferredDOMNode) {
      node = await (object as SDK.DOMModel.DeferredDOMNode).resolvePromise();
    }

    if (!node) {
      // Can't render not-a-node, or couldn't resolve deferred node.
      return null;
    }

    const treeOutline = new ElementsTreeOutline(
        /* omitRootDOMNode: */ false, /* selectEnabled: */ true, /* hideGutter: */ true);
    treeOutline.rootDOMNode = node;
    const firstChild = treeOutline.firstChild();
    if (firstChild && !firstChild.isExpandable()) {
      treeOutline.element.classList.add('single-node');
    }
    treeOutline.setVisible(true);
    // @ts-ignore used in console_test_runner
    treeOutline.element.treeElementForTest = firstChild;
    treeOutline.setShowSelectionOnKeyboardFocus(/* show: */ true, /* preventTabOrder: */ true);
    return {node: treeOutline.element, tree: treeOutline};
  }
}

export class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
  private readonly nodeShortcut: SDK.DOMModel.DOMNodeShortcut;
  private hoveredInternal?: boolean;
  constructor(nodeShortcut: SDK.DOMModel.DOMNodeShortcut) {
    super('');
    this.listItemElement.createChild('div', 'selection fill');
    const title = this.listItemElement.createChild('span', 'elements-tree-shortcut-title');
    let text = nodeShortcut.nodeName.toLowerCase();
    if (nodeShortcut.nodeType === Node.ELEMENT_NODE) {
      text = '<' + text + '>';
    }
    title.textContent = '\u21AA ' + text;
    this.nodeShortcut = nodeShortcut;
    this.addRevealAdorner();
  }

  addRevealAdorner(): void {
    const adorner = new Adorners.Adorner.Adorner();
    adorner.classList.add('adorner-reveal');
    const config = ElementsComponents.AdornerManager.getRegisteredAdorner(
        ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL);
    const name = config.name;
    const adornerContent = document.createElement('span');
    const linkIcon = new IconButton.Icon.Icon();
    linkIcon.data = {iconName: 'select-element', color: 'var(--icon-default)', width: '14px', height: '14px'};
    const slotText = document.createElement('span');
    slotText.textContent = name;
    adornerContent.append(linkIcon);
    adornerContent.append(slotText);
    adornerContent.classList.add('adorner-with-icon');
    adorner.data = {
      name,
      content: adornerContent,
    };
    this.listItemElement.appendChild(adorner);
    const onClick = (((): void => {
                       Host.userMetrics.badgeActivated(Host.UserMetrics.BadgeType.REVEAL);
                       this.nodeShortcut.deferredNode.resolve(
                           node => {
                             void Common.Revealer.reveal(node);
                           },
                       );
                     }) as EventListener);
    adorner.addInteraction(onClick, {
      isToggle: false,
      shouldPropagateOnKeydown: false,
      ariaLabelDefault: i18nString(UIStrings.reveal),
      ariaLabelActive: i18nString(UIStrings.reveal),
    });
    adorner.addEventListener('mousedown', e => e.consume(), false);
    ElementsPanel.instance().registerAdorner(adorner);
  }

  get hovered(): boolean {
    return Boolean(this.hoveredInternal);
  }

  set hovered(x: boolean) {
    if (this.hoveredInternal === x) {
      return;
    }
    this.hoveredInternal = x;
    this.listItemElement.classList.toggle('hovered', x);
  }

  deferredNode(): SDK.DOMModel.DeferredDOMNode {
    return this.nodeShortcut.deferredNode;
  }

  domModel(): SDK.DOMModel.DOMModel {
    return this.nodeShortcut.deferredNode.domModel();
  }

  private setLeftIndentOverlay(): void {
    // We use parent's `--indent` value and add 24px to account for an extra level of indent.
    let indent = 24;
    if (this.parent && this.parent instanceof ElementsTreeElement) {
      const parentIndent = parseFloat(this.parent.listItemElement.style.getPropertyValue('--indent')) || 0;
      indent += parentIndent;
    }
    this.listItemElement.style.setProperty('--indent', indent + 'px');
  }

  override onattach(): void {
    this.setLeftIndentOverlay();
  }

  override onselect(selectedByUser?: boolean): boolean {
    if (!selectedByUser) {
      return true;
    }
    this.nodeShortcut.deferredNode.highlight();
    this.nodeShortcut.deferredNode.resolve(resolved.bind(this));
    function resolved(this: ShortcutTreeElement, node: SDK.DOMModel.DOMNode|null): void {
      if (node && this.treeOutline instanceof ElementsTreeOutline) {
        this.treeOutline.selectedDOMNodeInternal = node;
        this.treeOutline.selectedNodeChanged(false);
      }
    }
    return true;
  }
}

export interface MultilineEditorController {
  cancel: () => void;
  commit: () => void;
  resize: () => void;
}

export interface ClipboardData {
  node: SDK.DOMModel.DOMNode;
  isCut: boolean;
}
