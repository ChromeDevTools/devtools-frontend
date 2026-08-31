// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
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
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Protocol from '../../generated/protocol.js';
import * as AIAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Badges from '../../models/badges/badges.js';
import * as Bindings from '../../models/bindings/bindings.js';
import type * as Elements from '../../models/elements/elements.js';
import * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as CodeMirror from '../../third_party/codemirror.next/codemirror.next.js';
import type * as Adorners from '../../ui/components/adorners/adorners.js';
import * as CodeHighlighter from '../../ui/components/code_highlighter/code_highlighter.js';
import * as Highlighting from '../../ui/components/highlighting/highlighting.js';
import * as TextEditor from '../../ui/components/text_editor/text_editor.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import type {DirectiveResult} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelsCommon from '../common/common.js';
import * as Media from '../media/media.js';

import * as ElementsComponents from './components/components.js';
import {getElementIssueDetails} from './ElementIssueUtils.js';
import {ElementsPanel} from './ElementsPanel.js';
import * as ElementStatePaneWidget from './ElementStatePaneWidget.js';
import {type ElementsTreeOutline, MappedCharToEntity} from './ElementsTreeOutline.js';
import {ImagePreviewPopover} from './ImagePreviewPopover.js';
import {getRegisteredDecorators, type MarkerDecorator, type MarkerDecoratorRegistration} from './MarkerDecorator.js';

const {html, nothing, render, Directives: {classMap, ref, repeat, until}} = Lit;
const {animateOn} = UI.UIUtils;

const UIStrings = {
  /**
   * @description Title for Ad adorner. This element is marked as advertisement element.
   */
  thisElementWasIdentifiedAsAnAd: 'This element was identified as an ad',
  /**
   * @description Title of a section in the Ad adorner tooltip. Lists the ad script(s) responsible for generating this element.
   */
  creatorAdScriptAncestry: 'Creator ad script ancestry',
  /**
   * @description Title of a section in the Ad adorner tooltip. The filter list rule that flagged the root script in 'Creator ad script ancestry' as an ad.
   */
  rootScriptFilterListRule: 'Root script filter list rule',
  /**
   * @description Title of a section in the Ad adorner tooltip. The filter list rule that flagged the element's current resource.
   */
  filterListRule: 'Filter list rule',
  /**
   * @description Title of a section in the Ad adorner tooltip. This element was identified as an ad, but no provenance data is available.
   */
  noProvenanceAvailable: 'No provenance data is available',
  /**
   * @description A context menu item in the Elements panel. Force is used as a verb, indicating intention to make the state change.
   */
  forceState: 'Force state',
  /**
   * @description Hint element title in the DOM tree of the Elements panel.
   * @example {0} PH1
   */
  useSInTheConsoleToReferToThis: 'Use {PH1} in the console to refer to this element.',
  /**
   * @description Text to cut an element, cut should be used as a verb.
   */
  cut: 'Cut',
  /**
   * @description Text for copying, copy should be used as a verb.
   */
  copy: 'Copy',
  /**
   * @description Text to paste an element, paste should be used as a verb.
   */
  paste: 'Paste',
  /**
   * @description Context menu item in the Edit as HTML editor that selects the editor's entire
   * contents. "Select all" should be used as a verb.
   */
  selectAll: 'Select all',
  /**
   * @description Text in the DOM tree of the Elements panel.
   */
  valueIsTooLargeToEdit: '<value is too large to edit>',
  /**
   * @description Element text content in the DOM tree of the Elements panel.
   */
  children: 'Children:',
  /**
   * @description ARIA label for Elements Tree adorners.
   */
  enableGridMode: 'Enable grid mode',
  /**
   * @description ARIA label for Elements Tree adorners.
   */
  disableGridMode: 'Disable grid mode',
  /**
   * @description ARIA label for Elements Tree adorners.
   */
  enableGridLanesMode: 'Enable grid-lanes mode',
  /**
   * @description ARIA label for Elements Tree adorners.
   */
  disableGridLanesMode: 'Disable grid-lanes mode',
  /**
   * @description ARIA label for an elements tree adorner.
   */
  forceOpenPopover: 'Keep this popover open',
  /**
   * @description ARIA label for an elements tree adorner.
   */
  stopForceOpenPopover: 'Stop keeping this popover open',
  /**
   * @description ARIA label for an elements tree adorner.
   */
  forceShowInterest: 'Trigger interest on this element',
  /**
   * @description ARIA label for an elements tree adorner.
   */
  stopForceShowInterest: 'Cancel interest on this element',
  /**
   * @description Label of the adorner for flex elements in the Elements panel.
   */
  enableFlexMode: 'Enable flex mode',
  /**
   * @description Label of the adorner for flex elements in the Elements panel.
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
   * to the Media panel.
   */
  openMediaPanel: 'Jump to Media panel',
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel.
   */
  showPopoverTarget: 'Show element associated with the `popovertarget` attribute',
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `interesttarget` attribute.
   */
  showInterestTarget: 'Show element associated with the `interesttarget` attribute',
  /**
   * @description Text of a tooltip to redirect to another element in the Elements panel, associated with the `commandfor` attribute.
   */
  showCommandForTarget: 'Show element associated with the `commandfor` attribute',
  /**
   * @description Text of the tooltip for the scroll adorner.
   */
  elementHasScrollableOverflow: 'This element has a scrollable overflow',
  /**
   * @description Label of an adorner next to the html node in the Elements panel.
   */
  viewSourceCode: 'View source code',
  /**
   * @description Label of an adorner in the Elements panel. When clicked, it reveals
   * the definition of the custom element in the Sources panel.
   */
  showCustomElementDefinition: 'Show custom element definition',
  /**
   * @description ARIA label for the top-layer adorner in the DOM tree of the Elements panel. When clicked, it reveals the true location of an element.
   */
  reveal: 'Reveal',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/ElementsTreeElement.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const enum TagType {
  OPENING = 'OPENING_TAG',
  CLOSING = 'CLOSING_TAG',
}

interface OpeningTagContext {
  tagType: TagType.OPENING;
  canAddAttributes: boolean;
}

interface ClosingTagContext {
  tagType: TagType.CLOSING;
}

export type TagTypeContext = OpeningTagContext|ClosingTagContext;

export function isOpeningTag(context: TagTypeContext): context is OpeningTagContext {
  return context.tagType === TagType.OPENING;
}

export interface ViewInput {
  node: SDK.DOMModel.DOMNode|null;
  isClosingTag: boolean;
  expanded: boolean;
  isExpandable: boolean;
  isXMLMimeType: boolean;
  updateRecord: Elements.ElementUpdateRecord.ElementUpdateRecord|null;
  onHighlightSearchResults: () => void;
  onExpand: () => void;
  issues?: IssuesManager.Issue.Issue[];

  containerAdornerActive: boolean;
  flexAdornerActive: boolean;
  gridAdornerActive: boolean;
  popoverAdornerActive: boolean;
  interestAdornerActive: boolean;

  adProvenance?: Protocol.Network.AdProvenance;
  target?: SDK.Target.Target;
  adTooltipId: string;

  showContainerAdorner: boolean;
  containerType?: string;
  showFlexAdorner: boolean;
  showGridAdorner: boolean;
  showGridLanesAdorner: boolean;
  showMediaAdorner: boolean;
  showPopoverAdorner: boolean;
  showInterestAdorner: boolean;
  showTopLayerAdorner: boolean;
  isSubgrid: boolean;

  showViewSourceAdorner: boolean;
  showScrollAdorner: boolean;
  showScrollSnapAdorner: boolean;
  topLayerIndex: number;
  scrollSnapAdornerActive: boolean;

  onGutterClick: (e: Event) => void;
  onContainerAdornerClick: (e: Event) => void;
  onFlexAdornerClick: (e: Event) => void;
  onGridAdornerClick: (e: Event) => void;
  onMediaAdornerClick: (e: Event) => void;
  onPopoverAdornerClick: (e: Event) => void;
  onInterestAdornerClick: (e: Event) => void;
  onScrollSnapAdornerClick: (e: Event) => void;
  onTopLayerAdornerClick: (e: Event) => void;
  onViewSourceAdornerClick: () => void;
  onSlotAdornerClick: (e: Event) => void;
  showSlotAdorner: boolean;
  showCustomElementAdorner: boolean;
  onCustomElementAdornerClick: (e: Event) => void;
  slotName?: string;
  showStartingStyleAdorner: boolean;
  startingStyleAdornerActive: boolean;
  onStartingStyleAdornerClick: (e: Event) => void;

  isHovered: boolean;
  isSelected: boolean;
  canInspect: boolean;
  showAiButton: boolean;
  aiButtonTitle?: string;
  onAiButtonClick: (e: Event) => void;
  decorations: Decoration[];
  descendantDecorations: Decoration[];
  decorationsTooltip: string;
  indent: number;

  editorState: CodeMirror.EditorState|null;
  editorWidth: number|null;
}

export interface ViewOutput {
  contentElement?: HTMLElement;
  editorRef?: TextEditor.TextEditor.TextEditor;
}

export function adornerRef(): DirectiveResult {
  let adorner: Adorners.Adorner.Adorner|undefined;
  return ref(el => {
    if (adorner) {
      ElementsPanel.instance().deregisterAdorner(adorner);
    }
    adorner = el as Adorners.Adorner.Adorner;
    if (adorner) {
      if (ElementsPanel.instance().isAdornerEnabled(adorner.name)) {
        adorner.show();
      } else {
        adorner.hide();
      }
      ElementsPanel.instance().registerAdorner(adorner);
    }
  });
}

export interface Decoration {
  title: string;
  color: string;
}

const DOM_UPDATE_ANIMATION_CLASS_NAME = 'dom-update-highlight';

export function handleAdornerKeydown(cb: (event: Event) => void): (event: KeyboardEvent) => void {
  return (event: KeyboardEvent) => {
    if (event.code === 'Enter' || event.code === 'Space') {
      cb(event);
      event.preventDefault();
      event.stopPropagation();
    }
  };
}

function renderTitle(
    node: SDK.DOMModel.DOMNode,
    isClosingTag: boolean,
    expanded: boolean,
    isExpandable: boolean,
    isXMLMimeType: boolean,
    updateRecord: Elements.ElementUpdateRecord.ElementUpdateRecord|null,
    onUpdateSearchHighlight: () => void,
    onExpand: () => void,
    issues?: IssuesManager.Issue.Issue[],
    ): Lit.LitTemplate {
  switch (node.nodeType()) {
    case Node.ATTRIBUTE_NODE:
      return renderAttribute({name: node.name as string, value: node.value as string}, updateRecord, true, node,
                             issues);

    case Node.ELEMENT_NODE: {
      if (node.pseudoType()) {
        let pseudoElementName = node.nodeName();
        const pseudoIdentifier = node.pseudoIdentifier();
        if (pseudoIdentifier) {
          pseudoElementName += `(${pseudoIdentifier})`;
        }
        return html`<span class="webkit-html-pseudo-element">${pseudoElementName}</span>\u200B`;
      }

      const tagName = node.nodeNameInCorrectCase();
      if (isClosingTag) {
        return renderTag(node, tagName, true, expanded, true, updateRecord, issues);
      }

      const openingTag = renderTag(node, tagName, false, expanded, false, updateRecord, issues);

      if (isExpandable) {
        if (!expanded) {
          return html`${openingTag}<devtools-elements-tree-expand-button .data=${
              {clickHandler: onExpand} as
              ElementsComponents.ElementsTreeExpandButton
                  .ElementsTreeExpandButtonData}></devtools-elements-tree-expand-button><span style="font-size: 0;"
                  >…</span>\u200B${renderTag(node, tagName, true, expanded, false, updateRecord, issues)}`;
        }
        return openingTag;
      }

      if (ElementsTreeWidget.canShowInlineText(node)) {
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

        return html`${openingTag}<span class="webkit-html-text-node" jslog=${
            VisualLogging.value('text-node').track({change: true, dblclick: true})} ${
            animateOn(Boolean((updateRecord?.hasChangedChildren() || updateRecord?.isCharDataModified())),
                      DOM_UPDATE_ANIMATION_CLASS_NAME)} ${renderTextNode}></span>\u200B${
            renderTag(node, tagName, true, expanded, false, updateRecord, issues)}`;
      }

      if (isXMLMimeType || !ForbiddenClosingTagElements.has(tagName)) {
        return html`${openingTag}${renderTag(node, tagName, true, expanded, false, updateRecord, issues)}`;
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
        return html`<span class="webkit-html-text-node webkit-html-js-node" jslog=${
            VisualLogging.value('script-text-node').track({change: true, dblclick: true})} ${highlightNode}></span>`;
      }
      if (node.parentNode && node.parentNode.nodeName().toLowerCase() === 'style') {
        const text = node.nodeValue();
        const highlightNode = ref(el => {
          if (el) {
            el.textContent = text.replace(/^[\n\r]+|\s+$/g, '');
            void CodeHighlighter.CodeHighlighter.highlightNode(el, 'text/css').then(onUpdateSearchHighlight);
          }
        });
        return html`<span class="webkit-html-text-node webkit-html-css-node" jslog=${
            VisualLogging.value('css-text-node').track({change: true, dblclick: true})} ${highlightNode}></span>`;
      }

      const result = convertUnicodeCharsToHTMLEntities(node.nodeValue());
      const textContent = Platform.StringUtilities.collapseWhitespace(result.text);
      const renderTextNode = ref(el => {
        if (el) {
          el.textContent = textContent;
          Highlighting.highlightRangesWithStyleClass(el, result.entityRanges, 'webkit-html-entity-value');
        }
      });
      return html`"<span class="webkit-html-text-node" jslog=${VisualLogging.value('text-node').track({
        change: true,
        dblclick: true,
      })} ${animateOn(Boolean(updateRecord?.isCharDataModified()), DOM_UPDATE_ANIMATION_CLASS_NAME)} ${
          renderTextNode}></span>"`;
    }

    case Node.COMMENT_NODE: {
      return html`<span class="webkit-html-comment">&lt;!--${node.nodeValue()}--&gt;</span>`;
    }

    case Node.DOCUMENT_TYPE_NODE: {
      let doctype = '<!DOCTYPE ' + node.nodeName();
      if (node.publicId) {
        doctype += ' PUBLIC "' + node.publicId + '"';
        if (node.systemId) {
          doctype += ' "' + node.systemId + '"';
        }
      } else if (node.systemId) {
        doctype += ' SYSTEM "' + node.systemId + '"';
      }
      if (node.internalSubset) {
        doctype += ' [' + node.internalSubset + ']';
      }
      doctype += '>';
      return html`<span class="webkit-html-doctype">${doctype}</span>`;
    }

    case Node.CDATA_SECTION_NODE: {
      return html`<span class="webkit-html-text-node">&lt;![CDATA[${node.nodeValue()}]]&gt;</span>`;
    }

    case Node.DOCUMENT_NODE: {
      const text = (node as SDK.DOMModel.DOMDocument).documentURL;
      return html`<span>#document (<span>${Components.Linkifier.Linkifier.renderLinkifiedUrl(text, {
        text,
        preventClick: true,
        showColumnNumber: false,
      })}</span>)</span>`;
    }

    case Node.DOCUMENT_FRAGMENT_NODE: {
      return html`<span class="webkit-html-fragment">${
          Platform.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase())}</span>`;
    }

    case Node.PROCESSING_INSTRUCTION_NODE: {
      const nodeValue = node.nodeValue();
      const maybeSpace = nodeValue ? ' ' : '';
      return html`<span class="webkit-html-processing-instruction">&lt;?<span
          class="webkit-html-tag-name" jslog=${VisualLogging.value('tag-name').track({change: true, dblclick: true})}>${
          node.nodeName()}</span>${maybeSpace}<span class="webkit-html-processing-instruction-value" jslog=${
          VisualLogging.value('processing-instruction-value').track({
            change: true,
            dblclick: true,
          })}>${nodeValue}</span>?&gt;</span>`;
    }

    default: {
      return html`${Platform.StringUtilities.collapseWhitespace(node.nodeNameInCorrectCase())}`;
    }
  }
}

function renderLinkifiedSrcset(tokens: Common.Srcset.Token[], node: SDK.DOMModel.DOMNode): Lit.TemplateResult {
  return html`${repeat(tokens, token => {
    switch (token.type) {
      case Common.Srcset.TokenType.URL:
        return renderLinkifiedValue(token.value, node);
      case Common.Srcset.TokenType.LITERAL:
        return token.value;
    }
  })}`;
}

const closingPunctuationRegex = /[\/;:\)\]\}]/g;

