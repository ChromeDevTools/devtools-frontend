// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import '../../ui/components/adorners/adorners.js';
import '../../ui/components/buttons/buttons.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AIAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Badges from '../../models/badges/badges.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import { Icon, Link } from '../../ui/kit/kit.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import * as Emulation from '../emulation/emulation.js';
import * as Media from '../media/media.js';
import * as ElementsComponents from './components/components.js';
import { canGetJSPath, cssPath, jsPath, xPath } from './DOMPath.js';
import { getElementIssueDetails } from './ElementIssueUtils.js';
import { ElementsPanel } from './ElementsPanel.js';
import { MappedCharToEntity } from './ElementsTreeOutline.js';
import { ImagePreviewPopover } from './ImagePreviewPopover.js';
import { getRegisteredDecorators } from './MarkerDecorator.js';
const { html, nothing, render, Directives: { ref } } = Lit;
const { animateOn } = UI.UIUtils;
const UIStrings = {
    /**
     * @description Title for Ad adorner. This iframe is marked as advertisement frame.
     */
    thisFrameWasIdentifiedAsAnAd: 'This frame was identified as an ad frame',
    /**
     * @description A context menu item in the Elements panel. Force is used as a verb, indicating intention to make the state change.
     */
    forceState: 'Force state',
    /**
     * @description Hint element title in Elements Tree Element of the Elements panel
     * @example {0} PH1
     */
    useSInTheConsoleToReferToThis: 'Use {PH1} in the console to refer to this element.',
    /**
     * @description A context menu item in the Elements Tree Element of the Elements panel
     */
    addAttribute: 'Add attribute',
    /**
     * @description Text to modify the attribute of an item
     */
    editAttribute: 'Edit attribute',
    /**
     * @description Text to focus on something
     */
    focus: 'Focus',
    /**
     * @description Text to scroll the displayed content into view
     */
    scrollIntoView: 'Scroll into view',
    /**
     * @description A context menu item in the Elements Tree Element of the Elements panel
     */
    editText: 'Edit text',
    /**
     * @description A context menu item in the Elements Tree Element of the Elements panel
     */
    editAsHtml: 'Edit as HTML',
    /**
     * @description Text to cut an element, cut should be used as a verb
     */
    cut: 'Cut',
    /**
     * @description Text for copying, copy should be used as a verb
     */
    copy: 'Copy',
    /**
     * @description Text to paste an element, paste should be used as a verb
     */
    paste: 'Paste',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copyOuterhtml: 'Copy outerHTML',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copySelector: 'Copy `selector`',
    /**
     * @description Text in Elements Tree Element of the Elements panel
     */
    copyJsPath: 'Copy JS path',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copyStyles: 'Copy styles',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copyXpath: 'Copy XPath',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copyFullXpath: 'Copy full XPath',
    /**
     * @description Text in Elements Tree Element of the Elements panel, copy should be used as a verb
     */
    copyElement: 'Copy element',
    /**
     * @description A context menu item in the Elements Tree Element of the Elements panel
     */
    duplicateElement: 'Duplicate element',
    /**
     * @description Text to hide an element
     */
    hideElement: 'Hide element',
    /**
     * @description A context menu item in the Elements Tree Element of the Elements panel
     */
    deleteElement: 'Delete element',
    /**
     * @description Text to expand something recursively
     */
    expandRecursively: 'Expand recursively',
    /**
     * @description Text to collapse children of a parent group
     */
    collapseChildren: 'Collapse children',
    /**
     * @description Title of an action in the emulation tool to capture node screenshot
     */
    captureNodeScreenshot: 'Capture node screenshot',
    /**
     * @description Title of a context menu item. When clicked DevTools goes to the Application panel and shows this specific iframe's details
     */
    showFrameDetails: 'Show `iframe` details',
    /**
     * @description Text in Elements Tree Element of the Elements panel
     */
    valueIsTooLargeToEdit: '<value is too large to edit>',
    /**
     * @description Element text content in Elements Tree Element of the Elements panel
     */
    children: 'Children:',
    /**
     * @description ARIA label for Elements Tree adorners
     */
    enableGridMode: 'Enable grid mode',
    /**
     * @description ARIA label for Elements Tree adorners
     */
    disableGridMode: 'Disable grid mode',
    /**
     * @description ARIA label for Elements Tree adorners
     */
    /**
     * @description ARIA label for Elements Tree adorners
     */
    enableGridLanesMode: 'Enable grid-lanes mode',
    /**
     * @description ARIA label for Elements Tree adorners
     */
    disableGridLanesMode: 'Disable grid-lanes mode',
    /**
     * @description ARIA label for an elements tree adorner
     */
    forceOpenPopover: 'Keep this popover open',
    /**
     * @description ARIA label for an elements tree adorner
     */
    stopForceOpenPopover: 'Stop keeping this popover open',
    /**
     * @description Label of the adorner for flex elements in the Elements panel
     */
    enableFlexMode: 'Enable flex mode',
    /**
     * @description Label of the adorner for flex elements in the Elements panel
     */
    disableFlexMode: 'Disable flex mode',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it enables
     * the overlay showing CSS scroll snapping for the current element.
     */
    enableScrollSnap: 'Enable scroll-snap overlay',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it disables
     * the overlay showing CSS scroll snapping for the current element.
     */
    disableScrollSnap: 'Disable scroll-snap overlay',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it enables
     * the overlay showing the container overlay for the current element.
     */
    enableContainer: 'Enable container overlay',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it disables
     * the overlay showing container for the current element.
     */
    disableContainer: 'Disable container overlay',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it forces
     * the element into applying its starting-style rules.
     */
    enableStartingStyle: 'Enable @starting-style mode',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it no longer
     * forces the element into applying its starting-style rules.
     */
    disableStartingStyle: 'Disable @starting-style mode',
    /**
     * @description Label of an adorner in the Elements panel. When clicked, it redirects
     * to the Media Panel.
     */
    openMediaPanel: 'Jump to Media panel',
    /**
     * @description Text of a tooltip to redirect to another element in the Elements panel
     */
    showPopoverTarget: 'Show element associated with the `popovertarget` attribute',
    /**
     * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `interesttarget` attribute
     */
    showInterestTarget: 'Show element associated with the `interesttarget` attribute',
    /**
     * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `commandfor` attribute
     */
    showCommandForTarget: 'Show element associated with the `commandfor` attribute',
    /**
     * @description Text of the tooltip for scroll adorner.
     */
    elementHasScrollableOverflow: 'This element has a scrollable overflow',
    /**
     * @description Text of a context menu item to redirect to the AI assistance panel and to start a chat.
     */
    startAChat: 'Start a chat',
    /**
     * @description Label of an adorner next to the html node in the Elements panel.
     */
    viewSourceCode: 'View source code',
    /**
     * @description Context menu item in Elements panel to assess visibility of an element via AI.
     */
    assessVisibility: 'Assess visibility',
    /**
     * @description Context menu item in Elements panel to center an element via AI.
     */
    centerElement: 'Center element',
    /**
     * @description Context menu item in Elements panel to wrap flex items via AI.
     */
    wrapTheseItems: 'Wrap these items',
    /**
     * @description Context menu item in Elements panel to distribute flex items evenly via AI.
     */
    distributeItemsEvenly: 'Distribute items evenly',
    /**
     * @description Context menu item in Elements panel to explain flexbox via AI.
     */
    explainFlexbox: 'Explain flexbox',
    /**
     * @description Context menu item in Elements panel to align grid items via AI.
     */
    alignItems: 'Align items',
    /**
     * @description Context menu item in Elements panel to add padding/gap to grid via AI.
     */
    addPadding: 'Add padding',
    /**
     * @description Context menu item in Elements panel to explain grid layout via AI.
     */
    explainGridLayout: 'Explain grid layout',
    /**
     * @description Context menu item in Elements panel to find grid definition for a subgrid item via AI.
     */
    findGridDefinition: 'Find grid definition',
    /**
     * @description Context menu item in Elements panel to change parent grid properties for a subgrid item via AI.
     */
    changeParentProperties: 'Change parent properties',
    /**
     * @description Context menu item in Elements panel to explain subgrids via AI.
     */
    explainSubgrids: 'Explain subgrids',
    /**
     * @description Context menu item in Elements panel to remove scrollbars via AI.
     */
    removeScrollbars: 'Remove scrollbars',
    /**
     * @description Context menu item in Elements panel to style scrollbars via AI.
     */
    styleScrollbars: 'Style scrollbars',
    /**
     * @description Context menu item in Elements panel to explain scrollbars via AI.
     */
    explainScrollbars: 'Explain scrollbars',
    /**
     * @description Context menu item in Elements panel to explain container queries via AI.
     */
    explainContainerQueries: 'Explain container queries',
    /**
     * @description Context menu item in Elements panel to explain container types via AI.
     */
    explainContainerTypes: 'Explain container types',
    /**
     * @description Context menu item in Elements panel to explain container context via AI.
     */
    explainContainerContext: 'Explain container context',
    /**
     * @description Link text content in Elements Tree Outline of the Elements panel. When clicked, it "reveals" the true location of an element.
     */
    reveal: 'reveal',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function isOpeningTag(context) {
    return context.tagType === "OPENING_TAG" /* TagType.OPENING */;
}
export function adornerRef() {
    let adorner;
    return ref(el => {
        if (adorner) {
            ElementsPanel.instance().deregisterAdorner(adorner);
        }
        adorner = el;
        if (adorner) {
            if (ElementsPanel.instance().isAdornerEnabled(adorner.name)) {
                adorner.show();
            }
            else {
                adorner.hide();
            }
            ElementsPanel.instance().registerAdorner(adorner);
        }
    });
}
const DOM_UPDATE_ANIMATION_CLASS_NAME = 'dom-update-highlight';
function handleAdornerKeydown(cb) {
    return (event) => {
        if (event.code === 'Enter' || event.code === 'Space') {
            cb(event);
            event.preventDefault();
            event.stopPropagation();
        }
    };
}
function renderTitle(node, isClosingTag, expanded, isExpandable, isXMLMimeType, updateRecord, onUpdateSearchHighlight, onExpand) {
    switch (node.nodeType()) {
        case Node.ATTRIBUTE_NODE:
            return renderAttribute({ name: node.name, value: node.value }, updateRecord, true, node);
        case Node.ELEMENT_NODE: {
            if (node.pseudoType()) {
                let pseudoElementName = node.nodeName();
                const pseudoIdentifier = node.pseudoIdentifier();
                if (pseudoIdentifier) {
                    pseudoElementName += `(${pseudoIdentifier})`;
                }
                return html `<span class="webkit-html-pseudo-element">${pseudoElementName}</span>\u200B`;
            }
            const tagName = node.nodeNameInCorrectCase();
            if (isClosingTag) {
                return renderTag(node, tagName, true, expanded, true, updateRecord);
            }
            const openingTag = renderTag(node, tagName, false, expanded, false, updateRecord);
            if (isExpandable) {
                if (!expanded) {
                    return html `${openingTag}<devtools-elements-tree-expand-button .data=${{ clickHandler: onExpand }}></devtools-elements-tree-expand-button><span style="font-size: 0;"
                  >…</span>\u200B${renderTag(node, tagName, true, expanded, false, updateRecord)}`;
                }
                return openingTag;
            }
            if (ElementsTreeElement.canShowInlineText(node)) {
                const firstChild = node.firstChild;
                if (!firstChild) {
                    throw new Error('ElementsTreeElement._nodeTitleInfo expects node.firstChild to be defined.');
                }
                const result = convertUnicodeCharsToHTMLEntities(firstChild.nodeValue());
                const textContent = Platform.StringUtilities.collapseWhitespace(result.text);
                const renderTextNode = ref(el => {
                    if (el) {
                        el.textContent = textContent;
                        Highlighting.highlightRangesWithStyleClass(el, result.entityRanges, 'webkit-html-entity-value');
                    }
                });
                return html `${openingTag}<span class="webkit-html-text-node" jslog=${VisualLogging.value('text-node').track({ change: true, dblclick: true })} ${animateOn(Boolean((updateRecord?.hasChangedChildren() || updateRecord?.isCharDataModified())), DOM_UPDATE_ANIMATION_CLASS_NAME)} ${renderTextNode}></span>\u200B${renderTag(node, tagName, true, expanded, false, updateRecord)}`;
            }
            if (isXMLMimeType || !ForbiddenClosingTagElements.has(tagName)) {
                return html `${openingTag}${renderTag(node, tagName, true, expanded, false, updateRecord)}`;
            }
            return openingTag;
        }
        case Node.TEXT_NODE: {
            if (node.parentNode && node.parentNode.nodeName().toLowerCase() === 'script') {
                const text = node.nodeValue();
                const highlightNode = ref(el => {
                    if (el) {
                        el.textContent = text.replace(/^[\n\r]+|\s+$/g, '');
                        void CodeHighlighter.CodeHighlighter.highlightNode(el, 'text/javascript').then(onUpdateSearchHighlight);
                    }
                });
                return html `<span class="webkit-html-text-node webkit-html-js-node" jslog=${VisualLogging.value('script-text-node').track({ change: true, dblclick: true })} ${highlightNode}></span>`;
            }
            if (node.parentNode && node.parentNode.nodeName().toLowerCase() === 'style') {
                const text = node.nodeValue();
                const highlightNode = ref(el => {
                    if (el) {
                        el.textContent = text.replace(/^[\n\r]+|\s+$/g, '');
                        void CodeHighlighter.CodeHighlighter.highlightNode(el, 'text/css').then(onUpdateSearchHighlight);
                    }
                });
                return html `<span class="webkit-html-text-node webkit-html-css-node" jslog=${VisualLogging.value('css-text-node').track({ change: true, dblclick: true })} ${highlightNode}></span>`;
            }
            const result = convertUnicodeCharsToHTMLEntities(node.nodeValue());
            const textContent = Platform.StringUtilities.collapseWhitespace(result.text);
            const renderTextNode = ref(el => {
                if (el) {
                    el.textContent = textContent;
                    Highlighting.highlightRangesWithStyleClass(el, result.entityRanges, 'webkit-html-entity-value');
                }
            });
            return html `"<span class="webkit-html-text-node" jslog=${VisualLogging.value('text-node').track({
                change: true,
                dblclick: true
            })} ${animateOn(Boolean(updateRecord?.isCharDataModified()), DOM_UPDATE_ANIMATION_CLASS_NAME)} ${renderTextNode}></span>"`;
        }
        case Node.COMMENT_NODE: {
            return html `<span class="webkit-html-comment">&lt;!--${node.nodeValue()}--&gt;</span>`;
        }
        case Node.DOCUMENT_TYPE_NODE: {
            let doctype = '<!DOCTYPE ' + node.nodeName();
            if (node.publicId) {
                doctype += ' PUBLIC "' + node.publicId + '"';
                if (node.systemId) {
                    doctype += ' "' + node.systemId + '"';
                }
            }
            else if (node.systemId) {
                doctype += ' SYSTEM "' + node.systemId + '"';
            }
            if (node.internalSubset) {
                doctype += ' [' + node.internalSubset + ']';
            }
            doctype += '>';
            return html `<span class="webkit-html-doctype">${doctype}</span>`;
        }
        case Node.CDATA_SECTION_NODE: {
            return html `<span class="webkit-html-text-node">&lt;![CDATA[${node.nodeValue()}]]&gt;</span>`;
        }
        case Node.DOCUMENT_NODE: {
            const text = node.documentURL;
            const linkify = ref(el => {
                if (el) {
                    el.removeChildren();
                    el.appendChild(Components.Linkifier.Linkifier.linkifyURL(text, {
                        text,
                        preventClick: true,
                        showColumnNumber: false,
                        inlineFrameIndex: 0,
                    }));
                }
            });
            return html `<span>#document (<span ${linkify}></span>)</span>`;
        }
        case Node.DOCUMENT_FRAGMENT_NODE: {
            return html `<span class="webkit-html-fragment">${Platform.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase())}</span>`;
        }
        default: {
            return html `${Platform.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase())}`;
        }
    }
}
function renderAttribute(attr, updateRecord, isDiff, node) {
    const name = attr.name;
    const value = attr.value || '';
    const forceValue = isDiff;
    const closingPunctuationRegex = /[\/;:\)\]\}]/g;
    let highlightIndex = 0;
    let highlightCount = 0;
    let additionalHighlightOffset = 0;
    function setValueWithEntities(element, value) {
        const result = convertUnicodeCharsToHTMLEntities(value);
        highlightCount = result.entityRanges.length;
        const newValue = result.text.replace(closingPunctuationRegex, (match, replaceOffset) => {
            while (highlightIndex < highlightCount && result.entityRanges[highlightIndex].offset < replaceOffset) {
                result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
                ++highlightIndex;
            }
            additionalHighlightOffset += 1;
            return match + '\u200B';
        });
        while (highlightIndex < highlightCount) {
            result.entityRanges[highlightIndex].offset += additionalHighlightOffset;
            ++highlightIndex;
        }
        element.setTextContentTruncatedIfNeeded(newValue);
        Highlighting.highlightRangesWithStyleClass(element, result.entityRanges, 'webkit-html-entity-value');
    }
    const hasText = (forceValue || value.length > 0);
    const jslog = VisualLogging.value(name === 'style' ? 'style-attribute' : 'attribute').track({
        change: true,
        dblclick: true,
    });
    function linkifyValue(value) {
        const rewrittenHref = node ? node.resolveURL(value) : null;
        if (rewrittenHref === null) {
            const span = document.createElement('span');
            setValueWithEntities(span, value);
            return span;
        }
        value = value.replace(closingPunctuationRegex, '$&\u200B');
        if (value.startsWith('data:')) {
            value = Platform.StringUtilities.trimMiddle(value, 60);
        }
        const link = node && node.nodeName().toLowerCase() === 'a' ?
            Link.create(rewrittenHref, value, undefined, 'image-url') :
            Components.Linkifier.Linkifier.linkifyURL(rewrittenHref, {
                text: value,
                preventClick: true,
                showColumnNumber: false,
                inlineFrameIndex: 0,
            });
        return ImagePreviewPopover.setImageUrl(link, rewrittenHref);
    }
    function linkifySrcset(value) {
        // Splitting normally on commas or spaces will break on valid srcsets "foo 1x,bar 2x" and "data:,foo 1x".
        const fragment = document.createDocumentFragment();
        let i = 0;
        while (value.length) {
            if (i++ > 0) {
                UI.UIUtils.createTextChild(fragment, ' ');
            }
            value = value.trim();
            let url = '';
            let descriptor = '';
            const indexOfSpace = value.search(/\s/);
            if (indexOfSpace === -1) {
                url = value;
            }
            else if (indexOfSpace > 0 && value[indexOfSpace - 1] === ',') {
                url = value.substring(0, indexOfSpace);
            }
            else {
                url = value.substring(0, indexOfSpace);
                const indexOfComma = value.indexOf(',', indexOfSpace);
                if (indexOfComma !== -1) {
                    descriptor = value.substring(indexOfSpace, indexOfComma + 1);
                }
                else {
                    descriptor = value.substring(indexOfSpace);
                }
            }
            if (url) {
                if (url.endsWith(',')) {
                    fragment.appendChild(linkifyValue(url.substring(0, url.length - 1)));
                    UI.UIUtils.createTextChild(fragment, ',');
                }
                else {
                    fragment.appendChild(linkifyValue(url));
                }
            }
            if (descriptor) {
                UI.UIUtils.createTextChild(fragment, descriptor);
            }
            value = value.substring(url.length + descriptor.length);
        }
        return fragment;
    }
    const nodeName = node ? node.nodeName().toLowerCase() : '';
    const setAttrValue = ref(el => {
        if (!el) {
            return;
        }
        const valueElement = el;
        valueElement.removeChildren();
        if (nodeName && (name === 'src' || name === 'href') && value) {
            valueElement.appendChild(linkifyValue(value));
        }
        else if ((nodeName === 'img' || nodeName === 'source') && name === 'srcset') {
            valueElement.appendChild(linkifySrcset(value));
        }
        else if (nodeName === 'image' && (name === 'xlink:href' || name === 'href')) {
            valueElement.appendChild(linkifySrcset(value));
        }
        else {
            setValueWithEntities(valueElement, value);
        }
    });
    const relationRef = (relation, tooltip) => ref((el) => {
        if (!el) {
            return;
        }
        void (async () => {
            const relatedElementId = await node.domModel().getElementByRelation(node.id, relation);
            const relatedElement = node.domModel().nodeForId(relatedElementId);
            if (!relatedElement) {
                return;
            }
            const link = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(relatedElement, {
                preventKeyboardFocus: true,
                tooltip,
                textContent: el.textContent || undefined,
                isDynamicLink: true,
            });
            el.removeChildren();
            el.append(link);
        })();
    });
    let relationRefDirective = ref(() => { });
    if (!value) {
        if (name === 'popovertarget') {
            relationRefDirective = relationRef("PopoverTarget" /* Protocol.DOM.GetElementByRelationRequestRelation.PopoverTarget */, i18nString(UIStrings.showPopoverTarget));
        }
        else if (name === 'interesttarget') {
            relationRefDirective = relationRef("InterestTarget" /* Protocol.DOM.GetElementByRelationRequestRelation.InterestTarget */, i18nString(UIStrings.showInterestTarget));
        }
        else if (name === 'commandfor') {
            relationRefDirective = relationRef("CommandFor" /* Protocol.DOM.GetElementByRelationRequestRelation.CommandFor */, i18nString(UIStrings.showCommandForTarget));
        }
    }
    let valueRelationRefDirective = ref(() => { });
    if (value) {
        if (name === 'popovertarget') {
            valueRelationRefDirective = relationRef("PopoverTarget" /* Protocol.DOM.GetElementByRelationRequestRelation.PopoverTarget */, i18nString(UIStrings.showPopoverTarget));
        }
        else if (name === 'interesttarget') {
            valueRelationRefDirective = relationRef("InterestTarget" /* Protocol.DOM.GetElementByRelationRequestRelation.InterestTarget */, i18nString(UIStrings.showInterestTarget));
        }
        else if (name === 'commandfor') {
            valueRelationRefDirective = relationRef("CommandFor" /* Protocol.DOM.GetElementByRelationRequestRelation.CommandFor */, i18nString(UIStrings.showCommandForTarget));
        }
    }
    return html `<span class="webkit-html-attribute" jslog=${jslog}><span class="webkit-html-attribute-name"
      ${animateOn(Boolean(updateRecord?.isAttributeModified(name) && !hasText), DOM_UPDATE_ANIMATION_CLASS_NAME)} ${relationRefDirective}>${name}</span>${hasText ? html `=\u200B"<span class="webkit-html-attribute-value" ${animateOn(Boolean(updateRecord?.isAttributeModified(name) && hasText), DOM_UPDATE_ANIMATION_CLASS_NAME)} ${setAttrValue} ${valueRelationRefDirective}></span>"` :
        nothing}</span>`;
}
function renderTag(node, tagName, isClosingTag, expanded, isDistinctTreeElement, updateRecord) {
    const classMap = {
        'webkit-html-tag': true,
        close: isClosingTag && isDistinctTreeElement,
    };
    let hasUpdates = false;
    const attributes = !isClosingTag && node.hasAttributes() ? node.attributes() : [];
    if (!isClosingTag && updateRecord) {
        hasUpdates = updateRecord.hasRemovedAttributes() || updateRecord.hasRemovedChildren();
        hasUpdates = hasUpdates || (!expanded && updateRecord.hasChangedChildren());
    }
    // We are taking full text content of the tag, including attributes and children, to set the aria label.
    // FIXME: we should compute the aria label ourselves if it is event needed.
    const setAriaLabel = ref(el => {
        if (el?.textContent) {
            UI.ARIAUtils.setLabel(el, el.textContent);
        }
    });
    const tagNameClass = isClosingTag ? 'webkit-html-close-tag-name' : 'webkit-html-tag-name';
    const tagString = (isClosingTag ? '/' : '') + tagName;
    const jslog = !isClosingTag ? VisualLogging.value('tag-name').track({ change: true, dblclick: true }) : '';
    return html `<span
      class=${Lit.Directives.classMap(classMap)} ${setAriaLabel}
      >&lt;<span class=${tagNameClass} jslog=${jslog || nothing} ${animateOn(hasUpdates, DOM_UPDATE_ANIMATION_CLASS_NAME)}>${tagString}</span>${attributes.map(attr => html ` ${renderAttribute(attr, updateRecord, false, node)}`)}&gt;</span>\u200B`;
}
export const DEFAULT_VIEW = (input, output, target) => {
    const hasAdorners = input.showAdAdorner || input.showContainerAdorner || input.showFlexAdorner ||
        input.showGridAdorner || input.showGridLanesAdorner || input.showMediaAdorner || input.showPopoverAdorner ||
        input.showTopLayerAdorner || input.showViewSourceAdorner || input.showScrollAdorner ||
        input.showScrollSnapAdorner || input.showSlotAdorner || input.showStartingStyleAdorner;
    const gutterContainerClasses = {
        'has-decorations': input.decorations.length || input.descendantDecorations.length,
        'gutter-container': true,
    };
    // clang-format off
    render(html `
    <div ${ref(el => { output.contentElement = el; })}>
      ${input.node ? html `<span class="highlight">${renderTitle(input.node, input.isClosingTag, input.expanded, input.isExpandable, input.isXMLMimeType, input.updateRecord, input.onHighlightSearchResults, input.onExpand)}</span>` : nothing}
      ${input.isHovered || input.isSelected ? html `
        <div class="selection fill" style=${`margin-left: ${-input.indent}px`}></div>
      ` : nothing}
      <div class=${Lit.Directives.classMap(gutterContainerClasses)}
           style="left: ${-input.indent}px"
           @click=${input.onGutterClick}>
        <devtools-icon name="dots-horizontal"></devtools-icon>
        ${input.decorations.length || input.descendantDecorations.length ? html `
        <div class="elements-gutter-decoration-container"
             title=${input.decorationsTooltip}>
             ${input.decorations.map(d => html `<div class="elements-gutter-decoration" style="--decoration-color: ${d.color}"></div>`)}
             ${input.descendantDecorations.map(d => html `<div class="elements-gutter-decoration elements-has-decorated-children" style="--decoration-color: ${d.color}"></div>`)}
        </div>` : nothing}
      </div>
      ${hasAdorners ? html `<div class="adorner-container ${!hasAdorners ? 'hidden' : ''}">
        ${input.showAdAdorner ? html `<devtools-adorner
          aria-label=${i18nString(UIStrings.thisFrameWasIdentifiedAsAnAd)}
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.AD}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.AD)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.AD}</span>
        </devtools-adorner>` : nothing}
        ${input.showViewSourceAdorner ? html `<devtools-adorner
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE)}
          aria-label=${i18nString(UIStrings.viewSourceCode)}
          @click=${input.onViewSourceAdornerClick}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE}</span>
        </devtools-adorner>` : nothing}
        ${input.showContainerAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.CONTAINER}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.CONTAINER).track({ click: true })}
          active=${input.containerAdornerActive}
          aria-label=${input.containerAdornerActive ? i18nString(UIStrings.enableContainer) : i18nString(UIStrings.disableContainer)}
          @click=${input.onContainerAdornerClick}
          @keydown=${handleAdornerKeydown(input.onContainerAdornerClick)}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            <devtools-icon name="container"></devtools-icon>
            <span>${input.containerType}</span>
          </span>
        </devtools-adorner>` : nothing}
        ${input.showFlexAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.FLEX}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.FLEX).track({ click: true })}
          active=${input.flexAdornerActive}
          aria-label=${input.flexAdornerActive ? i18nString(UIStrings.disableFlexMode) : i18nString(UIStrings.enableFlexMode)}
          @click=${input.onFlexAdornerClick}
          @keydown=${handleAdornerKeydown(input.onFlexAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.FLEX}</span>
        </devtools-adorner>` : nothing}
        ${input.showGridAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${input.isSubgrid ? ElementsComponents.AdornerManager.RegisteredAdorners.SUBGRID : ElementsComponents.AdornerManager.RegisteredAdorners.GRID}
          jslog=${VisualLogging.adorner(input.isSubgrid ? ElementsComponents.AdornerManager.RegisteredAdorners.SUBGRID : ElementsComponents.AdornerManager.RegisteredAdorners.GRID).track({ click: true })}
          active=${input.gridAdornerActive}
          aria-label=${input.gridAdornerActive ? i18nString(UIStrings.disableGridMode) : i18nString(UIStrings.enableGridMode)}
          @click=${input.onGridAdornerClick}
          @keydown=${handleAdornerKeydown(input.onGridAdornerClick)}
          ${adornerRef()}>
          <span>${input.isSubgrid ? ElementsComponents.AdornerManager.RegisteredAdorners.SUBGRID : ElementsComponents.AdornerManager.RegisteredAdorners.GRID}</span>
        </devtools-adorner>` : nothing}
        ${input.showGridLanesAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.GRID_LANES}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.GRID_LANES).track({ click: true })}
          active=${input.gridAdornerActive}
          aria-label=${input.gridAdornerActive ? i18nString(UIStrings.disableGridLanesMode) : i18nString(UIStrings.enableGridLanesMode)}
          @click=${input.onGridAdornerClick}
          @keydown=${handleAdornerKeydown(input.onGridAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.GRID_LANES}</span>
        </devtools-adorner>` : nothing}
        ${input.showMediaAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.MEDIA}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.MEDIA).track({ click: true })}
          aria-label=${i18nString(UIStrings.openMediaPanel)}
          @click=${input.onMediaAdornerClick}
          @keydown=${handleAdornerKeydown(input.onMediaAdornerClick)}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            ${ElementsComponents.AdornerManager.RegisteredAdorners.MEDIA}<devtools-icon name="select-element"></devtools-icon>
          </span>
        </devtools-adorner>` : nothing}
        ${input.showPopoverAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.POPOVER}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.POPOVER).track({ click: true })}
          active=${input.popoverAdornerActive}
          aria-label=${input.popoverAdornerActive ? i18nString(UIStrings.stopForceOpenPopover) : i18nString(UIStrings.forceOpenPopover)}
          @click=${input.onPopoverAdornerClick}
          @keydown=${handleAdornerKeydown(input.onPopoverAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.POPOVER}</span>
        </devtools-adorner>` : nothing}
        ${input.showTopLayerAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.TOP_LAYER}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.TOP_LAYER).track({ click: true })}
          aria-label=${i18nString(UIStrings.reveal)}
          @click=${input.onTopLayerAdornerClick}
          @keydown=${handleAdornerKeydown(input.onTopLayerAdornerClick)}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            ${`top-layer (${input.topLayerIndex})`}<devtools-icon name="select-element"></devtools-icon>
          </span>
        </devtools-adorner>` : nothing}
        ${input.showStartingStyleAdorner ? html `<devtools-adorner
          class="starting-style"
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.STARTING_STYLE}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.STARTING_STYLE).track({ click: true })}
          active=${input.startingStyleAdornerActive}
          toggleable=true
          aria-label=${input.startingStyleAdornerActive ? i18nString(UIStrings.disableStartingStyle) : i18nString(UIStrings.enableStartingStyle)}
          @click=${input.onStartingStyleAdornerClick}
          @keydown=${handleAdornerKeydown(input.onStartingStyleAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.STARTING_STYLE}</span>
        </devtools-adorner>` : nothing}
        ${input.showScrollAdorner ? html `<devtools-adorner
          class="scroll"
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL).track({ click: true })}
          aria-label=${i18nString(UIStrings.elementHasScrollableOverflow)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL}</span>
        </devtools-adorner>` : nothing}
        ${input.showSlotAdorner ? html `<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.SLOT}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.SLOT).track({ click: true })}
          @click=${input.onSlotAdornerClick}
          @mousedown=${(e) => e.stopPropagation()}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            <devtools-icon name="select-element"></devtools-icon>
            <span>${ElementsComponents.AdornerManager.RegisteredAdorners.SLOT}</span>
          </span>
        </devtools-adorner>` : nothing}
        ${input.showScrollSnapAdorner ? html `<devtools-adorner
          class="scroll-snap"
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL_SNAP}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL_SNAP).track({ click: true })}
          active=${input.scrollSnapAdornerActive}
          toggleable=true
          aria-label=${input.scrollSnapAdornerActive ? i18nString(UIStrings.disableScrollSnap) : i18nString(UIStrings.enableScrollSnap)}
          @click=${input.onScrollSnapAdornerClick}
          @keydown=${handleAdornerKeydown(input.onScrollSnapAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL_SNAP}</span>
        </devtools-adorner>` : nothing}
      </div>` : nothing}
      ${input.isSelected ? html `
        <span class="selected-hint" title=${i18nString(UIStrings.useSInTheConsoleToReferToThis, { PH1: '$0' })} aria-hidden="true"></span>
      ` : nothing}
      ${input.showAiButton ? html `
        <span class="ai-button-container">
          <devtools-floating-button
            icon-name=${AIAssistance.AiUtils.getIconName()}
            title=${input.aiButtonTitle || ''}
            jslogcontext="ask-ai"
            @click=${input.onAiButtonClick}
            @mousedown=${(e) => e.stopPropagation()}>
          </devtools-floating-button>
        </span>
      ` : nothing}
    </div>
  `, target);
    // clang-format on
};
export class ElementsTreeElement extends UI.TreeOutline.TreeElement {
    nodeInternal;
    treeOutline;
    searchQuery;
    #expandedChildrenLimit;
    decorationsThrottler;
    inClipboard;
    #hovered;
    editing;
    htmlEditElement;
    expandAllButtonElement;
    #elementIssues = new Map();
    #nodeElementToIssue = new Map();
    #highlights = [];
    tagTypeContext;
    #adornersThrottler = new Common.Throttler.Throttler(100);
    #containerAdornerActive = false;
    #flexAdornerActive = false;
    #gridAdornerActive = false;
    #popoverAdornerActive = false;
    #scrollSnapAdornerActive = false;
    #startingStyleAdornerActive = false;
    #layout = null;
    #decorations = [];
    #descendantDecorations = [];
    #decorationsTooltip = '';
    #updateRecord = null;
    // Used to add the content to TreeElement's title element.
    // Relied on by web tests.
    #contentElement;
    constructor(node, isClosingTag) {
        // The title will be updated in onattach.
        super();
        this.nodeInternal = node;
        this.treeOutline = null;
        this.listItemElement.setAttribute('jslog', `${VisualLogging.treeItem().parent('elementsTreeOutline').track({
            keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
            drag: true,
            click: true,
        })}`);
        this.searchQuery = null;
        this.#expandedChildrenLimit = InitialChildrenLimit;
        this.decorationsThrottler = new Common.Throttler.Throttler(100);
        this.inClipboard = false;
        this.#hovered = false;
        this.editing = null;
        if (isClosingTag) {
            this.tagTypeContext = { tagType: "CLOSING_TAG" /* TagType.CLOSING */ };
        }
        else {
            this.tagTypeContext = {
                tagType: "OPENING_TAG" /* TagType.OPENING */,
                canAddAttributes: this.nodeInternal.nodeType() === Node.ELEMENT_NODE,
            };
            void this.#updateAdorners();
        }
        this.expandAllButtonElement = null;
        this.performUpdate();
        if (this.nodeInternal.retained && !this.isClosingTag()) {
            const icon = new Icon();
            icon.name = 'small-status-dot';
            icon.style.color = 'var(--icon-error)';
            icon.classList.add('extra-small');
            icon.style.setProperty('vertical-align', 'middle');
            this.setLeadingIcons([icon]);
            this.listItemNode.classList.add('detached-elements-detached-node');
            this.listItemNode.style.setProperty('display', '-webkit-box');
            this.listItemNode.setAttribute('title', 'Retained Node');
        }
        if (this.nodeInternal.detached && !this.isClosingTag()) {
            this.listItemNode.setAttribute('title', 'Detached Tree Node');
        }
    }
    static animateOnDOMUpdate(treeElement) {
        const tagName = treeElement.listItemElement.querySelector('.webkit-html-tag-name');
        UI.UIUtils.runCSSAnimationOnce(tagName || treeElement.listItemElement, DOM_UPDATE_ANIMATION_CLASS_NAME);
    }
    static visibleShadowRoots(node) {
        let roots = node.shadowRoots();
        if (roots.length && !Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get()) {
            roots = roots.filter(filter);
        }
        function filter(root) {
            return root.shadowRootType() !== SDK.DOMModel.DOMNode.ShadowRootTypes.UserAgent;
        }
        return roots;
    }
    static canShowInlineText(node) {
        if (node.contentDocument() || node.templateContent() || ElementsTreeElement.visibleShadowRoots(node).length ||
            node.hasPseudoElements()) {
            return false;
        }
        if (node.nodeType() !== Node.ELEMENT_NODE) {
            return false;
        }
        if (!node.firstChild || node.firstChild !== node.lastChild || node.firstChild.nodeType() !== Node.TEXT_NODE) {
            return false;
        }
        const textChild = node.firstChild;
        const maxInlineTextChildLength = 80;
        if (textChild.nodeValue().length < maxInlineTextChildLength) {
            return true;
        }
        return false;
    }
    static populateForcedPseudoStateItems(contextMenu, node) {
        const pseudoClasses = ['active', 'hover', 'focus', 'visited', 'focus-within', 'focus-visible'];
        const forcedPseudoState = node.domModel().cssModel().pseudoState(node);
        const stateMenu = contextMenu.debugSection().appendSubMenuItem(i18nString(UIStrings.forceState), false, 'force-state');
        for (const pseudoClass of pseudoClasses) {
            const pseudoClassForced = forcedPseudoState ? forcedPseudoState.indexOf(pseudoClass) >= 0 : false;
            stateMenu.defaultSection().appendCheckboxItem(':' + pseudoClass, setPseudoStateCallback.bind(null, pseudoClass, !pseudoClassForced), { checked: pseudoClassForced, jslogContext: pseudoClass });
        }
        function setPseudoStateCallback(pseudoState, enabled) {
            node.domModel().cssModel().forcePseudoState(node, pseudoState, enabled);
        }
    }
    // ClearNode param is used to clean DOM after in-place editing..
    performUpdate(clearNode = false) {
        if (this.editing) {
            return;
        }
        const output = {};
        DEFAULT_VIEW({
            node: !clearNode ? this.nodeInternal : null,
            isClosingTag: this.isClosingTag(),
            expanded: this.expanded,
            isExpandable: this.isExpandable(),
            isXMLMimeType: Boolean(this.treeOutline?.isXMLMimeType),
            updateRecord: this.#updateRecord,
            onHighlightSearchResults: () => this.#highlightSearchResults(),
            onExpand: () => this.expand(),
            containerAdornerActive: this.#containerAdornerActive,
            showAdAdorner: this.nodeInternal.isAdFrameNode(),
            showContainerAdorner: Boolean(this.#layout?.containerType) && !this.isClosingTag(),
            containerType: this.#layout?.containerType,
            showFlexAdorner: Boolean(this.#layout?.isFlex) && !this.isClosingTag(),
            flexAdornerActive: this.#flexAdornerActive,
            showGridAdorner: Boolean(this.#layout?.isGrid) && !this.isClosingTag(),
            showGridLanesAdorner: Boolean(this.#layout?.isGridLanes) && !this.isClosingTag(),
            showMediaAdorner: this.node().isMediaNode() && !this.isClosingTag(),
            showPopoverAdorner: Boolean(Root.Runtime.hostConfig.devToolsAllowPopoverForcing?.enabled) &&
                Boolean(this.node().attributes().find(attr => attr.name === 'popover')) && !this.isClosingTag(),
            showTopLayerAdorner: this.node().topLayerIndex() !== -1 && !this.isClosingTag(),
            gridAdornerActive: this.#gridAdornerActive,
            popoverAdornerActive: this.#popoverAdornerActive,
            isSubgrid: Boolean(this.#layout?.isSubgrid),
            showViewSourceAdorner: this.nodeInternal.isRootNode() && isOpeningTag(this.tagTypeContext),
            showScrollAdorner: ((this.node().nodeName() === 'HTML' && this.node().ownerDocument?.isScrollable()) ||
                (this.node().nodeName() !== '#document' && this.node().isScrollable())) &&
                !this.isClosingTag(),
            decorations: this.#decorations,
            descendantDecorations: this.expanded ? [] : this.#descendantDecorations,
            decorationsTooltip: this.#decorationsTooltip,
            indent: this.computeLeftIndent(),
            showScrollSnapAdorner: Boolean(this.#layout?.hasScroll) && !this.isClosingTag(),
            scrollSnapAdornerActive: this.#scrollSnapAdornerActive,
            showSlotAdorner: Boolean(this.nodeInternal.assignedSlot) && !this.isClosingTag(),
            showStartingStyleAdorner: this.nodeInternal.affectedByStartingStyles() && !this.isClosingTag(),
            startingStyleAdornerActive: this.#startingStyleAdornerActive,
            onStartingStyleAdornerClick: (event) => this.#onStartingStyleAdornerClick(event),
            onSlotAdornerClick: () => {
                if (this.nodeInternal.assignedSlot) {
                    const deferredNode = this.nodeInternal.assignedSlot.deferredNode;
                    deferredNode.resolve(node => {
                        void Common.Revealer.reveal(node);
                    });
                }
            },
            topLayerIndex: this.node().topLayerIndex(),
            onViewSourceAdornerClick: this.revealHTMLInSources.bind(this),
            onGutterClick: this.showContextMenu.bind(this),
            onContainerAdornerClick: (event) => this.#onContainerAdornerClick(event),
            onFlexAdornerClick: (event) => this.#onFlexAdornerClick(event),
            onGridAdornerClick: (event) => this.#onGridAdornerClick(event),
            onMediaAdornerClick: (event) => this.#onMediaAdornerClick(event),
            onPopoverAdornerClick: (event) => this.#onPopoverAdornerClick(event),
            onScrollSnapAdornerClick: (event) => this.#onScrollSnapAdornerClick(event),
            onTopLayerAdornerClick: () => {
                if (!this.treeOutline) {
                    return;
                }
                this.treeOutline.revealInTopLayer(this.node());
            },
            isHovered: this.#hovered,
            isSelected: this.selected,
            showAiButton: Boolean(this.#hovered || this.selected) && this.node().nodeType() === Node.ELEMENT_NODE &&
                UI.ActionRegistry.ActionRegistry.instance().hasAction('freestyler.elements-floating-button'),
            aiButtonTitle: UI.ActionRegistry.ActionRegistry.instance().hasAction('freestyler.elements-floating-button') ?
                UI.ActionRegistry.ActionRegistry.instance().getAction('freestyler.elements-floating-button').title() :
                undefined,
            onAiButtonClick: (ev) => {
                ev.stopPropagation();
                this.select(true, false);
                const action = UI.ActionRegistry.ActionRegistry.instance().getAction('freestyler.elements-floating-button');
                if (action) {
                    void action.execute();
                }
            },
        }, output, this.listItemElement);
        this.#contentElement = output.contentElement;
        if (this.#updateRecord) {
            this.#updateRecord = null;
        }
    }
    #onContainerAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const model = node.domModel().overlayModel();
        if (model.isHighlightedContainerQueryInPersistentOverlay(nodeId)) {
            model.hideContainerQueryInPersistentOverlay(nodeId);
            this.#containerAdornerActive = false;
        }
        else {
            model.highlightContainerQueryInPersistentOverlay(nodeId);
            this.#containerAdornerActive = true;
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
        }
        void this.updateAdorners();
    }
    #onFlexAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const model = node.domModel().overlayModel();
        if (model.isHighlightedFlexContainerInPersistentOverlay(nodeId)) {
            model.hideFlexContainerInPersistentOverlay(nodeId);
            this.#flexAdornerActive = false;
        }
        else {
            model.highlightFlexContainerInPersistentOverlay(nodeId);
            this.#flexAdornerActive = true;
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
        }
        void this.updateAdorners();
    }
    #onGridAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const model = node.domModel().overlayModel();
        if (model.isHighlightedGridInPersistentOverlay(nodeId)) {
            model.hideGridInPersistentOverlay(nodeId);
            this.#gridAdornerActive = false;
        }
        else {
            model.highlightGridInPersistentOverlay(nodeId);
            this.#gridAdornerActive = true;
            if (this.#layout?.isSubgrid) {
                Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
            }
        }
        void this.updateAdorners();
    }
    async #onMediaAdornerClick(event) {
        event.stopPropagation();
        await UI.ViewManager.ViewManager.instance().showView('medias');
        const view = UI.ViewManager.ViewManager.instance().view('medias');
        if (view) {
            const widget = await view.widget();
            if (widget instanceof Media.MainView.MainView) {
                await widget.waitForInitialPlayers();
                widget.selectPlayerByDOMNodeId(this.node().backendNodeId());
            }
        }
    }
    highlightAttribute(attributeName) {
        // If the attribute is not found, we highlight the tag name instead.
        let animationElement = this.listItemElement.querySelector('.webkit-html-tag-name') ?? this.listItemElement;
        if (this.nodeInternal.getAttribute(attributeName) !== undefined) {
            const tag = this.listItemElement.getElementsByClassName('webkit-html-tag')[0];
            const attributes = tag.getElementsByClassName('webkit-html-attribute');
            for (const attribute of attributes) {
                const attributeElement = attribute.getElementsByClassName('webkit-html-attribute-name')[0];
                if (attributeElement.textContent === attributeName) {
                    animationElement = attributeElement;
                    break;
                }
            }
        }
        UI.UIUtils.runCSSAnimationOnce(animationElement, DOM_UPDATE_ANIMATION_CLASS_NAME);
    }
    isClosingTag() {
        return !isOpeningTag(this.tagTypeContext);
    }
    node() {
        return this.nodeInternal;
    }
    isEditing() {
        return Boolean(this.editing);
    }
    highlightSearchResults(searchQuery) {
        this.searchQuery = searchQuery;
        if (!this.editing) {
            this.#highlightSearchResults();
        }
    }
    hideSearchHighlights() {
        Highlighting.HighlightManager.HighlightManager.instance().removeHighlights(this.#highlights);
        this.#highlights = [];
    }
    setInClipboard(inClipboard) {
        if (this.inClipboard === inClipboard) {
            return;
        }
        this.inClipboard = inClipboard;
        this.listItemElement.classList.toggle('in-clipboard', inClipboard);
    }
    get hovered() {
        return this.#hovered;
    }
    set hovered(isHovered) {
        if (this.#hovered === isHovered) {
            return;
        }
        this.#hovered = isHovered;
        if (this.listItemElement) {
            if (isHovered) {
                this.listItemElement.classList.add('hovered');
            }
            else {
                this.listItemElement.classList.remove('hovered');
            }
            this.performUpdate();
        }
    }
    addIssue(newIssue) {
        if (this.#elementIssues.has(newIssue.primaryKey())) {
            return;
        }
        this.#elementIssues.set(newIssue.primaryKey(), newIssue);
        this.#applyIssueStyleAndTooltip(newIssue);
    }
    #applyIssueStyleAndTooltip(issue) {
        const elementIssueDetails = getElementIssueDetails(issue);
        if (!elementIssueDetails) {
            return;
        }
        if (elementIssueDetails.attribute) {
            this.#highlightViolatingAttr(elementIssueDetails.attribute, issue);
        }
        else {
            this.#highlightTagAsViolating(issue);
        }
    }
    get issuesByNodeElement() {
        return this.#nodeElementToIssue;
    }
    #highlightViolatingAttr(name, issue) {
        const tag = this.listItemElement.getElementsByClassName('webkit-html-tag')[0];
        const attributes = tag.getElementsByClassName('webkit-html-attribute');
        for (const attribute of attributes) {
            if (attribute.getElementsByClassName('webkit-html-attribute-name')[0].textContent === name) {
                const attributeElement = attribute.getElementsByClassName('webkit-html-attribute-name')[0];
                attributeElement.classList.add('violating-element');
                this.#updateNodeElementToIssue(attributeElement, issue);
            }
        }
    }
    #highlightTagAsViolating(issue) {
        const tagElement = this.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
        tagElement.classList.add('violating-element');
        this.#updateNodeElementToIssue(tagElement, issue);
    }
    #updateNodeElementToIssue(nodeElement, issue) {
        let issues = this.#nodeElementToIssue.get(nodeElement);
        if (!issues) {
            issues = [];
            this.#nodeElementToIssue.set(nodeElement, issues);
        }
        issues.push(issue);
        this.treeOutline?.updateNodeElementToIssue(nodeElement, issues);
    }
    expandedChildrenLimit() {
        return this.#expandedChildrenLimit;
    }
    setExpandedChildrenLimit(expandedChildrenLimit) {
        this.#expandedChildrenLimit = expandedChildrenLimit;
    }
    onTopLayerIndexChanged() {
        this.performUpdate();
    }
    onbind() {
        this.performUpdate();
        if (this.treeOutline && !this.isClosingTag()) {
            this.treeOutline.treeElementByNode.set(this.nodeInternal, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.onTopLayerIndexChanged, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.SCROLLABLE_FLAG_UPDATED, this.#onScrollableFlagUpdated, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.CONTAINER_QUERY_OVERLAY_STATE_CHANGED, this.#onPersistentContainerQueryOverlayStateChanged, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.#onPersistentFlexContainerOverlayStateChanged, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, this.#onPersistentGridOverlayStateChanged, this);
            this.nodeInternal.addEventListener(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, this.#onPersistentScrollSnapOverlayStateChanged, this);
        }
    }
    onunbind() {
        if (this.editing) {
            this.editing.cancel();
        }
        // Update the element to clean up adorner registrations with the
        // ElementsPanel.
        // We do not change the ElementsTreeElement state in case the
        // element is bound again.
        DEFAULT_VIEW({
            node: null,
            isClosingTag: false,
            expanded: false,
            isExpandable: false,
            isXMLMimeType: false,
            updateRecord: null,
            onHighlightSearchResults: () => { },
            onExpand: () => { },
            containerAdornerActive: false,
            showAdAdorner: false,
            showContainerAdorner: false,
            containerType: this.#layout?.containerType,
            showFlexAdorner: false,
            flexAdornerActive: false,
            showGridAdorner: false,
            showGridLanesAdorner: false,
            showMediaAdorner: false,
            showPopoverAdorner: false,
            showTopLayerAdorner: false,
            gridAdornerActive: false,
            popoverAdornerActive: false,
            isSubgrid: false,
            showViewSourceAdorner: false,
            showScrollAdorner: false,
            showScrollSnapAdorner: false,
            scrollSnapAdornerActive: false,
            showSlotAdorner: false,
            showStartingStyleAdorner: false,
            startingStyleAdornerActive: false,
            onStartingStyleAdornerClick: () => { },
            onSlotAdornerClick: () => { },
            topLayerIndex: -1,
            onViewSourceAdornerClick: () => { },
            onGutterClick: () => { },
            onContainerAdornerClick: () => { },
            onFlexAdornerClick: () => { },
            onGridAdornerClick: () => { },
            onMediaAdornerClick: () => { },
            onPopoverAdornerClick: () => { },
            onScrollSnapAdornerClick: () => { },
            onTopLayerAdornerClick: () => { },
            isHovered: false,
            isSelected: false,
            showAiButton: false,
            onAiButtonClick: () => { },
            decorations: [],
            descendantDecorations: [],
            decorationsTooltip: '',
            indent: 0,
        }, {}, this.listItemElement);
        if (this.treeOutline && this.treeOutline.treeElementByNode.get(this.nodeInternal) === this) {
            this.treeOutline.treeElementByNode.delete(this.nodeInternal);
        }
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.onTopLayerIndexChanged, this);
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.SCROLLABLE_FLAG_UPDATED, this.#onScrollableFlagUpdated, this);
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.CONTAINER_QUERY_OVERLAY_STATE_CHANGED, this.#onPersistentContainerQueryOverlayStateChanged, this);
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.FLEX_CONTAINER_OVERLAY_STATE_CHANGED, this.#onPersistentFlexContainerOverlayStateChanged, this);
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED, this.#onPersistentGridOverlayStateChanged, this);
        this.nodeInternal.removeEventListener(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED, this.#onPersistentScrollSnapOverlayStateChanged, this);
    }
    #onScrollableFlagUpdated() {
        void this.#updateAdorners();
    }
    #onPersistentContainerQueryOverlayStateChanged(event) {
        this.#containerAdornerActive = event.data.enabled;
        this.performUpdate();
    }
    #onPersistentFlexContainerOverlayStateChanged(event) {
        this.#flexAdornerActive = event.data.enabled;
        this.performUpdate();
    }
    #onPersistentGridOverlayStateChanged(event) {
        this.#gridAdornerActive = event.data.enabled;
        this.performUpdate();
    }
    #onPersistentScrollSnapOverlayStateChanged(event) {
        this.#scrollSnapAdornerActive = event.data.enabled;
        this.performUpdate();
    }
    #onScrollSnapAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const model = node.domModel().overlayModel();
        if (this.#scrollSnapAdornerActive) {
            model.hideScrollSnapInPersistentOverlay(nodeId);
        }
        else {
            model.highlightScrollSnapInPersistentOverlay(nodeId);
        }
    }
    onattach() {
        if (this.#hovered) {
            this.listItemElement.classList.add('hovered');
            this.performUpdate();
        }
        this.updateTitle();
        this.listItemElement.draggable = true;
    }
    async onpopulate() {
        if (this.treeOutline) {
            return await this.treeOutline.populateTreeElement(this);
        }
    }
    async expandRecursively() {
        await this.nodeInternal.getSubtree(100, true);
        await super.expandRecursively(Number.MAX_VALUE);
    }
    onexpand() {
        if (this.isClosingTag()) {
            return;
        }
        this.updateTitle();
    }
    oncollapse() {
        if (this.isClosingTag()) {
            return;
        }
        this.updateTitle();
    }
    select(omitFocus, selectedByUser) {
        if (this.editing) {
            return false;
        }
        return super.select(omitFocus, selectedByUser);
    }
    onselect(selectedByUser) {
        if (!this.treeOutline) {
            return false;
        }
        this.treeOutline.suppressRevealAndSelect = true;
        this.treeOutline.selectDOMNode(this.nodeInternal, selectedByUser);
        if (selectedByUser) {
            this.nodeInternal.highlight();
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);
        }
        this.performUpdate();
        this.treeOutline.suppressRevealAndSelect = false;
        return true;
    }
    ondelete() {
        if (!this.treeOutline) {
            return false;
        }
        const startTagTreeElement = this.treeOutline.findTreeElement(this.nodeInternal);
        startTagTreeElement ? (void startTagTreeElement.remove()) : (void this.remove());
        return true;
    }
    onenter() {
        // On Enter or Return start editing the first attribute
        // or create a new attribute on the selected element.
        if (this.editing) {
            return false;
        }
        this.startEditing();
        // prevent a newline from being immediately inserted
        return true;
    }
    selectOnMouseDown(event) {
        super.selectOnMouseDown(event);
        if (this.editing) {
            return;
        }
        // Prevent selecting the nearest word on double click.
        if (event.detail >= 2) {
            event.preventDefault();
        }
    }
    ondblclick(event) {
        if (this.editing || this.isClosingTag()) {
            return false;
        }
        if (this.startEditingTarget(event.target)) {
            return false;
        }
        if (this.isExpandable() && !this.expanded) {
            this.expand();
        }
        return false;
    }
    hasEditableNode() {
        return !this.nodeInternal.isShadowRoot() && !this.nodeInternal.ancestorUserAgentShadowRoot();
    }
    insertInLastAttributePosition(tag, node) {
        if (tag.getElementsByClassName('webkit-html-attribute').length > 0) {
            tag.insertBefore(node, tag.lastChild);
        }
        else if (tag.textContent !== null) {
            const matchResult = tag.textContent.match(/^<(.*?)>$/);
            if (!matchResult) {
                return;
            }
            const nodeName = matchResult[1];
            tag.textContent = '';
            UI.UIUtils.createTextChild(tag, '<' + nodeName);
            tag.appendChild(node);
            UI.UIUtils.createTextChild(tag, '>');
        }
    }
    startEditingTarget(eventTarget) {
        if (!this.treeOutline || this.treeOutline.selectedDOMNode() !== this.nodeInternal) {
            return false;
        }
        if (this.nodeInternal.nodeType() !== Node.ELEMENT_NODE && this.nodeInternal.nodeType() !== Node.TEXT_NODE) {
            return false;
        }
        const textNode = eventTarget.enclosingNodeOrSelfWithClass('webkit-html-text-node');
        if (textNode) {
            return this.startEditingTextNode(textNode);
        }
        const attribute = eventTarget.enclosingNodeOrSelfWithClass('webkit-html-attribute');
        if (attribute) {
            return this.startEditingAttribute(attribute, eventTarget);
        }
        const tagName = eventTarget.enclosingNodeOrSelfWithClass('webkit-html-tag-name');
        if (tagName) {
            return this.startEditingTagName(tagName);
        }
        const newAttribute = eventTarget.enclosingNodeOrSelfWithClass('add-attribute');
        if (newAttribute) {
            return this.addNewAttribute();
        }
        return false;
    }
    showContextMenu(event) {
        this.treeOutline && void this.treeOutline.showContextMenu(this, event);
    }
    revealHTMLInSources() {
        const frameOwnerId = this.nodeInternal.frameOwnerFrameId();
        if (frameOwnerId) {
            const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameOwnerId);
            if (frame) {
                const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(frame.url);
                void Common.Revealer.reveal(sourceCode);
            }
        }
    }
    async populateTagContextMenu(contextMenu, event) {
        // Add attribute-related actions.
        const treeElement = this.isClosingTag() && this.treeOutline ? this.treeOutline.findTreeElement(this.nodeInternal) : this;
        if (!treeElement) {
            return;
        }
        contextMenu.editSection().appendItem(i18nString(UIStrings.addAttribute), treeElement.addNewAttribute.bind(treeElement), { jslogContext: 'add-attribute' });
        const target = event.target;
        const attribute = target.enclosingNodeOrSelfWithClass('webkit-html-attribute');
        const newAttribute = target.enclosingNodeOrSelfWithClass('add-attribute');
        if (attribute && !newAttribute) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.editAttribute), this.startEditingAttribute.bind(this, attribute, target), { jslogContext: 'edit-attribute' });
        }
        await this.populateNodeContextMenu(contextMenu);
        ElementsTreeElement.populateForcedPseudoStateItems(contextMenu, treeElement.node());
        this.populateScrollIntoView(contextMenu);
        contextMenu.viewSection().appendItem(i18nString(UIStrings.focus), async () => {
            await this.nodeInternal.focus();
        }, { jslogContext: 'focus' });
    }
    populatePseudoElementContextMenu(contextMenu) {
        if (this.childCount() !== 0) {
            this.populateExpandRecursively(contextMenu);
        }
        this.populateScrollIntoView(contextMenu);
    }
    populateExpandRecursively(contextMenu) {
        contextMenu.viewSection().appendItem(i18nString(UIStrings.expandRecursively), this.expandRecursively.bind(this), { jslogContext: 'expand-recursively' });
    }
    populateScrollIntoView(contextMenu) {
        contextMenu.viewSection().appendItem(i18nString(UIStrings.scrollIntoView), () => this.nodeInternal.scrollIntoView(), { jslogContext: 'scroll-into-view' });
    }
    async populateTextContextMenu(contextMenu, textNode) {
        if (!this.editing) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.editText), this.startEditingTextNode.bind(this, textNode), { jslogContext: 'edit-text' });
        }
        return await this.populateNodeContextMenu(contextMenu);
    }
    async populateNodeContextMenu(contextMenu) {
        // Add free-form node-related actions.
        const isEditable = this.hasEditableNode();
        // clang-format off
        if (isEditable && !this.editing) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.editAsHtml), this.editAsHTML.bind(this), { jslogContext: 'elements.edit-as-html' });
        }
        // clang-format on
        const isShadowRoot = this.nodeInternal.isShadowRoot();
        const createShortcut = UI.KeyboardShortcut.KeyboardShortcut.shortcutToString.bind(null);
        const modifier = UI.KeyboardShortcut.Modifiers.CtrlOrMeta.value;
        const treeOutline = this.treeOutline;
        if (!treeOutline) {
            return;
        }
        let menuItem;
        const openAiAssistanceId = 'freestyler.element-panel-context';
        if (UI.ActionRegistry.ActionRegistry.instance().hasAction(openAiAssistanceId)) {
            function appendSubmenuPromptAction(submenu, action, label, prompt, jslogContext) {
                submenu.defaultSection().appendItem(label, () => {
                    void action.execute({ prompt });
                    UI.UIUtils.PromotionManager.instance().recordFeatureInteraction(openAiAssistanceId);
                }, { disabled: !action.enabled(), jslogContext });
            }
            UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, this.nodeInternal);
            const action = UI.ActionRegistry.ActionRegistry.instance().getAction(openAiAssistanceId);
            const submenu = contextMenu.footerSection().appendSubMenuItem(action.title(), false, openAiAssistanceId);
            submenu.defaultSection().appendAction(openAiAssistanceId, i18nString(UIStrings.startAChat));
            const submenuConfigs = [
                {
                    condition: (props) => Boolean(props?.isFlex),
                    items: [
                        {
                            label: i18nString(UIStrings.wrapTheseItems),
                            prompt: 'How can I make flex items wrap?',
                            jslogContextSuffix: '.flex-wrap',
                        },
                        {
                            label: i18nString(UIStrings.distributeItemsEvenly),
                            prompt: 'How do I distribute flex items evenly?',
                            jslogContextSuffix: '.flex-distribute',
                        },
                        {
                            label: i18nString(UIStrings.explainFlexbox),
                            prompt: 'What is flexbox?',
                            jslogContextSuffix: '.flex-what',
                        },
                    ],
                },
                {
                    condition: (props) => Boolean(props?.isGrid && !props?.isSubgrid),
                    items: [
                        {
                            label: i18nString(UIStrings.alignItems),
                            prompt: 'How do I align items in a grid?',
                            jslogContextSuffix: '.grid-align',
                        },
                        {
                            label: i18nString(UIStrings.addPadding),
                            prompt: 'How to add spacing between grid items?',
                            jslogContextSuffix: '.grid-gap',
                        },
                        {
                            label: i18nString(UIStrings.explainGridLayout),
                            prompt: 'How does grid layout work?',
                            jslogContextSuffix: '.grid-how',
                        },
                    ],
                },
                {
                    condition: (props) => Boolean(props?.isSubgrid),
                    items: [
                        {
                            label: i18nString(UIStrings.findGridDefinition),
                            prompt: 'Where is this grid defined?',
                            jslogContextSuffix: '.subgrid-where',
                        },
                        {
                            label: i18nString(UIStrings.changeParentProperties),
                            prompt: 'How to overwrite parent grid properties?',
                            jslogContextSuffix: '.subgrid-override',
                        },
                        {
                            label: i18nString(UIStrings.explainSubgrids),
                            prompt: 'How do subgrids work?',
                            jslogContextSuffix: '.subgrid-how',
                        },
                    ],
                },
                {
                    condition: (props) => Boolean(props?.hasScroll),
                    items: [
                        {
                            label: i18nString(UIStrings.removeScrollbars),
                            prompt: 'How do I remove scrollbars for this element?',
                            jslogContextSuffix: '.scroll-remove',
                        },
                        {
                            label: i18nString(UIStrings.styleScrollbars),
                            prompt: 'How can I style a scrollbar?',
                            jslogContextSuffix: '.scroll-style',
                        },
                        {
                            label: i18nString(UIStrings.explainScrollbars),
                            prompt: 'Why does this element scroll?',
                            jslogContextSuffix: '.scroll-why',
                        },
                    ],
                },
                {
                    condition: (props) => Boolean(props?.containerType),
                    items: [
                        {
                            label: i18nString(UIStrings.explainContainerQueries),
                            prompt: 'What are container queries?',
                            jslogContextSuffix: '.container-what',
                        },
                        {
                            label: i18nString(UIStrings.explainContainerTypes),
                            prompt: 'How do I use container-type?',
                            jslogContextSuffix: '.container-how',
                        },
                        {
                            label: i18nString(UIStrings.explainContainerContext),
                            prompt: 'What\'s the container context for this element?',
                            jslogContextSuffix: '.container-context',
                        },
                    ],
                },
                {
                    // Default items
                    condition: () => true,
                    items: [
                        {
                            label: i18nString(UIStrings.assessVisibility),
                            prompt: 'Why isn’t this element visible?',
                            jslogContextSuffix: '.visibility',
                        },
                        {
                            label: i18nString(UIStrings.centerElement),
                            prompt: 'How do I center this element?',
                            jslogContextSuffix: '.center',
                        },
                    ],
                },
            ];
            const layoutProps = await this.nodeInternal.domModel().cssModel().getLayoutPropertiesFromComputedStyle(this.nodeInternal.id);
            const config = submenuConfigs.find(c => c.condition(layoutProps));
            if (config) {
                for (const item of config.items) {
                    appendSubmenuPromptAction(submenu, action, item.label, item.prompt, openAiAssistanceId + item.jslogContextSuffix);
                }
            }
        }
        menuItem = contextMenu.clipboardSection().appendItem(i18nString(UIStrings.cut), treeOutline.performCopyOrCut.bind(treeOutline, true, this.nodeInternal), { disabled: !this.hasEditableNode(), jslogContext: 'cut' });
        menuItem.setShortcut(createShortcut('X', modifier));
        // Place it here so that all "Copy"-ing items stick together.
        const copyMenu = contextMenu.clipboardSection().appendSubMenuItem(i18nString(UIStrings.copy), false, 'copy');
        const section = copyMenu.section();
        if (!isShadowRoot) {
            menuItem = section.appendItem(i18nString(UIStrings.copyOuterhtml), treeOutline.performCopyOrCut.bind(treeOutline, false, this.nodeInternal), { jslogContext: 'copy-outer-html' });
            menuItem.setShortcut(createShortcut('V', modifier));
        }
        if (this.nodeInternal.nodeType() === Node.ELEMENT_NODE) {
            section.appendItem(i18nString(UIStrings.copySelector), this.copyCSSPath.bind(this), { jslogContext: 'copy-selector' });
            section.appendItem(i18nString(UIStrings.copyJsPath), this.copyJSPath.bind(this), { disabled: !canGetJSPath(this.nodeInternal), jslogContext: 'copy-js-path' });
            section.appendItem(i18nString(UIStrings.copyStyles), this.copyStyles.bind(this), { jslogContext: 'elements.copy-styles' });
        }
        if (!isShadowRoot) {
            section.appendItem(i18nString(UIStrings.copyXpath), this.copyXPath.bind(this), { jslogContext: 'copy-xpath' });
            section.appendItem(i18nString(UIStrings.copyFullXpath), this.copyFullXPath.bind(this), { jslogContext: 'copy-full-xpath' });
        }
        menuItem = copyMenu.clipboardSection().appendItem(i18nString(UIStrings.copyElement), treeOutline.performCopyOrCut.bind(treeOutline, false, this.nodeInternal, true), { jslogContext: 'copy-element' });
        menuItem.setShortcut(createShortcut('C', modifier));
        if (!isShadowRoot) {
            // Duplicate element, disabled on root element and ShadowDOM.
            const isRootElement = !this.nodeInternal.parentNode || this.nodeInternal.parentNode.nodeName() === '#document';
            menuItem = contextMenu.editSection().appendItem(i18nString(UIStrings.duplicateElement), treeOutline.duplicateNode.bind(treeOutline, this.nodeInternal), {
                disabled: (this.nodeInternal.isInShadowTree() || isRootElement),
                jslogContext: 'elements.duplicate-element',
            });
        }
        menuItem = contextMenu.clipboardSection().appendItem(i18nString(UIStrings.paste), treeOutline.pasteNode.bind(treeOutline, this.nodeInternal), { disabled: !treeOutline.canPaste(this.nodeInternal), jslogContext: 'paste' });
        menuItem.setShortcut(createShortcut('V', modifier));
        menuItem = contextMenu.debugSection().appendCheckboxItem(i18nString(UIStrings.hideElement), treeOutline.toggleHideElement.bind(treeOutline, this.nodeInternal), { checked: treeOutline.isToggledToHidden(this.nodeInternal), jslogContext: 'elements.hide-element' });
        menuItem.setShortcut(UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction('elements.hide-element') || '');
        if (isEditable) {
            contextMenu.editSection().appendItem(i18nString(UIStrings.deleteElement), this.remove.bind(this), { jslogContext: 'delete-element' });
        }
        this.populateExpandRecursively(contextMenu);
        contextMenu.viewSection().appendItem(i18nString(UIStrings.collapseChildren), this.collapseChildren.bind(this), { jslogContext: 'collapse-children' });
        const deviceModeWrapperAction = new Emulation.DeviceModeWrapper.ActionDelegate();
        contextMenu.viewSection().appendItem(i18nString(UIStrings.captureNodeScreenshot), deviceModeWrapperAction.handleAction.bind(null, UI.Context.Context.instance(), 'emulation.capture-node-screenshot'), { jslogContext: 'emulation.capture-node-screenshot' });
        if (this.nodeInternal.frameOwnerFrameId()) {
            contextMenu.viewSection().appendItem(i18nString(UIStrings.showFrameDetails), () => {
                const frameOwnerFrameId = this.nodeInternal.frameOwnerFrameId();
                if (frameOwnerFrameId) {
                    const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameOwnerFrameId);
                    void Common.Revealer.reveal(frame);
                }
            }, { jslogContext: 'show-frame-details' });
        }
    }
    startEditing() {
        if (!this.treeOutline || this.treeOutline.selectedDOMNode() !== this.nodeInternal) {
            return;
        }
        const listItem = this.listItemElement;
        if (isOpeningTag(this.tagTypeContext) && this.tagTypeContext.canAddAttributes) {
            const attribute = listItem.getElementsByClassName('webkit-html-attribute')[0];
            if (attribute) {
                return this.startEditingAttribute(attribute, attribute.getElementsByClassName('webkit-html-attribute-value')[0]);
            }
            return this.addNewAttribute();
        }
        if (this.nodeInternal.nodeType() === Node.TEXT_NODE) {
            const textNode = listItem.getElementsByClassName('webkit-html-text-node')[0];
            if (textNode) {
                return this.startEditingTextNode(textNode);
            }
        }
        return;
    }
    addNewAttribute() {
        // Cannot just convert the textual html into an element without
        // a parent node. Use a temporary span container for the HTML.
        const container = document.createElement('span');
        // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
        Lit.render(renderAttribute({ name: ' ', value: '' }, null, false, this.nodeInternal), container);
        const attr = container.firstElementChild;
        attr.style.marginLeft = '2px'; // overrides the .editing margin rule
        attr.style.marginRight = '2px'; // overrides the .editing margin rule
        attr.setAttribute('jslog', `${VisualLogging.value('new-attribute').track({ change: true, resize: true })}`);
        const tag = this.listItemElement.getElementsByClassName('webkit-html-tag')[0];
        this.insertInLastAttributePosition(tag, attr);
        attr.scrollIntoViewIfNeeded(true);
        return this.startEditingAttribute(attr, attr);
    }
    triggerEditAttribute(attributeName) {
        const attributeElements = this.listItemElement.getElementsByClassName('webkit-html-attribute-name');
        for (let i = 0, len = attributeElements.length; i < len; ++i) {
            if (attributeElements[i].textContent === attributeName) {
                for (let elem = attributeElements[i].nextSibling; elem; elem = elem.nextSibling) {
                    if (elem.nodeType !== Node.ELEMENT_NODE) {
                        continue;
                    }
                    if (elem.classList.contains('webkit-html-attribute-value')) {
                        return this.startEditingAttribute(elem.parentElement, elem);
                    }
                }
            }
        }
        return;
    }
    startEditingAttribute(attribute, elementForSelection) {
        console.assert(this.listItemElement.isAncestor(attribute));
        if (UI.UIUtils.isBeingEdited(attribute)) {
            return true;
        }
        const attributeNameElement = attribute.getElementsByClassName('webkit-html-attribute-name')[0];
        if (!attributeNameElement) {
            return false;
        }
        const attributeName = attributeNameElement.textContent;
        const attributeValueElement = attribute.getElementsByClassName('webkit-html-attribute-value')[0];
        // Make sure elementForSelection is not a child of attributeValueElement.
        elementForSelection =
            attributeValueElement?.isAncestor(elementForSelection) ? attributeValueElement : elementForSelection;
        function removeZeroWidthSpaceRecursive(node) {
            if (node.nodeType === Node.TEXT_NODE) {
                node.nodeValue = node.nodeValue ? node.nodeValue.replace(/\u200B/g, '') : '';
                return;
            }
            if (node.nodeType !== Node.ELEMENT_NODE) {
                return;
            }
            for (let child = node.firstChild; child; child = child.nextSibling) {
                removeZeroWidthSpaceRecursive(child);
            }
        }
        const attributeValue = attributeName && attributeValueElement ?
            this.nodeInternal.getAttribute(attributeName)?.replaceAll('"', '&quot;') :
            undefined;
        if (attributeValue !== undefined) {
            attributeValueElement.setTextContentTruncatedIfNeeded(attributeValue, i18nString(UIStrings.valueIsTooLargeToEdit));
        }
        // Remove zero-width spaces that were added by nodeTitleInfo.
        removeZeroWidthSpaceRecursive(attribute);
        const config = new UI.InplaceEditor.Config(this.attributeEditingCommitted.bind(this), this.editingCancelled.bind(this), attributeName);
        function postKeyDownFinishHandler(event) {
            UI.UIUtils.handleElementValueModifications(event, attribute);
            return '';
        }
        if (!Common.ParsedURL.ParsedURL.fromString(attributeValueElement?.textContent || '')) {
            config.setPostKeydownFinishHandler(postKeyDownFinishHandler);
        }
        this.updateEditorHandles(attribute, config);
        const componentSelection = this.listItemElement.getComponentSelection();
        componentSelection?.selectAllChildren(elementForSelection);
        return true;
    }
    startEditingTextNode(textNodeElement) {
        if (UI.UIUtils.isBeingEdited(textNodeElement)) {
            return true;
        }
        let textNode = this.nodeInternal;
        // We only show text nodes inline in elements if the element only
        // has a single child, and that child is a text node.
        if (textNode.nodeType() === Node.ELEMENT_NODE && textNode.firstChild) {
            textNode = textNode.firstChild;
        }
        const container = textNodeElement.enclosingNodeOrSelfWithClass('webkit-html-text-node');
        if (container) {
            container.textContent = textNode.nodeValue();
        } // Strip the CSS or JS highlighting if present.
        const config = new UI.InplaceEditor.Config(this.textNodeEditingCommitted.bind(this, textNode), this.editingCancelled.bind(this), null);
        this.updateEditorHandles(textNodeElement, config);
        const componentSelection = this.listItemElement.getComponentSelection();
        componentSelection?.selectAllChildren(textNodeElement);
        return true;
    }
    startEditingTagName(tagNameElement) {
        if (!tagNameElement) {
            tagNameElement = this.listItemElement.getElementsByClassName('webkit-html-tag-name')[0];
            if (!tagNameElement) {
                return false;
            }
        }
        const tagName = tagNameElement.textContent;
        if (tagName !== null && EditTagBlocklist.has(tagName.toLowerCase())) {
            return false;
        }
        if (UI.UIUtils.isBeingEdited(tagNameElement)) {
            return true;
        }
        const closingTagElement = this.distinctClosingTagElement();
        function keyupListener() {
            if (closingTagElement && tagNameElement) {
                closingTagElement.textContent = '</' + tagNameElement.textContent + '>';
            }
        }
        const keydownListener = (event) => {
            if (event.key !== ' ') {
                return;
            }
            this.editing?.commit();
            event.consume(true);
        };
        function editingCommitted(element, newTagName, oldText, tagName, moveDirection) {
            if (!tagNameElement) {
                return;
            }
            tagNameElement.removeEventListener('keyup', keyupListener, false);
            tagNameElement.removeEventListener('keydown', keydownListener, false);
            this.tagNameEditingCommitted(element, newTagName, oldText, tagName, moveDirection);
        }
        function editingCancelled(element, tagName) {
            if (!tagNameElement) {
                return;
            }
            tagNameElement.removeEventListener('keyup', keyupListener, false);
            tagNameElement.removeEventListener('keydown', keydownListener, false);
            this.editingCancelled(element, tagName);
        }
        tagNameElement.addEventListener('keyup', keyupListener, false);
        tagNameElement.addEventListener('keydown', keydownListener, false);
        const config = new UI.InplaceEditor.Config(editingCommitted.bind(this), editingCancelled.bind(this), tagName);
        this.updateEditorHandles(tagNameElement, config);
        const componentSelection = this.listItemElement.getComponentSelection();
        componentSelection?.selectAllChildren(tagNameElement);
        return true;
    }
    updateEditorHandles(element, config) {
        const editorHandles = UI.InplaceEditor.InplaceEditor.startEditing(element, config);
        if (!editorHandles) {
            this.editing = null;
        }
        else {
            this.editing = {
                commit: editorHandles.commit,
                cancel: editorHandles.cancel,
                editor: undefined,
                resize: () => { },
            };
        }
    }
    async startEditingAsHTML(commitCallback, disposeCallback, maybeInitialValue) {
        if (maybeInitialValue === null) {
            return;
        }
        if (this.editing) {
            return;
        }
        const initialValue = convertUnicodeCharsToHTMLEntities(maybeInitialValue).text;
        this.htmlEditElement = document.createElement('div');
        this.htmlEditElement.className = 'source-code elements-tree-editor';
        // Hide header items.
        let child = this.listItemElement.firstChild;
        while (child) {
            if (child instanceof HTMLElement) {
                child.style.display = 'none';
            }
            child = child.nextSibling;
        }
        // Hide children item.
        if (this.childrenListElement) {
            this.childrenListElement.style.display = 'none';
        }
        // Append editor.
        this.listItemElement.append(this.htmlEditElement);
        this.htmlEditElement.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.consume(true);
            }
        });
        const editor = new TextEditor.TextEditor.TextEditor(CodeMirror.EditorState.create({
            doc: initialValue,
            extensions: [
                CodeMirror.keymap.of([
                    {
                        key: 'Mod-Enter',
                        run: () => {
                            this.editing?.commit();
                            return true;
                        },
                    },
                    {
                        key: 'Escape',
                        run: () => {
                            this.editing?.cancel();
                            return true;
                        },
                    },
                ]),
                TextEditor.Config.baseConfiguration(initialValue),
                TextEditor.Config.closeBrackets.instance(),
                TextEditor.Config.autocompletion.instance(),
                CodeMirror.html.html({ autoCloseTags: false, selfClosingTags: true }),
                TextEditor.Config.domWordWrap.instance(),
                CodeMirror.EditorView.theme({
                    '&.cm-editor': { maxHeight: '300px' },
                    '.cm-scroller': { overflowY: 'auto' },
                }),
                CodeMirror.EditorView.domEventHandlers({
                    focusout: event => {
                        // The relatedTarget is null when no element gains focus, e.g. switching windows.
                        const relatedTarget = event.relatedTarget;
                        if (relatedTarget && !relatedTarget.isSelfOrDescendant(editor)) {
                            this.editing?.commit();
                        }
                    },
                }),
            ],
        }));
        this.editing = { commit: commit.bind(this), cancel: dispose.bind(this), editor, resize: resize.bind(this) };
        resize.call(this);
        this.htmlEditElement.appendChild(editor);
        editor.editor.focus();
        this.treeOutline?.setMultilineEditing(this.editing);
        function resize() {
            if (this.treeOutline && this.htmlEditElement) {
                this.htmlEditElement.style.width = this.treeOutline.visibleWidth() - this.computeLeftIndent() - 30 + 'px';
            }
        }
        function commit() {
            if (this.editing?.editor) {
                commitCallback(initialValue, this.editing.editor.state.doc.toString());
            }
            dispose.call(this);
        }
        function dispose() {
            if (!this.editing?.editor) {
                return;
            }
            this.editing = null;
            // Remove editor.
            if (this.htmlEditElement) {
                this.listItemElement.removeChild(this.htmlEditElement);
            }
            this.htmlEditElement = undefined;
            // Unhide children item.
            if (this.childrenListElement) {
                this.childrenListElement.style.removeProperty('display');
            }
            // Unhide header items.
            let child = this.listItemElement.firstChild;
            while (child) {
                if (child instanceof HTMLElement) {
                    child.style.removeProperty('display');
                }
                child = child.nextSibling;
            }
            if (this.treeOutline) {
                this.treeOutline.setMultilineEditing(null);
                this.treeOutline.focus();
            }
            disposeCallback();
        }
    }
    attributeEditingCommitted(element, newText, oldText, attributeName, moveDirection) {
        this.editing = null;
        const treeOutline = this.treeOutline;
        function moveToNextAttributeIfNeeded(error) {
            if (error) {
                this.editingCancelled(element, attributeName);
            }
            if (!moveDirection) {
                return;
            }
            if (treeOutline) {
                treeOutline.runPendingUpdates();
                treeOutline.focus();
            }
            // Search for the attribute's position, and then decide where to move to.
            const attributes = this.nodeInternal.attributes();
            for (let i = 0; i < attributes.length; ++i) {
                if (attributes[i].name !== attributeName) {
                    continue;
                }
                if (moveDirection === 'backward') {
                    if (i === 0) {
                        this.startEditingTagName();
                    }
                    else {
                        this.triggerEditAttribute(attributes[i - 1].name);
                    }
                }
                else if (i === attributes.length - 1) {
                    this.addNewAttribute();
                }
                else {
                    this.triggerEditAttribute(attributes[i + 1].name);
                }
                return;
            }
            // Moving From the "New Attribute" position.
            if (moveDirection === 'backward') {
                if (newText === ' ') {
                    // Moving from "New Attribute" that was not edited
                    if (attributes.length > 0) {
                        this.triggerEditAttribute(attributes[attributes.length - 1].name);
                    }
                    // Moving from "New Attribute" that holds new value
                }
                else if (attributes.length > 1) {
                    this.triggerEditAttribute(attributes[attributes.length - 2].name);
                }
            }
            else if (moveDirection === 'forward') {
                if (!Platform.StringUtilities.isWhitespace(newText)) {
                    this.addNewAttribute();
                }
                else {
                    this.startEditingTagName();
                }
            }
        }
        if (attributeName !== null && (attributeName.trim() || newText.trim()) && oldText !== newText) {
            this.nodeInternal.setAttribute(attributeName, newText, moveToNextAttributeIfNeeded.bind(this));
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
            return;
        }
        this.updateTitle();
        moveToNextAttributeIfNeeded.call(this);
    }
    tagNameEditingCommitted(element, newText, oldText, tagName, moveDirection) {
        this.editing = null;
        const self = this;
        function cancel() {
            const closingTagElement = self.distinctClosingTagElement();
            if (closingTagElement) {
                closingTagElement.textContent = '</' + tagName + '>';
            }
            self.editingCancelled(element, tagName);
            moveToNextAttributeIfNeeded.call(self);
        }
        function moveToNextAttributeIfNeeded() {
            if (moveDirection !== 'forward') {
                this.addNewAttribute();
                return;
            }
            const attributes = this.nodeInternal.attributes();
            if (attributes.length > 0) {
                this.triggerEditAttribute(attributes[0].name);
            }
            else {
                this.addNewAttribute();
            }
        }
        newText = newText.trim();
        if (newText === oldText) {
            cancel();
            return;
        }
        const treeOutline = this.treeOutline;
        const wasExpanded = this.expanded;
        this.nodeInternal.setNodeName(newText, (error, newNode) => {
            if (error || !newNode) {
                cancel();
                return;
            }
            if (!treeOutline) {
                return;
            }
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
            const newTreeItem = treeOutline.selectNodeAfterEdit(wasExpanded, error, newNode);
            // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
            // @ts-expect-error
            moveToNextAttributeIfNeeded.call(newTreeItem);
        });
    }
    textNodeEditingCommitted(textNode, _element, newText) {
        this.editing = null;
        function callback() {
            this.updateTitle();
        }
        textNode.setNodeValue(newText, callback.bind(this));
    }
    editingCancelled(_element, _tagName) {
        this.editing = null;
        // Need to restore attributes structure.
        this.updateTitle();
    }
    distinctClosingTagElement() {
        // FIXME: Improve the Tree Element / Outline Abstraction to prevent crawling the DOM
        // For an expanded element, it will be the last element with class "close"
        // in the child element list.
        if (this.expanded) {
            const closers = this.childrenListElement.querySelectorAll('.close');
            return closers[closers.length - 1];
        }
        // Remaining cases are single line non-expanded elements with a closing
        // tag, or HTML elements without a closing tag (such as <br>). Return
        // null in the case where there isn't a closing tag.
        const tags = this.listItemElement.getElementsByClassName('webkit-html-tag');
        return tags.length === 1 ? null : tags[tags.length - 1];
    }
    updateTitle(updateRecord) {
        // If we are editing, return early to prevent canceling the edit.
        // After editing is committed updateTitle will be called.
        if (this.editing) {
            return;
        }
        this.performUpdate(/* clearNode= */ true);
        this.#updateRecord = updateRecord ?? null;
        if (this.nodeInternal.nodeType() === Node.DOCUMENT_FRAGMENT_NODE && this.nodeInternal.isInShadowTree() &&
            this.nodeInternal.shadowRootType()) {
            this.childrenListElement.classList.add('shadow-root');
            let depth = 4;
            for (let node = this.nodeInternal; depth && node; node = node.parentNode) {
                if (node.nodeType() === Node.DOCUMENT_FRAGMENT_NODE) {
                    depth--;
                }
            }
            if (!depth) {
                this.childrenListElement.classList.add('shadow-root-deep');
            }
            else {
                this.childrenListElement.classList.add('shadow-root-depth-' + depth);
            }
        }
        this.performUpdate();
        if (this.#contentElement) {
            // fixme: we probably do not need a title element in the new tree outline.
            this.title = this.#contentElement;
        }
        this.updateDecorations();
        // If there is an issue with this node, make sure to update it.
        for (const issue of this.#elementIssues.values()) {
            this.#applyIssueStyleAndTooltip(issue);
        }
        this.#highlightSearchResults();
    }
    computeLeftIndent() {
        let treeElement = this.parent;
        let depth = 0;
        while (treeElement !== null) {
            depth++;
            treeElement = treeElement.parent;
        }
        /** Keep it in sync with elementsTreeOutline.css **/
        return 12 * (depth - 2) + (this.isExpandable() && this.isCollapsible() ? 1 : 12);
    }
    updateDecorations() {
        if (this.isClosingTag()) {
            return;
        }
        if (this.nodeInternal.nodeType() !== Node.ELEMENT_NODE) {
            return;
        }
        void this.decorationsThrottler.schedule(this.#updateDecorations.bind(this));
    }
    #updateDecorations() {
        if (!this.treeOutline) {
            return Promise.resolve();
        }
        const node = this.nodeInternal;
        if (!this.treeOutline.decoratorExtensions) {
            this.treeOutline.decoratorExtensions = getRegisteredDecorators();
        }
        const markerToExtension = new Map();
        for (const decoratorExtension of this.treeOutline.decoratorExtensions) {
            markerToExtension.set(decoratorExtension.marker, decoratorExtension);
        }
        const promises = [];
        const decorations = [];
        const descendantDecorations = [];
        node.traverseMarkers(visitor);
        function visitor(n, marker) {
            const extension = markerToExtension.get(marker);
            if (!extension) {
                return;
            }
            promises.push(Promise.resolve(extension.decorator()).then(collectDecoration.bind(null, n)));
        }
        function collectDecoration(n, decorator) {
            const decoration = decorator.decorate(n);
            if (!decoration) {
                return;
            }
            (n === node ? decorations : descendantDecorations).push(decoration);
        }
        return Promise.all(promises).then(updateDecorationsUI.bind(this));
        function updateDecorationsUI() {
            this.#decorations = decorations;
            this.#descendantDecorations = descendantDecorations;
            if (!decorations.length && !descendantDecorations.length) {
                this.#decorationsTooltip = '';
                this.performUpdate();
                return;
            }
            const tooltip = [];
            for (const decoration of decorations) {
                tooltip.push(decoration.title);
            }
            if (!this.expanded && descendantDecorations.length) {
                tooltip.push(i18nString(UIStrings.children));
                for (const decoration of descendantDecorations) {
                    tooltip.push(decoration.title);
                }
            }
            this.#decorationsTooltip = tooltip.join('\n');
            this.performUpdate();
        }
    }
    async remove() {
        if (this.treeOutline?.isToggledToHidden(this.nodeInternal)) {
            // Unhide the node before removing. This avoids inconsistent state if the node is restored via undo.
            await this.treeOutline.toggleHideElement(this.nodeInternal);
        }
        if (this.nodeInternal.pseudoType()) {
            return;
        }
        const parentElement = this.parent;
        if (!parentElement) {
            return;
        }
        if (!this.nodeInternal.parentNode || this.nodeInternal.parentNode.nodeType() === Node.DOCUMENT_NODE) {
            return;
        }
        void this.nodeInternal.removeNode();
    }
    toggleEditAsHTML(callback, startEditing) {
        if (this.editing && this.htmlEditElement) {
            this.editing.commit();
            return;
        }
        if (startEditing === false) {
            return;
        }
        function selectNode(error) {
            if (callback) {
                callback(!error);
            }
        }
        function commitChange(initialValue, value) {
            if (initialValue !== value) {
                node.setOuterHTML(value, selectNode);
            }
        }
        function disposeCallback() {
            if (callback) {
                callback(false);
            }
        }
        const node = this.nodeInternal;
        void node.getOuterHTML().then(this.startEditingAsHTML.bind(this, commitChange, disposeCallback));
    }
    copyCSSPath() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(cssPath(this.nodeInternal, true));
    }
    copyJSPath() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(jsPath(this.nodeInternal, true));
    }
    copyXPath() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(this.nodeInternal, true));
    }
    copyFullXPath() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(xPath(this.nodeInternal, false));
    }
    async copyStyles() {
        const node = this.nodeInternal;
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
    #highlightSearchResults() {
        this.hideSearchHighlights();
        if (!this.searchQuery) {
            return;
        }
        const text = this.listItemElement.textContent || '';
        const regexObject = Platform.StringUtilities.createPlainTextSearchRegex(this.searchQuery, 'gi');
        const matchRanges = [];
        let match = regexObject.exec(text);
        while (match) {
            matchRanges.push(new TextUtils.TextRange.SourceRange(match.index, match[0].length));
            match = regexObject.exec(text);
        }
        // Fall back for XPath, etc. matches.
        if (!matchRanges.length) {
            matchRanges.push(new TextUtils.TextRange.SourceRange(0, text.length));
        }
        this.#highlights = Highlighting.HighlightManager.HighlightManager.instance().highlightOrderedTextRanges(this.listItemElement, matchRanges);
    }
    editAsHTML() {
        const promise = Common.Revealer.reveal(this.node());
        void promise.then(() => {
            const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.edit-as-html');
            return action.execute();
        });
    }
    updateAdorners() {
        // TODO: remove adornersThrottler in favour of throttled updated (requestUpdate/performUpdate).
        void this.#adornersThrottler.schedule(this.#updateAdorners.bind(this));
    }
    async #updateAdorners() {
        if (this.isClosingTag()) {
            return;
        }
        const node = this.node();
        const nodeId = node.id;
        if (node.nodeType() !== Node.COMMENT_NODE && node.nodeType() !== Node.DOCUMENT_FRAGMENT_NODE &&
            node.nodeType() !== Node.TEXT_NODE && nodeId !== undefined) {
            this.#layout = await node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(nodeId);
        }
        else {
            this.#layout = null;
        }
        this.performUpdate();
    }
    async #onPopoverAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        await node.domModel().agent.invoke_forceShowPopover({ nodeId, enable: !this.#popoverAdornerActive });
        this.#popoverAdornerActive = !this.#popoverAdornerActive;
        if (this.#popoverAdornerActive) {
            Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
        }
        this.performUpdate();
    }
    #onStartingStyleAdornerClick(event) {
        event.stopPropagation();
        const node = this.node();
        const nodeId = node.id;
        if (!nodeId) {
            return;
        }
        const model = node.domModel().cssModel();
        if (this.#startingStyleAdornerActive) {
            model.forceStartingStyle(node, false);
        }
        else {
            model.forceStartingStyle(node, true);
        }
        this.#startingStyleAdornerActive = !this.#startingStyleAdornerActive;
        this.performUpdate();
    }
}
export const InitialChildrenLimit = 500;
/**
 * A union of HTML4 and HTML5-Draft elements that explicitly
 * or implicitly (for HTML5) forbid the closing tag.
 **/
export const ForbiddenClosingTagElements = new Set([
    'area', 'base', 'basefont', 'br', 'canvas', 'col', 'command', 'embed', 'frame', 'hr',
    'img', 'input', 'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
]);
/** These tags we do not allow editing their tag name. **/
export const EditTagBlocklist = new Set(['html', 'head', 'body']);
export function convertUnicodeCharsToHTMLEntities(text) {
    let result = '';
    let lastIndexAfterEntity = 0;
    const entityRanges = [];
    const charToEntity = MappedCharToEntity;
    for (let i = 0, size = text.length; i < size; ++i) {
        const char = text.charAt(i);
        if (charToEntity.has(char)) {
            result += text.substring(lastIndexAfterEntity, i);
            const entityValue = '&' + charToEntity.get(char) + ';';
            entityRanges.push(new TextUtils.TextRange.SourceRange(result.length, entityValue.length));
            result += entityValue;
            lastIndexAfterEntity = i + 1;
        }
    }
    if (result) {
        result += text.substring(lastIndexAfterEntity);
    }
    return { text: result || text, entityRanges };
}
/**
 * As a privacy measure we are logging elements tree outline as a flat list where every tree item is a
 * child of a tree outline.
 **/
function loggingParentProvider(e) {
    const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(e);
    return treeElement?.treeOutline?.contentElement;
}
VisualLogging.registerParentProvider('elementsTreeOutline', loggingParentProvider);
//# sourceMappingURL=ElementsTreeElement.js.map