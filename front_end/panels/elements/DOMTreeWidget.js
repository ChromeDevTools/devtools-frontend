// Copyright 2021 The Chromium Authors
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
import * as SDK from '../../core/sdk/sdk.js';
import * as Badges from '../../models/badges/badges.js';
import * as ChangeTracker from '../../models/change_tracker/change_tracker.js';
import * as Elements from '../../models/elements/elements.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as IssueCounter from '../../ui/components/issue_counter/issue_counter.js';
import * as UIComponentUtils from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as SettingsUI from '../../ui/settings/settings.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AdoptedStyleSheetContentsWidget } from './AdoptedStyleSheetTreeElement.js';
import * as ElementsComponents from './components/components.js';
import { cssPath, jsPath, xPath } from './DOMPath.js';
import { showContextMenu } from './DOMTreeContextMenu.js';
import { adornerRef, buildChangeSelector, DOMTreeElementWidget, ForbiddenClosingTagElements, handleAdornerKeydown, InitialChildrenLimit, } from './DOMTreeElementWidget.js';
import domTreeWidgetStyles from './domTreeWidget.css.js';
import { getElementIssueDetails } from './ElementIssueUtils.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
const { html, nothing, render, Directives: { classMap, ifDefined, repeat, styleMap } } = Lit;
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
const str_ = i18n.i18n.registerUIStrings('panels/elements/DOMTreeWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export { domTreeWidgetStyles };
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
function nodeHasVisibleChildren(node, options) {
    if (isMaxDepthReached(node, options.rootDOMNode, options.maxTreeDepth, options.omitRootDOMNode)) {
        return false;
    }
    if (node.isIframe() || node.contentDocument() || node.templateContent() ||
        DOMTreeElementWidget.visibleShadowRoots(node).length || node.hasPseudoElements() || node.isInsertionPoint() ||
        node.adoptedStyleSheetsForNode.length) {
        return true;
    }
    return Boolean(node.childNodeCount()) && !DOMTreeElementWidget.canShowInlineText(node);
}
function nodeNeedsClosingTag(node, hasChildren) {
    return hasChildren && node.nodeType() === Node.ELEMENT_NODE &&
        !ForbiddenClosingTagElements.has(node.nodeName().toLowerCase()) && !node.pseudoType();
}
/** Children of the document element (e.g. `<html>`) are always shown expanded. */
function isNotCollapsible(node) {
    return node.nodeType() === Node.ELEMENT_NODE && node.parentNode?.nodeType() === Node.DOCUMENT_NODE &&
        !node.parentNode.parentNode;
}
function isBeingEditedAsHTML(state, node) {
    return state.multilineEditingNode === node ||
        (state.nodeToEdit?.node === node && Boolean(state.nodeToEdit.isEditAsHTML));
}
function getVisibleChildren(node, { showComments }) {
    const children = [];
    children.push(...DOMTreeElementWidget.visibleShadowRoots(node));
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
/**
 * Returns the closest sibling of `node` that is part of `visibleChildren`,
 * preferring following siblings over preceding ones.
 */
function findVisibleSibling(node, visibleChildren) {
    for (let candidate = node.nextSibling; candidate; candidate = candidate.nextSibling) {
        if (visibleChildren.includes(candidate)) {
            return candidate;
        }
    }
    for (let candidate = node.previousSibling; candidate; candidate = candidate.previousSibling) {
        if (visibleChildren.includes(candidate)) {
            return candidate;
        }
    }
    return null;
}
function computeLeftIndent(depth, isExpandable) {
    return 12 * (depth - 1) + (isExpandable ? 1 : 12);
}
export const DEFAULT_VIEW = (input, _output, target) => {
    let allRootNodes = [];
    let rootNodes = [];
    const rootDOMNode = input.rootDOMNode;
    if (rootDOMNode) {
        if (input.omitRootDOMNode) {
            allRootNodes = getVisibleChildren(rootDOMNode, input);
            const rootLimit = input.expandedChildrenLimit(rootDOMNode);
            rootNodes = allRootNodes.slice(0, rootLimit);
        }
        else {
            rootNodes = [rootDOMNode];
        }
    }
    const on = Lit.Directive.directive(Lit.CustomDirectives.InterceptBindingDirective);
    const treeItemJslog = (context, drag) => VisualLogging.treeItem(context).parent('elementsTreeOutline').track({
        keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
        resize: true,
        ...(drag ? { drag: true } : {}),
        click: true,
    });
    const renderShortcut = (shortcut, shortcutDepth) => {
        const hasShortcutChildren = shortcut.childShortcuts.length > 0;
        const isShortcutExpanded = input.isTopLayerShortcutExpanded(shortcut);
        const isShortcutSelected = input.selectedTopLayerShortcut === shortcut;
        let title = shortcut.nodeName.toLowerCase();
        if (shortcut.nodeType === Node.ELEMENT_NODE) {
            title = '<' + title + '>';
        }
        const onShortcutExpand = (event) => {
            input.onToggleTopLayerShortcutExpanded(shortcut, event.detail.expanded);
        };
        const onShortcutSelect = () => {
            input.onSelectTopLayerShortcut(shortcut);
        };
        const onReveal = (event) => {
            event.stopPropagation();
            input.onRevealTopLayerShortcut(shortcut);
        };
        const onShortcutMouseMove = (event) => {
            event.stopPropagation();
            shortcut.deferredNode.highlight();
        };
        const onShortcutMouseLeave = (event) => {
            event.stopPropagation();
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        };
        // clang-format off
        return html `
      <li role="treeitem"
          ?selected=${isShortcutSelected}
          ?open=${isShortcutExpanded}
          class="elements-tree-shortcut"
          style=${styleMap({ '--indent': `${computeLeftIndent(shortcutDepth, hasShortcutChildren)}px` })}
          @select=${on(onShortcutSelect)}
          @expand=${on(onShortcutExpand)}
          @mousemove=${on(onShortcutMouseMove)}
          @mouseleave=${on(onShortcutMouseLeave)}
          jslog=${treeItemJslog()}>
        <span class="elements-tree-shortcut-title">\u21AA ${title}</span>
        <devtools-adorner
            .name=${ElementsComponents.AdornerManager.RegisteredAdorners.REVEAL}
            class="adorner-reveal clickable"
            role=button
            tabindex=0
            jslog=${VisualLogging.adorner('reveal').track({ click: true })}
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
            ${shortcut.childShortcuts.map(child => renderShortcut(child, shortcutDepth + 1))}
          </ul>
        ` : nothing}
      </li>
    `;
        // clang-format on
    };
    const renderTopLayerContainer = (doc, containerDepth) => {
        const shortcuts = input.getTopLayerShortcuts(doc);
        if (shortcuts.length === 0) {
            return nothing;
        }
        const isTopLayerExpanded = input.isTopLayerExpanded(doc);
        const onTopLayerExpand = (event) => {
            input.onToggleTopLayerExpanded(doc, event.detail.expanded);
        };
        const onTopLayerSelect = () => {
            input.onSelectTopLayerContainer(doc);
        };
        // clang-format off
        return html `
          <li role="treeitem"
              ?open=${isTopLayerExpanded}
              class="elements-tree-top-layer-container"
              style=${styleMap({ '--indent': `${computeLeftIndent(containerDepth, true)}px` })}
              @select=${on(onTopLayerSelect)}
              @expand=${on(onTopLayerExpand)}
              jslog=${treeItemJslog()}>
            <span class="elements-tree-shortcut-title">#top-layer</span>
            <ul role="group">
              ${shortcuts.map(sc => renderShortcut(sc, containerDepth + 1))}
            </ul>
          </li>
        `;
        // clang-format on
    };
    const renderAdoptedStyleSheet = (sheet, depth) => {
        const header = sheet.cssModel.styleSheetHeaderForId(sheet.id);
        const linkText = header?.sourceURL;
        const isExpanded = input.isAdoptedStyleSheetExpanded(sheet);
        const isSelected = input.selectedAdoptedStyleSheet === sheet;
        const onExpand = (event) => {
            input.onToggleAdoptedStyleSheetExpanded(sheet, event.detail.expanded);
        };
        const onSelect = () => {
            input.onSelectAdoptedStyleSheet(sheet);
        };
        // clang-format off
        return html `
      <li role="treeitem"
          ?selected=${isSelected}
          ?open=${isExpanded}
          class="elements-tree-adopted-style-sheet"
          style=${styleMap({ '--indent': `${computeLeftIndent(depth, true)}px` })}
          @select=${on(onSelect)}
          @expand=${on(onExpand)}
          jslog=${treeItemJslog('adopted-style-sheet')}>
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
                  style=${styleMap({ '--indent': `${computeLeftIndent(depth + 1, false)}px` })}
                  jslog=${treeItemJslog('adopted-style-sheet-contents')}>
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
        const isExpanded = input.isAdoptedStyleSheetsExpanded(node);
        const onExpand = (event) => {
            input.onToggleAdoptedStyleSheetsExpanded(node, event.detail.expanded);
        };
        const onSelect = () => {
            input.onSelectAdoptedStyleSheets(node);
        };
        // clang-format off
        return html `
      <li role="treeitem"
          ?open=${isExpanded}
          class="elements-tree-adopted-style-sheets"
          style=${styleMap({ '--indent': `${computeLeftIndent(depth, true)}px` })}
          @select=${on(onSelect)}
          @expand=${on(onExpand)}
          jslog=${treeItemJslog('adopted-style-sheets')}>
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
    const resolveNodeShape = (node) => {
        const editingAsHTML = isBeingEditedAsHTML(input, node);
        const hasChildren = !editingAsHTML && nodeHasVisibleChildren(node, input);
        const isCollapsible = !editingAsHTML && !isNotCollapsible(node);
        const isExpanded = !isCollapsible ||
            Boolean(input.currentHighlightedNode && isAncestorOf(node, input.currentHighlightedNode)) ||
            input.isNodeExpanded(node);
        const allChildren = hasChildren && isExpanded ? getVisibleChildren(node, input) : [];
        const children = allChildren.slice(0, input.expandedChildrenLimit(node));
        return {
            isEditingAsHTML: editingAsHTML,
            hasChildren,
            isCollapsible,
            isExpanded,
            children,
            remainingChildrenCount: allChildren.length - children.length,
            needsClosingTag: nodeNeedsClosingTag(node, hasChildren),
        };
    };
    const countTopLayerRows = (doc) => {
        const shortcuts = input.getTopLayerShortcuts(doc);
        if (shortcuts.length === 0) {
            return 0;
        }
        const countShortcutRows = (shortcut) => {
            let shortcutRows = 1;
            if (shortcut.childShortcuts.length > 0 && input.isTopLayerShortcutExpanded(shortcut)) {
                for (const child of shortcut.childShortcuts) {
                    shortcutRows += countShortcutRows(child);
                }
            }
            return shortcutRows;
        };
        let rows = 1;
        if (input.isTopLayerExpanded(doc)) {
            for (const shortcut of shortcuts) {
                rows += countShortcutRows(shortcut);
            }
        }
        return rows;
    };
    const countAdoptedStyleSheetsRows = (node) => {
        const sheets = node.adoptedStyleSheetsForNode;
        if (!sheets || sheets.length === 0) {
            return 0;
        }
        let rows = 1; // The "#adopted-style-sheets" container
        if (input.isAdoptedStyleSheetsExpanded(node)) {
            for (const sheet of sheets) {
                rows += 1; // The sheet row
                if (input.isAdoptedStyleSheetExpanded(sheet) && sheet.cssModel.styleSheetHeaderForId(sheet.id)) {
                    rows += 1; // The AdoptedStyleSheetContentsWidget row
                }
            }
        }
        return rows;
    };
    const countVisibleRowsForNode = (node) => {
        let rows = 1;
        const shape = resolveNodeShape(node);
        if (shape.hasChildren && shape.isExpanded) {
            rows += countAdoptedStyleSheetsRows(node);
            for (const child of shape.children) {
                rows += countVisibleRowsForNode(child);
            }
            if (shape.remainingChildrenCount > 0) {
                rows += 1;
            }
            if (node instanceof SDK.DOMModel.DOMDocument) {
                rows += countTopLayerRows(node);
            }
            if (shape.needsClosingTag) {
                rows += 1;
            }
        }
        return rows;
    };
    const countAllVisibleRows = () => {
        let totalRows = 0;
        if (input.omitRootDOMNode && input.rootDOMNode) {
            totalRows += countAdoptedStyleSheetsRows(input.rootDOMNode);
        }
        for (const node of rootNodes) {
            totalRows += countVisibleRowsForNode(node);
        }
        if (input.omitRootDOMNode && input.rootDOMNode) {
            const remaining = allRootNodes.length - rootNodes.length;
            if (remaining > 0) {
                totalRows += 1;
            }
            if (input.rootDOMNode instanceof SDK.DOMModel.DOMDocument) {
                totalRows += countTopLayerRows(input.rootDOMNode);
            }
        }
        return totalRows;
    };
    const renderNode = (node, depth = 0) => {
        const isDOMNodeSelected = input.selectedNode === node;
        const isSelected = Boolean(input.selectEnabled) && isDOMNodeSelected;
        const isOpeningHovered = (input.currentHighlightedNode === node) || (input.hoveredNode === node && !input.hoveredClosingTag);
        const isClosingHovered = input.hoveredNode === node && input.hoveredClosingTag;
        const { isEditingAsHTML, hasChildren, isCollapsible, isExpanded, children, remainingChildrenCount, needsClosingTag } = resolveNodeShape(node);
        const isExpandable = hasChildren && isCollapsible;
        const onSelect = (isClosingTag = false, selectedByUser = false) => {
            input.onSelect(node, isClosingTag, selectedByUser);
        };
        const onExpand = (event) => {
            if (!isCollapsible) {
                return;
            }
            input.onExpand(node, event.detail.expanded);
        };
        const isDragOver = input.dragOverNode?.node === node && !input.dragOverNode.isClosingTag;
        const isClosingTagDragOver = input.dragOverNode?.node === node && Boolean(input.dragOverNode.isClosingTag);
        const isDraggable = !input.disableEdits && input.isValidDragSource(node);
        const classes = classMap({
            selected: isSelected && !input.selectedClosingTag,
            hovered: isOpeningHovered,
            'in-clipboard': input.isNodeInClipboard(node),
            'elements-drag-over': isDragOver,
            'always-parent': !isCollapsible && !isEditingAsHTML,
        });
        // The opening and the closing tag are separate rows that report the
        // same node with a different `isClosingTag`.
        const onMouseMove = (isClosingTag) => (event) => {
            const currentTarget = event.currentTarget;
            if (currentTarget && event.target.closest('li[role="treeitem"]') !== currentTarget) {
                return;
            }
            const showInfo = !UI.KeyboardShortcut.KeyboardShortcut.eventHasEitherCtrlOrMeta(event);
            input.onHoverNode(node, showInfo, isClosingTag);
        };
        const onContextMenu = (event) => {
            event.stopPropagation();
            input.onContextMenu(node, event);
        };
        // Prevent the native word selection on double click. The double click
        // starts inline editing instead. Inside an active inline editor the
        // native selection must stay enabled.
        const onMouseDown = (event) => {
            if (event.detail < 2 || UI.UIUtils.isBeingEdited(event.target)) {
                return;
            }
            event.preventDefault();
        };
        const onDragStart = (event) => {
            event.stopPropagation();
            const currentTarget = event.currentTarget;
            // Only use the row's own content, not the nested child rows.
            const textContent = currentTarget?.querySelector(':scope > devtools-widget')?.textContent ||
                currentTarget?.textContent || undefined;
            input.onDragStart(node, event, textContent);
        };
        const onDragOver = (isClosingTag) => (event) => {
            event.stopPropagation();
            input.onDragOver(node, isClosingTag, event);
        };
        const onDragLeave = (event) => {
            event.stopPropagation();
            input.onDragLeave(event);
        };
        const onDrop = (isClosingTag) => (event) => {
            event.stopPropagation();
            input.onDrop(node, isClosingTag, event);
        };
        const onDragEnd = (event) => {
            event.stopPropagation();
            input.onDragEnd(event);
        };
        // clang-format off
        return html `
      <li role="treeitem"
          data-backend-node-id=${ifDefined(node.backendNodeId())}
          data-target-id=${ifDefined(node.domModel().target().id())}
          selectable=${input.selectEnabled ? 'true' : 'false'}
          ?selected=${isSelected && !input.selectedClosingTag}
          class=${classes}
          style=${styleMap({ '--indent': `${computeLeftIndent(depth, isExpandable)}px` })}
          ?open=${hasChildren && isExpanded && !isEditingAsHTML}
          draggable=${isDraggable ? 'true' : 'false'}
          @select=${on((event) => onSelect(false, Boolean(event.detail?.selectedByUser)))}
          @expand=${on(onExpand)}
          @mousemove=${on(onMouseMove(/* isClosingTag= */ false))}
          @mousedown=${on(onMouseDown)}
          @contextmenu=${on(onContextMenu)}
          @dragstart=${on(onDragStart)}
          @dragover=${on(onDragOver(/* isClosingTag= */ false))}
          @dragleave=${on(onDragLeave)}
          @drop=${on(onDrop(/* isClosingTag= */ false))}
          @dragend=${on(onDragEnd)}
          jslog=${treeItemJslog(undefined, true)}>${UI.Widget.widget(DOMTreeElementWidget, {
            node,
            isClosingTag: false,
            renderSelection: false,
            expanded: isExpanded && !isEditingAsHTML,
            isExpandable: hasChildren,
            selected: isSelected && !input.selectedClosingTag,
            isDOMNodeSelected,
            hovered: isOpeningHovered,
            searchQuery: input.searchMatchNode === node ? input.searchMatchQuery : null,
            computeLeftIndent: computeLeftIndent(depth, isExpandable),
            disableEdits: input.disableEdits,
            showAIButton: input.showAIButton,
            initialEdit: input.nodeToEdit?.node === node ? input.nodeToEdit : null,
            onInitialEditCompleted: input.onInitialEditCompleted,
            attributeToHighlight: input.attributeToHighlight?.node === node ? input.attributeToHighlight.attribute : null,
            onAttributeHighlighted: input.onAttributeHighlighted,
            adornersUpdateVersion: input.nodeAdornerVersions.get(node) ?? 0,
            popoverAdornerActive: input.forceOpenPopovers.has(node),
            onPopoverAdornerToggled: input.onPopoverAdornerToggled,
            interestAdornerActive: input.forceOpenInterests.has(node),
            onInterestAdornerToggled: input.onInterestAdornerToggled,
            expandNode: isCollapsible ? () => input.onExpand(node, true) : undefined,
            revealInTopLayer: input.onRevealInTopLayer,
            setMultilineEditing: (multilineEditing, n) => input.onSetMultilineEditing(multilineEditing, n ?? node),
            visibleWidth: input.visibleWidth,
            selectDOMNode: (n, selectedByUser) => input.onSelect(n, false, Boolean(selectedByUser)),
            selectNodeAfterEdit: (wasExpanded, error, newNode, moveDirection) => {
                input.onSelectNodeAfterEdit(wasExpanded, error, newNode, moveDirection);
            },
            toggleHideElement: (n) => {
                return input.onToggleHideElement(n) ?? Promise.resolve();
            },
            isToggledToHidden: (n) => input.isToggledToHidden(n) ?? false,
            showContextMenu: (event) => {
                if (event instanceof MouseEvent) {
                    input.onContextMenu(node, event);
                }
            },
            updateRecord: input.updateRecordForNode(node) ?? null,
        })}${hasChildren ? html `<ul role="group">
            ${isExpanded && !isEditingAsHTML ? html `
              ${node.adoptedStyleSheetsForNode.length > 0 ? renderAdoptedStyleSheets(node, depth + 1) : nothing}
              ${repeat(children, child => child.id, child => renderNode(child, depth + 1))}
              ${remainingChildrenCount > 0 ? html `
                <li role="treeitem"
                    selectable="false"
                    class="elements-tree-expand-all"
                    style=${styleMap({ '--indent': `${computeLeftIndent(depth + 1, false)}px` })}
                    jslog=${treeItemJslog('show-all-nodes')}><devtools-button
                      .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                      title=${i18nString(UIStrings.showAllNodesDMore, { PH1: remainingChildrenCount })}
                      @click=${on((event) => {
            event.stopPropagation();
            input.onExpandAllChildren(node);
        })}>${i18nString(UIStrings.showAllNodesDMore, { PH1: remainingChildrenCount })}</devtools-button></li>
              ` : nothing}
              ${node.isInsertionPoint() ? node.distributedNodes().map(distributedNode => renderShortcut(distributedNode, depth + 1)) : nothing}
              ${node instanceof SDK.DOMModel.DOMDocument ? renderTopLayerContainer(node, depth + 1) : nothing}
              ${needsClosingTag ? html `
                <li role="treeitem"
                    data-backend-node-id=${ifDefined(node.backendNodeId())}
                    data-target-id=${ifDefined(node.domModel().target().id())}
                    selectable=${input.selectEnabled ? 'true' : 'false'}
                    ?selected=${isSelected && input.selectedClosingTag}
                    class=${classMap({
            selected: isSelected && input.selectedClosingTag,
            hovered: isClosingHovered,
            'elements-drag-over': isClosingTagDragOver,
        })}
                    style=${styleMap({ '--indent': `${computeLeftIndent(depth + 1, false)}px` })}
                    draggable=${isDraggable ? 'true' : 'false'}
                    jslog=${treeItemJslog(undefined, true)}
                    @select=${on((event) => onSelect(true, Boolean(event.detail?.selectedByUser)))}
                    @contextmenu=${on(onContextMenu)}
                    @mousemove=${on(onMouseMove(/* isClosingTag= */ true))}
                    @mousedown=${on(onMouseDown)}
                    @dragstart=${on(onDragStart)}
                    @dragover=${on(onDragOver(/* isClosingTag= */ true))}
                    @dragleave=${on(onDragLeave)}
                    @drop=${on(onDrop(/* isClosingTag= */ true))}
                    @dragend=${on(onDragEnd)}>${UI.Widget.widget(DOMTreeElementWidget, {
            node,
            isClosingTag: true,
            renderSelection: false,
            expanded: false,
            isExpandable: false,
            selected: isSelected && input.selectedClosingTag,
            isDOMNodeSelected,
            hovered: isClosingHovered,
            computeLeftIndent: computeLeftIndent(depth + 1, false),
            disableEdits: input.disableEdits,
            showAIButton: false,
            showContextMenu: (event) => {
                if (event instanceof MouseEvent) {
                    input.onContextMenu(node, event);
                }
            },
            updateRecord: input.updateRecordForNode(node) ?? null,
        })}</li>
              ` : nothing}
            ` : nothing}
          </ul>` : nothing}</li>
    `;
        // clang-format on
    };
    const isSingleNode = Boolean(input.deindentSingleNode && rootNodes.length === 1 && !nodeHasVisibleChildren(rootNodes[0], input));
    const disclosureClasses = classMap({
        'elements-disclosure': true,
        'single-node': isSingleNode,
        'elements-tree-truncated': Boolean(input.maxRowsShown),
    });
    const disclosureStyles = styleMap({
        '--max-rows': input.maxRowsShown ? String(input.maxRowsShown) : null,
    });
    const totalVisibleRows = input.maxRowsShown ? countAllVisibleRows() : 0;
    const truncatedLines = input.maxRowsShown ? Math.max(0, totalVisibleRows - input.maxRowsShown) : 0;
    // This widget renders without a shadow root, so you must scope its
    // stylesheets. Otherwise, broad rules such as `* {min-width: 0}` in
    // `inspectorCommon.css` apply to the host's whole tree scope and break the
    // layout of hosts such as the AI assistance chat.
    // clang-format off
    render(html `
    <style>@scope to (devtools-widget > *) { ${UI.inspectorCommonStyles} }</style>
    <style>@scope to (devtools-widget > *) { ${domTreeWidgetStyles} }</style>
    <style>@scope to (devtools-widget > *) { ${CodeHighlighter.codeHighlighterStyles} }</style>
    <div class=${disclosureClasses} style=${disclosureStyles}>
      <devtools-tree
        class="elements-tree-outline ${input.wrap ? '' : 'elements-tree-nowrap'} ${input.hideGutter ? 'elements-hide-gutter' : ''} ${isSingleNode ? 'single-node' : ''}"
        disclosure-class="elements-disclosure ${isSingleNode ? 'single-node' : ''} ${input.maxRowsShown ? 'elements-tree-truncated' : ''}"
        jslog=${VisualLogging.tree('elements')}
        ?show-selection-on-keyboard-focus=${input.showSelectionOnKeyboardFocus}
        @enter=${(event) => event.preventDefault()}
        @keydown=${input.onKeyDown}
        @clipboard-copy=${(event) => input.onCopyOrCut(false, event)}
        @clipboard-cut=${(event) => input.onCopyOrCut(true, event)}
        @clipboard-paste=${(event) => input.onPaste(event)}
        @mouseleave=${input.onLeave}
        .template=${html `
          <style>${UI.inspectorCommonStyles}</style>
          <style>${domTreeWidgetStyles}</style>
          <style>${CodeHighlighter.codeHighlighterStyles}</style>
          <ul role="tree" class="elements-tree-outline source-code ${input.wrap ? '' : 'elements-tree-nowrap'} ${input.hideGutter ? 'elements-hide-gutter' : ''} ${isSingleNode ? 'single-node' : ''}" aria-label=${i18nString(UIStrings.pageDom)}>
            ${input.omitRootDOMNode && input.rootDOMNode && input.rootDOMNode.adoptedStyleSheetsForNode.length > 0 ?
        renderAdoptedStyleSheets(input.rootDOMNode, 0) : nothing}
            ${repeat(rootNodes, node => node.id, node => renderNode(node))}
            ${input.omitRootDOMNode && input.rootDOMNode ? (() => {
        const remaining = allRootNodes.length - rootNodes.length;
        if (remaining <= 0) {
            return nothing;
        }
        const root = input.rootDOMNode;
        return html `
                <li role="treeitem"
                    selectable="false"
                    class="elements-tree-expand-all"
                    style=${styleMap({ '--indent': `${computeLeftIndent(0, false)}px` })}
                    jslog=${treeItemJslog('show-all-nodes')}><devtools-button
                    .variant=${"outlined" /* Buttons.Button.Variant.OUTLINED */}
                    title=${i18nString(UIStrings.showAllNodesDMore, { PH1: remaining })}
                    @click=${on((event) => {
            event.stopPropagation();
            input.onExpandAllChildren(root);
        })}>${i18nString(UIStrings.showAllNodesDMore, { PH1: remaining })}</devtools-button></li>
              `;
    })() : nothing}
            ${input.omitRootDOMNode && input.rootDOMNode instanceof SDK.DOMModel.DOMDocument ? renderTopLayerContainer(input.rootDOMNode, 0) : nothing}
          </ul>
        `}>
      </devtools-tree>
    </div>
    ${truncatedLines > 0 ? html `
      <button
        type="button"
        class="elements-tree-show-all"
        jslog=${VisualLogging.action('show-all-nodes').track({ click: true })}
        @click=${input.onClearMaxRows}>
        ${i18nString(UIStrings.showAllLines, { PH1: truncatedLines })}
      </button>
    ` : nothing}
  `, target);
    // clang-format on
    if (input.nodesWithDirtyAdorners.size > 0) {
        input.onDirtyAdornersUpdated();
    }
};
function getElementsTreeWidgetAndNode(element) {
    let current = element;
    while (current) {
        if (current.tagName === 'LI') {
            const devtoolsWidget = current.querySelector(':scope > devtools-widget, :scope > .tree-element-title > devtools-widget');
            if (devtoolsWidget) {
                const widget = UI.Widget.Widget.get(devtoolsWidget);
                if (widget instanceof DOMTreeElementWidget) {
                    return { node: widget.node, widget };
                }
            }
        }
        current = current.parentElementOrShadowHost();
    }
    return {};
}
/**
 * Presenter for the DOM tree shown in the Elements panel. Renders the tree
 * declaratively via `<devtools-tree>` and `ElementsTreeWidget`.
 */
export class DOMTreeWidget extends UI.Widget.Widget {
    static INJECT = [ChangeTracker.ChangeTracker.ChangeTracker];
    omitRootDOMNode = false;
    selectEnabled = false;
    hideGutter = false;
    showSelectionOnKeyboardFocus = false;
    deindentSingleNode = false;
    onSelectedNodeChanged = () => { };
    onElementsTreeUpdated = () => { };
    onElementCollapsed = () => { };
    onElementExpanded = () => { };
    onDocumentUpdated = () => { };
    #maxTreeDepth;
    #enableContextMenu = true;
    #showHTMLCommentsSetting = Common.Settings.Settings.instance().resolve(SettingsUI.ElementsSettings.showHTMLCommentsSettingDescriptor);
    #lastObservedShowHTMLCommentsSetting = this.#showHTMLCommentsSetting.get();
    #showComments = this.#lastObservedShowHTMLCommentsSetting;
    #showAIButton = true;
    #disableEdits = false;
    #expandRoot = false;
    #visibleWidth;
    #wrap = false;
    #maxRows;
    #changeTracker;
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
    #expandRootNode(node) {
        if (!this.#expandRoot && !this.omitRootDOMNode) {
            return;
        }
        this.#expandedNodes.add(node);
        const expandChildren = () => {
            for (const child of node.children() ?? []) {
                if (isNotCollapsible(child) || (this.#expandRoot && this.omitRootDOMNode)) {
                    this.setNodeExpanded(child, true);
                }
            }
        };
        if (node.children()) {
            expandChildren();
        }
        else if (node.childNodeCount()) {
            void node.getChildNodes(() => {
                expandChildren();
                this.performUpdate();
            });
        }
    }
    set rootDOMNode(node) {
        this.#rootDOMNode = node;
        if (node) {
            this.#expandRootNode(node);
        }
        this.performUpdate();
    }
    get rootDOMNode() {
        return this.#rootDOMNode;
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
        this.#validateSelectedNode();
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
        if (this.#rootDOMNode) {
            this.#expandRootNode(this.#rootDOMNode);
        }
        this.performUpdate();
    }
    #currentHighlightedNode = null;
    #domModelListeners = new Map();
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
    #highlightThrottler = new Common.Throttler.Throttler(100);
    get changeTracker() {
        // The widget is also created without dependency injection (e.g. by
        // ElementsPanel), so the changeTracker can be empty, relying on the manual
        // resolution. Note that this only works once the widget is attached to the
        // DOM.
        this.#changeTracker ??=
            UI.Widget.lookupUniverseForElement(this.contentElement)?.get(ChangeTracker.ChangeTracker.ChangeTracker);
        return this.#changeTracker;
    }
    constructor(element, [changeTracker] = [], view = DEFAULT_VIEW) {
        super(element, {
            useShadowDom: false,
            delegatesFocus: false,
        });
        this.#view = view;
        this.#changeTracker = changeTracker;
        this.#setupPopovers();
    }
    // Global listeners are registered while the widget is showing (see
    // wasShown/willHide) so that hidden or abandoned trees (e.g. the ones the
    // Console creates per logged DOM node) do not stay alive through them.
    #globalListenersRegistered = false;
    #registerGlobalListeners() {
        if (this.#globalListenersRegistered) {
            return;
        }
        this.#globalListenersRegistered = true;
        this.#showHTMLCommentsSetting.addChangeListener(this.#onShowHTMLCommentsChange, this);
        if (Common.Settings.Settings.instance()
            .resolve(SettingsUI.ElementsSettings.highlightNodeOnHoverInOverlaySettingDescriptor)
            .get()) {
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "HighlightNodeRequested" /* SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED */, this.#highlightNode, this, { scoped: true });
            SDK.TargetManager.TargetManager.instance().addModelListener(SDK.OverlayModel.OverlayModel, "InspectModeWillBeToggled" /* SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED */, this.#onInspectModeWillBeToggled, this, { scoped: true });
        }
    }
    #unregisterGlobalListeners() {
        if (!this.#globalListenersRegistered) {
            return;
        }
        this.#globalListenersRegistered = false;
        this.#showHTMLCommentsSetting.removeChangeListener(this.#onShowHTMLCommentsChange, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.OverlayModel.OverlayModel, "HighlightNodeRequested" /* SDK.OverlayModel.Events.HIGHLIGHT_NODE_REQUESTED */, this.#highlightNode, this);
        SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.OverlayModel.OverlayModel, "InspectModeWillBeToggled" /* SDK.OverlayModel.Events.INSPECT_MODE_WILL_BE_TOGGLED */, this.#onInspectModeWillBeToggled, this);
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
                    // The popover content is rendered imperatively into the GlassPane
                    // provided by PopoverHelper; this is a one-off render outside of
                    // the view until the popover is made declarative.
                    // clang-format off
                    // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
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
        this.#resetTreeState();
        if (domModel.existingDocument()) {
            this.rootDOMNode = domModel.existingDocument();
        }
    }
    /** Forgets selection, expansion and pending changes, e.g. when the document is replaced. */
    #resetTreeState() {
        this.#selectedDOMNode = null;
        this.#selectedClosingTag = false;
        this.#expandedNodes.clear();
        this.#currentHighlightedNode = null;
        this.#updateRecords.clear();
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
    #cancelPendingModifiedNodesUpdate() {
        if (this.#updateModifiedNodesTimeout) {
            clearTimeout(this.#updateModifiedNodesTimeout);
            this.#updateModifiedNodesTimeout = undefined;
        }
    }
    /** Drops changes that have been recorded but not rendered yet, e.g. when the tree is hidden. */
    #discardPendingUpdates() {
        this.#cancelPendingModifiedNodesUpdate();
        this.#updateRecords.clear();
    }
    #onNodeInserted(event) {
        const node = event.data;
        if (node.parentNode) {
            this.#addUpdateRecord(node.parentNode).nodeInserted(node);
        }
        this.#updateModifiedNodesSoon();
    }
    #findNextNodeOnRemoval(node, parent) {
        const visibleChildren = parent ? getVisibleChildren(parent, this) : [];
        const sibling = findVisibleSibling(node, visibleChildren);
        if (sibling) {
            return sibling;
        }
        if (parent) {
            if (parent.nodeType() === Node.DOCUMENT_NODE) {
                return parent.parentNode;
            }
            return parent;
        }
        return null;
    }
    #onNodeRemoved(event) {
        const { node, parent } = event.data;
        this.resetClipboardIfNeeded(node);
        if (parent) {
            this.#addUpdateRecord(parent).nodeRemoved(node);
        }
        if (this.#selectedDOMNode && (this.#selectedDOMNode === node || node.isAncestor(this.#selectedDOMNode))) {
            this.selectDOMNode(this.#findNextNodeOnRemoval(node, parent), true);
        }
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
    #onMarkersChanged(event) {
        const node = event.data;
        if (node) {
            this.#addUpdateRecord(node);
        }
        this.performUpdate();
    }
    updateModifiedNodes() {
        this.#cancelPendingModifiedNodesUpdate();
        this.#validateSelectedNode();
        this.performUpdate();
    }
    #wireDOMModel(domModel) {
        const { Events } = SDK.DOMModel;
        // Records a change for the event's node and schedules a re-render.
        const recordAndUpdate = (record) => (event) => {
            record(event.data);
            this.#updateModifiedNodesSoon();
        };
        const recordAttributeAndUpdate = (record) => (event) => {
            record(event.data.node, event.data.name);
            this.#updateModifiedNodesSoon();
        };
        const listeners = [
            domModel.addEventListener(Events.DocumentUpdated, this.#onDocumentUpdated, this),
            domModel.addEventListener(Events.NodeInserted, this.#onNodeInserted, this),
            domModel.addEventListener(Events.NodeRemoved, this.#onNodeRemoved, this),
            domModel.addEventListener(Events.AttrModified, recordAttributeAndUpdate((node, name) => this.#addUpdateRecord(node).attributeModified(name))),
            domModel.addEventListener(Events.AttrRemoved, recordAttributeAndUpdate((node, name) => this.#addUpdateRecord(node).attributeRemoved(name))),
            domModel.addEventListener(Events.CharacterDataModified, this.#onCharacterDataModified, this),
            domModel.addEventListener(Events.ChildNodeCountUpdated, recordAndUpdate(node => this.#addUpdateRecord(node).childrenModified())),
            domModel.addEventListener(Events.MarkersChanged, this.#onMarkersChanged, this),
            domModel.addEventListener(Events.AdoptedStyleSheetsModified, recordAndUpdate(node => this.#addUpdateRecord(node).childrenModified())),
            domModel.addEventListener(Events.TopLayerElementsChanged, this.#onTopLayerElementsChanged, this),
            domModel.addEventListener(Events.DistributedNodesChanged, recordAndUpdate(node => this.#addUpdateRecord(node).childrenModified())),
            domModel.addEventListener(Events.DocumentURLChanged, recordAndUpdate(node => this.#addUpdateRecord(node).charDataModified())),
            domModel.addEventListener(Events.AffectedByStartingStylesFlagUpdated, this.requestUpdate, this),
        ];
        const cssModel = domModel.target().model(SDK.CSSModel.CSSModel);
        if (cssModel) {
            listeners.push(cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this.requestUpdate, this));
        }
        this.#domModelListeners.set(domModel, listeners);
    }
    #unwireDOMModel(domModel) {
        Common.EventTarget.removeEventListeners(this.#domModelListeners.get(domModel) ?? []);
        this.#domModelListeners.delete(domModel);
    }
    #onShowHTMLCommentsChange() {
        this.#lastObservedShowHTMLCommentsSetting = this.#showHTMLCommentsSetting.get();
        this.#showComments = this.#lastObservedShowHTMLCommentsSetting;
        this.#validateSelectedNode();
        const selectedNode = this.selectedDOMNode();
        if (selectedNode && selectedNode.nodeType() === Node.COMMENT_NODE && !this.#showComments) {
            this.selectDOMNode(selectedNode.parentNode);
        }
        else {
            this.performUpdate();
        }
    }
    #highlightNode(event) {
        void this.#highlightThrottler.schedule(() => {
            this.#currentHighlightedNode = event.data;
            this.requestUpdate();
        });
    }
    #onInspectModeWillBeToggled() {
        this.#clearHighlightedNode();
        this.performUpdate();
    }
    // Callers render themselves, so that an entry point renders only once.
    #clearHighlightedNode() {
        this.#currentHighlightedNode = null;
    }
    selectDOMNode(node, focus, isClosingTag) {
        this.#imagePreviewPopover?.hide();
        this.#issuePopoverHelper?.hidePopover();
        if (node instanceof SDK.DOMModel.AdoptedStyleSheet) {
            this.highlightAdoptedStyleSheet(node);
            return;
        }
        this.#selectedAdoptedStyleSheet = null;
        if (node?.nodeType() === Node.TEXT_NODE && node.parentNode &&
            (!nodeHasVisibleChildren(node.parentNode, this) || !getVisibleChildren(node.parentNode, this).includes(node))) {
            node = node.parentNode;
        }
        if (node) {
            const ancestors = [];
            for (let current = node.parentNode; current; current = current.parentNode) {
                ancestors.unshift(current);
            }
            for (let i = 0; i < ancestors.length; ++i) {
                const ancestor = ancestors[i];
                const child = ancestors[i + 1] || node;
                this.#expandedNodes.add(ancestor);
                this.#ensureChildVisible(ancestor, child);
                if (!ancestor.children() && ancestor.childNodeCount()) {
                    void ancestor.getChildNodes(() => {
                        this.#ensureChildVisible(ancestor, child);
                        this.performUpdate();
                    });
                }
            }
            if (isClosingTag && nodeHasVisibleChildren(node, this)) {
                this.#expandedNodes.add(node);
            }
        }
        const selectClosingTag = Boolean(isClosingTag) && Boolean(node && this.#hasClosingTag(node));
        const isSameNode = this.#selectedDOMNode === node && this.#selectedClosingTag === selectClosingTag;
        this.#selectedDOMNode = node;
        this.#selectedClosingTag = selectClosingTag;
        this.#clearHighlightedNode();
        if (!isSameNode) {
            this.#notifySelectedNodeChanged(node, Boolean(focus));
        }
        this.performUpdate();
        if (focus) {
            this.focus();
        }
    }
    /** Raises the children limit of `ancestor` if `child` is paginated away. */
    #ensureChildVisible(ancestor, child) {
        const childIndex = getVisibleChildren(ancestor, this).indexOf(child);
        if (childIndex !== -1 && childIndex >= this.expandedChildrenLimit(ancestor)) {
            this.#expandedChildrenLimitByNode.set(ancestor, childIndex + 1);
        }
    }
    #notifySelectedNodeChanged(node, focus) {
        this.onSelectedNodeChanged({ data: { node, focus } });
    }
    highlightNodeAttribute(node, attribute) {
        this.#attributeToHighlight = { node, attribute };
        this.selectDOMNode(node);
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
        return this.#selectedDOMNode;
    }
    setNodeExpanded(node, expanded) {
        if (!expanded && this.#multilineEditingNode === node) {
            return;
        }
        if (expanded) {
            this.#expandedNodes.add(node);
            if (!node.children() && (node.childNodeCount() || node.isIframe() || node.nodeType() === Node.DOCUMENT_NODE)) {
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
    }
    isNodeExpanded(node) {
        return isNotCollapsible(node) || this.#expandedNodes.has(node);
    }
    expandedChildrenLimit(node) {
        return this.#expandedChildrenLimitByNode.get(node) ?? InitialChildrenLimit;
    }
    setExpandedChildrenLimit(node, limit) {
        if (this.expandedChildrenLimit(node) === limit) {
            return;
        }
        this.#expandedChildrenLimitByNode.set(node, limit);
        this.performUpdate();
    }
    expandAllChildren(node) {
        const currentLimit = this.expandedChildrenLimit(node);
        const visibleChildren = getVisibleChildren(node, this);
        this.setExpandedChildrenLimit(node, Math.max(visibleChildren.length, currentLimit + InitialChildrenLimit));
    }
    async expandRecursively(node, maxDepth = Number.MAX_VALUE) {
        const expand = async (n, depth) => {
            if (depth > maxDepth) {
                return;
            }
            if (n.childDocumentPromiseForTesting) {
                await n.childDocumentPromiseForTesting;
            }
            if (!n.children() && !n.contentDocument() &&
                (n === node || n.childNodeCount() || n.isIframe() || n.nodeType() === Node.DOCUMENT_NODE)) {
                await n.getSubtree(100, true);
            }
            if (nodeHasVisibleChildren(n, this)) {
                this.#expandedNodes.add(n);
            }
            const visibleChildren = getVisibleChildren(n, this);
            if (visibleChildren.length) {
                if (visibleChildren.length > this.expandedChildrenLimit(n)) {
                    this.#expandedChildrenLimitByNode.set(n, visibleChildren.length);
                }
                await Promise.all(visibleChildren.map(child => expand(child, depth + 1)));
            }
        };
        await expand(node, 0);
        this.performUpdate();
    }
    collapseChildren(node) {
        const collapse = (n) => {
            for (const child of getVisibleChildren(n, this)) {
                if (this.#expandedNodes.delete(child)) {
                    collapse(child);
                }
            }
        };
        collapse(node);
        this.performUpdate();
    }
    showContextMenu(node, event) {
        if (!this.#enableContextMenu) {
            return Promise.resolve(undefined);
        }
        return showContextMenu(this, node, event);
    }
    /**
     * Re-renders the tree from scratch, for example, when a global setting
     * such as `show-ua-shadow-dom` changes.
     *
     * FIXME: the setting values should be part of the view input instead.
     */
    reload() {
        this.performUpdate();
    }
    #hoveredDOMNode = null;
    #hoveredClosingTag = false;
    #selectedClosingTag = false;
    #searchMatchNode = null;
    #searchMatchQuery = null;
    #nodeToEdit = null;
    #attributeToHighlight = null;
    #nodesWithDirtyAdorners = new Set();
    #nodeAdornerVersions = new WeakMap();
    #forceOpenPopovers = new WeakSet();
    #forceOpenInterests = new WeakSet();
    #draggedNode = null;
    #draggedNodeWasExpanded = false;
    #dragOverNode = null;
    #isFocusing = false;
    hoveredDOMNode() {
        return this.#hoveredDOMNode;
    }
    hoveredClosingTag() {
        return this.#hoveredClosingTag;
    }
    selectedClosingTag() {
        return this.#selectedClosingTag;
    }
    searchMatchNode() {
        return this.#searchMatchNode;
    }
    searchMatchQuery() {
        return this.#searchMatchQuery;
    }
    setHoveredNode(node, showInfo = true, isClosingTag = false) {
        if (this.hoveredDOMNode() === node && this.#hoveredClosingTag === Boolean(isClosingTag)) {
            return;
        }
        this.#hoveredDOMNode = node;
        this.#hoveredClosingTag = Boolean(isClosingTag);
        if (node) {
            // TODO(crbug.com/407751692): pass `selectorList: '*'` for `display: contents`
            // elements once the view can report that state for the hovered node.
            node.domModel().overlayModel().highlightInOverlay({ node, selectorList: undefined }, 'all', showInfo);
        }
        else {
            SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
        }
        this.performUpdate();
    }
    #findValidSelectedNode(selectedNode) {
        if (!this.#rootDOMNode) {
            return null;
        }
        if (selectedNode === this.#rootDOMNode) {
            return selectedNode;
        }
        let current = selectedNode;
        let fallback = null;
        while (current && current !== this.#rootDOMNode) {
            const parent = current.parentNode;
            if (!parent) {
                return fallback ?? this.#rootDOMNode;
            }
            if (parent.children() !== null || parent.childNodeCount() === 0 || parent.isIframe()) {
                const visibleChildren = getVisibleChildren(parent, this);
                if (!visibleChildren.includes(current)) {
                    const sibling = findVisibleSibling(current, visibleChildren);
                    return this.#findValidSelectedNode(sibling ?? parent);
                }
            }
            fallback = parent;
            current = parent;
        }
        return current === this.#rootDOMNode ? selectedNode : (fallback ?? this.#rootDOMNode);
    }
    #hasClosingTag(node) {
        const editingAsHTML = isBeingEditedAsHTML({ multilineEditingNode: this.#multilineEditingNode, nodeToEdit: this.#nodeToEdit }, node);
        if (editingAsHTML || !this.isNodeExpanded(node)) {
            return false;
        }
        const hasChildren = nodeHasVisibleChildren(node, this);
        return nodeNeedsClosingTag(node, hasChildren);
    }
    #validateSelectedNode() {
        if (!this.#selectedDOMNode) {
            this.#selectedClosingTag = false;
            return;
        }
        const validNode = this.#findValidSelectedNode(this.#selectedDOMNode);
        if (validNode !== this.#selectedDOMNode) {
            this.#selectedDOMNode = validNode;
            this.#selectedClosingTag = false;
            this.#clearHighlightedNode();
            this.#notifySelectedNodeChanged(validNode, false);
        }
        else if (this.#selectedClosingTag && !this.#hasClosingTag(this.#selectedDOMNode)) {
            this.#selectedClosingTag = false;
        }
    }
    performUpdate() {
        this.#cancelPendingModifiedNodesUpdate();
        this.#validateSelectedNode();
        const updatedNodes = [...this.#updateRecords.keys()];
        this.#view({
            rootDOMNode: this.#rootDOMNode,
            omitRootDOMNode: this.omitRootDOMNode,
            selectEnabled: this.selectEnabled,
            hideGutter: this.hideGutter,
            maxTreeDepth: this.#maxTreeDepth,
            showComments: this.#showComments,
            showAIButton: this.#showAIButton,
            disableEdits: this.#disableEdits,
            wrap: this.#wrap,
            maxRowsShown: this.#maxRows,
            onClearMaxRows: () => {
                this.maxRows = undefined;
            },
            showSelectionOnKeyboardFocus: this.showSelectionOnKeyboardFocus,
            deindentSingleNode: this.deindentSingleNode,
            currentHighlightedNode: this.#currentHighlightedNode,
            hoveredNode: this.#hoveredDOMNode,
            hoveredClosingTag: this.#hoveredClosingTag,
            searchMatchNode: this.#searchMatchNode,
            searchMatchQuery: this.#searchMatchQuery,
            selectedNode: this.selectedDOMNode(),
            selectedClosingTag: this.#selectedClosingTag,
            onHoverNode: (node, showInfo, isClosingTag = false) => {
                this.setHoveredNode(node, showInfo, isClosingTag);
            },
            onLeave: () => {
                this.setHoveredNode(null);
            },
            onSelect: (node, isClosingTag = false, selectedByUser) => {
                if (!selectedByUser) {
                    return;
                }
                this.selectDOMNode(node, selectedByUser, isClosingTag);
                // Mirror the legacy ElementsTreeElement.onselect behavior: a user
                // selection (mouse click or keyboard navigation) highlights the node
                // in the page overlay.
                node.highlight();
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);
            },
            onExpand: (node, expanded) => {
                this.setNodeExpanded(node, expanded);
            },
            onContextMenu: (node, event) => {
                void this.showContextMenu(node, event);
            },
            onToggleHideElement: (node) => {
                return this.toggleHideElement(node);
            },
            onKeyDown: (event) => {
                this.onKeyDown(event);
            },
            isToggledToHidden: (node) => {
                return this.isToggledToHidden(node);
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
            attributeToHighlight: this.#attributeToHighlight,
            onAttributeHighlighted: () => {
                this.#attributeToHighlight = null;
            },
            nodesWithDirtyAdorners: this.#nodesWithDirtyAdorners,
            nodeAdornerVersions: this.#nodeAdornerVersions,
            onDirtyAdornersUpdated: () => {
                this.#nodesWithDirtyAdorners.clear();
            },
            forceOpenPopovers: this.#forceOpenPopovers,
            onPopoverAdornerToggled: (node, active) => {
                if (active) {
                    this.#forceOpenPopovers.add(node);
                }
                else {
                    this.#forceOpenPopovers.delete(node);
                }
                this.performUpdate();
            },
            forceOpenInterests: this.#forceOpenInterests,
            onInterestAdornerToggled: (node, active) => {
                if (active) {
                    this.#forceOpenInterests.add(node);
                }
                else {
                    this.#forceOpenInterests.delete(node);
                }
                this.performUpdate();
            },
            multilineEditingNode: this.#multilineEditingNode,
            onSetMultilineEditing: (editing, node) => this.setMultilineEditing(editing, node),
            onRevealInTopLayer: (node) => this.revealInTopLayer(node),
            visibleWidth: () => this.visibleWidth,
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
            },
            isAdoptedStyleSheetExpanded: (sheet) => this.isAdoptedStyleSheetExpanded(sheet),
            onToggleAdoptedStyleSheetExpanded: (sheet, expanded) => this.setAdoptedStyleSheetExpanded(sheet, expanded),
            selectedAdoptedStyleSheet: this.#selectedAdoptedStyleSheet,
            onSelectAdoptedStyleSheet: (sheet) => this.#selectAdoptedStyleSheet(sheet),
            expandedChildrenLimit: (node) => this.expandedChildrenLimit(node),
            onExpandAllChildren: (node) => this.expandAllChildren(node),
            updateRecordForNode: (node) => this.#updateRecords.get(node) ?? null,
        }, undefined, this.contentElement);
        this.#updateRecords.clear();
        if (updatedNodes.length > 0) {
            this.onElementsTreeUpdated({ data: updatedNodes });
        }
    }
    modelAdded(domModel) {
        if (!this.#domModelListeners.has(domModel)) {
            this.#wireDOMModel(domModel);
        }
        if (this.isShowing() && !domModel.parentModel()) {
            this.#adoptDocument(domModel);
        }
        this.performUpdate();
    }
    modelRemoved(domModel) {
        this.#unwireDOMModel(domModel);
        if (this.#rootDOMNode?.domModel() === domModel) {
            this.#rootDOMNode = null;
            this.#resetTreeState();
        }
        this.performUpdate();
    }
    /**
     * Makes the document of `domModel` the root of the tree, requesting it
     * first if it has not been fetched yet.
     */
    #adoptDocument(domModel) {
        if (this.rootDOMNode?.domModel() === domModel) {
            return;
        }
        const existingDocument = domModel.existingDocument();
        if (existingDocument) {
            this.rootDOMNode = existingDocument;
            this.onDocumentUpdated(domModel);
            return;
        }
        void domModel.requestDocument().then(document => {
            if (document && this.isShowing() && this.#domModelListeners.has(domModel)) {
                this.rootDOMNode = document;
                this.onDocumentUpdated(domModel);
            }
        });
    }
    expand() {
        const selectedNode = this.selectedDOMNode();
        if (selectedNode) {
            this.setNodeExpanded(selectedNode, true);
        }
    }
    /**
     * FIXME: which node is selected should be part of the view input.
     */
    selectDOMNodeWithoutReveal(node) {
        const isSameNode = this.#selectedDOMNode === node && !this.#selectedClosingTag;
        if (isSameNode) {
            return;
        }
        this.#selectedDOMNode = node;
        this.#selectedClosingTag = false;
        this.#clearHighlightedNode();
        this.#notifySelectedNodeChanged(node, false);
        this.performUpdate();
    }
    /**
     * FIXME: adorners should be part of the view input.
     */
    updateNodeAdorners(node) {
        this.#nodesWithDirtyAdorners.add(node);
        const version = (this.#nodeAdornerVersions.get(node) ?? 0) + 1;
        this.#nodeAdornerVersions.set(node, version);
        this.performUpdate();
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
    async toggleHideElement(node) {
        const wasHidden = this.isToggledToHidden(node);
        await node.toggleHideElement();
        const isHidden = this.isToggledToHidden(node);
        if (isHidden !== wasHidden) {
            const changeTracker = this.changeTracker;
            Elements.DOMChanges.trackVisibilityToggle(changeTracker, node, buildChangeSelector(changeTracker, node), isHidden);
        }
    }
    async removeNode(node) {
        if (this.isToggledToHidden(node)) {
            // Unhide the node before removing. This avoids inconsistent state if the node is restored via undo.
            await node.toggleHideElement();
        }
        if (node.pseudoType()) {
            return;
        }
        if (!node.parentNode || node.parentNode.nodeType() === Node.DOCUMENT_NODE) {
            return;
        }
        // The selector has to be resolved before the node is detached from the tree.
        const changeTracker = this.changeTracker;
        const selector = buildChangeSelector(changeTracker, node);
        await node.removeNode((err) => {
            if (!err) {
                Elements.DOMChanges.trackNodeRemoval(changeTracker, node, selector);
            }
        });
    }
    isToggledToHidden(node) {
        return node.isToggledToHidden();
    }
    #multilineEditing = null;
    #multilineEditingNode = null;
    setMultilineEditing(multilineEditing, node) {
        this.#multilineEditing = multilineEditing;
        this.#multilineEditingNode = multilineEditing ? (node ?? this.#multilineEditingNode) : null;
        this.performUpdate();
    }
    multilineEditing() {
        return this.#multilineEditing;
    }
    multilineEditingNode() {
        return this.#multilineEditingNode;
    }
    runPendingUpdates() {
        this.updateModifiedNodes();
    }
    onResize() {
        super.onResize();
        if (this.#multilineEditing) {
            this.#multilineEditing.resize();
        }
    }
    willHide() {
        super.willHide();
        this.#unregisterGlobalListeners();
        this.#imagePreviewPopover?.hide();
        this.#issuePopoverHelper?.hidePopover();
        this.#discardPendingUpdates();
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
            this.#multilineEditingNode = null;
            if (callback) {
                callback();
            }
            if (!success) {
                this.performUpdate();
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
        this.#multilineEditingNode = node;
        this.#nodeToEdit = {
            node,
            isEditAsHTML: true,
            editAsHTMLCallback: editingFinished,
        };
        this.performUpdate();
    }
    duplicateNode(node) {
        void node.duplicate().then(({ error, node: newNode }) => {
            if (!error && newNode) {
                const changeTracker = this.changeTracker;
                Elements.DOMChanges.trackNodeDuplication(changeTracker, newNode, buildChangeSelector(changeTracker, newNode));
            }
        });
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
        if (UI.UIUtils.isEditing() || this.#multilineEditing) {
            event.preventDefault();
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
            this.performUpdate();
        }
        return true;
    }
    onDragLeave(event) {
        event.preventDefault();
        if (this.#dragOverNode) {
            this.#dragOverNode = null;
            this.performUpdate();
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
        this.performUpdate();
    }
    onDragEnd(event) {
        event.preventDefault();
        this.#draggedNode = null;
        this.#dragOverNode = null;
        this.performUpdate();
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
        draggedNode.moveTo(parentNode, anchorNode, (error, newNode) => {
            if (!error && newNode) {
                const changeTracker = this.changeTracker;
                Elements.DOMChanges.trackNodeDrop(changeTracker, newNode, buildChangeSelector(changeTracker, newNode));
            }
            this.selectNodeAfterEdit(wasExpanded, error, newNode);
        });
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
                if (!DOMTreeElementWidget.canEditTextNode(newNode)) {
                    return;
                }
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
        const parent = adoptedStyleSheet.parent;
        if (!parent) {
            return;
        }
        for (let current = parent; current; current = current.parentNode) {
            this.#expandedNodes.add(current);
        }
        this.#adoptedStyleSheetsExpandedByNode.set(parent, true);
        this.#selectAdoptedStyleSheet(adoptedStyleSheet);
    }
    #selectAdoptedStyleSheet(sheet) {
        // Clear the DOM node selection first: selectDOMNode() also resets the
        // selected adopted style sheet.
        this.selectDOMNode(null);
        this.#selectedAdoptedStyleSheet = sheet;
        this.performUpdate();
    }
    addNewAttribute(node) {
        if (UI.UIUtils.isEditing()) {
            return;
        }
        if (node.nodeType() !== Node.ELEMENT_NODE || node.isShadowRoot() || node.ancestorUserAgentShadowRoot()) {
            return;
        }
        this.#nodeToEdit = { node, isNewAttribute: true };
        this.performUpdate();
    }
    startEditingTextNode(node) {
        if (UI.UIUtils.isEditing() || !DOMTreeElementWidget.canEditTextNode(node)) {
            return;
        }
        this.#nodeToEdit = { node, isTextNode: true };
        this.performUpdate();
    }
    startEditing(node, attributeName) {
        if (UI.UIUtils.isEditing()) {
            return;
        }
        const nodeType = node.nodeType();
        if (nodeType === Node.ELEMENT_NODE) {
            if (node.isShadowRoot() || node.ancestorUserAgentShadowRoot()) {
                return;
            }
            if (attributeName) {
                this.#nodeToEdit = { node, attributeName };
            }
            else {
                const attributes = node.attributes();
                if (attributes.length > 0) {
                    this.#nodeToEdit = { node, attributeName: attributes[0].name };
                }
                else {
                    this.#nodeToEdit = { node, isNewAttribute: true };
                }
            }
            this.performUpdate();
        }
        else if (nodeType === Node.TEXT_NODE) {
            if (!DOMTreeElementWidget.canEditTextNode(node)) {
                return;
            }
            this.#nodeToEdit = { node, isTextNode: true };
            this.performUpdate();
        }
        else if (nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
            if (!DOMTreeElementWidget.canEditTextNode(node)) {
                return;
            }
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
            if (event.key === 'ArrowUp' && node.previousSibling) {
                this.#moveNodeAmongSiblings(node, node.previousSibling, /* directionUp= */ true);
                event.consume(true);
                return true;
            }
            if (event.key === 'ArrowDown' && node.nextSibling) {
                this.#moveNodeAmongSiblings(node, node.nextSibling.nextSibling, /* directionUp= */ false);
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
            void this.toggleHideElement(node);
            event.consume(true);
            return true;
        }
        return false;
    }
    /** Moves `node` within its parent so that it ends up right before `anchor` (or last, if `anchor` is null). */
    #moveNodeAmongSiblings(node, anchor, directionUp) {
        const parentNode = node.parentNode;
        if (!parentNode) {
            return;
        }
        const wasExpanded = this.isNodeExpanded(node);
        node.moveTo(parentNode, anchor, (error, newNode) => {
            if (!error && newNode) {
                const changeTracker = this.changeTracker;
                Elements.DOMChanges.trackNodeMove(changeTracker, newNode, buildChangeSelector(changeTracker, newNode), directionUp);
            }
            this.selectNodeAfterEdit(wasExpanded, error, newNode);
        });
    }
    #clipboardData = null;
    clipboardData() {
        return this.#clipboardData;
    }
    setClipboardData(data) {
        this.#clipboardData = data;
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
    async copyXPath(node, optimized = true) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(await xPath(node, optimized));
    }
    async copyFullXPath(node) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(await xPath(node, false));
    }
    async copyStyles(node) {
        const cssModel = node.domModel().cssModel();
        const cascade = await cssModel.cachedMatchedCascadeForNode(node);
        if (!cascade) {
            return;
        }
        const indent = Common.Settings.Settings.instance().resolve(SDK.SDKSettings.textEditorIndentSettingDescriptor).get();
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
        const clipboardNode = this.#clipboardData.node;
        if (this.#clipboardData.isCut) {
            clipboardNode.moveTo(targetNode, null, (error, newNode) => {
                if (!error && newNode) {
                    const changeTracker = this.changeTracker;
                    Elements.DOMChanges.trackNodePaste(changeTracker, newNode, buildChangeSelector(changeTracker, newNode), 
                    /* isCut= */ true);
                }
                this.selectNodeAfterEdit(wasExpanded, error, newNode);
            });
            this.setClipboardData(null);
        }
        else {
            clipboardNode.copyTo(targetNode, null, (error, newNode) => {
                if (!error && newNode) {
                    const changeTracker = this.changeTracker;
                    Elements.DOMChanges.trackNodePaste(changeTracker, newNode, buildChangeSelector(changeTracker, newNode), 
                    /* isCut= */ false);
                }
                this.selectNodeAfterEdit(wasExpanded, error, newNode);
            });
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
        return !this.#rootDOMNode;
    }
    focus() {
        if (this.#isFocusing) {
            return;
        }
        this.#isFocusing = true;
        try {
            super.focus();
            this.contentElement.querySelector('devtools-tree')?.focus();
        }
        finally {
            this.#isFocusing = false;
        }
    }
    wasShown() {
        super.wasShown();
        this.#registerGlobalListeners();
        if (this.#lastObservedShowHTMLCommentsSetting !== this.#showHTMLCommentsSetting.get()) {
            // The setting changed while the tree was hidden.
            this.#onShowHTMLCommentsChange();
            return;
        }
        this.performUpdate();
    }
    wasHidden() {
        super.wasHidden();
        this.#discardPendingUpdates();
    }
    detach(overrideHideOnDetach) {
        super.detach(overrideHideOnDetach);
        this.#discardPendingUpdates();
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
        // Only follow the inspected page's document when wired to DOM models via
        // modelAdded() (the Elements panel). Embedders that set an explicit
        // rootDOMNode (e.g. the Console) keep it, even if that node lives in a
        // different (e.g. OOPIF) DOM model than the scoped main one.
        const domModels = SDK.TargetManager.TargetManager.instance().models(SDK.DOMModel.DOMModel, { scoped: true });
        for (const domModel of domModels) {
            if (!domModel.parentModel() && this.#domModelListeners.has(domModel)) {
                this.#adoptDocument(domModel);
            }
        }
        super.show(parentElement, insertBefore, suppressOrphanWidgetError);
    }
}
//# sourceMappingURL=DOMTreeWidget.js.map