// FIXME: this should be made declarative next.
function setValueWithEntities(element: Element, value: string): void {
  let highlightIndex = 0;
  let highlightCount = 0;
  let additionalHighlightOffset = 0;
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

function renderLinkifiedValue(value: string, node: SDK.DOMModel.DOMNode): Lit.TemplateResult {
  const rewrittenHref = node ? node.resolveURL(value) : null;
  if (rewrittenHref === null) {
    return html`<span ${ref(el => {
      if (el) {
        setValueWithEntities(el, value);
      }
    })}}></span>`;
  }
  value = value.replace(closingPunctuationRegex, '$&\u200B');
  if (value.startsWith('data:')) {
    value = Platform.StringUtilities.trimMiddle(value, 60);
  }
  const isAnchor = node && node.nodeName().toLowerCase() === 'a';
  if (isAnchor) {
    return html`<devtools-link class="devtools-link image-url" href=${rewrittenHref} ${ref(el => {
      if (el) {
        ImagePreviewPopover.setImageUrl(el, rewrittenHref);
      }
    })}>${Platform.StringUtilities.trimMiddle(value, 150)}</devtools-link>`;
  }
  return Components.Linkifier.Linkifier.renderLinkifiedUrl(rewrittenHref, {
    text: value,
    preventClick: true,
    showColumnNumber: false,
    bypassURLTrimming: true,
    onRef: link => {
      ImagePreviewPopover.setImageUrl(link, rewrittenHref);
    },
  });
}

const relationPromisesCache = new WeakMap<SDK.DOMModel.DOMNode, Map<string, Promise<string|Lit.LitTemplate>>>();
const relatedElementsCache = new WeakMap<SDK.DOMModel.DOMNode, Map<string, SDK.DOMModel.DOMNode|null>>();

function renderAttribute(attr: {name: string, value?: string},
                         updateRecord: Elements.ElementUpdateRecord.ElementUpdateRecord|null, isDiff: boolean,
                         node: SDK.DOMModel.DOMNode, issues?: IssuesManager.Issue.Issue[]): Lit.LitTemplate {
  const name = attr.name;
  const value = attr.value || '';
  const forceValue = isDiff;
  const isRelation = name === 'popovertarget' || name === 'interesttarget' || name === 'commandfor';
  const hasText = (forceValue || value.length > 0);
  const linkifyName = isRelation && value.length === 0;
  const linkifyValue = isRelation && value.length > 0;

  let relation: Protocol.DOM.GetElementByRelationRequestRelation|undefined = undefined;
  let tooltip = '';
  if (isRelation) {
    if (name === 'popovertarget') {
      relation = Protocol.DOM.GetElementByRelationRequestRelation.PopoverTarget;
      tooltip = i18nString(UIStrings.showPopoverTarget);
    } else if (name === 'interesttarget') {
      relation = Protocol.DOM.GetElementByRelationRequestRelation.InterestTarget;
      tooltip = i18nString(UIStrings.showInterestTarget);
    } else if (name === 'commandfor') {
      relation = Protocol.DOM.GetElementByRelationRequestRelation.CommandFor;
      tooltip = i18nString(UIStrings.showCommandForTarget);
    }
  }

  let relationPromise: Promise<string|Lit.LitTemplate>|undefined = undefined;
  if (isRelation && relation) {
    let nodeCache = relationPromisesCache.get(node);
    if (!nodeCache) {
      nodeCache = new Map();
      relationPromisesCache.set(node, nodeCache);
    }
    const cacheKey = `${relation}:${value}`;
    relationPromise = nodeCache.get(cacheKey);
    const relationType = relation;
    if (!relationPromise) {
      relationPromise = (async () => {
        try {
          const relatedElementId = await node.domModel().getElementByRelation(node.id, relationType);
          const relatedElement = node.domModel().nodeForId(relatedElementId);

          let elemCache = relatedElementsCache.get(node);
          if (!elemCache) {
            elemCache = new Map();
            relatedElementsCache.set(node, elemCache);
          }
          elemCache.set(`${name}:${value}`, relatedElement || null);

          const isNameLinking = value.length === 0;
          const fallback = isNameLinking ? name : value;

          if (!relatedElement) {
            return fallback;
          }

          const linkOptions: PanelsCommon.DOMLinkifier.Options = {
            preventKeyboardFocus: true,
            tooltip,
            isDynamicLink: true,
          };

          if (isNameLinking) {
            linkOptions.textContent = name;
          } else {
            const targetId = relatedElement.getAttribute('id');
            if (targetId) {
              linkOptions.textContent = targetId;
            }
          }

          return PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(relatedElement, linkOptions);
        } catch {
          return value.length === 0 ? name : value;
        }
      })();
      nodeCache.set(cacheKey, relationPromise);
    }
  }

  const nodeName = node ? node.nodeName().toLowerCase() : '';
  const enum ValueType {
    UNKNOWN = 0,
    SRC = 1,
    SRCSET = 2,
  }
  let valueType = ValueType.UNKNOWN;
  if (nodeName && (name === 'src' || name === 'href') && value) {
    valueType = ValueType.SRC;
  } else if ((nodeName === 'img' || nodeName === 'source') && name === 'srcset') {
    valueType = ValueType.SRCSET;
  } else if (nodeName === 'image' && (name === 'xlink:href' || name === 'href')) {
    valueType = ValueType.SRCSET;
  }

  const withEntitiesRef = (valueType === ValueType.UNKNOWN && !isRelation) ? ref(el => {
    if (el) {
      setValueWithEntities(el, value);
    }
  }) :
                                                                             nothing;

  const jslog = VisualLogging.value(name === 'style' ? 'style-attribute' : 'attribute').track({
    change: true,
    dblclick: true,
  });

  const hasAttributeIssues = Boolean(issues?.some(issue => getElementIssueDetails(issue)?.attribute === name));
  const attributeNameClasses = {
    'webkit-html-attribute-name': true,
    'violating-element': hasAttributeIssues,
  };

  return html`<span class="webkit-html-attribute" jslog=${jslog}><span class=${classMap(attributeNameClasses)}
      ${animateOn(Boolean(updateRecord?.isAttributeModified(name) && !hasText), DOM_UPDATE_ANIMATION_CLASS_NAME)}>${
      linkifyName && relationPromise ? until(relationPromise, name) : name}</span>${
      hasText ?
          html`=\u200B"<span class="webkit-html-attribute-value" ${
              animateOn(Boolean(updateRecord?.isAttributeModified(name) && hasText),
                        DOM_UPDATE_ANIMATION_CLASS_NAME)} ${withEntitiesRef}>
                        ${valueType === ValueType.SRC ? renderLinkifiedValue(value, node) : nothing}
                        ${
              valueType === ValueType.SRCSET ? renderLinkifiedSrcset(Common.Srcset.parseSrcset(value), node) : nothing}
                        ${linkifyValue && relationPromise ? until(relationPromise, value) : nothing}
                </span>"` :
          nothing}</span>`;
}

function renderTag(node: SDK.DOMModel.DOMNode, tagName: string, isClosingTag: boolean, expanded: boolean,
                   isDistinctTreeElement: boolean, updateRecord: Elements.ElementUpdateRecord.ElementUpdateRecord|null,
                   issues?: IssuesManager.Issue.Issue[]): Lit.LitTemplate {
  const tagClasses = {
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
  const hasTagIssues = !isClosingTag && Boolean(issues?.some(issue => {
    const details = getElementIssueDetails(issue);
    return Boolean(details && !details.attribute);
  }));
  const tagNameClasses = {
    [tagNameClass]: true,
    'violating-element': hasTagIssues,
  };
  const tagString = (isClosingTag ? '/' : '') + tagName;
  const jslog = !isClosingTag ? VisualLogging.value('tag-name').track({change: true, dblclick: true}) : '';

  return html`<span
      class=${classMap(tagClasses)} ${setAriaLabel}
      >&lt;<span class=${classMap(tagNameClasses)} jslog=${jslog || nothing} ${
      animateOn(hasUpdates, DOM_UPDATE_ANIMATION_CLASS_NAME)}>${tagString}</span>${
      attributes.map(attr => html` ${renderAttribute(attr, updateRecord, false, node, issues)}`)}&gt;</span>\u200B`;
}

function maybeRenderAdAdorner(input: ViewInput): Lit.TemplateResult|typeof nothing {
  if (!input.adProvenance) {
    return nothing;
  }

  // clang-format off
  return html`
    <devtools-adorner
      aria-details=${input.adTooltipId}
      aria-label=${i18nString(UIStrings.thisElementWasIdentifiedAsAnAd)}
      .name=${ElementsComponents.AdornerManager.RegisteredAdorners.AD}
      jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.AD)}
      ${adornerRef()}>
      <span>${ElementsComponents.AdornerManager.RegisteredAdorners.AD}</span>
    </devtools-adorner>

    <!--
      Prevent the copy event from bubbling up to the Elements tree outline. Otherwise, DevTools
      copies the underlying DOM node's HTML instead of the user's highlighted text.
    -->
    <devtools-tooltip id=${input.adTooltipId} variant=rich @copy=${(e: Event) => e.stopPropagation()}>
      <div class="ad-provenance-tooltip">
        ${input.adProvenance.filterlistRule ? html`
          <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.filterListRule)}</div>
          <div class="ad-provenance-tooltip-content">${input.adProvenance.filterlistRule}</div>
        ` : nothing}

        ${input.adProvenance.adScriptAncestry && input.target ? html`
          <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.creatorAdScriptAncestry)}</div>
          <div class="ad-provenance-tooltip-content">
            ${input.adProvenance.adScriptAncestry.ancestryChain.map(script => html`
              <div>
                ${UI.Widget.widget(Components.Linkifier.ScriptLocationLink, {
                  target: input.target,
                  scriptId: script.scriptId,
                  options: { jslogContext: 'ad-script' },
                })}
              </div>
            `)}
          </div>

          ${input.adProvenance.adScriptAncestry.rootScriptFilterlistRule ? html`
            <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.rootScriptFilterListRule)}</div>
            <div class="ad-provenance-tooltip-content">
              ${input.adProvenance.adScriptAncestry.rootScriptFilterlistRule}
            </div>
          ` : nothing}
        ` : nothing}

        ${!input.adProvenance.adScriptAncestry && !input.adProvenance.filterlistRule ? html`
            <div class="ad-provenance-tooltip-title">${i18nString(UIStrings.noProvenanceAvailable)}</div>
          ` : nothing}
      </div>
    </devtools-tooltip>
  `;
  // clang-format on
}

export const DEFAULT_VIEW = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  const hasAdorners = !!input.adProvenance || input.showContainerAdorner || input.showFlexAdorner ||
      input.showGridAdorner || input.showGridLanesAdorner || input.showMediaAdorner || input.showPopoverAdorner ||
      input.showInterestAdorner || input.showTopLayerAdorner || input.showViewSourceAdorner ||
      input.showScrollAdorner || input.showScrollSnapAdorner || input.showSlotAdorner ||
      input.showStartingStyleAdorner || input.showCustomElementAdorner;
  const gutterContainerClasses = {
    'has-decorations': input.decorations.length || input.descendantDecorations.length,
    'gutter-container': true,
    hidden: Boolean(input.editorState),
  };
  // clang-format off
  render(html`
    <div ${ref(el => { output.contentElement = el as HTMLElement; })}>
      ${input.node ? html`<span class="highlight ${input.editorState ? 'hidden' : ''}">${renderTitle(
    input.node,
    input.isClosingTag,
    input.expanded,
    input.isExpandable,
    input.isXMLMimeType,
    input.updateRecord,
    input.onHighlightSearchResults,
    input.onExpand,
    input.issues,
  )}</span>` : nothing}
      ${input.isHovered || input.isSelected ? html`
        <div class="selection fill ${input.editorState ? 'hidden' : ''}" style=${`margin-left: ${-input.indent}px`}></div>
      ` : nothing}
      <div class=${classMap(gutterContainerClasses)}
           style="left: ${-input.indent}px"
           @click=${input.onGutterClick}>
        <devtools-icon name="dots-horizontal"></devtools-icon>
        ${input.decorations.length || input.descendantDecorations.length ? html`
        <div class="elements-gutter-decoration-container"
             title=${input.decorationsTooltip}>
             ${input.decorations.map(d => html`<div class="elements-gutter-decoration" style="--decoration-color: ${d.color}"></div>`)}
             ${input.descendantDecorations.map(d => html`<div class="elements-gutter-decoration elements-has-decorated-children" style="--decoration-color: ${d.color}"></div>`)}
        </div>` : nothing}
      </div>
      ${hasAdorners ? html`<div class="adorner-container ${(input.editorState) ? 'hidden' : ''}">
        ${maybeRenderAdAdorner(input)}
        ${input.showViewSourceAdorner ? html`<devtools-adorner
          class="clickable"
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE).track({ click: true })}
          aria-label=${i18nString(UIStrings.viewSourceCode)}
          @click=${input.onViewSourceAdornerClick}
          @keydown=${handleAdornerKeydown(input.onViewSourceAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.VIEW_SOURCE}</span>
        </devtools-adorner>` : nothing}
        ${input.showCustomElementAdorner ? html`<devtools-adorner
          class="custom-element clickable"
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.CUSTOM_ELEMENT}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.CUSTOM_ELEMENT).track({ click: true })}
          aria-label=${i18nString(UIStrings.showCustomElementDefinition)}
          @click=${input.onCustomElementAdornerClick}
          @keydown=${handleAdornerKeydown(input.onCustomElementAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.CUSTOM_ELEMENT}</span>
        </devtools-adorner>` : nothing}
        ${input.showContainerAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showFlexAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showGridAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showGridLanesAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showMediaAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showPopoverAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showInterestAdorner ? html`<devtools-adorner
          class=clickable
          role=button
          toggleable=true
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.INTEREST}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.INTEREST).track({ click: true })}
          active=${input.interestAdornerActive}
          aria-label=${input.interestAdornerActive ? i18nString(UIStrings.stopForceShowInterest) : i18nString(UIStrings.forceShowInterest)}
          @click=${input.onInterestAdornerClick}
          @keydown=${handleAdornerKeydown(input.onInterestAdornerClick)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.INTEREST}</span>
        </devtools-adorner>`: nothing}
        ${input.showTopLayerAdorner ? html`<devtools-adorner
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
        </devtools-adorner>`: nothing}
        ${input.showStartingStyleAdorner ? html`<devtools-adorner
          class="starting-style clickable"
          role=button
          tabindex=0
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
        ${input.showScrollAdorner ? html`<devtools-adorner
          class="scroll"
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL).track({ click: true })}
          aria-label=${i18nString(UIStrings.elementHasScrollableOverflow)}
          ${adornerRef()}>
          <span>${ElementsComponents.AdornerManager.RegisteredAdorners.SCROLL}</span>
        </devtools-adorner>` : nothing}
        ${input.showSlotAdorner ? html`<devtools-adorner
          class=clickable
          role=button
          tabindex=0
          .name=${ElementsComponents.AdornerManager.RegisteredAdorners.SLOT}
          jslog=${VisualLogging.adorner(ElementsComponents.AdornerManager.RegisteredAdorners.SLOT).track({ click: true })}
          @click=${input.onSlotAdornerClick}
          @mousedown=${(e: Event) => e.stopPropagation()}
          ${adornerRef()}>
          <span class="adorner-with-icon">
            <devtools-icon name="select-element"></devtools-icon>
            <span>${ElementsComponents.AdornerManager.RegisteredAdorners.SLOT}</span>
          </span>
        </devtools-adorner>`: nothing}
        ${input.showScrollSnapAdorner ? html`<devtools-adorner
          class="scroll-snap clickable"
          role=button
          tabindex=0
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
      </div>`: nothing}
      ${input.isSelected && input.canInspect ? html`
        <span class="selected-hint ${input.editorState ? 'hidden' : ''}" title=${i18nString(UIStrings.useSInTheConsoleToReferToThis, { PH1: '$0' })} aria-hidden="true"></span>
      ` : nothing}
      ${input.showAiButton ? html`
        <span class="ai-button-container ${input.editorState ? 'hidden' : ''}">
          <devtools-floating-button
            icon-name=${AIAssistance.AiUtils.getIconName()}
            title=${input.aiButtonTitle || ''}
            jslogcontext="ask-ai"
            @click=${input.onAiButtonClick}
            @mousedown=${(e: Event) => e.stopPropagation()}>
          </devtools-floating-button>
        </span>
      ` : nothing}
      ${input.editorState ? html`<div @keydown=${(event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.consume(true);
        }
      }} class="source-code elements-tree-editor" style="width: ${input.editorWidth ?? 0}px;">
        <devtools-text-editor .state=${input.editorState} ${ref(el => {
          output.editorRef = el as TextEditor.TextEditor.TextEditor;
        })}></devtools-text-editor>
      </div>`: nothing}
    </div>
  `, target);
  // clang-format on
};

type View = typeof DEFAULT_VIEW;

export interface InitialEditState {
  attributeName?: string;
  isNewAttribute?: boolean;
  isProcessingInstruction?: boolean;
  isEditAsHTML?: boolean;
  editAsHTMLCallback?: (success: boolean) => void;
}

export class ElementsTreeWidget extends UI.Widget.Widget {
  static override readonly INJECT = [IssuesManager.DOMIssuesManager.DOMIssuesManager] as const;
  #domIssuesManager?: IssuesManager.DOMIssuesManager.DOMIssuesManager;

  #node!: SDK.DOMModel.DOMNode;
  isClosingTag = false;
  #expanded = false;
  #isExpandable = false;
  #selected = false;
  isXMLMimeType = false;
  disableEdits = false;
  showAIButton = false;
  isDOMNodeSelected = false;
  initialEdit?: InitialEditState|null;
  onInitialEditCompleted?: () => void;

  expand?: () => void;
  collapse?: () => void;
  selectTreeElement?: (omitFocus?: boolean, selectedByUser?: boolean) => boolean | void;
  expandRecursively?: (maxDepth?: number) => Promise<void>;
  collapseChildren?: () => void;
  childCount?: () => number;
  closingTagElement?: () => Element | null;
  updateShadowRootDepth?: (depth: number) => void;
  computeLeftIndent?: number|(() => number);
  setChildrenListElementVisible?: (visible: boolean) => void;

  findStartTagWidget?: () => ElementsTreeWidget | null;
  selectDOMNode?: (node: SDK.DOMModel.DOMNode, selectedByUser?: boolean) => void;
  revealInTopLayer?: (node: SDK.DOMModel.DOMNode) => void;
  showContextMenu?: (event: Event, widget?: ElementsTreeWidget) => void;
  populateTreeElement?: () => Promise<void>;
  toggleHideElement?: (node: SDK.DOMModel.DOMNode) => Promise<void>;
  isToggledToHidden?: (node: SDK.DOMModel.DOMNode) => boolean;
  selectNodeAfterEdit?: (wasExpanded: boolean, error: string|null, newNode: SDK.DOMModel.DOMNode|null,
                         moveDirection?: string) => void;
  runPendingUpdates?: () => void;
  focusOutline?: () => void;
  setMultilineEditing?: (multilineEditing: EditorHandles|null) => void;
  visibleWidth?: () => number;

  #view: View;

  #searchQuery: string|null = null;
  #expandedChildrenLimit: number;
  private readonly decorationsThrottler: Common.Throttler.Throttler;
  inClipboard = false;
  #hovered: boolean;
  editing: EditorHandles|null;
  #editorRef?: TextEditor.TextEditor.TextEditor;
  // True while the Edit as HTML editor's own context menu is open, so that the
  // focusout caused by the menu taking focus does not commit the edit.
  #editAsHtmlMenuOpen = false;
  #editorState: CodeMirror.EditorState|null = null;
  #editorWidth: number|null = null;
  expandAllButtonElement: UI.TreeOutline.TreeElement|null;
  #highlights: Range[] = [];

  #adornersThrottler = new Common.Throttler.Throttler(100);
  #containerAdornerActive = false;
  #flexAdornerActive = false;
  #gridAdornerActive = false;
  #popoverAdornerActive = false;
  #interestAdornerActive = false;

  #scrollSnapAdornerActive = false;
  #startingStyleAdornerActive = false;
  #layout: SDK.CSSModel.LayoutProperties|null = null;

  #decorations: Decoration[] = [];
  #descendantDecorations: Decoration[] = [];
  #decorationsTooltip = '';

  static #adTooltipIdCounter = 0;
  #adTooltipId = `ad-tooltip-${++ElementsTreeWidget.#adTooltipIdCounter}`;

  #updateRecord: Elements.ElementUpdateRecord.ElementUpdateRecord|null = null;

  get node(): SDK.DOMModel.DOMNode {
    return this.#node;
  }

  set node(node: SDK.DOMModel.DOMNode) {
    this.#node = node;
    if (!this.isClosingTag) {
      void this.#updateAdorners();
    }
  }

  get expanded(): boolean {
    return this.#expanded;
  }

  set expanded(expanded: boolean) {
    this.#expanded = expanded;
    this.requestUpdate();
  }

  get isExpandable(): boolean {
    return this.#isExpandable;
  }

  set isExpandable(isExpandable: boolean) {
    this.#isExpandable = isExpandable;
    this.requestUpdate();
  }

  get selected(): boolean {
    return this.#selected;
  }

  set selected(selected: boolean) {
    this.#selected = selected;
    this.requestUpdate();
  }

  get searchQuery(): string|null {
    return this.#searchQuery;
  }

  set searchQuery(query: string|null) {
    if (this.#searchQuery === query) {
      return;
    }
    this.#searchQuery = query;
    this.requestUpdate();
  }

  get tagTypeContext(): TagTypeContext {
    if (this.isClosingTag) {
      return {tagType: TagType.CLOSING};
    }
    return {
      tagType: TagType.OPENING,
      canAddAttributes: this.#node ? this.#node.nodeType() === Node.ELEMENT_NODE : false,
    };
  }

  get issues(): IssuesManager.Issue.Issue[] {
    // The widget is currently created for non-widget ElementsTreeElement so
    // the domIssuesManager can be empty, relying on the manual resolution.
    if (!this.#domIssuesManager) {
      const universe = UI.Widget.lookupUniverseForElement(this.contentElement);
      if (universe) {
        this.#domIssuesManager = universe.get(IssuesManager.DOMIssuesManager.DOMIssuesManager);
        if (this.node?.id) {
          this.#domIssuesManager.subscribeByNodeId(this.node.id, this.#onDOMIssueUpdated);
        }
      }
    }
    return this.#domIssuesManager?.issuesForNode(this.node) ?? [];
  }

  constructor(
      element?: HTMLElement,
      [domIssuesManager]: UI.Widget.WidgetDependencies<typeof ElementsTreeWidget>|[undefined] = [undefined],
      view: View = DEFAULT_VIEW,
  ) {
    super(element);
    this.#domIssuesManager = domIssuesManager;
    this.#view = view;

    this.#expandedChildrenLimit = InitialChildrenLimit;
    this.decorationsThrottler = new Common.Throttler.Throttler(100);

    this.inClipboard = false;
    this.#hovered = false;

    this.editing = null;
    this.expandAllButtonElement = null;
  }

  static visibleShadowRoots(node: SDK.DOMModel.DOMNode): SDK.DOMModel.DOMNode[] {
    let roots = node.shadowRoots();
    if (roots.length && !Common.Settings.Settings.instance().moduleSetting('show-ua-shadow-dom').get()) {
      roots = roots.filter(filter);
    }

    function filter(root: SDK.DOMModel.DOMNode): boolean {
      return root.shadowRootType() !== SDK.DOMModel.DOMNode.ShadowRootTypes.UserAgent;
    }
    return roots;
  }

  static canShowInlineText(node: SDK.DOMModel.DOMNode): boolean {
    if (node.contentDocument() || node.templateContent() || ElementsTreeWidget.visibleShadowRoots(node).length ||
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

  static populateForcedPseudoStateItems(contextMenu: UI.ContextMenu.ContextMenu, node: SDK.DOMModel.DOMNode): void {
    const pseudoClasses = ['active', 'hover', 'focus', 'visited', 'focus-within', 'focus-visible'];
    const forcedPseudoState = node.domModel().cssModel().pseudoState(node);
    const stateMenu =
        contextMenu.debugSection().appendSubMenuItem(i18nString(UIStrings.forceState), false, 'force-state');
    for (const pseudoClass of pseudoClasses) {
      const pseudoClassForced = forcedPseudoState ? forcedPseudoState.indexOf(pseudoClass) >= 0 : false;
      stateMenu.defaultSection().appendCheckboxItem(
          ':' + pseudoClass, setPseudoStateCallback.bind(null, pseudoClass, !pseudoClassForced),
          {checked: pseudoClassForced, jslogContext: pseudoClass});
    }

    function setPseudoStateCallback(pseudoState: string, enabled: boolean): void {
      node.domModel().cssModel().forcePseudoState(node, pseudoState, enabled);
      // Show the element state pane after the user sets an element state from
      // the context menu. We assume it should help the users to discover the
      // element state pane and prevent overhead of using the context menu
      // (http://crbug.com/519254907).
      ElementStatePaneWidget.ButtonProvider.instance().showPane();
    }
  }

  animateOnDOMUpdate(): void {
    const tagName = this.contentElement.querySelector('.webkit-html-tag-name');
    UI.UIUtils.runCSSAnimationOnce(tagName || this.contentElement, DOM_UPDATE_ANIMATION_CLASS_NAME);
  }

  #clearDOMNextUpdate = false;

  override performUpdate(): void {
    // Skip updating when in-place editing (not HTML editing indicated by the
    // editorState) is happening. Doing an update would break editing
    // (crbug.com/515639787).
    if (this.editing && !this.#editorState) {
      return;
    }
    if (this.#clearDOMNextUpdate) {
      this.#clearDOMNextUpdate = false;
      Lit.render(Lit.nothing, this.contentElement, {host: this});
    }
    const isClosingTag = this.isClosingTag;
    const output: ViewOutput = {};
    this.#view({
      node: this.node,
      isClosingTag,
      expanded: this.#expanded,
      isExpandable: this.#isExpandable,
      isXMLMimeType: this.isXMLMimeType,
      updateRecord: this.#updateRecord,
      onHighlightSearchResults: () => this.#highlightSearchResults(),
      onExpand: () => this.expand?.(),

      containerAdornerActive: this.#containerAdornerActive,
      adProvenance: this.node.adProvenance(),
      adTooltipId: this.#adTooltipId,
      target: this.node.domModel().target(),
      showContainerAdorner: Boolean(this.#layout?.containerType) && !isClosingTag,
      containerType: this.#layout?.containerType,
      showFlexAdorner: Boolean(this.#layout?.isFlex) && !isClosingTag,
      flexAdornerActive: this.#flexAdornerActive,
      showGridAdorner: Boolean(this.#layout?.isGrid) && !isClosingTag,
      showGridLanesAdorner: Boolean(this.#layout?.isGridLanes) && !isClosingTag,
      showMediaAdorner: this.node.isMediaNode() && !isClosingTag,
      showPopoverAdorner: Boolean(this.node.attributes().find(attr => attr.name === 'popover')) && !isClosingTag,
      showInterestAdorner: Boolean(Root.Runtime.hostConfig.devToolsAllowInterestForcing?.enabled) &&
          Boolean(this.node.attributes().find(attr => attr.name === 'interesttarget' || attr.name === 'interestfor')) &&
          !isClosingTag,
      showTopLayerAdorner: this.node.topLayerIndex() !== -1 && !isClosingTag,
      gridAdornerActive: this.#gridAdornerActive,
      popoverAdornerActive: this.#popoverAdornerActive,
      interestAdornerActive: this.#interestAdornerActive,
      isSubgrid: Boolean(this.#layout?.isSubgrid),
      showViewSourceAdorner: this.node.isRootNode() && isOpeningTag(this.tagTypeContext),
      showScrollAdorner: ((this.node.nodeName() === 'HTML' && this.node.ownerDocument?.isScrollable()) ||
                          (this.node.nodeName() !== '#document' && this.node.isScrollable())) &&
          !isClosingTag,
      decorations: this.#decorations,
      descendantDecorations: this.#expanded ? [] : this.#descendantDecorations,
      decorationsTooltip: this.#decorationsTooltip,
      indent: this.#getLeftIndent(),
      showScrollSnapAdorner: Boolean(this.#layout?.hasScroll) && !isClosingTag,
      scrollSnapAdornerActive: this.#scrollSnapAdornerActive,
      showSlotAdorner: Boolean(this.node.assignedSlot) && !isClosingTag,
      showCustomElementAdorner: this.node.isCustomElement() && !isClosingTag,
      onCustomElementAdornerClick: this.disableEdits ? () => {} :
                                                       (event: Event) => void this.#onCustomElementAdornerClick(event),
      showStartingStyleAdorner: this.node.affectedByStartingStyles() && !isClosingTag,
      startingStyleAdornerActive: this.#startingStyleAdornerActive,
      onStartingStyleAdornerClick: this.disableEdits ? () => {} :
                                                       (event: Event) => this.#onStartingStyleAdornerClick(event),
      onSlotAdornerClick:
          () => {
            if (this.node.assignedSlot) {
              const deferredNode = this.node.assignedSlot.deferredNode;
              deferredNode.resolve(node => {
                void Common.Revealer.reveal(node);
              });
            }
          },
      topLayerIndex: this.node.topLayerIndex(),
      onViewSourceAdornerClick: this.disableEdits ? () => {} : this.revealHTMLInSources.bind(this),
      onGutterClick: this.showContextMenu ? (event: Event) => this.showContextMenu?.(event, this) : () => {},
      onContainerAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onContainerAdornerClick(event),
      onFlexAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onFlexAdornerClick(event),
      onGridAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onGridAdornerClick(event),
      onMediaAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onMediaAdornerClick(event),
      onPopoverAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onPopoverAdornerClick(event),
      onInterestAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onInterestAdornerClick(event),
      onScrollSnapAdornerClick: this.disableEdits ? () => {} : (event: Event) => this.#onScrollSnapAdornerClick(event),
      onTopLayerAdornerClick: this.disableEdits ? () => {} :
                                                  () => {
                                                    this.revealInTopLayer?.(this.node);
                                                  },
      isHovered: this.#hovered,
      isSelected: this.#selected,
      canInspect: this.node.canInspectNode(),
      showAiButton: Boolean(this.#hovered || this.#selected) && this.node.nodeType() === Node.ELEMENT_NODE &&
          this.isAiButtonEnabled() && this.showAIButton,
      aiButtonTitle: this.isAiButtonEnabled() ?
          UI.ActionRegistry.ActionRegistry.instance().getAction('freestyler.elements-floating-button').title() :
          undefined,
      onAiButtonClick: (ev: Event) => {
        ev.stopPropagation();
        this.selectTreeElement?.(true, false);
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction('freestyler.elements-floating-button');
        if (action) {
          void action.execute();
        }
      },
      editorState: this.#editorState,
      editorWidth: this.#editorWidth,
      issues: this.issues,
    },
               output, this.contentElement);

    this.#editorRef = output.editorRef;
    if (this.#updateRecord) {
      this.#updateRecord = null;
    }
    if (this.#searchQuery && !this.editing) {
      this.#highlightSearchResults();
    } else if (!this.#searchQuery && this.#highlights.length) {
      this.hideSearchHighlights();
    }
    if (this.initialEdit) {
      const edit = this.initialEdit;
      this.initialEdit = null;
      this.onInitialEditCompleted?.();
      if (edit.isEditAsHTML) {
        this.toggleEditAsHTML(edit.editAsHTMLCallback);
      } else if (edit.isProcessingInstruction) {
        this.startEditingProcessingInstructionValue();
      } else if (edit.isNewAttribute) {
        this.addNewAttribute();
      } else if (edit.attributeName) {
        this.triggerEditAttribute(edit.attributeName);
      }
    }
  }

  async #onCustomElementAdornerClick(event: Event): Promise<void> {
    event.stopPropagation();
    const node = this.node;
    const object = await node.resolveToObject('');
    if (!object) {
      return;
    }
    let constructorObject: SDK.RemoteObject.RemoteObject|null = null;
    try {
      const result = await object.callFunction(function(this: Element): unknown {
        const selector = this.getAttribute('is') || this.tagName.toLowerCase();
        return (typeof customElements !== 'undefined' && customElements.get(selector)) || this.constructor;
      });
      constructorObject = result.object;
    } finally {
      object.release();
    }
    if (!constructorObject) {
      return;
    }
    try {
      if (constructorObject.type === 'function') {
        const functionDetails =
            await SDK.RemoteObject.RemoteFunction.objectAsFunction(constructorObject).targetFunctionDetails();
        if (functionDetails?.location) {
          const uiLocation =
              await Bindings.DebuggerWorkspaceBinding.DebuggerWorkspaceBinding.instance().rawLocationToUILocation(
                  functionDetails.location);
          if (uiLocation) {
            void Common.Revealer.reveal(uiLocation);
          }
        }
      }
    } finally {
      constructorObject.release();
    }
  }

  #onContainerAdornerClick(event: Event): void {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedContainerQueryInPersistentOverlay(nodeId)) {
      model.hideContainerQueryInPersistentOverlay(nodeId);
      this.#containerAdornerActive = false;
    } else {
      model.highlightContainerQueryInPersistentOverlay(nodeId);
      this.#containerAdornerActive = true;
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    void this.updateAdorners();
  }

  #onFlexAdornerClick(event: Event): void {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedFlexContainerInPersistentOverlay(nodeId)) {
      model.hideFlexContainerInPersistentOverlay(nodeId);
      this.#flexAdornerActive = false;
    } else {
      model.highlightFlexContainerInPersistentOverlay(nodeId);
      this.#flexAdornerActive = true;
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    void this.updateAdorners();
  }

  #onGridAdornerClick(event: Event): void {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (model.isHighlightedGridInPersistentOverlay(nodeId)) {
      model.hideGridInPersistentOverlay(nodeId);
      this.#gridAdornerActive = false;
    } else {
      model.highlightGridInPersistentOverlay(nodeId);
      this.#gridAdornerActive = true;
      if (this.#layout?.isSubgrid) {
        Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
      }
    }
    void this.updateAdorners();
  }

  async #onMediaAdornerClick(event: Event): Promise<void> {
    event.stopPropagation();
    await UI.ViewManager.ViewManager.instance().showView('medias');
    const view = UI.ViewManager.ViewManager.instance().view('medias');
    if (view) {
      const widget = await view.widget();
      if (widget instanceof Media.MainView.MainView) {
        await widget.waitForInitialPlayers();
        widget.selectPlayerByDOMNodeId(this.node.backendNodeId());
      }
    }
  }

  highlightAttribute(attributeName: string): void {
    // If the attribute is not found, we highlight the tag name instead.
    let animationElement = this.contentElement.querySelector('.webkit-html-tag-name') ?? this.element;

    if (this.node.getAttribute(attributeName) !== undefined) {
      const tag = this.contentElement.querySelector('.webkit-html-tag');
      const attributes = tag?.getElementsByClassName('webkit-html-attribute') ?? [];
      for (const attribute of attributes) {
        const attributeElement = attribute.getElementsByClassName('webkit-html-attribute-name')[0];
        if (attributeElement?.textContent === attributeName) {
          animationElement = attributeElement;
          break;
        }
      }
    }
    UI.UIUtils.runCSSAnimationOnce(animationElement, DOM_UPDATE_ANIMATION_CLASS_NAME);
  }

  isDisplayContents(): boolean {
    return Boolean(this.#layout?.isContents);
  }

  get isEditing(): boolean {
    return Boolean(this.editing);
  }

  highlightSearchResults(searchQuery: string): void {
    this.searchQuery = searchQuery;
    if (!this.editing) {
      this.#highlightSearchResults();
    }
  }

  hideSearchHighlights(): void {
    Highlighting.HighlightManager.HighlightManager.instance().removeHighlights(this.#highlights);
    this.#highlights = [];
  }

  setInClipboard(inClipboard: boolean): void {
    if (this.inClipboard === inClipboard) {
      return;
    }
    this.inClipboard = inClipboard;
    this.requestUpdate();
  }

  get hovered(): boolean {
    return this.#hovered;
  }

  set hovered(isHovered: boolean) {
    if (this.#hovered === isHovered) {
      return;
    }

    this.#hovered = isHovered;
    this.requestUpdate();
  }

  expandedChildrenLimit(): number {
    return this.#expandedChildrenLimit;
  }

  setExpandedChildrenLimit(expandedChildrenLimit: number): void {
    this.#expandedChildrenLimit = expandedChildrenLimit;
  }

  onTopLayerIndexChanged(): void {
    this.requestUpdate();
  }

  onbind(): void {
    this.requestUpdate();
    if (!this.isClosingTag) {
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.onTopLayerIndexChanged, this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.SCROLLABLE_FLAG_UPDATED, this.#onScrollableFlagUpdated,
                                 this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.AD_RELATED_STATE_UPDATED, this.#onAdRelatedStateUpdated,
                                 this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.CONTAINER_QUERY_OVERLAY_STATE_CHANGED,
                                 this.#onPersistentContainerQueryOverlayStateChanged, this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.FLEX_CONTAINER_OVERLAY_STATE_CHANGED,
                                 this.#onPersistentFlexContainerOverlayStateChanged, this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED,
                                 this.#onPersistentGridOverlayStateChanged, this);
      this.node.addEventListener(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED,
                                 this.#onPersistentScrollSnapOverlayStateChanged, this);
      if (this.#domIssuesManager && this.node.id) {
        this.#domIssuesManager.subscribeByNodeId(this.node.id, this.#onDOMIssueUpdated);
      }
    }
  }

  clearView(): void {
    // Update the element to clean up adorner registrations with the
    // ElementsPanel.
    // We do not change the ElementsTreeElement state in case the
    // element is bound again.
    this.#view({
      node: null,
      isClosingTag: false,
      expanded: false,
      isExpandable: false,
      isXMLMimeType: false,
      updateRecord: null,
      onHighlightSearchResults: () => {},
      onExpand: () => {},
      containerAdornerActive: false,
      adProvenance: undefined,
      target: undefined,
      adTooltipId: '',
      showContainerAdorner: false,
      containerType: this.#layout?.containerType,
      showFlexAdorner: false,
      flexAdornerActive: false,
      showGridAdorner: false,
      showGridLanesAdorner: false,
      showMediaAdorner: false,
      showPopoverAdorner: false,
      showInterestAdorner: false,
      showTopLayerAdorner: false,
      gridAdornerActive: false,
      popoverAdornerActive: false,
      interestAdornerActive: false,
      isSubgrid: false,
      showViewSourceAdorner: false,
      showScrollAdorner: false,
      showScrollSnapAdorner: false,
      scrollSnapAdornerActive: false,
      showSlotAdorner: false,
      showCustomElementAdorner: false,
      showStartingStyleAdorner: false,
      startingStyleAdornerActive: false,
      onStartingStyleAdornerClick: () => {},
      onSlotAdornerClick: () => {},
      onCustomElementAdornerClick: () => {},
      topLayerIndex: -1,
      onViewSourceAdornerClick: () => {},
      onGutterClick: () => {},
      onContainerAdornerClick: () => {},
      onFlexAdornerClick: () => {},
      onGridAdornerClick: () => {},
      onMediaAdornerClick: () => {},
      onPopoverAdornerClick: () => {},
      onInterestAdornerClick: () => {},
      onScrollSnapAdornerClick: () => {},
      onTopLayerAdornerClick: () => {},
      isHovered: false,
      isSelected: false,
      canInspect: false,
      showAiButton: false,
      onAiButtonClick: () => {},
      decorations: [],
      descendantDecorations: [],
      decorationsTooltip: '',
      indent: 0,
      editorState: null,
      editorWidth: null,
      issues: [],
    },
               {}, this.contentElement);
  }

  onunbind(): void {
    if (this.editing) {
      this.editing.cancel();
    }
    this.clearView();
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.TOP_LAYER_INDEX_CHANGED, this.onTopLayerIndexChanged,
                                  this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.SCROLLABLE_FLAG_UPDATED, this.#onScrollableFlagUpdated,
                                  this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.AD_RELATED_STATE_UPDATED, this.#onAdRelatedStateUpdated,
                                  this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.CONTAINER_QUERY_OVERLAY_STATE_CHANGED,
                                  this.#onPersistentContainerQueryOverlayStateChanged, this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.FLEX_CONTAINER_OVERLAY_STATE_CHANGED,
                                  this.#onPersistentFlexContainerOverlayStateChanged, this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.GRID_OVERLAY_STATE_CHANGED,
                                  this.#onPersistentGridOverlayStateChanged, this);
    this.node.removeEventListener(SDK.DOMModel.DOMNodeEvents.SCROLL_SNAP_OVERLAY_STATE_CHANGED,
                                  this.#onPersistentScrollSnapOverlayStateChanged, this);
    if (this.#domIssuesManager && this.node.id) {
      this.#domIssuesManager.unsubscribeByNodeId(this.node.id, this.#onDOMIssueUpdated);
    }
  }

  #onDOMIssueUpdated = (): void => {
    this.performUpdate();
  };

  #onScrollableFlagUpdated(): void {
    void this.#updateAdorners();
  }

  #onAdRelatedStateUpdated(): void {
    void this.#updateAdorners();
  }

  #onPersistentContainerQueryOverlayStateChanged(event: Common.EventTarget.EventTargetEvent<{enabled: boolean}>): void {
    this.#containerAdornerActive = event.data.enabled;
    this.requestUpdate();
  }

  #onPersistentFlexContainerOverlayStateChanged(event: Common.EventTarget.EventTargetEvent<{enabled: boolean}>): void {
    this.#flexAdornerActive = event.data.enabled;
    this.requestUpdate();
  }

  #onPersistentGridOverlayStateChanged(event: Common.EventTarget.EventTargetEvent<{enabled: boolean}>): void {
    this.#gridAdornerActive = event.data.enabled;
    this.requestUpdate();
  }

  #onPersistentScrollSnapOverlayStateChanged(event: Common.EventTarget.EventTargetEvent<{enabled: boolean}>): void {
    this.#scrollSnapAdornerActive = event.data.enabled;
    this.requestUpdate();
  }

  #onScrollSnapAdornerClick(event: Event): void {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().overlayModel();
    if (this.#scrollSnapAdornerActive) {
      model.hideScrollSnapInPersistentOverlay(nodeId);
    } else {
      model.highlightScrollSnapInPersistentOverlay(nodeId);
    }
  }

  onattach(): void {
    if (this.#hovered) {
      this.element.classList.add('hovered');
      this.requestUpdate();
    }

    this.updateTitle();
    this.element.draggable = true;
  }

  async onpopulate(): Promise<void> {
    if (this.populateTreeElement) {
      return await this.populateTreeElement();
    }
  }

  onexpand(): void {
    if (this.isClosingTag) {
      return;
    }

    this.updateTitle();
  }

  oncollapse(): void {
    if (this.isClosingTag) {
      return;
    }

    this.updateTitle();
  }

  onselect(selectedByUser?: boolean): boolean {
    if (!this.selectDOMNode) {
      return false;
    }
    this.selectDOMNode(this.node, selectedByUser);
    if (selectedByUser) {
      this.node.highlight();
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.ChangeInspectedNodeInElementsPanel);
    }
    this.requestUpdate();
    return true;
  }

  onenter(): boolean {
    // On Enter or Return start editing the first attribute
    // or create a new attribute on the selected element.
    if (this.editing) {
      return false;
    }

    this.startEditing();

    // prevent a newline from being immediately inserted
    return true;
  }

  ondblclick(event: Event): boolean {
    if (this.editing || this.isClosingTag) {
      return false;
    }
    const target = (event.composedPath()[0] || event.target) as Element;
    if (this.startEditingTarget(target)) {
      return false;
    }

    if (this.#isExpandable && !this.#expanded) {
      this.expand?.();
    }
    return false;
  }
  hasEditableNode(): boolean {
    return !this.node.isShadowRoot() && !this.node.ancestorUserAgentShadowRoot();
  }

  private insertInLastAttributePosition(tag: Element, node: Element): void {
    if (tag.getElementsByClassName('webkit-html-attribute').length > 0) {
      tag.insertBefore(node, tag.lastChild);
    } else if (tag.textContent !== null) {
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

  private startEditingTarget(eventTarget: Element): boolean {
    if (!this.isDOMNodeSelected) {
      return false;
    }

    if (this.node.nodeType() !== Node.ELEMENT_NODE && this.node.nodeType() !== Node.TEXT_NODE &&
        this.node.nodeType() !== Node.PROCESSING_INSTRUCTION_NODE) {
      return false;
    }

    const textNode = eventTarget.enclosingNodeOrSelfWithClass('webkit-html-text-node') ??
        eventTarget.enclosingNodeOrSelfWithClass('webkit-html-processing-instruction-value');
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

  private revealHTMLInSources(): void {
    const frameOwnerId = this.node.frameOwnerFrameId();
    if (frameOwnerId) {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameOwnerId);
      if (frame) {
        const sourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(frame.url);
        void Common.Revealer.reveal(sourceCode);
      }
    }
  }

  private isAiButtonEnabled(): boolean {
    return UI.ActionRegistry.ActionRegistry.instance().hasAction('freestyler.elements-floating-button');
  }

  startEditing(): boolean|undefined {
    if (!this.isDOMNodeSelected) {
      return;
    }

    const listItem = this.element;

    if (isOpeningTag(this.tagTypeContext) && this.tagTypeContext.canAddAttributes) {
      const attribute = listItem.getElementsByClassName('webkit-html-attribute')[0];
      if (attribute) {
        return this.startEditingAttribute(
            attribute, attribute.getElementsByClassName('webkit-html-attribute-value')[0]);
      }

      return this.addNewAttribute();
    }

    if (this.node.nodeType() === Node.TEXT_NODE) {
      const textNode = listItem.getElementsByClassName('webkit-html-text-node')[0];
      if (textNode) {
        return this.startEditingTextNode(textNode);
      }
    }

    if (this.node.nodeType() === Node.PROCESSING_INSTRUCTION_NODE) {
      return this.startEditingProcessingInstructionValue();
    }

    return;
  }

  startEditingProcessingInstructionValue(): boolean|undefined {
    const processingInstructionValue =
        this.contentElement.querySelectorAll('.webkit-html-processing-instruction-value')[0];
    if (processingInstructionValue) {
      return this.startEditingTextNode(processingInstructionValue);
    }
    return;
  }

  addNewAttribute(): boolean {
    // Cannot just convert the textual html into an element without
    // a parent node. Use a temporary span container for the HTML.
    const container = document.createDocumentFragment();

    Lit.render(renderAttribute({name: ' ', value: ''}, null, false, this.node), container);
    const attr = container.firstElementChild as HTMLElement;
    attr.style.marginLeft = '2px';   // overrides the .editing margin rule
    attr.style.marginRight = '2px';  // overrides the .editing margin rule
    attr.setAttribute('jslog', `${VisualLogging.value('new-attribute').track({change: true, resize: true})}`);

    const tag = this.contentElement.querySelectorAll('.webkit-html-tag')[0];
    this.insertInLastAttributePosition(tag, attr);
    attr.scrollIntoViewIfNeeded(true);
    return this.startEditingAttribute(attr, attr);
  }

  triggerEditAttribute(attributeName: string): boolean|undefined {
    const attributeElements = this.contentElement.querySelectorAll('.webkit-html-attribute-name');
    for (let i = 0, len = attributeElements.length; i < len; ++i) {
      if (attributeElements[i].textContent === attributeName) {
        for (let elem: (ChildNode|null) = attributeElements[i].nextSibling; elem; elem = elem.nextSibling) {
          if (elem.nodeType !== Node.ELEMENT_NODE) {
            continue;
          }
          if ((elem as Element).classList.contains('webkit-html-attribute-value')) {
            return this.startEditingAttribute((elem.parentElement as HTMLElement), (elem as Element));
          }
        }
      }
    }

    return;
  }

  startEditingAttribute(attribute: Element, elementForSelection: Element): boolean {
    console.assert(this.element.isAncestor(attribute));

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

    function removeZeroWidthSpaceRecursive(node: Node): void {
      if (node.nodeType === Node.TEXT_NODE) {
        node.nodeValue = node.nodeValue ? node.nodeValue.replace(/\u200B/g, '') : '';
        return;
      }

      if (node.nodeType !== Node.ELEMENT_NODE) {
        return;
      }

      for (let child: (ChildNode|null) = node.firstChild; child; child = child.nextSibling) {
        removeZeroWidthSpaceRecursive(child);
      }
    }

    let attributeValue = attributeName && attributeValueElement ?
        this.node.getAttribute(attributeName)?.replaceAll('"', '&quot;') :
        undefined;

    const isRelation =
        attributeName === 'popovertarget' || attributeName === 'interesttarget' || attributeName === 'commandfor';
    if (isRelation && attributeName && attributeValueElement) {
      const rawValue = this.node.getAttribute(attributeName) || '';
      const relatedElement = relatedElementsCache.get(this.node)?.get(`${attributeName}:${rawValue}`);
      if (relatedElement) {
        attributeValue = relatedElement.getAttribute('id') || '';
      }
    }

    if (attributeValue !== undefined) {
      attributeValueElement.setTextContentTruncatedIfNeeded(
          attributeValue, i18nString(UIStrings.valueIsTooLargeToEdit));
    }

    // Remove zero-width spaces that were added by nodeTitleInfo.
    removeZeroWidthSpaceRecursive(attribute);

    const config = new UI.InplaceEditor.Config(
        this.attributeEditingCommitted.bind(this), this.editingCancelled.bind(this), attributeName);

    function postKeyDownFinishHandler(event: Event): string {
      UI.UIUtils.handleElementValueModifications(event, attribute);
      return '';
    }

    if (!Common.ParsedURL.ParsedURL.fromString(attributeValueElement?.textContent || '')) {
      config.setPostKeydownFinishHandler(postKeyDownFinishHandler);
    }

    this.updateEditorHandles(attribute, config);

    const componentSelection = this.element.getComponentSelection();
    componentSelection?.selectAllChildren(elementForSelection);

    return true;
  }

  startEditingTextNode(textNodeElement: Element): boolean {
    if (UI.UIUtils.isBeingEdited(textNodeElement)) {
      return true;
    }

    let textNode: SDK.DOMModel.DOMNode = this.node;
    // We only show text nodes inline in elements if the element only
    // has a single child, and that child is a text node.
    if (textNode.nodeType() === Node.ELEMENT_NODE && textNode.firstChild) {
      textNode = textNode.firstChild;
    }

    const container = textNodeElement.enclosingNodeOrSelfWithClass('webkit-html-text-node');
    if (container) {
      container.textContent = textNode.nodeValue();
    }  // Strip the CSS or JS highlighting if present.
    const config = new UI.InplaceEditor.Config(
        this.textNodeEditingCommitted.bind(this, textNode), this.editingCancelled.bind(this), null);
    this.updateEditorHandles(textNodeElement, config);
    const componentSelection = this.element.getComponentSelection();
    componentSelection?.selectAllChildren(textNodeElement);

    return true;
  }

  startEditingTagName(tagNameElement?: Element): boolean {
    if (!tagNameElement) {
      tagNameElement = this.contentElement.querySelectorAll('.webkit-html-tag-name')[0];
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

    function keyupListener(): void {
      if (closingTagElement && tagNameElement) {
        closingTagElement.textContent = '</' + tagNameElement.textContent + '>';
      }
    }

    const keydownListener = (event: Event): void => {
      if ((event as KeyboardEvent).key !== ' ') {
        return;
      }
      this.editing?.commit();
      event.consume(true);
    };

    function editingCommitted(
        this: ElementsTreeWidget,
        element: Element,
        newTagName: string,
        oldText: string|null,
        tagName: string|null,
        moveDirection: string,
        ): void {
      if (!tagNameElement) {
        return;
      }
      tagNameElement.removeEventListener('keyup', keyupListener, false);
      tagNameElement.removeEventListener('keydown', keydownListener, false);
      this.tagNameEditingCommitted(element, newTagName, oldText, tagName, moveDirection);
    }

    function editingCancelled(this: ElementsTreeWidget, element: Element, tagName: string|null): void {
      if (!tagNameElement) {
        return;
      }
      tagNameElement.removeEventListener('keyup', keyupListener, false);
      tagNameElement.removeEventListener('keydown', keydownListener, false);
      this.editingCancelled(element, tagName);
    }

    tagNameElement.addEventListener('keyup', keyupListener, false);
    tagNameElement.addEventListener('keydown', keydownListener, false);

    const config =
        new UI.InplaceEditor.Config<string|null>(editingCommitted.bind(this), editingCancelled.bind(this), tagName);
    this.updateEditorHandles(tagNameElement, config);
    const componentSelection = this.element.getComponentSelection();
    componentSelection?.selectAllChildren(tagNameElement);
    return true;
  }

  private updateEditorHandles<T>(element: Element, config: UI.InplaceEditor.Config<T>): void {
    const editorHandles = UI.InplaceEditor.InplaceEditor.startEditing(element, config);
    if (!editorHandles) {
      this.editing = null;
    } else {
      this.editing = {
        commit: editorHandles.commit,
        cancel: editorHandles.cancel,
        resize: () => {},
      };
    }
  }

  private async startEditingAsHTML(
      commitCallback: (arg0: string, arg1: string) => void, disposeCallback: () => void,
      maybeInitialValue: string|null): Promise<void> {
    if (maybeInitialValue === null) {
      return;
    }
    if (this.editing) {
      return;
    }

    // Hide children item.
    this.setChildrenListElementVisible?.(false);
    const initialValue = convertUnicodeCharsToHTMLEntities(maybeInitialValue).text;
    // Append editor.
    this.#editorState = CodeMirror.EditorState.create({
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
        CodeMirror.html.html({autoCloseTags: false, selfClosingTags: true}),
        TextEditor.Config.domWordWrap.instance(),
        CodeMirror.EditorView.theme({
          '&.cm-editor': {maxHeight: '300px'},
          '.cm-scroller': {overflowY: 'auto'},
        }),
        CodeMirror.EditorView.domEventHandlers({
          focusout: event => {
            if (!this.#editorRef || this.#editAsHtmlMenuOpen) {
              return;
            }
            // The relatedTarget is null when no element gains focus, e.g. switching windows.
            const relatedTarget = (event.relatedTarget as Node | null);
            if (relatedTarget && !relatedTarget.isSelfOrDescendant(this.#editorRef)) {
              this.editing?.commit();
            }
          },
          contextmenu: (event, view) => {
            // The editor virtualizes its content, so the browser's native
            // "Select all" only reaches the rendered lines. Show a menu whose
            // "Select all" spans the whole document, like Ctrl/Cmd+A.
            event.consume(true);
            const {from, to, empty} = view.state.selection.main;
            const copy = (): void =>
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(view.state.sliceDoc(from, to));
            const contextMenu = new UI.ContextMenu.ContextMenu(event, {
              onSoftMenuClosed: () => {
                this.#editAsHtmlMenuOpen = false;
              },
            });
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.cut), () => {
              copy();
              view.dispatch({changes: {from, to, insert: ''}});
              view.focus();
            }, {disabled: empty, jslogContext: 'cut'});
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copy), () => {
              copy();
              view.focus();
            }, {disabled: empty, jslogContext: 'copy'});
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.paste), () => {
              void navigator.clipboard.readText().then(text => {
                view.dispatch(view.state.replaceSelection(text));
                view.focus();
              });
            }, {jslogContext: 'paste'});
            contextMenu.editSection().appendItem(i18nString(UIStrings.selectAll), () => {
              view.dispatch({selection: {anchor: 0, head: view.state.doc.length}});
              view.focus();
            }, {jslogContext: 'select-all'});
            this.#editAsHtmlMenuOpen = true;
            void contextMenu.show();
            return true;
          },
        }),
      ],
    });
    this.requestUpdate();
    resize.call(this);
    this.editing = {commit: commit.bind(this), cancel: dispose.bind(this), resize: resize.bind(this)};
    this.setMultilineEditing?.(this.editing);
    await this.updateComplete;
    this.#editorRef?.focus();

    function resize(this: ElementsTreeWidget): void {
      if (this.visibleWidth) {
        this.#editorWidth = this.visibleWidth() - this.#getLeftIndent() - 30;
        this.requestUpdate();
      }
    }

    function commit(this: ElementsTreeWidget): void {
      if (this.#editorRef) {
        commitCallback(initialValue, this.#editorRef.editor.state.doc.toString());
      }
      dispose.call(this);
    }

    function dispose(this: ElementsTreeWidget): void {
      if (!this.editing && !this.#editorState) {
        return;
      }
      this.editing = null;
      this.#editorState = null;
      this.requestUpdate();
      // Unhide children item.
      this.setChildrenListElementVisible?.(true);

      if (this.setMultilineEditing) {
        this.setMultilineEditing(null);
      }
      this.focusOutline?.();

      disposeCallback();
    }
  }

  private attributeEditingCommitted(
      element: Element,
      newText: string,
      oldText: string|null,
      attributeName: string|null,
      moveDirection: string,
      ): void {
    this.editing = null;
    this.#clearDOMNextUpdate = true;

    function moveToNextAttributeIfNeeded(this: ElementsTreeWidget, error?: string|null): void {
      if (error) {
        this.editingCancelled(element, attributeName);
      }

      if (!moveDirection) {
        return;
      }

      this.runPendingUpdates?.();
      this.focusOutline?.();

      // Search for the attribute's position, and then decide where to move to.
      const attributes = this.node.attributes();
      for (let i = 0; i < attributes.length; ++i) {
        if (attributes[i].name !== attributeName) {
          continue;
        }

        if (moveDirection === 'backward') {
          if (i === 0) {
            this.startEditingTagName();
          } else {
            this.triggerEditAttribute(attributes[i - 1].name);
          }
        } else if (i === attributes.length - 1) {
          this.addNewAttribute();
        } else {
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
        } else if (attributes.length > 1) {
          this.triggerEditAttribute(attributes[attributes.length - 2].name);
        }
      } else if (moveDirection === 'forward') {
        if (!Platform.StringUtilities.isWhitespace(newText)) {
          this.addNewAttribute();
        } else {
          this.startEditingTagName();
        }
      }
    }

    if (attributeName !== null && (attributeName.trim() || newText.trim()) && oldText !== newText) {
      this.node.setAttribute(attributeName, newText, moveToNextAttributeIfNeeded.bind(this));
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
      return;
    }

    this.updateTitle();
    moveToNextAttributeIfNeeded.call(this);
  }

  private tagNameEditingCommitted(
      element: Element,
      newText: string,
      oldText: string|null,
      tagName: string|null,
      moveDirection: string,
      ): void {
    this.editing = null;
    const self = this;

    function cancel(): void {
      const closingTagElement = self.distinctClosingTagElement();
      if (closingTagElement) {
        closingTagElement.textContent = '</' + tagName + '>';
      }

      self.editingCancelled(element, tagName);
      moveToNextAttributeIfNeeded.call(self);
    }

    function moveToNextAttributeIfNeeded(this: ElementsTreeWidget): void {
      if (this.node.nodeType() === Node.PROCESSING_INSTRUCTION_NODE) {
        this.startEditingProcessingInstructionValue();
        return;
      }

      if (moveDirection !== 'forward') {
        this.addNewAttribute();
        return;
      }

      const attributes = this.node.attributes();
      if (attributes.length > 0) {
        this.triggerEditAttribute(attributes[0].name);
      } else {
        this.addNewAttribute();
      }
    }

    newText = newText.trim();
    if (newText === oldText) {
      cancel();
      return;
    }

    const wasExpanded = this.#expanded;

    this.node.setNodeName(newText, (error, newNode) => {
      if (error || !newNode) {
        cancel();
        return;
      }
      if (!this.selectNodeAfterEdit) {
        return;
      }

      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.DOM_ELEMENT_OR_ATTRIBUTE_EDITED);
      this.selectNodeAfterEdit(wasExpanded, error, newNode, moveDirection);
    });
  }

  private textNodeEditingCommitted(textNode: SDK.DOMModel.DOMNode, _element: Element, newText: string): void {
    this.editing = null;

    function callback(this: ElementsTreeWidget): void {
      this.#clearDOMNextUpdate = true;
      this.updateTitle();
    }
    textNode.setNodeValue(newText, callback.bind(this));
  }

  editingCancelled(_element: Element, _tagName: string|null): void {
    this.editing = null;

    // Need to restore attributes structure.
    this.#clearDOMNextUpdate = true;
    this.updateTitle();
  }

  private distinctClosingTagElement(): Element|null {
    // FIXME: Improve the Tree Element / Outline Abstraction to prevent crawling the DOM

    // For an expanded element, it will be the last element with class "close"
    // in the child element list.
    if (this.#expanded) {
      return this.closingTagElement?.() ?? null;
    }

    // Remaining cases are single line non-expanded elements with a closing
    // tag, or HTML elements without a closing tag (such as <br>). Return
    // null in the case where there isn't a closing tag.
    const tags = this.contentElement.querySelectorAll('.webkit-html-tag');
    return tags.length === 1 ? null : tags[tags.length - 1];
  }

  updateTitle(updateRecord?: Elements.ElementUpdateRecord.ElementUpdateRecord|null): void {
    // If we are editing, return early to prevent canceling the edit.
    // After editing is committed updateTitle will be called.
    if (this.editing) {
      return;
    }
    this.#updateRecord = updateRecord ?? null;
    if (this.node.nodeType() === Node.DOCUMENT_FRAGMENT_NODE && this.node.isInShadowTree() &&
        this.node.shadowRootType()) {
      let depth = 4;
      for (let node: (SDK.DOMModel.DOMNode|null) = (this.node as SDK.DOMModel.DOMNode | null); depth && node;
           node = node.parentNode) {
        if (node.nodeType() === Node.DOCUMENT_FRAGMENT_NODE) {
          depth--;
        }
      }
      this.updateShadowRootDepth?.(depth);
    }
    this.performUpdate();
    this.updateDecorations();

    this.#highlightSearchResults();
  }

  #getLeftIndent(): number {
    if (typeof this.computeLeftIndent === 'function') {
      return this.computeLeftIndent();
    }
    return this.computeLeftIndent ?? 0;
  }

  updateDecorations(): void {
    // Important to keep the entire tree node row as a clickable area for that
    // node.
    this.element.style.setProperty('--indent', this.#getLeftIndent() + 'px');

    if (this.isClosingTag) {
      return;
    }

    if (this.node.nodeType() !== Node.ELEMENT_NODE) {
      return;
    }

    void this.decorationsThrottler.schedule(this.#updateDecorations.bind(this));
  }

  #updateDecorations(): Promise<void> {
    const node = this.node;
    const decoratorExtensions = getRegisteredDecorators();

    const markerToExtension = new Map<string, MarkerDecoratorRegistration>();
    for (const decoratorExtension of decoratorExtensions) {
      markerToExtension.set(decoratorExtension.marker, decoratorExtension);
    }

    const promises: Array<Promise<void>> = [];
    const decorations: Array<{
      title: string,
      color: string,
    }> = [];
    const descendantDecorations: Array<{
      title: string,
      color: string,
    }> = [];
    node.traverseMarkers(visitor);

    function visitor(n: SDK.DOMModel.DOMNode, marker: string): void {
      const extension = markerToExtension.get(marker);
      if (!extension) {
        return;
      }
      promises.push(Promise.resolve(extension.decorator()).then(collectDecoration.bind(null, n)));
    }

    function collectDecoration(n: SDK.DOMModel.DOMNode, decorator: MarkerDecorator): void {
      const decoration = decorator.decorate(n);
      if (!decoration) {
        return;
      }
      (n === node ? decorations : descendantDecorations).push(decoration);
    }

    return Promise.all(promises).then(updateDecorationsUI.bind(this));

    function updateDecorationsUI(this: ElementsTreeWidget): void {
      this.#decorations = decorations;
      this.#descendantDecorations = descendantDecorations;

      if (!decorations.length && !descendantDecorations.length) {
        this.#decorationsTooltip = '';
        this.requestUpdate();
        return;
      }

      const tooltip: string[] = [];
      for (const decoration of decorations) {
        tooltip.push(decoration.title);
      }
      if (!this.#expanded && descendantDecorations.length) {
        tooltip.push(i18nString(UIStrings.children));
        for (const decoration of descendantDecorations) {
          tooltip.push(decoration.title);
        }
      }
      this.#decorationsTooltip = tooltip.join('\n');
      this.requestUpdate();
    }
  }

  async remove(): Promise<void> {
    if (this.isToggledToHidden?.(this.node)) {
      // Unhide the node before removing. This avoids inconsistent state if the node is restored via undo.
      await this.toggleHideElement?.(this.node);
    }
    if (this.node.pseudoType()) {
      return;
    }

    if (!this.node.parentNode || this.node.parentNode.nodeType() === Node.DOCUMENT_NODE) {
      return;
    }
    void this.node.removeNode();
  }

  toggleEditAsHTML(callback?: ((arg0: boolean) => void), startEditing?: boolean): void {
    if (this.editing && this.#editorState) {
      this.editing.commit();
      return;
    }

    if (startEditing === false) {
      return;
    }

    function selectNode(error: string|null): void {
      if (callback) {
        callback(!error);
      }
    }

    function commitChange(initialValue: string, value: string): void {
      if (initialValue !== value) {
        node.setOuterHTML(value, selectNode);
      }
    }

    function disposeCallback(): void {
      if (callback) {
        callback(false);
      }
    }

    const node = this.node;
    void node.getOuterHTML().then(this.startEditingAsHTML.bind(this, commitChange, disposeCallback));
  }

  #highlightSearchResults(): void {
    this.hideSearchHighlights();

    if (!this.searchQuery) {
      return;
    }

    const text = this.contentElement.deepTextContent();
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

    this.#highlights = Highlighting.HighlightManager.HighlightManager.instance().highlightOrderedTextRanges(
        this.contentElement, matchRanges);
  }

  editAsHTML(): void {
    const promise = Common.Revealer.reveal(this.node);
    void promise.then(() => {
      const action = UI.ActionRegistry.ActionRegistry.instance().getAction('elements.edit-as-html');
      return action.execute();
    });
  }

  updateAdorners(): void {
    // TODO: remove adornersThrottler in favour of throttled updated (requestUpdate/performUpdate).
    void this.#adornersThrottler.schedule(this.#updateAdorners.bind(this));
  }

  async #updateAdorners(): Promise<void> {
    if (this.isClosingTag) {
      return;
    }
    const node = this.node;
    const nodeId = node.id;
    if (node.nodeType() !== Node.COMMENT_NODE && node.nodeType() !== Node.DOCUMENT_FRAGMENT_NODE &&
        node.nodeType() !== Node.TEXT_NODE && nodeId !== undefined) {
      this.#layout = await node.domModel().cssModel().getLayoutPropertiesFromComputedStyle(nodeId);
    } else {
      this.#layout = null;
    }
    this.requestUpdate();
  }

  async #onPopoverAdornerClick(event: Event): Promise<void> {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    await node.domModel().agent.invoke_forceShowPopover({nodeId, enable: !this.#popoverAdornerActive});
    this.#popoverAdornerActive = !this.#popoverAdornerActive;
    if (this.#popoverAdornerActive) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    this.requestUpdate();
  }

  async #onInterestAdornerClick(event: Event): Promise<void> {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    await node.domModel().agent.invoke_forceShowInterest({nodeId, enable: !this.#interestAdornerActive});
    this.#interestAdornerActive = !this.#interestAdornerActive;
    if (this.#interestAdornerActive) {
      Badges.UserBadges.instance().recordAction(Badges.BadgeAction.MODERN_DOM_BADGE_CLICKED);
    }
    this.requestUpdate();
  }

  #onStartingStyleAdornerClick(event: Event): void {
    event.stopPropagation();
    const node = this.node;
    const nodeId = node.id;
    if (!nodeId) {
      return;
    }
    const model = node.domModel().cssModel();
    if (this.#startingStyleAdornerActive) {
      model.forceStartingStyle(node, false);
    } else {
      model.forceStartingStyle(node, true);
    }
    this.#startingStyleAdornerActive = !this.#startingStyleAdornerActive;
    this.requestUpdate();
  }
}
export class ElementsTreeElement extends UI.TreeOutline.TreeElement {
  widget: ElementsTreeWidget;
  widgetWrapper: HTMLElement;
  nodeInternal: SDK.DOMModel.DOMNode;
  #isClosingTag: boolean;

