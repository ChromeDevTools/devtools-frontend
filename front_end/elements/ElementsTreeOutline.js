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

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';  // eslint-disable-line no-unused-vars
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

import {linkifyDeferredNodeReference} from './DOMLinkifier.js';
import {ElementsTreeElement, HrefSymbol, InitialChildrenLimit} from './ElementsTreeElement.js';

/**
 * @unrestricted
 */
export class ElementsTreeOutline extends UI.TreeOutline.TreeOutline {
  /**
   * @param {boolean=} omitRootDOMNode
   * @param {boolean=} selectEnabled
   * @param {boolean=} hideGutter
   */
  constructor(omitRootDOMNode, selectEnabled, hideGutter) {
    super();

    this._treeElementSymbol = Symbol('treeElement');
    const shadowContainer = createElement('div');
    this._shadowRoot = UI.Utils.createShadowRootWithCoreStyles(shadowContainer, 'elements/elementsTreeOutline.css');
    const outlineDisclosureElement = this._shadowRoot.createChild('div', 'elements-disclosure');

    this._element = this.element;
    this._element.classList.add('elements-tree-outline', 'source-code');
    if (hideGutter) {
      this._element.classList.add('elements-hide-gutter');
    }
    UI.ARIAUtils.setAccessibleName(this._element, Common.UIString.UIString('Page DOM'));
    this._element.addEventListener('focusout', this._onfocusout.bind(this), false);
    this._element.addEventListener('mousedown', this._onmousedown.bind(this), false);
    this._element.addEventListener('mousemove', this._onmousemove.bind(this), false);
    this._element.addEventListener('mouseleave', this._onmouseleave.bind(this), false);
    this._element.addEventListener('dragstart', this._ondragstart.bind(this), false);
    this._element.addEventListener('dragover', this._ondragover.bind(this), false);
    this._element.addEventListener('dragleave', this._ondragleave.bind(this), false);
    this._element.addEventListener('drop', this._ondrop.bind(this), false);
    this._element.addEventListener('dragend', this._ondragend.bind(this), false);
    this._element.addEventListener('contextmenu', this._contextMenuEventFired.bind(this), false);
    this._element.addEventListener('clipboard-beforecopy', this._onBeforeCopy.bind(this), false);
    this._element.addEventListener('clipboard-copy', this._onCopyOrCut.bind(this, false), false);
    this._element.addEventListener('clipboard-cut', this._onCopyOrCut.bind(this, true), false);
    this._element.addEventListener('clipboard-paste', this._onPaste.bind(this), false);
    this._element.addEventListener('keydown', this._onKeyDown.bind(this), false);

    outlineDisclosureElement.appendChild(this._element);
    this.element = shadowContainer;

    this._includeRootDOMNode = !omitRootDOMNode;
    this._selectEnabled = selectEnabled;
    /** @type {?SDK.DOMModel.DOMNode} */
    this._rootDOMNode = null;
    /** @type {?SDK.DOMModel.DOMNode} */
    this._selectedDOMNode = null;

    this._visible = false;

    this._popoverHelper = new UI.PopoverHelper.PopoverHelper(this._element, this._getPopoverRequest.bind(this));
    this._popoverHelper.setHasPadding(true);
    this._popoverHelper.setTimeout(0, 100);

    /** @type {!Map<!SDK.DOMModel.DOMNode, !UpdateRecord>} */
    this._updateRecords = new Map();
    /** @type {!Set<!ElementsTreeElement>} */
    this._treeElementsBeingUpdated = new Set();

    this._showHTMLCommentsSetting = Common.Settings.Settings.instance().moduleSetting('showHTMLComments');
    this._showHTMLCommentsSetting.addChangeListener(this._onShowHTMLCommentsChange.bind(this));
    this.useLightSelectionColor();
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   * @return {?ElementsTreeOutline}
   */
  static forDOMModel(domModel) {
    return domModel[ElementsTreeOutline._treeOutlineSymbol] || null;
  }

  _onShowHTMLCommentsChange() {
    const selectedNode = this.selectedDOMNode();
    if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this._showHTMLCommentsSetting.get()) {
      this.selectDOMNode(selectedNode.parentNode);
    }
    this.update();
  }

  /**
   * @return {symbol}
   */
  treeElementSymbol() {
    return this._treeElementSymbol;
  }


  /**
   * @param {boolean} wrap
   */
  setWordWrap(wrap) {
    this._element.classList.toggle('elements-tree-nowrap', !wrap);
  }

  /**
   * @param {?MultilineEditorController} multilineEditing
   */
  setMultilineEditing(multilineEditing) {
    this._multilineEditing = multilineEditing;
  }

  /**
   * @return {number}
   */
  visibleWidth() {
    return this._visibleWidth;
  }

  /**
   * @param {number} width
   */
  setVisibleWidth(width) {
    this._visibleWidth = width;
    if (this._multilineEditing) {
      this._multilineEditing.resize();
    }
  }

  /**
   * @param {?ClipboardData} data
   */
  _setClipboardData(data) {
    if (this._clipboardNodeData) {
      const treeElement = this.findTreeElement(this._clipboardNodeData.node);
      if (treeElement) {
        treeElement.setInClipboard(false);
      }
      delete this._clipboardNodeData;
    }

    if (data) {
      const treeElement = this.findTreeElement(data.node);
      if (treeElement) {
        treeElement.setInClipboard(true);
      }
      this._clipboardNodeData = data;
    }
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} removedNode
   */
  resetClipboardIfNeeded(removedNode) {
    if (this._clipboardNodeData && this._clipboardNodeData.node === removedNode) {
      this._setClipboardData(null);
    }
  }

