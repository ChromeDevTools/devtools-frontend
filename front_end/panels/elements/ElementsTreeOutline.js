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
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as Elements from '../../models/elements/elements.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UIComponentUtils from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AdoptedStyleSheetContentsWidget, AdoptedStyleSheetSetTreeElement, AdoptedStyleSheetTreeElement, } from './AdoptedStyleSheetTreeElement.js';
import * as ElementsComponents from './components/components.js';
import { cssPath, jsPath, xPath } from './DOMPath.js';
import { showContextMenu } from './DOMTreeContextMenu.js';
import { getElementIssueDetails } from './ElementIssueUtils.js';
import { adornerRef, ElementsTreeElement, ElementsTreeWidget, ForbiddenClosingTagElements, handleAdornerKeydown, InitialChildrenLimit, isOpeningTag, } from './ElementsTreeElement.js';
import elementsTreeOutlineStyles from './elementsTreeOutline.css.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { ShortcutTreeElement } from './ShortcutTreeElement.js';
import { TopLayerContainer } from './TopLayerContainer.js';
const { html, nothing, render, Directives: { classMap } } = Lit;
const UIStrings = {
    /**
     * @description ARIA accessible name in the DOM tree outline of the Elements panel.
     */
    pageDom: 'Page DOM',
    /**
     * @description Text for the button to expand all tree nodes in the DOM tree outline of the Elements panel.
     * @example {3} PH1
     */
    showAllNodesDMore: 'Show all nodes ({PH1} more)',
    /**
     * @description Text for a button to show all truncated lines in the tree.
     * @example {5} PH1
     */
    showAllLines: 'Show all ({PH1} lines)',
    /**
     * @description Text for popover that directs to the Issues panel.
     */
    viewIssue: 'View issue:',
    /**
     * @description Link text content in the DOM tree outline of the Elements panel.
     */
    reveal: 'reveal',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsTreeOutline.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const elementsTreeOutlineByDOMModel = new WeakMap();
const populatedTreeElements = new WeakSet();
export { elementsTreeOutlineStyles };
export const DEFAULT_VIEW = (input, output, target) => {
    if (!output.elementsTreeOutline) {
        // FIXME: this is basically a ref to existing imperative
        // implementation. Once this is declarative the ref should not be
        // needed.
        const elementsTreeOutline = new ElementsTreeOutline(input.omitRootDOMNode, input.selectEnabled, input.hideGutter, input.maxTreeDepth, input.enableContextMenu, input.showComments, input.showAIButton, input.disableEdits, input.expandRoot, input.domTreeWidget);
        output.elementsTreeOutline = elementsTreeOutline;
        elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.SelectedNodeChanged, input.onSelectedNodeChanged, this);
        elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.ElementsTreeUpdated, input.onElementsTreeUpdated, this);
        elementsTreeOutline.addEventListener(UI.TreeOutline.Events.ElementExpanded, input.onElementExpanded, this);
        elementsTreeOutline.addEventListener(UI.TreeOutline.Events.ElementCollapsed, input.onElementCollapsed, this);
        elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.ShowAllRows, () => {
            if (elementsTreeOutline.maxRowsShown) {
                // Set max to undefined to show all rows
                elementsTreeOutline.maxRowsShown = undefined;
            }
        }, this);
        elementsTreeOutline.elementInternal.addEventListener('contextmenu', (event) => {
            const treeElement = elementsTreeOutline.treeElementFromEventInternal(event);
            if (treeElement instanceof ElementsTreeElement) {
                input.onContextMenu?.(treeElement.node(), event, treeElement.widget);
            }
        }, false);
        elementsTreeOutline.elementInternal.addEventListener('keydown', (event) => {
            input.onKeyDown?.(event);
        }, false);
        elementsTreeOutline.elementInternal.addEventListener('clipboard-copy', (event) => {
            input.onCopyOrCut?.(false, event);
        }, false);
        elementsTreeOutline.elementInternal.addEventListener('clipboard-cut', (event) => {
            input.onCopyOrCut?.(true, event);
        }, false);
        elementsTreeOutline.elementInternal.addEventListener('clipboard-paste', (event) => {
            input.onPaste?.(event);
        }, false);
        target.appendChild(elementsTreeOutline.element);
    }
    output.elementsTreeOutline.maxTreeDepth = input.maxTreeDepth;
    output.elementsTreeOutline.enableContextMenu = input.enableContextMenu ?? true;
    output.elementsTreeOutline.showContextMenu = (treeElement, event) => {
        if (event instanceof MouseEvent) {
            input.onContextMenu?.(treeElement.node(), event, treeElement.widget);
        }
    };
    let needsUpdate = false;
    const showComments = input.showComments ?? true;
    if (output.elementsTreeOutline.showComments !== showComments) {
        output.elementsTreeOutline.showComments = showComments;
        needsUpdate = true;
    }
    output.elementsTreeOutline.showAIButton = input.showAIButton ?? true;
    output.elementsTreeOutline.disableEdits = input.disableEdits ?? false;
    output.elementsTreeOutline.expandRoot = input.expandRoot ?? false;
    if (input.visibleWidth !== undefined) {
        output.elementsTreeOutline.setVisibleWidth(input.visibleWidth);
    }
    if (input.visible !== undefined) {
        output.elementsTreeOutline.setVisible(input.visible);
    }
    output.elementsTreeOutline.maxRowsShown = input.maxRowsShown;
    output.elementsTreeOutline.setWordWrap(input.wrap);
    output.elementsTreeOutline.setShowSelectionOnKeyboardFocus(input.showSelectionOnKeyboardFocus, input.preventTabOrder);
    if (input.deindentSingleNode) {
        output.elementsTreeOutline.deindentSingleNode();
    }
    if (needsUpdate) {
        output.elementsTreeOutline.update();
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
        if (input.selectedNode) {
            output.elementsTreeOutline.selectDOMNode(input.selectedNode);
        }
        output.highlightedTreeElement = treeElement;
        output.elementsTreeOutline.setHoverEffect(treeElement);
        treeElement?.reveal(true);
        output.isUpdatingHighlights = false;
    }
    const previousSearchMatchNode = output.searchMatchTreeElement?.node() ?? null;
    if (previousSearchMatchNode !== input.searchMatchNode || output.searchMatchQuery !== input.searchMatchQuery) {
        if (output.searchMatchTreeElement) {
            output.searchMatchTreeElement.hideSearchHighlights();
            output.searchMatchTreeElement = null;
        }
        output.searchMatchQuery = input.searchMatchQuery ?? undefined;
        if (input.searchMatchNode) {
            const treeElement = output.elementsTreeOutline.findTreeElement(input.searchMatchNode);
            if (treeElement) {
                output.searchMatchTreeElement = treeElement;
                if (input.searchMatchQuery) {
                    treeElement.highlightSearchResults(input.searchMatchQuery);
                }
                treeElement.reveal();
                const matches = treeElement.listItemElement.getElementsByClassName(Highlighting.highlightedSearchResultClassName);
                if (matches.length) {
                    matches[0].scrollIntoViewIfNeeded(false);
                }
            }
        }
    }
    if (input.nodeToEdit) {
        const treeElement = output.elementsTreeOutline.findTreeElement(input.nodeToEdit.node);
        if (treeElement) {
            const edit = input.nodeToEdit;
            input.onInitialEditCompleted?.();
            if (edit.isEditAsHTML) {
                treeElement.widget.toggleEditAsHTML(edit.editAsHTMLCallback);
            }
            else if (edit.isProcessingInstruction) {
                treeElement.widget.startEditingProcessingInstructionValue();
            }
            else if (edit.isTextNode) {
                const textNode = treeElement.widget.contentElement.querySelector('.webkit-html-text-node');
                if (textNode) {
                    treeElement.widget.startEditingTextNode(textNode);
                }
            }
            else if (edit.isNewAttribute) {
                treeElement.widget.addNewAttribute();
            }
            else if (edit.attributeName) {
                treeElement.widget.triggerEditAttribute(edit.attributeName);
            }
        }
    }
};
function isMaxDepthReached(node, rootDOMNode, maxTreeDepth, omitRootDOMNode) {
    if (maxTreeDepth === undefined || maxTreeDepth === Infinity) {
        return false;
    }
    if (node.nodeType() === Node.DOCUMENT_NODE || node.isShadowRoot()) {
        return false;
    }
    let depth = 0;
    let current = node;
    while (current && current !== rootDOMNode) {
        depth++;
        current = current.parentNode;
    }
    if (!omitRootDOMNode) {
        depth++;
    }
    return depth >= maxTreeDepth;
}
function nodeHasVisibleChildren(node, rootDOMNode = null, maxTreeDepth, omitRootDOMNode) {
    if (isMaxDepthReached(node, rootDOMNode, maxTreeDepth, omitRootDOMNode)) {
        return false;
    }
    if (node.isIframe() || node.contentDocument() || node.templateContent() ||
        ElementsTreeWidget.visibleShadowRoots(node).length || node.hasPseudoElements() || node.isInsertionPoint() ||
        node.adoptedStyleSheetsForNode.length) {
        return true;
    }
    return Boolean(node.childNodeCount()) && !ElementsTreeWidget.canShowInlineText(node);
}
function getVisibleChildren(node, showComments = true) {
    const children = [];
    children.push(...ElementsTreeWidget.visibleShadowRoots(node));
    const contentDocument = node.contentDocument();
    if (contentDocument) {
        children.push(contentDocument);
    }
    const templateContent = node.templateContent();
    if (templateContent) {
        children.push(templateContent);
    }
    children.push(...node.viewTransitionPseudoElements());
    const markerPseudo = node.markerPseudoElement();
    if (markerPseudo) {
        children.push(markerPseudo);
    }
    const checkmarkPseudo = node.checkmarkPseudoElement();
    if (checkmarkPseudo) {
        children.push(checkmarkPseudo);
    }
    const beforePseudo = node.beforePseudoElement();
    if (beforePseudo) {
        children.push(beforePseudo);
    }
    children.push(...node.carouselPseudoElements());
    if (node.childNodeCount()) {
        const nodeChildren = node.children();
        if (nodeChildren) {
            let filteredChildren = nodeChildren;
            if (!showComments) {
                filteredChildren = filteredChildren.filter(n => n.nodeType() !== Node.COMMENT_NODE);
            }
            children.push(...filteredChildren);
        }
    }
    const afterPseudo = node.afterPseudoElement();
    if (afterPseudo) {
        children.push(afterPseudo);
    }
    const pickerIconPseudo = node.pickerIconPseudoElement();
    if (pickerIconPseudo) {
        children.push(pickerIconPseudo);
    }
    const interestButtonPseudo = node.interestButtonPseudoElement();
    if (interestButtonPseudo) {
        children.push(interestButtonPseudo);
    }
    const backdropPseudo = node.backdropPseudoElement();
    if (backdropPseudo) {
        children.push(backdropPseudo);
    }
    return children;
}
function isAncestorOf(ancestor, descendant) {
    let current = descendant.parentNode;
    while (current) {
        if (current === ancestor) {
            return true;
        }
        current = current.parentNode;
    }
    return false;
}
function computeLeftIndent(depth, isExpandable) {
    return 12 * (depth - 1) + (isExpandable ? 1 : 12);
}
export const DECLARATIVE_VIEW = (input, _output, target) => {
    let allRootNodes = [];
    let rootNodes = [];
    const rootDOMNode = input.rootDOMNode;
    if (rootDOMNode) {
        if (input.omitRootDOMNode) {
            allRootNodes = getVisibleChildren(rootDOMNode, input.showComments ?? true);
            const rootLimit = input.expandedChildrenLimit ? input.expandedChildrenLimit(rootDOMNode) : InitialChildrenLimit;
            rootNodes = allRootNodes.slice(0, rootLimit);
        }
        else {
            rootNodes = [rootDOMNode];
        }
    }
    const on = Lit.Directive.directive(Lit.CustomDirectives.InterceptBindingDirective);
    const renderShortcut = (shortcut, shortcutDepth) => {
        const hasShortcutChildren = shortcut.childShortcuts.length > 0;
        const isShortcutExpanded = Boolean(input.isTopLayerShortcutExpanded?.(shortcut));
        const isShortcutSelected = input.selectedTopLayerShortcut === shortcut;
        let title = shortcut.nodeName.toLowerCase();
        if (shortcut.nodeType === Node.ELEMENT_NODE) {
            title = '<' + title + '>';
        }
        const onShortcutExpand = (event) => {
            input.onToggleTopLayerShortcutExpanded?.(shortcut, event.detail.expanded);
        };
        const onShortcutSelect = () => {
            input.onSelectTopLayerShortcut?.(shortcut);
        };
        const onReveal = (event) => {
            event.stopPropagation();
            input.onRevealTopLayerShortcut?.(shortcut);
        };
        const onShortcutMouseMove = (event) => {
            event.stopPropagation();
            shortcut.deferredNode.highlight();
        };
        const onShortcutMouseLeave = (event) => {
            event.stopPropagation();
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        };
        return html `
      <li role="treeitem"
          ?selected=${isShortcutSelected}
          ?open=${isShortcutExpanded}
          class="elements-tree-shortcut"
          style="--indent: ${computeLeftIndent(shortcutDepth, hasShortcutChildren)}px"
          @select=${onShortcutSelect}
          @expand=${onShortcutExpand}
          @mousemove=${on(onShortcutMouseMove)}
          @mouseleave=${on(onShortcutMouseLeave)}
          jslog=${VisualLogging.treeItem().parent('elementsTreeOutline')}>
        <div class="selection fill"></div>
        <span class="elements-tree-shortcut-title">\u21AA ${title}</span>
        <devtools-adorner
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL}
          class="adorner-reveal clickable"
          role=button
          tabindex=0
          jslog=${VisualLogging.adorner('reveal').track({
            click: true,
        })}
          aria-label=${i18nString(UIStrings.reveal)}
          @click=${on(onReveal)}
          @keydown=${handleAdornerKeydown(onReveal)}
          @mousedown=${(e) => e.consume()}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            <devtools-icon name="select-element"></devtools-icon>
            <span>${ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL}</span>
          </span>
        </devtools-adorner>
        ${hasShortcutChildren ? html `
          <ul role="group">
            ${UI.TreeOutline.ifExpanded(html `
              ${shortcut.childShortcuts.map(child => renderShortcut(child, shortcutDepth + 1))}
            `)}
          </ul>
        ` :
            nothing}
      </li>
    `;
    };
    const renderTopLayerContainer = (doc, containerDepth) => {
        const shortcuts = input.getTopLayerShortcuts?.(doc) ?? [];
        if (shortcuts.length === 0) {
            return nothing;
        }
        const isTopLayerExpanded = Boolean(input.isTopLayerExpanded?.(doc));
        const onTopLayerExpand = (event) => {
            input.onToggleTopLayerExpanded?.(doc, event.detail.expanded);
        };
        const onTopLayerSelect = () => {
            input.onSelectTopLayerContainer?.(doc);
        };
        return html `
      <li role="treeitem"
          ?open=${isTopLayerExpanded}
          class="elements-tree-top-layer-container"
          style="--indent: ${computeLeftIndent(containerDepth, true)}px"
          @select=${onTopLayerSelect}
          @expand=${onTopLayerExpand}
          jslog=${VisualLogging.treeItem().parent('elementsTreeOutline')}>
        <div class="selection fill"></div>
        <span class="elements-tree-shortcut-title">#top-layer</span>
        <ul role="group">
          ${UI.TreeOutline.ifExpanded(html `
            ${shortcuts.map(sc => renderShortcut(sc, containerDepth + 1))}
          `)}
        </ul>
      </li>
    `;
    };
    const renderAdoptedStyleSheet = (sheet, depth) => {
        const header = sheet.cssModel.styleSheetHeaderForId(sheet.id);
        const linkText = header?.sourceURL;
        const isExpanded = Boolean(input.isAdoptedStyleSheetExpanded?.(sheet));
        const isSelected = input.selectedAdoptedStyleSheet === sheet;
        const onExpand = (event) => {
            input.onToggleAdoptedStyleSheetExpanded?.(sheet, event.detail.expanded);
        };
        const onSelect = () => {
            input.onSelectAdoptedStyleSheet?.(sheet);
        };
        // clang-format off
        return html `
      <li role="treeitem"
          ?selected=${isSelected}
          ?open=${isExpanded}
          class="elements-tree-adopted-style-sheet"
          style="--indent: ${computeLeftIndent(depth, true)}px"
          @select=${onSelect}
          @expand=${onExpand}
          jslog=${VisualLogging.treeItem('adopted-style-sheet').parent('elementsTreeOutline')}>
        <div class="selection fill"></div>
        <span class="elements-tree-shortcut-title">#adopted-style-sheet${linkText ? html ` (${UIComponentUtils.Linkifier.Linkifier.linkifyURL(linkText, {
            text: linkText,
            preventClick: true,
            showColumnNumber: false,
        })})` : nothing}</span>
        <ul role="group">
          ${UI.TreeOutline.ifExpanded(html `
            ${header ? html `
              <li role="treeitem"
                  class="elements-tree-adopted-style-sheet-contents"
                  style="--indent: ${computeLeftIndent(depth + 1, false)}px"
                  jslog=${VisualLogging.treeItem('adopted-style-sheet-contents').parent('elementsTreeOutline')}>
                <div class="selection fill"></div>
                ${UI.Widget.widget(AdoptedStyleSheetContentsWidget, { styleSheetHeader: header })}
              </li>
            ` : nothing}
          `)}
        </ul>
      </li>
    `;
        // clang-format on
    };
    const renderAdoptedStyleSheets = (node, depth) => {
        const sheets = node.adoptedStyleSheetsForNode;
        if (!sheets || sheets.length === 0) {
            return nothing;
        }
        const isExpanded = Boolean(input.isAdoptedStyleSheetsExpanded?.(node));
        const onExpand = (event) => {
            input.onToggleAdoptedStyleSheetsExpanded?.(node, event.detail.expanded);
        };
        const onSelect = () => {
            input.onSelectAdoptedStyleSheets?.(node);
        };
        // clang-format off
        return html `
      <li role="treeitem"
          ?open=${isExpanded}
          class="elements-tree-adopted-style-sheets"
          style="--indent: ${computeLeftIndent(depth, true)}px"
          @select=${onSelect}
          @expand=${onExpand}
          jslog=${VisualLogging.treeItem('adopted-style-sheets').parent('elementsTreeOutline')}>
        <div class="selection fill"></div>
        <span class="elements-tree-shortcut-title">#adopted-style-sheets</span>
        <ul role="group">
          ${UI.TreeOutline.ifExpanded(html `
            ${sheets.map(sheet => renderAdoptedStyleSheet(sheet, depth + 1))}
          `)}
        </ul>
      </li>
    `;
        // clang-format on
    };
    const renderNode = (node, depth = 0) => {
        const isSelected = input.selectedNode === node;
        const isHovered = (input.currentHighlightedNode === node) || (input.hoveredNode === node);
        const isExpanded = Boolean((input.currentHighlightedNode && isAncestorOf(node, input.currentHighlightedNode)) ||
            (input.isNodeExpanded ?
                input.isNodeExpanded(node) :
                (input.expandRoot &&
                    (node === input.rootDOMNode || (input.omitRootDOMNode && node.parentNode === input.rootDOMNode)))));
        const hasChildren = nodeHasVisibleChildren(node, input.rootDOMNode, input.maxTreeDepth, input.omitRootDOMNode);
        const allVisibleChildren = hasChildren ? getVisibleChildren(node, input.showComments ?? true) : [];
        const limit = input.expandedChildrenLimit ? input.expandedChildrenLimit(node) : InitialChildrenLimit;
        const children = allVisibleChildren.slice(0, limit);
        const remainingChildrenCount = allVisibleChildren.length - children.length;
        const tagName = node.nodeName().toLowerCase();
        const needsClosingTag = node.nodeType() === Node.ELEMENT_NODE && !ForbiddenClosingTagElements.has(tagName) &&
            !node.pseudoType() && (hasChildren || !ElementsTreeWidget.canShowInlineText(node));
        const on = Lit.Directive.directive(Lit.CustomDirectives.InterceptBindingDirective);
        const onSelect = () => {
            input.onSelect?.(node, /* selectedByUser= */ true);
        };
        const onExpand = (event) => {
            input.onExpand?.(node, event.detail.expanded);
        };
        const isDragOver = input.dragOverNode?.node === node && !input.dragOverNode.isClosingTag;
        const isClosingTagDragOver = input.dragOverNode?.node === node && Boolean(input.dragOverNode.isClosingTag);
        const isDraggable = !input.disableEdits && Boolean(input.isValidDragSource?.(node));
        const classes = classMap({
            hovered: isHovered,
            'in-clipboard': Boolean(input.isNodeInClipboard?.(node)),
            'elements-drag-over': isDragOver,
        });
        const onMouseMove = (event) => {
            event.stopPropagation();
            const showInfo = !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event);
            input.onHoverNode?.(node, showInfo);
        };
        const onContextMenu = (event) => {
            event.stopPropagation();
            input.onContextMenu?.(node, event);
        };
        const onDragStart = (event) => {
            event.stopPropagation();
            const currentTarget = event.currentTarget;
            const textContent = currentTarget?.firstElementChild?.textContent ?? currentTarget?.textContent ?? undefined;
            input.onDragStart?.(node, event, textContent);
        };
        const onDragOver = (event) => {
            event.stopPropagation();
            input.onDragOver?.(node, /* isClosingTag= */ false, event);
        };
        const onClosingTagDragOver = (event) => {
            event.stopPropagation();
            input.onDragOver?.(node, /* isClosingTag= */ true, event);
        };
        const onDragLeave = (event) => {
            event.stopPropagation();
            input.onDragLeave?.(event);
        };
        const onDrop = (event) => {
            event.stopPropagation();
            input.onDrop?.(node, /* isClosingTag= */ false, event);
        };
        const onClosingTagDrop = (event) => {
            event.stopPropagation();
            input.onDrop?.(node, /* isClosingTag= */ true, event);
        };
        const onDragEnd = (event) => {
            event.stopPropagation();
            input.onDragEnd?.(event);
        };
        /* clang-format off */
        return html `
      <li role="treeitem"
          ?selected=${isSelected}
          class=${classes}
          ?open=${isExpanded}
          draggable=${isDraggable ? 'true' : 'false'}
          @select=${onSelect}
          @expand=${onExpand}
          @mousemove=${on(onMouseMove)}
          @contextmenu=${on(onContextMenu)}
          @dragstart=${on(onDragStart)}
          @dragover=${on(onDragOver)}
          @dragleave=${on(onDragLeave)}
          @drop=${on(onDrop)}
          @dragend=${on(onDragEnd)}
          jslog=${VisualLogging.treeItem().parent('elementsTreeOutline').track({
            keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
            resize: true,
            drag: true,
            click: true,
        })}>
        ${UI.Widget.widget(ElementsTreeWidget, {
            node,
            isClosingTag: false,
            expanded: isExpanded,
            isExpandable: hasChildren,
            selected: isSelected,
            isDOMNodeSelected: isSelected,
            hovered: isHovered,
            searchQuery: input.searchMatchNode === node ? (input.searchMatchQuery ?? null) : null,
            inClipboard: input.isNodeInClipboard?.(node) ?? false,
            computeLeftIndent: computeLeftIndent(depth, hasChildren),
            disableEdits: input.disableEdits ?? false,
            showAIButton: input.showAIButton ?? true,
            initialEdit: input.nodeToEdit?.node === node ? input.nodeToEdit : null,
            onInitialEditCompleted: input.onInitialEditCompleted,
            revealInTopLayer: (n) => input.domTreeWidget?.revealInTopLayer(n),
            setMultilineEditing: multilineEditing => input.domTreeWidget?.setMultilineEditing(multilineEditing),
            visibleWidth: () => input.domTreeWidget?.visibleWidth ?? 0,
            selectDOMNode: (n, selectedByUser) => input.onSelect?.(n, selectedByUser),
            selectNodeAfterEdit: (wasExpanded, error, newNode, moveDirection) => {
                input.onSelectNodeAfterEdit?.(wasExpanded, error, newNode, moveDirection);
            },
            toggleHideElement: (n) => {
                input.onToggleHideElement?.(n);
                return Promise.resolve();
            },
            isToggledToHidden: (n) => input.isToggledToHidden?.(n) ?? false,
            showContextMenu: (event, widget) => {
                if (event instanceof MouseEvent) {
                    input.onContextMenu?.(node, event, widget);
                }
            },
            updateRecord: input.updateRecordForNode?.(node) ?? null,
        })}
        ${hasChildren ? html `
          <ul role="group">
            ${UI.TreeOutline.ifExpanded(html `
              ${node.adoptedStyleSheetsForNode.length > 0 ? renderAdoptedStyleSheets(node, depth + 1) : nothing}
              ${children.map(child => renderNode(child, depth + 1))}
              ${remainingChildrenCount > 0 ? html `
                <li role="treeitem"
                    class="elements-tree-expand-all"
                    style="--indent: ${computeLeftIndent(depth + 1, false)}px"
                    jslog=${VisualLogging.treeItem('show-all-nodes').parent('elementsTreeOutline')}>
                  <devtools-button
                      .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                      title=${i18nString(UIStrings.showAllNodesDMore, { PH1: remainingChildrenCount })}
                      @click=${on((event) => {
            event.stopPropagation();
            input.onExpandAllChildren?.(node);
        })}>
                    ${i18nString(UIStrings.showAllNodesDMore, { PH1: remainingChildrenCount })}
                  </devtools-button>
                </li>
              ` : nothing}
              ${node instanceof SDK.DOMModel.DOMDocument ? renderTopLayerContainer(node, depth + 1) : nothing}
              ${needsClosingTag ? html `
                <li role="treeitem"
                    class=${classMap({ hovered: isHovered, 'elements-drag-over': isClosingTagDragOver })}
                    jslog=${VisualLogging.treeItem().parent('elementsTreeOutline')}
                    @mousemove=${on(onMouseMove)}
                    @dragover=${on(onClosingTagDragOver)}
                    @dragleave=${on(onDragLeave)}
                    @drop=${on(onClosingTagDrop)}>
                  ${UI.Widget.widget(ElementsTreeWidget, {
            node,
            isClosingTag: true,
            expanded: false,
            isExpandable: false,
            selected: false,
            isDOMNodeSelected: false,
            hovered: isHovered,
            computeLeftIndent: computeLeftIndent(depth, false),
            disableEdits: input.disableEdits ?? false,
            showAIButton: false,
            showContextMenu: (event, widget) => {
                if (event instanceof MouseEvent) {
                    input.onContextMenu?.(node, event, widget);
                }
            },
            updateRecord: input.updateRecordForNode?.(node) ?? null,
        })}
                </li>
              ` : nothing}
            `)}
          </ul>
        ` : nothing}
      </li>
    `;
        /* clang-format on */
    };
    /* clang-format off */
    render(html `
    <style>${UI.inspectorCommonStyles}</style>
    <style>${elementsTreeOutlineStyles}</style>
    <style>${CodeHighlighter.codeHighlighterStyles}</style>
    <div class="elements-disclosure ${input.deindentSingleNode && rootNodes.length === 1 && !nodeHasVisibleChildren(rootNodes[0], input.rootDOMNode, input.maxTreeDepth, input.omitRootDOMNode) ? 'single-node' : ''}">
      <devtools-tree
        class="elements-tree-outline source-code ${input.wrap ? '' : 'elements-tree-nowrap'} ${input.hideGutter ? 'elements-hide-gutter' : ''}"
        aria-label=${i18nString(UIStrings.pageDom)}
        jslog=${VisualLogging.tree('elements')}
        ?show-selection-on-keyboard-focus=${input.showSelectionOnKeyboardFocus}
        @keydown=${input.onKeyDown}
        @clipboard-copy=${(event) => input.onCopyOrCut?.(false, event)}
        @clipboard-cut=${(event) => input.onCopyOrCut?.(true, event)}
        @clipboard-paste=${(event) => input.onPaste?.(event)}
        @mouseleave=${input.onLeave}
        .template=${html `
          <style>${UI.inspectorCommonStyles}</style>
          <style>${elementsTreeOutlineStyles}</style>
          <style>${CodeHighlighter.codeHighlighterStyles}</style>
          <ul role="tree">
            ${rootNodes.map(node => renderNode(node))}
            ${input.omitRootDOMNode && input.rootDOMNode ? (() => {
        const remaining = allRootNodes.length - rootNodes.length;
        if (remaining <= 0) {
            return nothing;
        }
        const root = input.rootDOMNode;
        return html `
                <li role="treeitem"
                    class="elements-tree-expand-all"
                    style="--indent: ${computeLeftIndent(0, false)}px"
                    jslog=${VisualLogging.treeItem('show-all-nodes').parent('elementsTreeOutline')}>
                  <devtools-button
                      .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                      title=${i18nString(UIStrings.showAllNodesDMore, { PH1: remaining })}
                      @click=${on((event) => {
            event.stopPropagation();
            input.onExpandAllChildren?.(root);
        })}>
                    ${i18nString(UIStrings.showAllNodesDMore, { PH1: remaining })}
                  </devtools-button>
                </li>
              `;
    })() : nothing}
            ${input.omitRootDOMNode && input.rootDOMNode instanceof SDK.DOMModel.DOMDocument ? renderTopLayerContainer(input.rootDOMNode, 0) : nothing}
          </ul>
        `}>
      </devtools-tree>
    </div>
  `, target);
    /* clang-format on */
};
function getElementsTreeWidgetAndNode(element) {
    let current = element;
    while (current) {
        if (current.tagName === 'LI') {
            const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(current);
            if (treeElement instanceof ElementsTreeElement) {
                return { node: treeElement.node(), widget: treeElement.widget };
            }
        }
        const widget = UI.Widget.Widget.get(current);
        if (widget instanceof ElementsTreeWidget) {
            return { node: widget.node, widget };
        }
        current = current.parentElementOrShadowHost();
    }
    return {};
}
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
    onElementCollapsed = () => { };
    onElementExpanded = () => { };
    onDocumentUpdated = () => { };
    #maxTreeDepth;
    #enableContextMenu = true;
    #showHTMLCommentsSetting = Common.Settings.Settings.instance().moduleSetting('show-html-comments');
    #showComments = this.#showHTMLCommentsSetting.get();
    #showAIButton = true;
    #disableEdits = false;
    #expandRoot = false;
    #visible = false;
    #visibleWidth;
    #wrap = false;
    #maxRows;
    // If maxRows is undefined, all rows are shown. If it is set to a number, only that many rows are shown.
    set maxRows(maxRows) {
        this.#maxRows = maxRows;
        this.requestUpdate();
    }
    get maxRows() {
        return this.#maxRows;
    }
    get visibleWidth() {
        return this.#visibleWidth ?? this.contentElement.offsetWidth;
    }
    set visibleWidth(width) {
        this.#visibleWidth = width;
        this.performUpdate();
    }
    #rootDOMNode = null;
    #selectedDOMNode = null;
    #expandedNodes = new Set();
    #expandedChildrenLimitByNode = new WeakMap();
    // FIXME: this is not declarative because ElementsTreeOutline can
    // change root node internally.
    set rootDOMNode(node) {
        if (this.#view === DECLARATIVE_VIEW) {
            this.#rootDOMNode = node;
            if (node) {
                if (this.expandRoot || this.omitRootDOMNode) {
                    this.#expandedNodes.add(node);
                }
                if (!node.children() && node.childNodeCount()) {
                    void node.getChildNodes(() => {
                        this.performUpdate();
                    });
                }
            }
            this.performUpdate();
            return;
        }
        this.performUpdate();
        if (!this.#viewOutput.elementsTreeOutline) {
            throw new Error('Unexpected: missing elementsTreeOutline');
        }
        this.#viewOutput.elementsTreeOutline.rootDOMNode = node;
        this.performUpdate();
    }
    get rootDOMNode() {
        if (this.#view === DECLARATIVE_VIEW) {
            return this.#rootDOMNode;
        }
        return this.#viewOutput.elementsTreeOutline?.rootDOMNode ?? null;
    }
    get maxTreeDepth() {
        return this.#maxTreeDepth;
    }
    set maxTreeDepth(maxTreeDepth) {
        this.#maxTreeDepth = maxTreeDepth;
        this.performUpdate();
    }
    get enableContextMenu() {
        return this.#enableContextMenu;
    }
    set enableContextMenu(enableContextMenu) {
        this.#enableContextMenu = enableContextMenu;
        this.performUpdate();
    }
    get showComments() {
        return this.#showComments;
    }
    set showComments(showComments) {
        this.#showComments = showComments;
        this.performUpdate();
    }
    get showAIButton() {
        return this.#showAIButton;
    }
    set showAIButton(showAIButton) {
        this.#showAIButton = showAIButton;
        this.performUpdate();
    }
    get disableEdits() {
        return this.#disableEdits;
    }
    set disableEdits(disableEdits) {
        this.#disableEdits = disableEdits;
        this.performUpdate();
    }
    get expandRoot() {
        return this.#expandRoot;
    }
    set expandRoot(expandRoot) {
        this.#expandRoot = expandRoot;
        this.performUpdate();
    }
    #currentHighlightedNode = null;
    #wiredDOMModels = new Set();
    #topLayerShortcutsByDocument = new WeakMap();
    #topLayerContainerExpandedByDocument = new WeakMap();
    #topLayerShortcutExpanded = new WeakMap();
    #selectedTopLayerShortcut = null;
    #adoptedStyleSheetsExpandedByNode = new WeakMap();
    #adoptedStyleSheetExpanded = new WeakMap();
    #selectedAdoptedStyleSheet = null;
    // TODO: Move #imagePreviewPopover and #issuePopoverHelper to the view once declarative versions exist.
    #imagePreviewPopover;
    #issuePopoverHelper;
    #view;
    #viewOutput = {
        highlightedTreeElement: null,
        alreadyExpandedParentTreeElement: null,
        isUpdatingHighlights: false,
    };
    #highlightThrottler = new Common.Throttler.Throttler(100);
    constructor(element, view = DEFAULT_VIEW) {
        super(element, {
            useShadowDom: false,
            delegatesFocus: false,
        });
        this.#view = view;
        this.#showHTMLCommentsSetting.addChangeListener(this.#onShowHTMLCommentsChange, this);
        if (Common.Settings.Settings.instance().moduleSetting('highlight-node-on-hover-in-overlay').get()) {
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "HighlightNodeRequested" /* SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED */, this.#highlightNode, this, { scoped: true });
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "InspectModeWillBeToggled" /* SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED */, this.#clearHighlightedNode, this, { scoped: true });
        }
        this.#setupPopovers();
    }
    // TODO: Move imagePreviewPopover and issuePopoverHelper to the view once declarative versions exist.
    #setupPopovers() {
        this.#imagePreviewPopover = new ImagePreviewPopover(this.contentElement, event => {
            let link = event.composedPath()[0];
            while (link && link !== this.contentElement && !ImagePreviewPopover.getImageURL(link)) {
                link = link.parentElementOrShadowHost();
            }
            return (link && link !== this.contentElement) ? link : null;
        }, async (link) => {
            const { node } = getElementsTreeWidgetAndNode(link);
            return await UIComponentUtils.ImagePreview.loadPrecomputedFeatures(node);
        });
        this.#issuePopoverHelper = new UI.PopoverHelper.PopoverHelper(this.contentElement, event => {
            const hoveredNode = event.composedPath()[0];
            if (!(hoveredNode instanceof Element) || !hoveredNode.matches('.violating-element')) {
                return null;
            }
            const { node, widget } = getElementsTreeWidgetAndNode(hoveredNode);
            if (!node) {
                return null;
            }
            let issues = widget?.issues ?? [];
            if (hoveredNode.classList.contains('webkit-html-attribute-name')) {
                const attrName = hoveredNode.textContent;
                issues = issues.filter(issue => getElementIssueDetails(issue)?.attribute === attrName);
            }
            else if (hoveredNode.classList.contains('webkit-html-tag-name')) {
                issues = issues.filter(issue => {
                    const details = getElementIssueDetails(issue);
                    return Boolean(details && !details.attribute);
                });
            }
            if (issues.length === 0) {
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
                            return nothing;
                        }
                        const issueKindIconName = IssueCounter.IssueCounter.getIssueKindIconName(issue.getKind());
                        const openIssueEvent = () => Common.Revealer.reveal(issue);
                        return html `
                  <div class="squiggles-content-item">
                  <devtools-icon .name=${issueKindIconName} @click=${openIssueEvent}></devtools-icon>
                  <devtools-link class="link" @click=${openIssueEvent}>${i18nString(UIStrings.viewIssue)}</devtools-link>
                  <span>${elementIssueDetails.tooltip}</span>
                  </div>`;
                    })}
            </div>`, popover.contentElement);
                    // clang-format on
                    return true;
                },
            };
        }, 'elements.issue');
        this.#issuePopoverHelper.setTimeout(300);
    }
    #updateRecords = new Map();
    updateRecordsForTest() {
        return this.#updateRecords;
    }
    #addUpdateRecord(node) {
        let record = this.#updateRecords.get(node);
        if (!record) {
            record = new Elements.ElementUpdateRecord.ElementUpdateRecord();
            this.#updateRecords.set(node, record);
        }
        return record;
    }
    #onDocumentUpdated(event) {
        const domModel = event.data;
        if (this.#view === DECLARATIVE_VIEW) {
            this.#selectedDOMNode = null;
            this.#expandedNodes.clear();
            this.#currentHighlightedNode = null;
            this.#updateRecords.clear();
        }
        if (domModel.existingDocument()) {
            this.rootDOMNode = domModel.existingDocument();
        }
        this.onDocumentUpdated(domModel);
    }
    #updateModifiedNodesTimeout;
    #updateModifiedNodesSoon() {
        if (!this.#updateRecords.size) {
            return;
        }
        if (this.#updateModifiedNodesTimeout) {
            return;
        }
        this.#updateModifiedNodesTimeout = window.setTimeout(this.updateModifiedNodes.bind(this), 50);
    }
    #onNodeInserted(event) {
        const node = event.data;
        if (node.parentNode) {
            this.#addUpdateRecord(node.parentNode).nodeInserted(node);
        }
        this.#updateModifiedNodesSoon();
    }
    #onNodeRemoved(event) {
        const { node, parent } = event.data;
        this.resetClipboardIfNeeded(node);
        if (parent) {
            this.#addUpdateRecord(parent).nodeRemoved(node);
        }
        this.#updateModifiedNodesSoon();
    }
    #onAttrModified(event) {
        const { node, name } = event.data;
        this.#addUpdateRecord(node).attributeModified(name);
        this.#updateModifiedNodesSoon();
    }
    #onAttrRemoved(event) {
        const { node, name } = event.data;
        this.#addUpdateRecord(node).attributeRemoved(name);
        this.#updateModifiedNodesSoon();
    }
    #onCharacterDataModified(event) {
        const node = event.data;
        this.#addUpdateRecord(node).charDataModified();
        if (node.parentNode && node.parentNode.firstChild === node.parentNode.lastChild) {
            this.#addUpdateRecord(node.parentNode).childrenModified();
        }
        this.#updateModifiedNodesSoon();
    }
    #onChildNodeCountUpdated(event) {
        const node = event.data;
        this.#addUpdateRecord(node).childrenModified();
        this.#updateModifiedNodesSoon();
    }
    #onAdoptedStyleSheetsModified(event) {
        const node = event.data;
        this.#addUpdateRecord(node).childrenModified();
        this.#updateModifiedNodesSoon();
    }
    #onDistributedNodesChanged(event) {
        const node = event.data;
        this.#addUpdateRecord(node).childrenModified();
        this.#updateModifiedNodesSoon();
    }
    #onDocumentURLChanged(event) {
        this.#addUpdateRecord(event.data).charDataModified();
        this.#updateModifiedNodesSoon();
    }
    #onMarkersChanged() {
        this.#updateModifiedNodesSoon();
    }
    updateModifiedNodes() {
        if (this.#view === DECLARATIVE_VIEW) {
            this.performUpdate();
            return;
        }
        this.#viewOutput.elementsTreeOutline?.updateModifiedNodes();
    }
    #wireDOMModel(domModel) {
        domModel.addEventListener(SDK.DOMModel.Events.DocumentUpdated, this.#onDocumentUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.NodeInserted, this.#onNodeInserted, this);
        domModel.addEventListener(SDK.DOMModel.Events.NodeRemoved, this.#onNodeRemoved, this);
        domModel.addEventListener(SDK.DOMModel.Events.AttrModified, this.#onAttrModified, this);
        domModel.addEventListener(SDK.DOMModel.Events.AttrRemoved, this.#onAttrRemoved, this);
        domModel.addEventListener(SDK.DOMModel.Events.CharacterDataModified, this.#onCharacterDataModified, this);
        domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.#onChildNodeCountUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.MarkersChanged, this.#onMarkersChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.AdoptedStyleSheetsModified, this.#onAdoptedStyleSheetsModified, this);
        domModel.addEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.#onTopLayerElementsChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.#onDistributedNodesChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.DocumentURLChanged, this.#onDocumentURLChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.requestUpdate, this);
    }
    #unwireDOMModel(domModel) {
        domModel.removeEventListener(SDK.DOMModel.Events.DocumentUpdated, this.#onDocumentUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.NodeInserted, this.#onNodeInserted, this);
        domModel.removeEventListener(SDK.DOMModel.Events.NodeRemoved, this.#onNodeRemoved, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AttrModified, this.#onAttrModified, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AttrRemoved, this.#onAttrRemoved, this);
        domModel.removeEventListener(SDK.DOMModel.Events.CharacterDataModified, this.#onCharacterDataModified, this);
        domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.#onChildNodeCountUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.MarkersChanged, this.#onMarkersChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AdoptedStyleSheetsModified, this.#onAdoptedStyleSheetsModified, this);
        domModel.removeEventListener(SDK.DOMModel.Events.TopLayerElementsChanged, this.#onTopLayerElementsChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.#onDistributedNodesChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.DocumentURLChanged, this.#onDocumentURLChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.AffectedByStartingStylesFlagUpdated, this.requestUpdate, this);
    }
    #onShowHTMLCommentsChange() {
        this.#showComments = this.#showHTMLCommentsSetting.get();
        const selectedNode = this.selectedDOMNode();
        if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.#showComments) {
            this.selectDOMNode(selectedNode.parentNode);
        }
        this.performUpdate();
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
        this.#imagePreviewPopover?.hide();
        this.#issuePopoverHelper?.hidePopover();
        if (node instanceof SDK.DOMModel.AdoptedStyleSheet) {
            this.highlightAdoptedStyleSheet(node);
            return;
        }
        this.#selectedAdoptedStyleSheet = null;
        if (this.#view === DECLARATIVE_VIEW) {
            const isSameNode = this.#selectedDOMNode === node;
            this.#selectedDOMNode = node;
            if (node) {
                const ancestors = [];
                for (let current = node.parentNode; current; current = current.parentNode) {
                    ancestors.unshift(current);
                }
                for (let i = 0; i < ancestors.length; ++i) {
                    const ancestor = ancestors[i];
                    const child = ancestors[i + 1] || node;
                    this.#expandedNodes.add(ancestor);
                    const visibleChildren = getVisibleChildren(ancestor, this.#showComments);
                    const childIndex = visibleChildren.indexOf(child);
                    if (childIndex !== -1 && childIndex >= this.expandedChildrenLimit(ancestor)) {
                        this.setExpandedChildrenLimit(ancestor, childIndex + 1);
                    }
                    if (!ancestor.children() && ancestor.childNodeCount()) {
                        void ancestor.getChildNodes(() => {
                            const visibleChildren = getVisibleChildren(ancestor, this.#showComments);
                            const childIndex = visibleChildren.indexOf(child);
                            if (childIndex !== -1 && childIndex >= this.expandedChildrenLimit(ancestor)) {
                                this.setExpandedChildrenLimit(ancestor, childIndex + 1);
                            }
                            this.performUpdate();
                        });
                    }
                }
            }
            this.#clearHighlightedNode();
            if (!isSameNode) {
                this.onSelectedNodeChanged({ data: { node, focus: Boolean(focus) } });
            }
            this.performUpdate();
            return;
        }
        this.#viewOutput?.elementsTreeOutline?.selectDOMNode(node, focus);
    }
    highlightNodeAttribute(node, attribute) {
        this.#viewOutput?.elementsTreeOutline?.highlightNodeAttribute(node, attribute);
    }
    get wrap() {
        return this.#wrap;
    }
    set wrap(wrap) {
        this.#wrap = wrap;
        this.performUpdate();
    }
    setWordWrap(wrap) {
        this.wrap = wrap;
    }
    selectedDOMNode() {
        if (this.#view === DECLARATIVE_VIEW) {
            return this.#selectedDOMNode;
        }
        return this.#viewOutput.elementsTreeOutline?.selectedDOMNode() ?? null;
    }
    setNodeExpanded(node, expanded) {
        if (this.#view === DECLARATIVE_VIEW) {
            if (expanded) {
                this.#expandedNodes.add(node);
                if (!node.children() && node.childNodeCount()) {
                    void node.getChildNodes(() => {
                        this.performUpdate();
                    });
                }
                this.onElementExpanded();
            }
            else {
                this.#expandedNodes.delete(node);
                this.onElementCollapsed();
            }
            if (!this.#currentHighlightedNode || !isAncestorOf(node, this.#currentHighlightedNode)) {
                this.#clearHighlightedNode();
            }
            this.performUpdate();
            return;
        }
        const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        if (expanded) {
            treeElement?.expand();
        }
        else {
            treeElement?.collapse();
        }
    }
    isNodeExpanded(node) {
        if (this.#view === DECLARATIVE_VIEW) {
            return this.#expandedNodes.has(node);
        }
        return Boolean(this.#viewOutput.elementsTreeOutline?.findTreeElement(node)?.expanded);
    }
    expandedChildrenLimit(node) {
        return this.#expandedChildrenLimitByNode.get(node) ?? InitialChildrenLimit;
    }
    setExpandedChildrenLimit(node, limit) {
        if (this.expandedChildrenLimit(node) === limit) {
            return;
        }
        this.#expandedChildrenLimitByNode.set(node, limit);
        if (this.#viewOutput.elementsTreeOutline) {
            const treeElement = this.#viewOutput.elementsTreeOutline.findTreeElement(node);
            if (treeElement && treeElement.expandedChildrenLimit() !== limit) {
                this.#viewOutput.elementsTreeOutline.setExpandedChildrenLimit(treeElement, limit);
            }
        }
        this.performUpdate();
    }
    expandAllChildren(node) {
        const currentLimit = this.expandedChildrenLimit(node);
        const visibleChildren = getVisibleChildren(node, this.#showComments);
        this.setExpandedChildrenLimit(node, Math.max(visibleChildren.length, currentLimit + InitialChildrenLimit));
    }
    async expandRecursively(node, maxDepth = Number.MAX_VALUE) {
        if (this.#view === DECLARATIVE_VIEW) {
            await node.getSubtree(100, true);
            const expand = async (n, depth) => {
                if (depth > maxDepth) {
                    return;
                }
                this.#expandedNodes.add(n);
                let children = n.children();
                if (!children && n.childNodeCount()) {
                    children = await new Promise(resolve => {
                        void n.getChildNodes(() => resolve(n.children() ?? []));
                    });
                }
                const pseudoElements = Array.from(n.pseudoElements().values()).flat();
                const allChildren = [...(children ?? []), ...pseudoElements];
                if (allChildren.length) {
                    await Promise.all(allChildren.map(child => expand(child, depth + 1)));
                }
            };
            await expand(node, 0);
            this.performUpdate();
            return;
        }
        const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        if (treeElement) {
            await treeElement.expandRecursively();
        }
    }
    collapseChildren(node) {
        if (this.#view === DECLARATIVE_VIEW) {
            const collapse = (n) => {
                const pseudoElements = Array.from(n.pseudoElements().values()).flat();
                const allChildren = [...(n.children() ?? []), ...pseudoElements];
                for (const child of allChildren) {
                    this.#expandedNodes.delete(child);
                    collapse(child);
                }
            };
            collapse(node);
            this.performUpdate();
            return;
        }
        const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(node);
        treeElement?.collapseChildren();
    }
    showContextMenu(node, event, widget) {
        if (!this.#enableContextMenu) {
            return Promise.resolve(undefined);
        }
        return showContextMenu(this, node, event, widget);
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
    #hoveredDOMNode = null;
    #searchMatchNode = null;
    #searchMatchQuery = null;
    #nodeToEdit = null;
    #draggedNode = null;
    #draggedNodeWasExpanded = false;
    #dragOverNode = null;
    hoveredDOMNode() {
        if (this.#view === DECLARATIVE_VIEW) {
            return this.#hoveredDOMNode;
        }
        const hoveredElement = this.#viewOutput.elementsTreeOutline?.hoveredTreeElement;
        if (hoveredElement instanceof ElementsTreeElement) {
            return hoveredElement.node();
        }
        return null;
    }
    searchMatchNode() {
        return this.#searchMatchNode;
    }
    searchMatchQuery() {
        return this.#searchMatchQuery;
    }
    setHoveredNode(node, showInfo = true) {
        if (this.#hoveredDOMNode === node) {
            return;
        }
        this.#hoveredDOMNode = node;
        if (node) {
            const treeElement = this.treeElementForNode(node);
            const selectorList = treeElement?.isDisplayContents() ? '*' : undefined;
            node.domModel().overlayModel().highlightInOverlay({ node, selectorList }, 'all', showInfo);
        }
        else {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        }
        if (this.#view === DECLARATIVE_VIEW) {
            this.performUpdate();
        }
        else {
            const treeElement = node ? this.treeElementForNode(node) : null;
            this.#viewOutput.elementsTreeOutline?.setHoverEffect(treeElement);
        }
    }
    performUpdate() {
        if (this.#updateModifiedNodesTimeout) {
            clearTimeout(this.#updateModifiedNodesTimeout);
            this.#updateModifiedNodesTimeout = undefined;
        }
        const firstRender = !this.#viewOutput.elementsTreeOutline;
        const updatedNodes = this.#view === DECLARATIVE_VIEW ? [...this.#updateRecords.keys()] : [];
        this.#view({
            domTreeWidget: this,
            rootDOMNode: this.#rootDOMNode,
            omitRootDOMNode: this.omitRootDOMNode,
            selectEnabled: this.selectEnabled,
            hideGutter: this.hideGutter,
            maxTreeDepth: this.#maxTreeDepth,
            enableContextMenu: this.#enableContextMenu,
            showComments: this.#showComments,
            showAIButton: this.#showAIButton,
            disableEdits: this.#disableEdits,
            expandRoot: this.#expandRoot,
            visibleWidth: this.#visibleWidth,
            visible: this.#visible,
            wrap: this.#wrap,
            maxRowsShown: this.#maxRows,
            showSelectionOnKeyboardFocus: this.showSelectionOnKeyboardFocus,
            preventTabOrder: this.preventTabOrder,
            deindentSingleNode: this.deindentSingleNode,
            currentHighlightedNode: this.#currentHighlightedNode,
            hoveredNode: this.#hoveredDOMNode,
            searchMatchNode: this.#searchMatchNode,
            searchMatchQuery: this.#searchMatchQuery,
            selectedNode: this.selectedDOMNode(),
            onElementsTreeUpdated: this.onElementsTreeUpdated.bind(this),
            onSelectedNodeChanged: event => {
                this.#clearHighlightedNode();
                this.onSelectedNodeChanged(event);
            },
            onElementCollapsed: () => {
                this.#clearHighlightedNode();
            },
            onElementExpanded: () => {
                this.#clearHighlightedNode();
            },
            onHoverNode: (node, showInfo) => {
                this.setHoveredNode(node, showInfo);
            },
            onLeave: () => {
                this.setHoveredNode(null);
            },
            onSelect: (node, selectedByUser) => {
                this.selectDOMNode(node, selectedByUser);
            },
            onExpand: (node, expanded) => {
                this.setNodeExpanded(node, expanded);
            },
            onContextMenu: (node, event, widget) => {
                void this.showContextMenu(node, event, widget);
            },
            onToggleHideElement: (node) => {
                this.toggleHideElement(node);
            },
            onKeyDown: (event) => {
                this.onKeyDown(event);
            },
            isToggledToHidden: (node) => {
                return this.isToggledToHidden(node);
            },
            onDuplicateNode: (node) => {
                this.duplicateNode(node);
            },
            isNodeExpanded: (node) => {
                return this.isNodeExpanded(node);
            },
            isNodeInClipboard: (node) => {
                return this.isNodeInClipboard(node);
            },
            onCopyOrCut: (isCut, event) => {
                this.onCopyOrCut(isCut, event);
            },
            onPaste: (event) => {
                this.onPaste(event);
            },
            onSelectNodeAfterEdit: (wasExpanded, error, newNode, moveDirection) => {
                this.selectNodeAfterEdit(wasExpanded, error, newNode, moveDirection);
            },
            nodeToEdit: this.#nodeToEdit,
            onInitialEditCompleted: () => {
                this.#nodeToEdit = null;
            },
            dragOverNode: this.#dragOverNode,
            isValidDragSource: (node) => this.isValidDragSource(node),
            onDragStart: (node, event, textContent) => this.onDragStart(node, event, textContent),
            onDragOver: (node, isClosingTag, event) => this.onDragOver(node, isClosingTag, event),
            onDragLeave: (event) => this.onDragLeave(event),
            onDrop: (node, isClosingTag, event) => this.onDrop(node, isClosingTag, event),
            onDragEnd: (event) => this.onDragEnd(event),
            getTopLayerShortcuts: (doc) => this.topLayerShortcuts(doc),
            isTopLayerExpanded: (doc) => this.isTopLayerExpanded(doc),
            onToggleTopLayerExpanded: (doc, expanded) => this.setTopLayerExpanded(doc, expanded),
            onSelectTopLayerContainer: (_doc) => {
                this.#selectedTopLayerShortcut = null;
                this.selectDOMNode(null);
                this.performUpdate();
            },
            isTopLayerShortcutExpanded: (shortcut) => this.isTopLayerShortcutExpanded(shortcut),
            onToggleTopLayerShortcutExpanded: (shortcut, expanded) => this.setTopLayerShortcutExpanded(shortcut, expanded),
            selectedTopLayerShortcut: this.#selectedTopLayerShortcut,
            onSelectTopLayerShortcut: (shortcut) => {
                this.#selectedTopLayerShortcut = shortcut;
                this.selectDOMNode(null);
                shortcut.deferredNode.highlight();
                shortcut.deferredNode.resolve(node => {
                    if (node) {
                        this.selectDOMNode(node, true);
                    }
                });
                this.performUpdate();
            },
            onRevealTopLayerShortcut: (shortcut) => {
                shortcut.deferredNode.resolve(node => {
                    if (node) {
                        this.selectDOMNode(node, true);
                        node.highlight();
                    }
                });
            },
            isAdoptedStyleSheetsExpanded: (node) => this.isAdoptedStyleSheetsExpanded(node),
            onToggleAdoptedStyleSheetsExpanded: (node, expanded) => this.setAdoptedStyleSheetsExpanded(node, expanded),
            onSelectAdoptedStyleSheets: (_node) => {
                this.#selectedAdoptedStyleSheet = null;
                this.selectDOMNode(null);
                this.performUpdate();
            },
            isAdoptedStyleSheetExpanded: (sheet) => this.isAdoptedStyleSheetExpanded(sheet),
            onToggleAdoptedStyleSheetExpanded: (sheet, expanded) => this.setAdoptedStyleSheetExpanded(sheet, expanded),
            selectedAdoptedStyleSheet: this.#selectedAdoptedStyleSheet,
            onSelectAdoptedStyleSheet: (sheet) => {
                this.#selectedAdoptedStyleSheet = sheet;
                this.selectDOMNode(null);
                this.performUpdate();
            },
            expandedChildrenLimit: (node) => this.expandedChildrenLimit(node),
            onExpandAllChildren: (node) => this.expandAllChildren(node),
            updateRecordForNode: (node) => this.#updateRecords.get(node) ?? null,
        }, this.#viewOutput, this.contentElement);
        if (this.#view === DECLARATIVE_VIEW) {
            this.#updateRecords.clear();
            if (updatedNodes.length > 0) {
                this.onElementsTreeUpdated({ data: updatedNodes });
            }
        }
        if (this.#viewOutput.elementsTreeOutline) {
            this.#viewOutput.elementsTreeOutline.domTreeWidget = this;
        }
        if (firstRender && this.#viewOutput.elementsTreeOutline) {
            this.#viewOutput.elementsTreeOutline.addEventListener(ElementsTreeOutline.Events.ShowAllRows, () => {
                this.maxRows = undefined;
            });
        }
    }
    modelAdded(domModel) {
        if (this.#view === DECLARATIVE_VIEW) {
            if (!this.#wiredDOMModels.has(domModel)) {
                this.#wiredDOMModels.add(domModel);
                this.#wireDOMModel(domModel);
            }
            if (this.isShowing() && !domModel.parentModel() &&
                (!this.rootDOMNode || this.rootDOMNode.domModel() !== domModel)) {
                if (domModel.existingDocument()) {
                    this.rootDOMNode = domModel.existingDocument();
                    this.onDocumentUpdated(domModel);
                }
                else {
                    void domModel.requestDocument().then(document => {
                        if (document && this.isShowing()) {
                            this.rootDOMNode = document;
                            this.onDocumentUpdated(domModel);
                        }
                    });
                }
            }
            this.performUpdate();
            return;
        }
        this.performUpdate();
        if (!this.#viewOutput.elementsTreeOutline) {
            throw new Error('Unexpected: missing elementsTreeOutline');
        }
        this.#viewOutput.elementsTreeOutline.wireToDOMModel(domModel);
        this.performUpdate();
    }
    modelRemoved(domModel) {
        if (this.#view === DECLARATIVE_VIEW) {
            if (this.#wiredDOMModels.has(domModel)) {
                this.#wiredDOMModels.delete(domModel);
                this.#unwireDOMModel(domModel);
            }
            this.performUpdate();
            return;
        }
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
        void element?.updateAdorners();
    }
    highlightMatch(node, query) {
        this.#searchMatchNode = node;
        this.#searchMatchQuery = query ?? null;
        if (this.selectedDOMNode() !== node) {
            this.selectDOMNode(node, /* focus= */ false);
        }
        else {
            this.performUpdate();
        }
    }
    hideMatchHighlights(node) {
        if (this.#searchMatchNode === node) {
            this.#searchMatchNode = null;
            this.#searchMatchQuery = null;
            this.performUpdate();
        }
    }
    toggleHideElement(node) {
        void node.toggleHideElement();
    }
    async removeNode(node) {
        if (this.isToggledToHidden(node)) {
            // Unhide the node before removing. This avoids inconsistent state if the node is restored via undo.
            this.toggleHideElement(node);
        }
        if (node.pseudoType()) {
            return;
        }
        if (!node.parentNode || node.parentNode.nodeType() === Node.DOCUMENT_NODE) {
            return;
        }
        void node.removeNode();
    }
    isToggledToHidden(node) {
        return node.isToggledToHidden();
    }
    #multilineEditing = null;
    setMultilineEditing(multilineEditing) {
        this.#multilineEditing = multilineEditing;
    }
    multilineEditing() {
        return this.#multilineEditing;
    }
    runPendingUpdates() {
        this.updateModifiedNodes();
        if (this.#view !== DECLARATIVE_VIEW) {
            this.performUpdate();
        }
    }
    onResize() {
        super.onResize();
        if (this.#multilineEditing) {
            this.#multilineEditing.resize();
        }
    }
    willHide() {
        super.willHide();
        this.#imagePreviewPopover?.hide();
        this.#issuePopoverHelper?.hidePopover();
        if (this.#updateModifiedNodesTimeout) {
            clearTimeout(this.#updateModifiedNodesTimeout);
            this.#updateModifiedNodesTimeout = undefined;
        }
        if (this.#view === DECLARATIVE_VIEW) {
            this.#updateRecords.clear();
        }
        if (this.#multilineEditing) {
            this.#multilineEditing.cancel();
        }
    }
    toggleEditAsHTML(node, startEditing, callback) {
        if (node.pseudoType() || node.isShadowRoot() || node.nodeType() === Node.DOCUMENT_NODE) {
            return;
        }
        const parentNode = node.parentNode;
        const index = node.index;
        const wasExpanded = this.isNodeExpanded(node);
        const editingFinished = (success) => {
            if (callback) {
                callback();
            }
            if (!success) {
                return;
            }
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
            this.runPendingUpdates();
            if (index === undefined) {
                return;
            }
            const children = parentNode?.children();
            const newNode = children ? children[index] || parentNode : parentNode;
            if (!newNode) {
                return;
            }
            this.selectDOMNode(newNode, true);
            if (wasExpanded) {
                this.setNodeExpanded(newNode, true);
            }
        };
        if (this.#multilineEditing) {
            this.#multilineEditing.commit();
            return;
        }
        if (startEditing === false) {
            return;
        }
        this.#nodeToEdit = {
            node,
            isEditAsHTML: true,
            editAsHTMLCallback: editingFinished,
        };
        this.performUpdate();
    }
    duplicateNode(node) {
        node.duplicate();
    }
    nodeBeingDragged() {
        return this.#draggedNode;
    }
    dragOverNode() {
        return this.#dragOverNode;
    }
    isValidDragSource(node) {
        if (this.disableEdits) {
            return false;
        }
        if (!node.parentNode || node.parentNode.nodeType() !== Node.ELEMENT_NODE) {
            return false;
        }
        const nodeName = node.nodeName();
        if (nodeName === 'BODY' || nodeName === 'HEAD') {
            return false;
        }
        return true;
    }
    isValidDragTarget(targetNode) {
        if (!this.#draggedNode) {
            return false;
        }
        if (!targetNode.parentNode || targetNode.parentNode.nodeType() !== Node.ELEMENT_NODE) {
            return false;
        }
        let current = targetNode;
        while (current) {
            if (current === this.#draggedNode) {
                return false;
            }
            current = current.parentNode;
        }
        return true;
    }
    onDragStart(node, event, textContent) {
        const target = event.target;
        if (!target) {
            return false;
        }
        const selection = target.getComponentSelection();
        if (selection && selection.type === 'Range' && !selection.isCollapsed && selection.toString().length > 0 &&
            target.hasSelection()) {
            return false;
        }
        if (target.nodeName === 'A') {
            return false;
        }
        if (!this.isValidDragSource(node)) {
            return false;
        }
        this.#draggedNode = node;
        this.#draggedNodeWasExpanded = this.isNodeExpanded(node);
        if (event.dataTransfer) {
            const text = textContent ?? node.nodeName().toLowerCase();
            event.dataTransfer.setData('text/plain', text.replace(/\u200b/g, ''));
            event.dataTransfer.effectAllowed = 'copyMove';
        }
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        return true;
    }
    onDragOver(node, isClosingTag, event) {
        if (!this.#draggedNode) {
            return false;
        }
        if (!this.isValidDragTarget(node)) {
            return false;
        }
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }
        if (this.#dragOverNode?.node !== node || this.#dragOverNode?.isClosingTag !== isClosingTag) {
            this.#dragOverNode = { node, isClosingTag };
            if (this.#view === DECLARATIVE_VIEW) {
                this.performUpdate();
            }
        }
        return true;
    }
    onDragLeave(event) {
        event.preventDefault();
        if (this.#dragOverNode) {
            this.#dragOverNode = null;
            if (this.#view === DECLARATIVE_VIEW) {
                this.performUpdate();
            }
        }
    }
    onDrop(node, isClosingTag, event) {
        event.preventDefault();
        if (!this.#draggedNode) {
            return;
        }
        this.moveNode(this.#draggedNode, node, isClosingTag);
        this.#draggedNode = null;
        this.#dragOverNode = null;
        if (this.#view === DECLARATIVE_VIEW) {
            this.performUpdate();
        }
    }
    onDragEnd(event) {
        event.preventDefault();
        this.#draggedNode = null;
        this.#dragOverNode = null;
        if (this.#view === DECLARATIVE_VIEW) {
            this.performUpdate();
        }
    }
    moveNode(draggedNode, targetNode, isClosingTag) {
        let parentNode;
        let anchorNode;
        if (isClosingTag) {
            // Drop onto closing tag -> insert as last child.
            parentNode = targetNode;
            anchorNode = null;
        }
        else {
            parentNode = targetNode.parentNode;
            anchorNode = targetNode;
        }
        if (!parentNode) {
            return;
        }
        const wasExpanded = this.#draggedNodeWasExpanded;
        draggedNode.moveTo(parentNode, anchorNode, (error, newNode) => this.selectNodeAfterEdit(wasExpanded, error, newNode));
    }
    selectNodeAfterEdit(wasExpanded, error, newNode, moveDirection) {
        if (error || !newNode) {
            return;
        }
        this.selectDOMNode(newNode, /* selectedByUser= */ true);
        if (wasExpanded) {
            this.setNodeExpanded(newNode, true);
        }
        if (moveDirection) {
            if (newNode.nodeType() === Node.PROCESSING_INSTRUCTION_NODE) {
                this.#nodeToEdit = { node: newNode, isProcessingInstruction: true };
            }
            else if (moveDirection !== 'forward') {
                this.#nodeToEdit = { node: newNode, isNewAttribute: true };
            }
            else {
                const attributes = newNode.attributes();
                if (attributes.length > 0) {
                    this.#nodeToEdit = { node: newNode, attributeName: attributes[0].name };
                }
                else {
                    this.#nodeToEdit = { node: newNode, isNewAttribute: true };
                }
            }
            this.performUpdate();
        }
    }
    topLayerShortcuts(document) {
        return this.#topLayerShortcutsByDocument.get(document) ?? [];
    }
    isTopLayerExpanded(document) {
        return this.#topLayerContainerExpandedByDocument.get(document) ?? false;
    }
    setTopLayerExpanded(document, expanded) {
        this.#topLayerContainerExpandedByDocument.set(document, expanded);
        this.performUpdate();
    }
    isTopLayerShortcutExpanded(shortcut) {
        return this.#topLayerShortcutExpanded.get(shortcut) ?? false;
    }
    setTopLayerShortcutExpanded(shortcut, expanded) {
        this.#topLayerShortcutExpanded.set(shortcut, expanded);
        this.performUpdate();
    }
    #onTopLayerElementsChanged(event) {
        this.#topLayerShortcutsByDocument.set(event.data.document, event.data.documentShortcuts);
        this.performUpdate();
    }
    revealInTopLayer(node) {
        const document = node.ownerDocument;
        if (!document) {
            return;
        }
        if (this.#viewOutput.elementsTreeOutline) {
            this.#viewOutput.elementsTreeOutline.revealInTopLayer(node);
            return;
        }
        const shortcuts = this.topLayerShortcuts(document);
        const findShortcut = (list) => {
            for (const sc of list) {
                if (sc.deferredNode.backendNodeId() === node.backendNodeId()) {
                    return sc;
                }
                const found = findShortcut(sc.childShortcuts);
                if (found) {
                    return found;
                }
            }
            return null;
        };
        const shortcut = findShortcut(shortcuts);
        if (shortcut) {
            this.#topLayerContainerExpandedByDocument.set(document, true);
            this.#selectedTopLayerShortcut = shortcut;
            this.performUpdate();
        }
    }
    isAdoptedStyleSheetsExpanded(node) {
        return this.#adoptedStyleSheetsExpandedByNode.get(node) ?? false;
    }
    setAdoptedStyleSheetsExpanded(node, expanded) {
        this.#adoptedStyleSheetsExpandedByNode.set(node, expanded);
        this.performUpdate();
    }
    isAdoptedStyleSheetExpanded(sheet) {
        return this.#adoptedStyleSheetExpanded.get(sheet) ?? false;
    }
    setAdoptedStyleSheetExpanded(sheet, expanded) {
        this.#adoptedStyleSheetExpanded.set(sheet, expanded);
        this.performUpdate();
    }
    highlightAdoptedStyleSheet(adoptedStyleSheet) {
        if (this.#viewOutput.elementsTreeOutline) {
            this.#viewOutput.elementsTreeOutline.highlightAdoptedStyleSheet(adoptedStyleSheet);
            return;
        }
        const parent = adoptedStyleSheet.parent;
        if (!parent) {
            return;
        }
        for (let current = parent; current; current = current.parentNode) {
            this.#expandedNodes.add(current);
        }
        this.setAdoptedStyleSheetsExpanded(parent, true);
        this.#selectedAdoptedStyleSheet = adoptedStyleSheet;
        this.selectDOMNode(null);
        this.performUpdate();
    }
    startEditing(node) {
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const nodeType = node.nodeType();
        if (nodeType === Node.ELEMENT_NODE) {
            if (node.isShadowRoot() || node.ancestorUserAgentShadowRoot()) {
                return;
            }
            const attributes = node.attributes();
            if (attributes.length > 0) {
                this.#nodeToEdit = { node, attributeName: attributes[0].name };
            }
            else {
                this.#nodeToEdit = { node, isNewAttribute: true };
            }
            this.performUpdate();
        }
        else if (nodeType === Node.TEXT_NODE) {
            this.#nodeToEdit = { node, isTextNode: true };
            this.performUpdate();
        }
        else if (nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
            this.#nodeToEdit = { node, isProcessingInstruction: true };
            this.performUpdate();
        }
    }
    onKeyDown(event) {
        if (UI.UIUtils.isEditing()) {
            return false;
        }
        const node = this.selectedDOMNode();
        if (!node) {
            return false;
        }
        if (UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(event) && node.parentNode) {
            const wasExpanded = this.isNodeExpanded(node);
            if (event.key === 'ArrowUp' && node.previousSibling) {
                node.moveTo(node.parentNode, node.previousSibling, (error, newNode) => {
                    this.selectNodeAfterEdit(wasExpanded, error, newNode);
                });
                event.consume(true);
                return true;
            }
            if (event.key === 'ArrowDown' && node.nextSibling) {
                node.moveTo(node.parentNode, node.nextSibling.nextSibling, (error, newNode) => {
                    this.selectNodeAfterEdit(wasExpanded, error, newNode);
                });
                event.consume(true);
                return true;
            }
        }
        if (event.key === 'Enter') {
            this.startEditing(node);
            event.consume(true);
            return true;
        }
        if (event.key === 'F2') {
            this.toggleEditAsHTML(node);
            event.consume(true);
            return true;
        }
        if (event.key === 'Delete' || event.key === 'Backspace') {
            void this.removeNode(node);
            event.consume(true);
            return true;
        }
        if (event.key === 'h' || event.key === 'H') {
            this.toggleHideElement(node);
            event.consume(true);
            return true;
        }
        return false;
    }
    #clipboardData = null;
    clipboardData() {
        return this.#clipboardData;
    }
    setClipboardData(data) {
        if (this.#clipboardData) {
            const prevTreeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(this.#clipboardData.node);
            if (prevTreeElement) {
                prevTreeElement.setInClipboard(false);
            }
            this.#clipboardData = null;
        }
        if (data) {
            const treeElement = this.#viewOutput.elementsTreeOutline?.findTreeElement(data.node);
            if (treeElement) {
                treeElement.setInClipboard(true);
            }
            this.#clipboardData = data;
        }
        this.requestUpdate();
    }
    resetClipboardIfNeeded(removedNode) {
        if (this.#clipboardData?.node === removedNode) {
            this.setClipboardData(null);
        }
    }
    isNodeInClipboard(node) {
        return Boolean(this.#clipboardData?.isCut && this.#clipboardData?.node === node);
    }
    async copyOuterHTML(node, includeShadowRoots = false) {
        const outerHTML = await node.getOuterHTML(includeShadowRoots);
        if (outerHTML !== null) {
            UI.UIUtils.copyTextToClipboard(outerHTML);
        }
    }
    copyCSSPath(node) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssPath(node, true));
    }
    copyJSPath(node) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(jsPath(node, true));
    }
    copyXPath(node, optimized = true) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(node, optimized));
    }
    copyFullXPath(node) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(node, false));
    }
    async copyStyles(node) {
        const cssModel = node.domModel().cssModel();
        const cascade = await cssModel.cachedMatchedCascadeForNode(node);
        if (!cascade) {
            return;
        }
        const indent = Common.Settings.Settings.instance().moduleSetting('text-editor-indent').get();
        const lines = [];
        for (const style of cascade.nodeStyles().reverse()) {
            for (const property of style.leadingProperties()) {
                if (!property.parsedOk || property.disabled || !property.activeInStyle() || property.implicit) {
                    continue;
                }
                if (cascade.isInherited(style) && !SDK.CSSMetadata.cssMetadata().isPropertyInherited(property.name)) {
                    continue;
                }
                if (style.parentRule?.isUserAgent()) {
                    continue;
                }
                if (cascade.propertyState(property) !== "Active" /* SDK.CSSMatchedStyles.PropertyState.ACTIVE */) {
                    continue;
                }
                lines.push(`${indent}${property.name}: ${property.value};`);
            }
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(lines.join('\n'));
    }
    performCopyOrCut(isCut, node, includeShadowRoots = false) {
        if (!node) {
            return;
        }
        if (isCut && (node.isShadowRoot() || node.ancestorUserAgentShadowRoot())) {
            return;
        }
        void this.copyOuterHTML(node, includeShadowRoots);
        this.setClipboardData({ node, isCut });
    }
    canPaste(targetNode) {
        if (targetNode.isShadowRoot() || targetNode.ancestorUserAgentShadowRoot()) {
            return false;
        }
        if (!this.#clipboardData) {
            return false;
        }
        const node = this.#clipboardData.node;
        if (this.#clipboardData.isCut && (node === targetNode || node.isAncestor(targetNode))) {
            return false;
        }
        if (targetNode.domModel() !== node.domModel()) {
            return false;
        }
        return true;
    }
    pasteNode(targetNode) {
        if (!this.canPaste(targetNode) || !this.#clipboardData) {
            return;
        }
        const wasExpanded = this.isNodeExpanded(this.#clipboardData.node);
        if (this.#clipboardData.isCut) {
            this.#clipboardData.node.moveTo(targetNode, null, this.selectNodeAfterEdit.bind(this, wasExpanded));
            this.setClipboardData(null);
        }
        else {
            this.#clipboardData.node.copyTo(targetNode, null, this.selectNodeAfterEdit.bind(this, wasExpanded));
        }
    }
    onCopyOrCut(isCut, event) {
        this.setClipboardData(null);
        // @ts-expect-error this bound in the main entry point
        const originalEvent = event['original'] || event;
        if (!originalEvent?.target) {
            return;
        }
        // Don't prevent the normal copy if the user has a selection.
        if (originalEvent.target instanceof Node && originalEvent.target.hasSelection?.()) {
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
        if (originalEvent.clipboardData) {
            originalEvent.clipboardData.clearData();
        }
        event.handled = true;
        this.performCopyOrCut(isCut, targetNode);
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
        this.pasteNode(targetNode);
    }
    /**
     * FIXME: used to determine focus state, probably we can have a better
     * way to do it.
     */
    empty() {
        if (this.#view === DECLARATIVE_VIEW) {
            return !this.#rootDOMNode;
        }
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
    wasHidden() {
        super.wasHidden();
        this.#visible = false;
        if (this.#updateModifiedNodesTimeout) {
            clearTimeout(this.#updateModifiedNodesTimeout);
            this.#updateModifiedNodesTimeout = undefined;
        }
        if (this.#view === DECLARATIVE_VIEW) {
            this.#updateRecords.clear();
        }
        this.performUpdate();
    }
    detach(overrideHideOnDetach) {
        super.detach(overrideHideOnDetach);
        this.#visible = false;
        this.#showHTMLCommentsSetting.removeChangeListener(this.#onShowHTMLCommentsChange, this);
        if (this.#updateModifiedNodesTimeout) {
            clearTimeout(this.#updateModifiedNodesTimeout);
            this.#updateModifiedNodesTimeout = undefined;
        }
        if (this.#view === DECLARATIVE_VIEW) {
            this.#updateRecords.clear();
        }
        this.performUpdate();
    }
    hideImagePreview() {
        this.#imagePreviewPopover?.hide();
    }
    imagePreviewPopoverForTest() {
        return this.#imagePreviewPopover;
    }
    issuePopoverHelperForTest() {
        return this.#issuePopoverHelper;
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
                else if (this.#view === DECLARATIVE_VIEW) {
                    void domModel.requestDocument().then(document => {
                        if (document && this.isShowing()) {
                            this.rootDOMNode = document;
                            this.onDocumentUpdated(domModel);
                        }
                    });
                }
                else {
                    void domModel.requestDocument();
                }
            }
        }
        super.show(parentElement, insertBefore, suppressOrphanWidgetError);
    }
}
const ElementsTreeOutlineBase = Common.ObjectWrapper.eventMixin(UI.TreeOutline.TreeOutline);
export class ElementsTreeOutline extends ElementsTreeOutlineBase {
    treeElementByNode;
    shadowRoot;
    elementInternal;
    includeRootDOMNode;
    selectEnabled;
    rootDOMNodeInternal;
    selectedDOMNodeInternal;
    visible;
    updateRecords;
    treeElementsBeingUpdated;
    visibleWidthInternal;
    isXMLMimeTypeInternal;
    suppressRevealAndSelect = false;
    previousHoveredElement;
    dragOverTreeElement;
    updateModifiedNodesTimeout;
    #topLayerContainerByDocument = new WeakMap();
    maxTreeDepth;
    enableContextMenu;
    showComments;
    showAIButton;
    disableEdits;
    expandRoot;
    #maxRowsShown;
    #showAllButton;
    domTreeWidget = null;
    get hoveredTreeElement() {
        return this.previousHoveredElement ?? null;
    }
    constructor(omitRootDOMNode, selectEnabled, hideGutter, maxTreeDepth, enableContextMenu, showComments, showAIButton, disableEdits, expandRoot, domTreeWidget) {
        super();
        this.domTreeWidget = domTreeWidget ?? null;
        this.renderSelection = true;
        this.treeElementByNode = new WeakMap();
        const shadowContainer = document.createElement('div');
        this.shadowRoot = UI.UIUtils.createShadowRootWithCoreStyles(shadowContainer, { cssFile: [elementsTreeOutlineStyles, CodeHighlighter.codeHighlighterStyles] });
        const outlineDisclosureElement = this.shadowRoot.createChild('div', 'elements-disclosure');
        this.elementInternal = this.element;
        this.elementInternal.classList.add('elements-tree-outline', 'source-code');
        this.maxTreeDepth = maxTreeDepth;
        this.enableContextMenu = enableContextMenu ?? true;
        this.showComments = showComments ?? true;
        this.showAIButton = showAIButton ?? true;
        this.disableEdits = disableEdits ?? false;
        this.expandRoot = expandRoot ?? false;
        this.elementInternal.classList.toggle('elements-hide-gutter', hideGutter);
        UI.ARIAUtils.setLabel(this.elementInternal, i18nString(UIStrings.pageDom));
        this.elementInternal.addEventListener('focusout', this.onfocusout.bind(this), false);
        this.elementInternal.addEventListener('mousedown', this.onmousedown.bind(this), false);
        this.elementInternal.addEventListener('mousemove', this.onmousemove.bind(this), false);
        this.elementInternal.addEventListener('mouseleave', this.onmouseleave.bind(this), false);
        if (!this.disableEdits) {
            this.elementInternal.addEventListener('dragstart', this.ondragstart.bind(this), false);
            this.elementInternal.addEventListener('dragover', this.ondragover.bind(this), false);
            this.elementInternal.addEventListener('dragleave', this.ondragleave.bind(this), false);
            this.elementInternal.addEventListener('drop', this.ondrop.bind(this), false);
            this.elementInternal.addEventListener('dragend', this.ondragend.bind(this), false);
        }
        outlineDisclosureElement.appendChild(this.elementInternal);
        this.element = shadowContainer;
        this.contentElement.setAttribute('jslog', `${VisualLogging.tree('elements')}`);
        this.includeRootDOMNode = !omitRootDOMNode;
        this.selectEnabled = selectEnabled;
        this.rootDOMNodeInternal = null;
        this.selectedDOMNodeInternal = null;
        this.visible = false;
        this.updateRecords = new Map();
        this.treeElementsBeingUpdated = new Set();
        this.setUseLightSelectionColor(true);
    }
    static forDOMModel(domModel) {
        return elementsTreeOutlineByDOMModel.get(domModel) || null;
    }
    deindentSingleNode() {
        const firstChild = this.firstChild();
        if (!firstChild || (firstChild && !firstChild.isExpandable())) {
            this.shadowRoot.querySelector('.elements-disclosure')?.classList.add('single-node');
        }
    }
    setWordWrap(wrap) {
        this.elementInternal.classList.toggle('elements-tree-nowrap', !wrap);
    }
    setMultilineEditing(multilineEditing) {
        this.domTreeWidget?.setMultilineEditing(multilineEditing);
    }
    visibleWidth() {
        return this.domTreeWidget?.visibleWidth ?? this.visibleWidthInternal ?? 0;
    }
    setVisibleWidth(width) {
        this.visibleWidthInternal = width;
    }
    setClipboardData(data) {
        this.domTreeWidget?.setClipboardData(data);
    }
    resetClipboardIfNeeded(removedNode) {
        this.domTreeWidget?.resetClipboardIfNeeded(removedNode);
    }
    performCopyOrCut(isCut, node, includeShadowRoots = false) {
        this.domTreeWidget?.performCopyOrCut(isCut, node, includeShadowRoots);
    }
    canPaste(targetNode) {
        return this.domTreeWidget?.canPaste(targetNode) ?? false;
    }
    pasteNode(targetNode) {
        this.domTreeWidget?.pasteNode(targetNode);
    }
    duplicateNode(targetNode) {
        this.domTreeWidget?.duplicateNode(targetNode);
    }
    setVisible(visible) {
        if (visible === this.visible) {
            return;
        }
        this.visible = visible;
        if (!this.visible) {
            this.domTreeWidget?.multilineEditing()?.cancel();
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
    set maxRowsShown(maxRows) {
        this.#maxRowsShown = maxRows;
        this.#updateShowAllButton();
    }
    #updateShowAllButton() {
        const container = this.shadowRoot.querySelector('.elements-disclosure');
        if (!container) {
            return;
        }
        if (!this.#maxRowsShown) {
            this.#showAllButton?.classList.add('hidden');
            container.style.removeProperty('--max-rows');
            container.classList.remove('elements-tree-truncated');
            return;
        }
        container.style.setProperty('--max-rows', String(this.#maxRowsShown));
        container.classList.add('elements-tree-truncated');
        // We use a microtask to wait for rendering so all node lines are rendered.
        window.requestAnimationFrame(() => {
            // The container has a max-height (based on --max-rows). If the total content height
            // (scrollHeight) is greater than the visible height (clientHeight), it means
            // some rows are hidden due to truncation, and we should show the "Show all" button.
            const isOverflowing = container.scrollHeight > container.clientHeight;
            if (!isOverflowing) {
                return;
            }
            if (!this.#showAllButton) {
                this.#showAllButton = UI.UIUtils.createTextButton('', () => {
                    this.dispatchEventToListeners(ElementsTreeOutline.Events.ShowAllRows);
                    this.dispatchEventToListeners(UI.TreeOutline.Events.ElementExpanded, this.rootElement());
                }, {
                    jslogContext: 'show-all-nodes',
                });
                this.#showAllButton.classList.add('elements-tree-show-all');
                this.shadowRoot.appendChild(this.#showAllButton);
            }
            this.#showAllButton.classList.remove('hidden');
            const computedStyle = window.getComputedStyle(container);
            const lineHeight = parseFloat(computedStyle.lineHeight) || 16;
            const truncatedLines = Math.round((container.scrollHeight - container.clientHeight) / lineHeight);
            if (truncatedLines > 0) {
                this.#showAllButton.textContent = i18nString(UIStrings.showAllLines, { PH1: truncatedLines });
            }
            else {
                this.#showAllButton?.classList.add('hidden');
            }
        });
    }
    highlightAdoptedStyleSheet(adoptedStyleSheet) {
        const parentDOMNode = !this.includeRootDOMNode && adoptedStyleSheet.parent === this.rootDOMNode && this.rootDOMNode ?
            this.rootElement() :
            this.createTreeElementFor(adoptedStyleSheet.parent);
        if (!parentDOMNode) {
            return;
        }
        const parentNode = parentDOMNode.firstChild();
        if (!(parentNode && parentNode instanceof AdoptedStyleSheetSetTreeElement)) {
            return;
        }
        for (const child of parentNode.children()) {
            if (child instanceof AdoptedStyleSheetTreeElement && child.adoptedStyleSheet === adoptedStyleSheet) {
                parentNode.expand();
                child.highlight();
                return;
            }
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
        return treeElement.isEditing || false;
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
            if (this.expandRoot) {
                treeElement.expand();
            }
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
        if (node instanceof Array) {
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
        for (const target of event.composedPath()) {
            if (target instanceof HTMLLIElement) {
                const element = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(target);
                if (element) {
                    return element;
                }
            }
        }
        const scrollContainer = this.element.parentElement;
        if (!scrollContainer) {
            return null;
        }
        const x = event.clientX;
        const y = event.clientY;
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
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
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
        const showInfo = !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event);
        if (this.domTreeWidget && element instanceof ElementsTreeElement) {
            this.domTreeWidget.setHoveredNode(element.node(), showInfo);
            return;
        }
        this.domTreeWidget?.setHoveredNode(null);
        this.setHoverEffect(element);
        this.highlightTreeElement(element, showInfo);
    }
    highlightTreeElement(element, showInfo) {
        if (element instanceof ElementsTreeElement) {
            const selectorList = element.isDisplayContents() ? '*' : undefined;
            element.node().domModel().overlayModel().highlightInOverlay({ node: element.node(), selectorList }, 'all', showInfo);
            return;
        }
        if (element instanceof ShortcutTreeElement) {
            element.domModel().overlayModel().highlightInOverlay({ deferredNode: element.deferredNode(), selectorList: undefined }, 'all', showInfo);
        }
    }
    onmouseleave(_event) {
        this.domTreeWidget?.setHoveredNode(null);
        this.setHoverEffect(null);
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    }
    ondragstart(event) {
        const treeElement = this.treeElementFromEventInternal(event);
        if (!(treeElement instanceof ElementsTreeElement)) {
            return false;
        }
        const textContent = treeElement.widget.contentElement.textContent || treeElement.listItemElement.textContent ||
            treeElement.node().nodeName().toLowerCase();
        const success = this.domTreeWidget?.onDragStart(treeElement.node(), event, textContent);
        return success;
    }
    ondragover(event) {
        const treeElement = this.treeElementFromEventInternal(event);
        if (!(treeElement instanceof ElementsTreeElement)) {
            this.clearDragOverTreeElementMarker();
            return false;
        }
        const success = this.domTreeWidget?.onDragOver(treeElement.node(), treeElement.isClosingTag(), event);
        if (success) {
            if (this.dragOverTreeElement !== treeElement) {
                this.clearDragOverTreeElementMarker();
                treeElement.listItemElement.classList.add('elements-drag-over');
                this.dragOverTreeElement = treeElement;
            }
        }
        else {
            this.clearDragOverTreeElementMarker();
        }
        return !success;
    }
    ondragleave(event) {
        this.clearDragOverTreeElementMarker();
        this.domTreeWidget?.onDragLeave(event);
        event.preventDefault();
        return false;
    }
    ondrop(event) {
        event.preventDefault();
        const treeElement = this.treeElementFromEventInternal(event);
        if (treeElement instanceof ElementsTreeElement) {
            this.domTreeWidget?.onDrop(treeElement.node(), treeElement.isClosingTag(), event);
        }
        this.clearDragOverTreeElementMarker();
    }
    ondragend(event) {
        event.preventDefault();
        this.clearDragOverTreeElementMarker();
        this.domTreeWidget?.onDragEnd(event);
    }
    clearDragOverTreeElementMarker() {
        if (this.dragOverTreeElement) {
            this.dragOverTreeElement.listItemElement.classList.remove('elements-drag-over');
            delete this.dragOverTreeElement;
        }
    }
    showContextMenu = () => { };
    runPendingUpdates() {
        this.updateModifiedNodes();
    }
    toggleEditAsHTML(node, startEditing, callback) {
        this.domTreeWidget?.toggleEditAsHTML(node, startEditing, callback);
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
    async toggleHideElement(node) {
        await node.toggleHideElement();
    }
    isToggledToHidden(node) {
        return node.isToggledToHidden();
    }
    reset() {
        this.rootDOMNode = null;
        this.selectDOMNode(null, false);
        this.setClipboardData(null);
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
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
        domModel.addEventListener(SDK.DOMModel.Events.DocumentURLChanged, this.documentURLChanged, this);
        domModel.addEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
        domModel.addEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
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
        domModel.removeEventListener(SDK.DOMModel.Events.DocumentURLChanged, this.documentURLChanged, this);
        domModel.removeEventListener(SDK.DOMModel.Events.ChildNodeCountUpdated, this.childNodeCountUpdated, this);
        domModel.removeEventListener(SDK.DOMModel.Events.DistributedNodesChanged, this.distributedNodesChanged, this);
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
    documentURLChanged(event) {
        this.addUpdateRecord(event.data).charDataModified();
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
    isMaxDepthReached(node) {
        if (this.maxTreeDepth === undefined || this.maxTreeDepth === Infinity) {
            return false;
        }
        // Allow ShadowRoots and Documents to expand one more level.
        if (node.nodeType() === Node.DOCUMENT_NODE || node.isShadowRoot()) {
            return false;
        }
        const maxDepth = this.maxTreeDepth;
        let depth = 0;
        let current = node;
        const rootNode = this.rootDOMNode;
        while (current && current !== rootNode) {
            depth++;
            current = current.parentNode;
        }
        if (this.includeRootDOMNode) {
            depth++;
        }
        if (depth >= maxDepth) {
            return true;
        }
        return false;
    }
    createElementTreeElement(node, isClosingTag) {
        if (node instanceof Array) {
            return new AdoptedStyleSheetSetTreeElement(node);
        }
        const treeElement = new ElementsTreeElement(node, isClosingTag);
        if (this.domTreeWidget) {
            treeElement.setExpandedChildrenLimit(this.domTreeWidget.expandedChildrenLimit(node));
        }
        treeElement.setExpandable(!isClosingTag && this.hasVisibleChildren(node));
        if (node.nodeType() === Node.ELEMENT_NODE && node.parentNode && node.parentNode.nodeType() === Node.DOCUMENT_NODE &&
            !node.parentNode.parentNode) {
            treeElement.setCollapsible(false);
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
        const visibleChildren = [];
        if (node.adoptedStyleSheetsForNode.length) {
            visibleChildren.push(node.adoptedStyleSheetsForNode);
        }
        visibleChildren.push(...ElementsTreeElement.visibleShadowRoots(node));
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
            if (!this.showComments) {
                children = children.filter(n => n.nodeType() !== Node.COMMENT_NODE);
            }
            visibleChildren.push(...children);
        }
        const afterPseudoElement = node.afterPseudoElement();
        if (afterPseudoElement) {
            visibleChildren.push(afterPseudoElement);
        }
        const pickerIconPseudoElement = node.pickerIconPseudoElement();
        if (pickerIconPseudoElement) {
            visibleChildren.push(pickerIconPseudoElement);
        }
        const interestButtonPseudoElement = node.interestButtonPseudoElement();
        if (interestButtonPseudoElement) {
            visibleChildren.push(interestButtonPseudoElement);
        }
        const backdropPseudoElement = node.backdropPseudoElement();
        if (backdropPseudoElement) {
            visibleChildren.push(backdropPseudoElement);
        }
        return visibleChildren;
    }
    hasVisibleChildren(node) {
        if (this.isMaxDepthReached(node)) {
            return false;
        }
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
        if (this.domTreeWidget && this.domTreeWidget.expandedChildrenLimit(treeElement.node()) !== expandedChildrenLimit) {
            this.domTreeWidget.setExpandedChildrenLimit(treeElement.node(), expandedChildrenLimit);
        }
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
    affectedByStartingStylesFlagUpdated(event) {
        const { node } = event.data;
        const treeElement = this.treeElementByNode.get(node);
        if (treeElement && isOpeningTag(treeElement.tagTypeContext)) {
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
        Events["ShowAllRows"] = "ShowAllRows";
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