  get tagTypeContext(): TagTypeContext {
    if (this.#isClosingTag) {
      return {tagType: TagType.CLOSING};
    }
    return {
      tagType: TagType.OPENING,
      canAddAttributes: this.nodeInternal.nodeType() === Node.ELEMENT_NODE,
    };
  }

  constructor(
      node: SDK.DOMModel.DOMNode,
      isClosingTag?: boolean,
  ) {
    super();
    this.nodeInternal = node;
    this.#isClosingTag = Boolean(isClosingTag);
    this.listItemElement.setAttribute(
        'jslog', `${VisualLogging.treeItem().parent('elementsTreeOutline').track({
          keydown: 'ArrowUp|ArrowDown|ArrowLeft|ArrowRight|Backspace|Delete|Enter|Space|Home|End',
          resize: true,
          drag: true,
          click: true,
        })}`);

    this.widgetWrapper = document.createElement('div');
    this.widgetWrapper.style.display = 'contents';
    this.title = this.widgetWrapper;
    this.listItemElement.draggable = true;
    this.widget = new ElementsTreeWidget();
    this.widget.isClosingTag = this.#isClosingTag;
    this.widget.node = this.nodeInternal;
    this.widget.childCount = () => this.childCount();
    this.widget.expand = () => this.expand();
    this.widget.collapse = () => this.collapse();
    this.widget.selectTreeElement = (omitFocus, selectedByUser) => {
      return this.select(omitFocus, selectedByUser);
    };
    this.widget.expandRecursively = () => this.expandRecursively();
    this.widget.collapseChildren = () => this.collapseChildren();
    this.widget.closingTagElement = () => {
      const closers = this.childrenListElement.querySelectorAll('.close');
      return closers[closers.length - 1] ?? null;
    };
    this.widget.updateShadowRootDepth = (depth: number) => {
      this.childrenListElement.classList.add('shadow-root');
      if (!depth) {
        this.childrenListElement.classList.add('shadow-root-deep');
      } else {
        this.childrenListElement.classList.add('shadow-root-depth-' + depth);
      }
    };
    this.widget.computeLeftIndent = () => {
      let treeElement: (UI.TreeOutline.TreeElement|null) = this.parent;
      let depth = 0;
      while (treeElement !== null) {
        depth++;
        treeElement = treeElement.parent;
      }
      return 12 * (depth - 2) + (this.isExpandable() && this.isCollapsible() ? 1 : 12);
    };
    this.widget.setChildrenListElementVisible = (visible: boolean) => {
      if (this.childrenListElement) {
        if (visible) {
          this.childrenListElement.style.removeProperty('display');
        } else {
          this.childrenListElement.style.display = 'none';
        }
      }
    };
    this.treeOutline = null;
    this.widget.element.classList.remove('vbox', 'flex-auto');
    this.widget.element.style.display = 'contents';
    this.widget.markAsRoot();
    this.widget.show(this.widgetWrapper);

    if (this.nodeInternal.retained && !this.isClosingTag()) {
      this.setLeadingIcons([
        html`<devtools-icon class="extra-small" name="small-status-dot" style="color:var(--icon-error); vertical-align:middle"></devtools-icon>`,
      ]);
      this.listItemNode.classList.add('detached-elements-detached-node');
      this.listItemNode.style.setProperty('display', '-webkit-box');
      this.listItemNode.setAttribute('title', 'Retained Node');
    }

    if (this.nodeInternal.detached && !this.isClosingTag()) {
      this.listItemNode.setAttribute('title', 'Detached Tree Node');
    }
  }