  /**
   * @param {!Event} event
   */
  _onBeforeCopy(event) {
    event.handled = true;
  }

  /**
   * @param {boolean} isCut
   * @param {!Event} event
   */
  _onCopyOrCut(isCut, event) {
    this._setClipboardData(null);
    const originalEvent = event['original'];

    // Don't prevent the normal copy if the user has a selection.
    if (originalEvent.target.hasSelection()) {
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

    originalEvent.clipboardData.clearData();
    event.handled = true;

    this.performCopyOrCut(isCut, targetNode);
  }

  /**
   * @param {boolean} isCut
   * @param {?SDK.DOMModel.DOMNode} node
   */
  performCopyOrCut(isCut, node) {
    if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
      return;
    }

    node.copyNode();
    this._setClipboardData({node: node, isCut: isCut});
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} targetNode
   * @return {boolean}
   */
  canPaste(targetNode) {
    if (targetNode.isShadowRoot() || targetNode.ancestorUserAgentShadowRoot()) {
      return false;
    }

    if (!this._clipboardNodeData) {
      return false;
    }

    const node = this._clipboardNodeData.node;
    if (this._clipboardNodeData.isCut && (node === targetNode || node.isAncestor(targetNode))) {
      return false;
    }

    if (targetNode.domModel() !== node.domModel()) {
      return false;
    }
    return true;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} targetNode
   */
  pasteNode(targetNode) {
    if (this.canPaste(targetNode)) {
      this._performPaste(targetNode);
    }
  }

  /**
   * @param {!Event} event
   */
  _onPaste(event) {
    // Do not interfere with text editing.
    if (UI.UIUtils.isEditing()) {
      return;
    }

    const targetNode = this.selectedDOMNode();
    if (!targetNode || !this.canPaste(targetNode)) {
      return;
    }

    event.handled = true;
    this._performPaste(targetNode);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} targetNode
   */
  _performPaste(targetNode) {
    if (this._clipboardNodeData.isCut) {
      this._clipboardNodeData.node.moveTo(targetNode, null, expandCallback.bind(this));
      this._setClipboardData(null);
    } else {
      this._clipboardNodeData.node.copyTo(targetNode, null, expandCallback.bind(this));
    }

    /**
     * @param {?ProtocolClient.InspectorBackend.ProtocolError} error
     * @param {!Protocol.DOM.NodeId} nodeId
     * @this {ElementsTreeOutline}
     */
    function expandCallback(error, nodeId) {
      if (error) {
        return;
      }
      const pastedNode = targetNode.domModel().nodeForId(nodeId);
      if (!pastedNode) {
        return;
      }
      this.selectDOMNode(pastedNode);
    }
  }

  /**
   * @param {boolean} visible
   */
  setVisible(visible) {
    if (visible === this._visible) {
      return;
    }
    this._visible = visible;
    if (!this._visible) {
      this._popoverHelper.hidePopover();
      if (this._multilineEditing) {
        this._multilineEditing.cancel();
      }
      return;
    }

    this.runPendingUpdates();
    if (this._selectedDOMNode) {
      this._revealAndSelectNode(this._selectedDOMNode, false);
    }
  }

  get rootDOMNode() {
    return this._rootDOMNode;
  }

  set rootDOMNode(x) {
    if (this._rootDOMNode === x) {
      return;
    }

    this._rootDOMNode = x;

    this._isXMLMimeType = x && x.isXMLNode();

    this.update();
  }

  get isXMLMimeType() {
    return this._isXMLMimeType;
  }

  /**
   * @return {?SDK.DOMModel.DOMNode}
   */
  selectedDOMNode() {
    return this._selectedDOMNode;
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   * @param {boolean=} focus
   */
  selectDOMNode(node, focus) {
    if (this._selectedDOMNode === node) {
      this._revealAndSelectNode(node, !focus);
      return;
    }

    this._selectedDOMNode = node;
    this._revealAndSelectNode(node, !focus);

    // The _revealAndSelectNode() method might find a different element if there is inlined text,
    // and the select() call would change the selectedDOMNode and reenter this setter. So to
    // avoid calling _selectedNodeChanged() twice, first check if _selectedDOMNode is the same
    // node as the one passed in.
    if (this._selectedDOMNode === node) {
      this._selectedNodeChanged(!!focus);
    }
  }

  /**
   * @return {boolean}
   */
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

    if (this._includeRootDOMNode) {
      const treeElement = this._createElementTreeElement(this.rootDOMNode);
      this.appendChild(treeElement);
    } else {
      // FIXME: this could use findTreeElement to reuse a tree element if it already exists
      const children = this._visibleChildren(this.rootDOMNode);
      for (const child of children) {
        const treeElement = this._createElementTreeElement(child);
        this.appendChild(treeElement);
      }
    }

    if (selectedNode) {
      this._revealAndSelectNode(selectedNode, true);
    }
  }

  /**
   * @param {boolean} focus
   */
  _selectedNodeChanged(focus) {
    this.dispatchEventToListeners(
        ElementsTreeOutline.Events.SelectedNodeChanged, {node: this._selectedDOMNode, focus: focus});
  }