  highlightSearchResults(searchQuery: string): void {
    this.widget.highlightSearchResults(searchQuery);
  }
  hideSearchHighlights(): void {
    this.widget.hideSearchHighlights();
  }
  copyStyles(): Promise<void> {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    return outline?.domTreeWidget?.copyStyles(this.nodeInternal) ?? Promise.resolve();
  }
  setInClipboard(inClipboard: boolean): void {
    this.widget.setInClipboard(inClipboard);
    if (this.listItemElement) {
      this.listItemElement.classList.toggle('in-clipboard', inClipboard);
    }
  }
  get isEditing(): boolean {
    return this.widget.isEditing;
  }
  expandedChildrenLimit(): number {
    return this.widget.expandedChildrenLimit();
  }

  setExpandedChildrenLimit(limit: number): void {
    this.widget.setExpandedChildrenLimit(limit);
  }
  highlightAttribute(name: string): void {
    this.widget.highlightAttribute(name);
  }
  startEditing(): boolean|undefined {
    return this.widget.startEditing();
  }
  startEditingAttribute(attribute: Element, elementForSelection: Element): boolean {
    return this.widget.startEditingAttribute(attribute, elementForSelection);
  }
  startEditingTextNode(textNodeElement: Element): boolean {
    return this.widget.startEditingTextNode(textNodeElement);
  }
  editAsHTML(): void {
    this.widget.editAsHTML();
  }
  copyCSSPath(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    outline?.domTreeWidget?.copyCSSPath(this.nodeInternal);
  }
  copyJSPath(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    outline?.domTreeWidget?.copyJSPath(this.nodeInternal);
  }
  copyXPath(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    outline?.domTreeWidget?.copyXPath(this.nodeInternal);
  }
  copyFullXPath(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    outline?.domTreeWidget?.copyFullXPath(this.nodeInternal);
  }
  hasEditableNode(): boolean {
    return this.widget.hasEditableNode();
  }
  toggleEditAsHTML(callback?: ((arg0: boolean) => void), startEditing?: boolean): void {
    this.widget.toggleEditAsHTML(callback, startEditing);
  }

  get expandAllButtonElement(): UI.TreeOutline.TreeElement|null {
    return this.widget.expandAllButtonElement;
  }
  set expandAllButtonElement(element: UI.TreeOutline.TreeElement|null) {
    this.widget.expandAllButtonElement = element;
  }

  node(): SDK.DOMModel.DOMNode {
    return this.nodeInternal;
  }

  isClosingTag(): boolean {
    return this.#isClosingTag;
  }

  #syncOutlineProperties(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    if (outline) {
      this.widget.isXMLMimeType = Boolean(outline.isXMLMimeType);
      this.widget.disableEdits = Boolean(outline.disableEdits);
      this.widget.showAIButton = Boolean(outline.showAIButton);
      this.widget.expanded = this.expanded;
      this.widget.isExpandable = this.isExpandable();
      this.widget.selected = this.selected;
      this.widget.isDOMNodeSelected = outline.selectedDOMNode() === this.nodeInternal;
      this.widget.selectDOMNode = (node, selectedByUser) => {
        outline.suppressRevealAndSelect = true;
        outline.selectDOMNode(node, selectedByUser);
        outline.suppressRevealAndSelect = false;
      };
      this.widget.findStartTagWidget = () => {
        return (outline.findTreeElement(this.nodeInternal) as ElementsTreeElement | null)?.widget ?? null;
      };
      this.widget.revealInTopLayer = node => outline.revealInTopLayer(node);
      this.widget.showContextMenu = event => void outline.showContextMenu(this, event);
      this.widget.populateTreeElement = async () => await outline.populateTreeElement(this);
      this.widget.toggleHideElement = node => outline.toggleHideElement(node);
      this.widget.isToggledToHidden = node => outline.isToggledToHidden(node);
      this.widget.selectNodeAfterEdit = (wasExpanded, error, newNode, moveDirection) => {
        outline.domTreeWidget?.selectNodeAfterEdit(wasExpanded, error, newNode, moveDirection);
      };
      this.widget.runPendingUpdates = () => outline.runPendingUpdates();
      this.widget.focusOutline = () => outline.focus();
      this.widget.setMultilineEditing = multilineEditing => {
        outline.domTreeWidget?.setMultilineEditing(multilineEditing);
      };
      this.widget.visibleWidth = () => outline.domTreeWidget?.visibleWidth ?? outline.visibleWidth();
    }
  }

  override onattach(): void {
    this.#syncOutlineProperties();
    this.widget.onattach();
  }

  override async onpopulate(): Promise<void> {
    return await this.widget.onpopulate();
  }

  override async expandRecursively(): Promise<void> {
    await this.nodeInternal.getSubtree(100, true);
    await super.expandRecursively(Number.MAX_VALUE);
  }

  override onexpand(): void {
    this.widget.expanded = true;
    this.widget.isExpandable = this.isExpandable();
    this.widget.onexpand();
  }

  override oncollapse(): void {
    this.widget.expanded = false;
    this.widget.isExpandable = this.isExpandable();
    this.widget.oncollapse();
  }

  override select(omitFocus?: boolean, selectedByUser?: boolean): boolean {
    if (this.widget.editing) {
      return false;
    }
    return super.select(omitFocus, selectedByUser);
  }

  override onselect(selectedByUser?: boolean): boolean {
    this.widget.selected = true;
    this.#syncOutlineProperties();
    return this.widget.onselect(selectedByUser);
  }

  override deselect(): void {
    super.deselect();
    this.widget.selected = false;
    this.#syncOutlineProperties();
  }

  override ondelete(): boolean {
    if (!this.treeOutline) {
      return false;
    }
    const startTagTreeElement = (this.treeOutline as ElementsTreeOutline).findTreeElement(this.nodeInternal);
    startTagTreeElement ? (void (startTagTreeElement as ElementsTreeElement).remove()) : (void this.remove());
    return true;
  }

  override onenter(): boolean {
    this.#syncOutlineProperties();
    return this.widget.onenter();
  }

  override selectOnMouseDown(event: MouseEvent): void {
    super.selectOnMouseDown(event);

    if (this.widget.editing) {
      return;
    }

    // Prevent selecting the nearest word on double click.
    if (event.detail >= 2) {
      event.preventDefault();
    }
  }

  override ondblclick(event: Event): boolean {
    this.#syncOutlineProperties();
    return this.widget.ondblclick(event);
  }

  override onbind(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    if (outline && !this.isClosingTag()) {
      outline.treeElementByNode.set(this.nodeInternal, this);
    }
    this.widget.onbind();
  }

  override onunbind(): void {
    const outline = this.treeOutline as ElementsTreeOutline | null;
    if (outline && outline.treeElementByNode.get(this.nodeInternal) === this) {
      outline.treeElementByNode.delete(this.nodeInternal);
    }
    this.widget.onunbind();
  }

  static animateOnDOMUpdate(treeElement: ElementsTreeElement): void {
    treeElement.widget.animateOnDOMUpdate();
  }

  static visibleShadowRoots(node: SDK.DOMModel.DOMNode): SDK.DOMModel.DOMNode[] {
    return ElementsTreeWidget.visibleShadowRoots(node);
  }

  static canShowInlineText(node: SDK.DOMModel.DOMNode): boolean {
    return ElementsTreeWidget.canShowInlineText(node);
  }

  static populateForcedPseudoStateItems(contextMenu: UI.ContextMenu.ContextMenu, node: SDK.DOMModel.DOMNode): void {
    ElementsTreeWidget.populateForcedPseudoStateItems(contextMenu, node);
  }

  set hovered(isHovered: boolean) {
    this.widget.hovered = isHovered;
    if (this.listItemElement) {
      this.listItemElement.classList.toggle('hovered', isHovered);
    }
  }

  get hovered(): boolean {
    return this.widget.hovered;
  }

  updateAdorners(): void {
    this.#syncOutlineProperties();
    this.widget.updateAdorners();
  }

  get updateComplete(): Promise<void> {
    return this.widget.updateComplete;
  }

  requestUpdate(): void {
    this.#syncOutlineProperties();
    this.widget.requestUpdate();
  }
  updateTitle(updateRecord?: Elements.ElementUpdateRecord.ElementUpdateRecord|null): void {
    this.#syncOutlineProperties();
    this.widget.updateTitle(updateRecord);
  }

  triggerEditAttribute(attributeName: string): boolean {
    return this.widget.triggerEditAttribute(attributeName) || false;
  }

  editingCancelled(element: Element, tagName: string|null): void {
    this.widget.editingCancelled(element, tagName);
  }

  updateDecorations(): void {
    this.widget.updateDecorations();
  }

  async remove(): Promise<void> {
    return await this.widget.remove();
  }

  addNewAttribute(): boolean {
    return this.widget.addNewAttribute();
  }
  startEditingTagName(tagNameElement?: Element): boolean {
    return this.widget.startEditingTagName(tagNameElement);
  }

  startEditingProcessingInstructionValue(): boolean|undefined {
    return this.widget.startEditingProcessingInstructionValue();
  }

  isDisplayContents(): boolean {
    return this.widget.isDisplayContents();
  }

  performUpdate(): void {
    this.widget.performUpdate();
  }
}