  /**
   * @param {!Array.<!SDK.DOMModel.DOMNode>} nodes
   */
  _fireElementsTreeUpdated(nodes) {
    this.dispatchEventToListeners(ElementsTreeOutline.Events.ElementsTreeUpdated, nodes);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?ElementsTreeElement}
   */
  findTreeElement(node) {
    let treeElement = this._lookUpTreeElement(node);
    if (!treeElement && node.nodeType() === Node.TEXT_NODE) {
      // The text node might have been inlined if it was short, so try to find the parent element.
      treeElement = this._lookUpTreeElement(node.parentNode);
    }

    return /** @type {?ElementsTreeElement} */ (treeElement);
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   * @return {?UI.TreeOutline.TreeElement}
   */
  _lookUpTreeElement(node) {
    if (!node) {
      return null;
    }

    const cachedElement = node[this._treeElementSymbol];
    if (cachedElement) {
      return cachedElement;
    }

    // Walk up the parent pointers from the desired node
    const ancestors = [];
    let currentNode;
    for (currentNode = node.parentNode; currentNode; currentNode = currentNode.parentNode) {
      ancestors.push(currentNode);
      if (currentNode[this._treeElementSymbol])  // stop climbing as soon as we hit
      {
        break;
      }
    }

    if (!currentNode) {
      return null;
    }

    // Walk down to populate each ancestor's children, to fill in the tree and the cache.
    for (let i = ancestors.length - 1; i >= 0; --i) {
      const child = ancestors[i - 1] || node;
      const treeElement = ancestors[i][this._treeElementSymbol];
      if (treeElement) {
        treeElement.onpopulate();  // fill the cache with the children of treeElement
        if (child.index >= treeElement.expandedChildrenLimit()) {
          this.setExpandedChildrenLimit(treeElement, child.index + 1);
        }
      }
    }

    return node[this._treeElementSymbol];
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?ElementsTreeElement}
   */
  createTreeElementFor(node) {
    let treeElement = this.findTreeElement(node);
    if (treeElement) {
      return treeElement;
    }
    if (!node.parentNode) {
      return null;
    }

    treeElement = this.createTreeElementFor(node.parentNode);
    return treeElement ? this._showChild(treeElement, node) : null;
  }

  set suppressRevealAndSelect(x) {
    if (this._suppressRevealAndSelect === x) {
      return;
    }
    this._suppressRevealAndSelect = x;
  }

  /**
   * @param {?SDK.DOMModel.DOMNode} node
   * @param {boolean} omitFocus
   */
  _revealAndSelectNode(node, omitFocus) {
    if (this._suppressRevealAndSelect) {
      return;
    }

    if (!this._includeRootDOMNode && node === this.rootDOMNode && this.rootDOMNode) {
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

  /**
   * @return {?UI.TreeOutline.TreeElement}
   */
  _treeElementFromEvent(event) {
    const scrollContainer = this.element.parentElement;

    // We choose this X coordinate based on the knowledge that our list
    // items extend at least to the right edge of the outer <ol> container.
    // In the no-word-wrap mode the outer <ol> may be wider than the tree container
    // (and partially hidden), in which case we are left to use only its right boundary.
    const x = scrollContainer.totalOffsetLeft() + scrollContainer.offsetWidth - 36;

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

  /**
   * @param {!Event} event
   * @return {?UI.PopoverRequest}
   */
  _getPopoverRequest(event) {
    let link = event.target;
    while (link && !link[HrefSymbol]) {
      link = link.parentElementOrShadowHost();
    }
    if (!link) {
      return null;
    }

    return {
      box: link.boxInWindow(),
      show: async popover => {
        const listItem = link.enclosingNodeOrSelfWithNodeName('li');
        if (!listItem) {
          return false;
        }
        const node = /** @type {!ElementsTreeElement} */ (listItem.treeElement).node();
        const precomputedFeatures = await Components.ImagePreview.ImagePreview.loadDimensionsForNode(node);
        const preview = await Components.ImagePreview.ImagePreview.build(
            node.domModel().target(), link[HrefSymbol], true, {precomputedFeatures});
        if (preview) {
          popover.contentElement.appendChild(preview);
        }
        return !!preview;
      }
    };
  }

  /**
   * @param {!Event} event
   */
  _onfocusout(event) {
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  _onmousedown(event) {
    const element = this._treeElementFromEvent(event);

    if (!element || element.isEventWithinDisclosureTriangle(event)) {
      return;
    }

    element.select();
  }

  /**
   * @param {?UI.TreeOutline.TreeElement} treeElement
   */
  setHoverEffect(treeElement) {
    if (this._previousHoveredElement === treeElement) {
      return;
    }

    if (this._previousHoveredElement) {
      this._previousHoveredElement.hovered = false;
      delete this._previousHoveredElement;
    }

    if (treeElement) {
      treeElement.hovered = true;
      this._previousHoveredElement = treeElement;
    }
  }

  _onmousemove(event) {
    const element = this._treeElementFromEvent(event);
    if (element && this._previousHoveredElement === element) {
      return;
    }

    this.setHoverEffect(element);
    this._highlightTreeElement(
        /** @type {!UI.TreeOutline.TreeElement} */ (element),
        !UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(event));
  }

  /**
   * @param {!UI.TreeOutline.TreeElement} element
   * @param {boolean} showInfo
   */
  _highlightTreeElement(element, showInfo) {
    if (element instanceof ElementsTreeElement) {
      element.node().domModel().overlayModel().highlightInOverlay({node: element.node()}, 'all', showInfo);
      return;
    }

    if (element instanceof ShortcutTreeElement) {
      element.domModel().overlayModel().highlightInOverlay({deferredNode: element.deferredNode()}, 'all', showInfo);
    }
  }

  _onmouseleave(event) {
    this.setHoverEffect(null);
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
  }

  _ondragstart(event) {
    if (event.target.hasSelection()) {
      return false;
    }
    if (event.target.nodeName === 'A') {
      return false;
    }

    const treeElement = this._validDragSourceOrTarget(this._treeElementFromEvent(event));
    if (!treeElement) {
      return false;
    }

    if (treeElement.node().nodeName() === 'BODY' || treeElement.node().nodeName() === 'HEAD') {
      return false;
    }

    event.dataTransfer.setData('text/plain', treeElement.listItemElement.textContent.replace(/\u200b/g, ''));
    event.dataTransfer.effectAllowed = 'copyMove';
    this._treeElementBeingDragged = treeElement;

    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();

    return true;
  }

  _ondragover(event) {
    if (!this._treeElementBeingDragged) {
      return false;
    }

    const treeElement = this._validDragSourceOrTarget(this._treeElementFromEvent(event));
    if (!treeElement) {
      return false;
    }

    let node = treeElement.node();
    while (node) {
      if (node === this._treeElementBeingDragged._node) {
        return false;
      }
      node = node.parentNode;
    }

    treeElement.listItemElement.classList.add('elements-drag-over');
    this._dragOverTreeElement = treeElement;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    return false;
  }

  _ondragleave(event) {
    this._clearDragOverTreeElementMarker();
    event.preventDefault();
    return false;
  }

  /**
   * @param {?UI.TreeOutline.TreeElement} treeElement
   * @return {?ElementsTreeElement}
   */
  _validDragSourceOrTarget(treeElement) {
    if (!treeElement) {
      return null;
    }

    if (!(treeElement instanceof ElementsTreeElement)) {
      return null;
    }
    const elementsTreeElement = /** @type {!ElementsTreeElement} */ (treeElement);

    const node = elementsTreeElement.node();
    if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
      return null;
    }

    return elementsTreeElement;
  }

  _ondrop(event) {
    event.preventDefault();
    const treeElement = this._treeElementFromEvent(event);
    if (treeElement instanceof ElementsTreeElement) {
      this._doMove(treeElement);
    }
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   */
  _doMove(treeElement) {
    if (!this._treeElementBeingDragged) {
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

    const wasExpanded = this._treeElementBeingDragged.expanded;
    this._treeElementBeingDragged._node.moveTo(
        parentNode, anchorNode, this.selectNodeAfterEdit.bind(this, wasExpanded));

    delete this._treeElementBeingDragged;
  }

  _ondragend(event) {
    event.preventDefault();
    this._clearDragOverTreeElementMarker();
    delete this._treeElementBeingDragged;
  }

  _clearDragOverTreeElementMarker() {
    if (this._dragOverTreeElement) {
      this._dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');
      delete this._dragOverTreeElement;
    }
  }

  _contextMenuEventFired(event) {
    const treeElement = this._treeElementFromEvent(event);
    if (treeElement instanceof ElementsTreeElement) {
      this.showContextMenu(treeElement, event);
    }
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @param {!Event} event
   */
  showContextMenu(treeElement, event) {
    if (UI.UIUtils.isEditing()) {
      return;
    }

    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const isPseudoElement = !!treeElement.node().pseudoType();
    const isTag = treeElement.node().nodeType() === Node.ELEMENT_NODE && !isPseudoElement;
    let textNode = event.target.enclosingNodeOrSelfWithClass('webkit-html-text-node');
    if (textNode && textNode.classList.contains('bogus')) {
      textNode = null;
    }
    const commentNode = event.target.enclosingNodeOrSelfWithClass('webkit-html-comment');
    contextMenu.saveSection().appendItem(
        ls`Store as global variable`, this._saveNodeToTempVariable.bind(this, treeElement.node()));
    if (textNode) {
      treeElement.populateTextContextMenu(contextMenu, textNode);
    } else if (isTag) {
      treeElement.populateTagContextMenu(contextMenu, event);
    } else if (commentNode) {
      treeElement.populateNodeContextMenu(contextMenu);
    } else if (isPseudoElement) {
      treeElement.populateScrollIntoView(contextMenu);
    }

    contextMenu.appendApplicableItems(treeElement.node());
    contextMenu.show();
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  async _saveNodeToTempVariable(node) {
    const remoteObjectForConsole = await node.resolveToObject();
    await SDK.ConsoleModel.ConsoleModel.instance().saveToTempVariable(
        self.UI.context.flavor(SDK.RuntimeModel.ExecutionContext), remoteObjectForConsole);
  }

  runPendingUpdates() {
    this._updateModifiedNodes();
  }

  /**
   * @param {!Event} event
   */
  _onKeyDown(event) {
    const keyboardEvent = /** @type {!KeyboardEvent} */ (event);
    if (UI.UIUtils.isEditing()) {
      return;
    }
    const node = this.selectedDOMNode();
    if (!node) {
      return;
    }
    const treeElement = node[this._treeElementSymbol];
    if (!treeElement) {
      return;
    }

    if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlOrMeta(keyboardEvent) && node.parentNode) {
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

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {boolean=} startEditing
   * @param {function()=} callback
   */
  toggleEditAsHTML(node, startEditing, callback) {
    const treeElement = node[this._treeElementSymbol];
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

    /**
     * @this {ElementsTreeOutline}
     * @param {boolean} success
     */
    function editingFinished(success) {
      if (callback) {
        callback();
      }
      if (!success) {
        return;
      }

      // Select it and expand if necessary. We force tree update so that it processes dom events and is up to date.
      this.runPendingUpdates();

      const newNode = parentNode ? parentNode.children()[index] || parentNode : null;
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

  /**
   * @param {boolean} wasExpanded
   * @param {?ProtocolClient.InspectorBackend.ProtocolError} error
   * @param {?SDK.DOMModel.DOMNode} newNode
   * @return {?ElementsTreeElement} nodeId
   */
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
   *
   * @param {!SDK.DOMModel.DOMNode} node
   */
  async toggleHideElement(node) {
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

    await object.callFunction(toggleClassAndInjectStyleRule, [{value: pseudoType}, {value: !hidden}]);
    object.release();
    node.setMarker('hidden-marker', hidden ? null : true);

    /**
     * @param {?string} pseudoType
     * @param {boolean} hidden
     * @suppressGlobalPropertiesCheck
     * @suppressReceiverCheck
     * @this {!Element}
     */
    function toggleClassAndInjectStyleRule(pseudoType, hidden) {
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

      let localRoot = this;
      while (localRoot.parentNode) {
        localRoot = localRoot.parentNode;
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

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {boolean}
   */
  isToggledToHidden(node) {
    return !!node.marker('hidden-marker');
  }

  _reset() {
    this.rootDOMNode = null;
    this.selectDOMNode(null, false);
    this._popoverHelper.hidePopover();
    delete this._clipboardNodeData;
    SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    this._updateRecords.clear();
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  wireToDOMModel(domModel) {
    domModel[ElementsTreeOutline._treeOutlineSymbol] = this;
    domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged, this._markersChanged, this);
    domModel.addEventListener(SDK.DOMModel.Events.NodeInserted, this._nodeInserted, this);
    domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    domModel.addEventListener(SDK.DOMModel.Events.AttrModified, this._attributeModified, this);
    domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved, this._attributeRemoved, this);
    domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
    domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
    domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);
    domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this._distributedNodesChanged, this);
  }

  /**
   * @param {!SDK.DOMModel.DOMModel} domModel
   */
  unwireFromDOMModel(domModel) {
    domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged, this._markersChanged, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this._nodeInserted, this);
    domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved, this._nodeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, this._attributeModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved, this._attributeRemoved, this);
    domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified, this._characterDataModified, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this._documentUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this._childNodeCountUpdated, this);
    domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this._distributedNodesChanged, this);
    delete domModel[ElementsTreeOutline._treeOutlineSymbol];
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!UpdateRecord}
   */
  _addUpdateRecord(node) {
    let record = this._updateRecords.get(node);
    if (!record) {
      record = new UpdateRecord();
      this._updateRecords.set(node, record);
    }
    return record;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {?UpdateRecord}
   */
  _updateRecordForHighlight(node) {
    if (!this._visible) {
      return null;
    }
    return this._updateRecords.get(node) || null;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _documentUpdated(event) {
    const domModel = /** @type {!SDK.DOMModel.DOMModel} */ (event.data);
    this._reset();
    if (domModel.existingDocument()) {
      this.rootDOMNode = domModel.existingDocument();
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _attributeModified(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data.node);
    this._addUpdateRecord(node).attributeModified(event.data.name);
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _attributeRemoved(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data.node);
    this._addUpdateRecord(node).attributeRemoved(event.data.name);
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _characterDataModified(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    this._addUpdateRecord(node).charDataModified();
    // Text could be large and force us to render itself as the child in the tree outline.
    if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
      this._addUpdateRecord(node.parentNode).childrenModified();
    }
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeInserted(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    this._addUpdateRecord(/** @type {!SDK.DOMModel.DOMNode} */ (node.parentNode)).nodeInserted(node);
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _nodeRemoved(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data.node);
    const parentNode = /** @type {!SDK.DOMModel.DOMNode} */ (event.data.parent);
    this.resetClipboardIfNeeded(node);
    this._addUpdateRecord(parentNode).nodeRemoved(node);
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _childNodeCountUpdated(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    this._addUpdateRecord(node).childrenModified();
    this._updateModifiedNodesSoon();
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _distributedNodesChanged(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    this._addUpdateRecord(node).childrenModified();
    this._updateModifiedNodesSoon();
  }

  _updateModifiedNodesSoon() {
    if (!this._updateRecords.size) {
      return;
    }
    if (this._updateModifiedNodesTimeout) {
      return;
    }
    this._updateModifiedNodesTimeout = setTimeout(this._updateModifiedNodes.bind(this), 50);
  }

  _updateModifiedNodes() {
    if (this._updateModifiedNodesTimeout) {
      clearTimeout(this._updateModifiedNodesTimeout);
      delete this._updateModifiedNodesTimeout;
    }

    const updatedNodes = [...this._updateRecords.keys()];
    const hidePanelWhileUpdating = updatedNodes.length > 10;
    let treeOutlineContainerElement;
    let originalScrollTop;
    if (hidePanelWhileUpdating) {
      treeOutlineContainerElement = this.element.parentNode;
      originalScrollTop = treeOutlineContainerElement ? treeOutlineContainerElement.scrollTop : 0;
      this._element.classList.add('hidden');
    }

    if (this._rootDOMNode && this._updateRecords.get(this._rootDOMNode) &&
        this._updateRecords.get(this._rootDOMNode).hasChangedChildren()) {
      // Document's children have changed, perform total update.
      this.update();
    } else {
      for (const node of this._updateRecords.keys()) {
        if (this._updateRecords.get(node).hasChangedChildren()) {
          this._updateModifiedParentNode(node);
        } else {
          this._updateModifiedNode(node);
        }
      }
    }

    if (hidePanelWhileUpdating) {
      this._element.classList.remove('hidden');
      if (originalScrollTop) {
        treeOutlineContainerElement.scrollTop = originalScrollTop;
      }
    }

    this._updateRecords.clear();
    this._fireElementsTreeUpdated(updatedNodes);
  }

  _updateModifiedNode(node) {
    const treeElement = this.findTreeElement(node);
    if (treeElement) {
      treeElement.updateTitle(this._updateRecordForHighlight(node));
    }
  }

  _updateModifiedParentNode(node) {
    const parentTreeElement = this.findTreeElement(node);
    if (parentTreeElement) {
      parentTreeElement.setExpandable(this._hasVisibleChildren(node));
      parentTreeElement.updateTitle(this._updateRecordForHighlight(node));
      if (parentTreeElement.populated) {
        this._updateChildren(parentTreeElement);
      }
    }
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @returns {!Promise}
   */
  populateTreeElement(treeElement) {
    if (treeElement.childCount() || !treeElement.isExpandable()) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      treeElement.node().getChildNodes(() => {
        treeElement.populated = true;
        this._updateModifiedParentNode(treeElement.node());
        resolve();
      });
    });
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @param {boolean=} closingTag
   * @return {!ElementsTreeElement}
   */
  _createElementTreeElement(node, closingTag) {
    const treeElement = new ElementsTreeElement(node, closingTag);
    treeElement.setExpandable(!closingTag && this._hasVisibleChildren(node));
    if (node.nodeType() === Node.ELEMENT_NODE && node.parentNode && node.parentNode.nodeType() === Node.DOCUMENT_NODE &&
        !node.parentNode.parentNode) {
      treeElement.setCollapsible(false);
    }
    treeElement.selectable = this._selectEnabled;
    return treeElement;
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @param {!SDK.DOMModel.DOMNode} child
   * @return {?Elements.ElementsTreeElement}
   */
  _showChild(treeElement, child) {
    if (treeElement.isClosingTag()) {
      return null;
    }

    const index = this._visibleChildren(treeElement.node()).indexOf(child);
    if (index === -1) {
      return null;
    }

    if (index >= treeElement.expandedChildrenLimit()) {
      this.setExpandedChildrenLimit(treeElement, index + 1);
    }
    return /** @type {!ElementsTreeElement} */ (treeElement.childAt(index));
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {!Array.<!SDK.DOMModel.DOMNode>} visibleChildren
   */
  _visibleChildren(node) {
    let visibleChildren = ElementsTreeElement.visibleShadowRoots(node);

    const contentDocument = node.contentDocument();
    if (contentDocument) {
      visibleChildren.push(contentDocument);
    }

    const importedDocument = node.importedDocument();
    if (importedDocument) {
      visibleChildren.push(importedDocument);
    }

    const templateContent = node.templateContent();
    if (templateContent) {
      visibleChildren.push(templateContent);
    }

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
      let children = node.children() || [];
      if (!this._showHTMLCommentsSetting.get()) {
        children = children.filter(n => n.nodeType() !== Node.COMMENT_NODE);
      }
      visibleChildren = visibleChildren.concat(children);
    }

    const afterPseudoElement = node.afterPseudoElement();
    if (afterPseudoElement) {
      visibleChildren.push(afterPseudoElement);
    }

    return visibleChildren;
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   * @return {boolean}
   */
  _hasVisibleChildren(node) {
    if (node.isIframe()) {
      return true;
    }
    if (node.isPortal()) {
      return true;
    }
    if (node.contentDocument()) {
      return true;
    }
    if (node.importedDocument()) {
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
    return !!node.childNodeCount() && !ElementsTreeElement.canShowInlineText(node);
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   */
  _createExpandAllButtonTreeElement(treeElement) {
    const button = UI.UIUtils.createTextButton('', handleLoadAllChildren.bind(this));
    button.value = '';
    const expandAllButtonElement = new UI.TreeOutline.TreeElement(button);
    expandAllButtonElement.selectable = false;
    expandAllButtonElement.expandAllButton = true;
    expandAllButtonElement.button = button;
    return expandAllButtonElement;

    /**
     * @this {ElementsTreeOutline}
     * @param {!Event} event
     */
    function handleLoadAllChildren(event) {
      const visibleChildCount = this._visibleChildren(treeElement.node()).length;
      this.setExpandedChildrenLimit(
          treeElement, Math.max(visibleChildCount, treeElement.expandedChildrenLimit() + InitialChildrenLimit));
      event.consume();
    }
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @param {number} expandedChildrenLimit
   */
  setExpandedChildrenLimit(treeElement, expandedChildrenLimit) {
    if (treeElement.expandedChildrenLimit() === expandedChildrenLimit) {
      return;
    }

    treeElement.setExpandedChildrenLimit(expandedChildrenLimit);
    if (treeElement.treeOutline && !this._treeElementsBeingUpdated.has(treeElement)) {
      this._updateModifiedParentNode(treeElement.node());
    }
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   */
  _updateChildren(treeElement) {
    if (!treeElement.isExpandable()) {
      const selectedTreeElement = treeElement.treeOutline.selectedTreeElement;
      if (selectedTreeElement && selectedTreeElement.hasAncestor(treeElement)) {
        treeElement.select(true);
      }
      treeElement.removeChildren();
      return;
    }

    console.assert(!treeElement.isClosingTag());

    this._innerUpdateChildren(treeElement);
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @param {!SDK.DOMModel.DOMNode} child
   * @param {number} index
   * @param {boolean=} closingTag
   * @return {!Elements.ElementsTreeElement}
   */
  insertChildElement(treeElement, child, index, closingTag) {
    const newElement = this._createElementTreeElement(child, closingTag);
    treeElement.insertChild(newElement, index);
    return newElement;
  }

  /**
   * @param {!ElementsTreeElement} treeElement
   * @param {!Elements.ElementsTreeElement} child
   * @param {number} targetIndex
   */
  _moveChild(treeElement, child, targetIndex) {
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

  /**
   * @param {!ElementsTreeElement} treeElement
   */
  _innerUpdateChildren(treeElement) {
    if (this._treeElementsBeingUpdated.has(treeElement)) {
      return;
    }

    this._treeElementsBeingUpdated.add(treeElement);

    const node = treeElement.node();
    const visibleChildren = this._visibleChildren(node);
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
      const elementsTreeElement = /** @type {!ElementsTreeElement} */ (existingTreeElement);
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
        this._moveChild(treeElement, existingTreeElement, i);
      } else {
        // No existing element found, insert a new element.
        const newElement = this.insertChildElement(treeElement, child, i);
        if (this._updateRecordForHighlight(node) && treeElement.expanded) {
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
        treeElement.expandAllButtonElement = this._createExpandAllButtonTreeElement(treeElement);
      }
      treeElement.insertChild(treeElement.expandAllButtonElement, targetButtonIndex);
      treeElement.expandAllButtonElement.button.textContent =
          Common.UIString.UIString('Show All Nodes (%d More)', visibleChildren.length - expandedChildCount);
    } else if (treeElement.expandAllButtonElement) {
      delete treeElement.expandAllButtonElement;
    }

    // Insert shortcuts to distrubuted children.
    if (node.isInsertionPoint()) {
      for (const distributedNode of node.distributedNodes()) {
        treeElement.appendChild(new ShortcutTreeElement(distributedNode));
      }
    }

    // Insert close tag.
    if (node.nodeType() === Node.ELEMENT_NODE && !node.pseudoType() && treeElement.isExpandable()) {
      this.insertChildElement(treeElement, node, treeElement.childCount(), true);
    }

    this._treeElementsBeingUpdated.delete(treeElement);
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _markersChanged(event) {
    const node = /** @type {!SDK.DOMModel.DOMNode} */ (event.data);
    const treeElement = node[this._treeElementSymbol];
    if (treeElement) {
      treeElement.updateDecorations();
    }
  }
}

ElementsTreeOutline._treeOutlineSymbol = Symbol('treeOutline');

/** @override @suppress {checkPrototypalTypes} @enum {symbol} */
ElementsTreeOutline.Events = {
  SelectedNodeChanged: Symbol('SelectedNodeChanged'),
  ElementsTreeUpdated: Symbol('ElementsTreeUpdated')
};

/**
 * @const
 * @type {!Object.<string, string>}
 */
export const MappedCharToEntity = {
  '\xA0': 'nbsp',
  '\x93': '#147',  // <control>
  '\xAD': 'shy',
  '\u2002': 'ensp',
  '\u2003': 'emsp',
  '\u2009': 'thinsp',
  '\u200a': '#8202',  // Hairspace
  '\u200b': '#8203',  // ZWSP
  '\u200c': 'zwnj',
  '\u200d': 'zwj',
  '\u200e': 'lrm',
  '\u200f': 'rlm',
  '\u202a': '#8234',  // LRE
  '\u202b': '#8235',  // RLE
  '\u202c': '#8236',  // PDF
  '\u202d': '#8237',  // LRO
  '\u202e': '#8238',  // RLO
  '\ufeff': '#65279'  // BOM
};

/**
 * @unrestricted
 */
export class UpdateRecord {
  /**
   * @param {string} attrName
   */
  attributeModified(attrName) {
    if (this._removedAttributes && this._removedAttributes.has(attrName)) {
      this._removedAttributes.delete(attrName);
    }
    if (!this._modifiedAttributes) {
      this._modifiedAttributes = /** @type {!Set.<string>} */ (new Set());
    }
    this._modifiedAttributes.add(attrName);
  }

  /**
   * @param {string} attrName
   */
  attributeRemoved(attrName) {
    if (this._modifiedAttributes && this._modifiedAttributes.has(attrName)) {
      this._modifiedAttributes.delete(attrName);
    }
    if (!this._removedAttributes) {
      this._removedAttributes = /** @type {!Set.<string>} */ (new Set());
    }
    this._removedAttributes.add(attrName);
  }

  /**
   * @param {!SDK.DOMModel.DOMNode} node
   */
  nodeInserted(node) {
    this._hasChangedChildren = true;
  }

  nodeRemoved(node) {
    this._hasChangedChildren = true;
    this._hasRemovedChildren = true;
  }

  charDataModified() {
    this._charDataModified = true;
  }

  childrenModified() {
    this._hasChangedChildren = true;
  }

  /**
   * @param {string} attributeName
   * @return {boolean}
   */
  isAttributeModified(attributeName) {
    return this._modifiedAttributes && this._modifiedAttributes.has(attributeName);
  }

  /**
   * @return {boolean}
   */
  hasRemovedAttributes() {
    return !!this._removedAttributes && !!this._removedAttributes.size;
  }

  /**
   * @return {boolean}
   */
  isCharDataModified() {
    return !!this._charDataModified;
  }

  /**
   * @return {boolean}
   */
  hasChangedChildren() {
    return !!this._hasChangedChildren;
  }

  /**
   * @return {boolean}
   */
  hasRemovedChildren() {
    return !!this._hasRemovedChildren;
  }
}

/**
 * @implements {UI.UIUtils.Renderer}
 */
export class Renderer {
  /**
   * @override
   * @param {!Object} object
   * @return {!Promise<?{node: !Node, tree: ?UI.TreeOutline.TreeOutline}>}
   */
  async render(object) {
    /** @type {?SDK.DOMModel.DOMNode} */
    let node;

    if (object instanceof SDK.DOMModel.DOMNode) {
      node = /** @type {!SDK.DOMModel.DOMNode} */ (object);
    } else if (object instanceof SDK.DOMModel.DeferredDOMNode) {
      node = await (/** @type {!SDK.DOMModel.DeferredDOMNode} */ (object)).resolvePromise();
    }

    if (!node) {
      // Can't render not-a-node, or couldn't resolve deferred node.
      return null;
    }

    const treeOutline = new ElementsTreeOutline(
        /* omitRootDOMNode: */ false, /* selectEnabled: */ true, /* hideGutter: */ true);
    treeOutline.rootDOMNode = node;
    if (!treeOutline.firstChild().isExpandable()) {
      treeOutline._element.classList.add('single-node');
    }
    treeOutline.setVisible(true);
    treeOutline.element.treeElementForTest = treeOutline.firstChild();
    treeOutline.setShowSelectionOnKeyboardFocus(/* show: */ true, /* preventTabOrder: */ true);
    return {node: treeOutline.element, tree: treeOutline};
  }
}

/**
 * @unrestricted
 */
export class ShortcutTreeElement extends UI.TreeOutline.TreeElement {
  /**
   * @param {!SDK.DOMModel.DOMNodeShortcut} nodeShortcut
   */
  constructor(nodeShortcut) {
    super('');
    this.listItemElement.createChild('div', 'selection fill');
    const title = this.listItemElement.createChild('span', 'elements-tree-shortcut-title');
    let text = nodeShortcut.nodeName.toLowerCase();
    if (nodeShortcut.nodeType === Node.ELEMENT_NODE) {
      text = '<' + text + '>';
    }
    title.textContent = '\u21AA ' + text;

    const link = linkifyDeferredNodeReference(nodeShortcut.deferredNode);
    this.listItemElement.createTextChild(' ');
    link.classList.add('elements-tree-shortcut-link');
    link.textContent = Common.UIString.UIString('reveal');
    this.listItemElement.appendChild(link);
    this._nodeShortcut = nodeShortcut;
  }

  /**
   * @return {boolean}
   */
  get hovered() {
    return this._hovered;
  }

  /**
   * @param {boolean} x
   */
  set hovered(x) {
    if (this._hovered === x) {
      return;
    }
    this._hovered = x;
    this.listItemElement.classList.toggle('hovered', x);
  }

  /**
   * @return {!SDK.DOMModel.DeferredDOMNode}
   */
  deferredNode() {
    return this._nodeShortcut.deferredNode;
  }

  /**
   * @return {!SDK.DOMModel.DOMModel}
   */
  domModel() {
    return this._nodeShortcut.deferredNode.domModel();
  }

  /**
   * @override
   * @param {boolean=} selectedByUser
   * @return {boolean}
   */
  onselect(selectedByUser) {
    if (!selectedByUser) {
      return true;
    }
    this._nodeShortcut.deferredNode.highlight();
    this._nodeShortcut.deferredNode.resolve(resolved.bind(this));
    /**
     * @param {?SDK.DOMModel.DOMNode} node
     * @this {ShortcutTreeElement}
     */
    function resolved(node) {
      if (node) {
        this.treeOutline._selectedDOMNode = node;
        this.treeOutline._selectedNodeChanged();
      }
    }
    return true;
  }
}

/** @typedef {{cancel: function(), commit: function(), resize: function(), editor:!UI.TextEditor.TextEditor}} */
export let MultilineEditorController;

/** @typedef {{node: !SDK.DOMModel.DOMNode, isCut: boolean}} */
export let ClipboardData;