export const InitialChildrenLimit = 500;

/**
 * A union of HTML4 and HTML5-Draft elements that explicitly
 * or implicitly (for HTML5) forbid the closing tag.
 **/
export const ForbiddenClosingTagElements = new Set<string>([
  'area', 'base',  'basefont', 'br',   'canvas',   'col',  'command', 'embed',  'frame', 'hr',
  'img',  'input', 'keygen',   'link', 'menuitem', 'meta', 'param',   'source', 'track', 'wbr',
]);

/** These tags we do not allow editing their tag name. **/
export const EditTagBlocklist = new Set<string>(['html', 'head', 'body']);

export function convertUnicodeCharsToHTMLEntities(text: string): {
  text: string,
  entityRanges: TextUtils.TextRange.SourceRange[],
} {
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
  return {text: result || text, entityRanges};
}

export interface EditorHandles {
  commit: () => void;
  cancel: () => void;
  resize: () => void;
}

/**
 * As a privacy measure we are logging elements tree outline as a flat list where every tree item is a
 * child of a tree outline.
 **/
function loggingParentProvider(e: Element): Element|undefined {
  const treeElement = UI.TreeOutline.TreeElement.getTreeElementBylistItemNode(e);
  return treeElement?.treeOutline?.contentElement;
}

VisualLogging.registerParentProvider('elementsTreeOutline', loggingParentProvider);
