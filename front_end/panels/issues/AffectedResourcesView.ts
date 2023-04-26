// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as Protocol from '../../generated/protocol.js';
import * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';

import {type IssueView} from './IssueView.js';
import {type AggregatedIssue} from './IssueAggregator.js';

const UIStrings = {
  /**
   *@description Text in Object Properties Section
   */
  unknown: 'unknown',
  /**
   *@description Tooltip for button linking to the Elements panel
   */
  clickToRevealTheFramesDomNodeIn: 'Click to reveal the frame\'s DOM node in the Elements panel',
  /**
   *@description Replacement text for a link to an HTML element which is not available (anymore).
   */
  unavailable: 'unavailable',
};
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedResourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum AffectedItem {
  Cookie = 'Cookie',
  Directive = 'Directive',
  Element = 'Element',
  LearnMore = 'LearnMore',
  Request = 'Request',
  Source = 'Source',
}

export const extractShortPath = (path: Platform.DevToolsPath.UrlString): string => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

export interface CreateRequestCellOptions {
  linkToPreflight?: boolean;
  highlightHeader?: {section: NetworkForward.UIRequestLocation.UIHeaderSection, name: string};
  networkTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
  additionalOnClickAction?: () => void;
}

/**
 * The base class for all affected resource views. It provides basic scaffolding
 * as well as machinery for resolving request and frame ids to SDK objects.
 */
export abstract class AffectedResourcesView extends UI.TreeOutline.TreeElement {
  readonly #parentView: IssueView;
  protected issue: AggregatedIssue;
  protected affectedResourcesCountElement: HTMLElement;
  protected affectedResources: HTMLElement;
  #affectedResourcesCount: number;
  #frameListeners: Common.EventTarget.EventDescriptor[];
  #unresolvedFrameIds: Set<string>;
  protected requestResolver: Logs.RequestResolver.RequestResolver;

  constructor(parent: IssueView, issue: AggregatedIssue) {
    super();
    this.#parentView = parent;
    this.issue = issue;
    this.toggleOnClick = true;
    this.affectedResourcesCountElement = this.createAffectedResourcesCounter();

    this.affectedResources = this.createAffectedResources();
    this.#affectedResourcesCount = 0;
    this.requestResolver = new Logs.RequestResolver.RequestResolver();
    this.#frameListeners = [];
    this.#unresolvedFrameIds = new Set();
  }

  /**
   * Sets the issue to take the resources from. Does not
   * trigger an update, the caller needs to do that explicitly.
   */
  setIssue(issue: AggregatedIssue): void {
    this.issue = issue;
  }

  createAffectedResourcesCounter(): HTMLElement {
    const counterLabel = document.createElement('div');
    counterLabel.classList.add('affected-resource-label');
    this.listItemElement.appendChild(counterLabel);
    return counterLabel;
  }

  createAffectedResources(): HTMLElement {
    const body = new UI.TreeOutline.TreeElement();
    const affectedResources = document.createElement('table');
    affectedResources.classList.add('affected-resource-list');
    body.listItemElement.appendChild(affectedResources);
    this.appendChild(body);

    return affectedResources;
  }

  protected abstract getResourceNameWithCount(count: number): string;

  protected updateAffectedResourceCount(count: number): void {
    this.#affectedResourcesCount = count;
    this.affectedResourcesCountElement.textContent = this.getResourceNameWithCount(count);
    this.hidden = this.#affectedResourcesCount === 0;
    this.#parentView.updateAffectedResourceVisibility();
  }

  isEmpty(): boolean {
    return this.#affectedResourcesCount === 0;
  }

  clear(): void {
    this.affectedResources.textContent = '';
    this.requestResolver.clear();
  }

  expandIfOneResource(): void {
    if (this.#affectedResourcesCount === 1) {
      this.expand();
    }
  }

  /**
   * This function resolves a frameId to a ResourceTreeFrame. If the frameId does not resolve, or hasn't navigated yet,
   * a listener is installed that takes care of updating the view if the frame is added. This is useful if the issue is
   * added before the frame gets reported.
   */
  #resolveFrameId(frameId: Protocol.Page.FrameId): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
    if (!frame || !frame.url) {
      this.#unresolvedFrameIds.add(frameId);
      if (!this.#frameListeners.length) {
        const addListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameAddedToTarget, this.#onFrameChanged, this);
        const navigateListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameNavigated, this.#onFrameChanged, this);
        this.#frameListeners = [addListener, navigateListener];
      }
    }
    return frame;
  }

  #onFrameChanged(event: Common.EventTarget.EventTargetEvent<{frame: SDK.ResourceTreeModel.ResourceTreeFrame}>): void {
    const frame = event.data.frame;
    if (!frame.url) {
      return;
    }
    const frameWasUnresolved = this.#unresolvedFrameIds.delete(frame.id);
    if (this.#unresolvedFrameIds.size === 0 && this.#frameListeners.length) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.removeEventListeners(this.#frameListeners);
      this.#frameListeners = [];
    }
    if (frameWasUnresolved) {
      this.update();
    }
  }

  protected createFrameCell(frameId: Protocol.Page.FrameId, issueCategory: IssuesManager.Issue.IssueCategory):
      HTMLElement {
    const frame = this.#resolveFrameId(frameId);
    const url = frame && (frame.unreachableUrl() || frame.url) || i18nString(UIStrings.unknown);

    const frameCell = document.createElement('td');
    frameCell.classList.add('affected-resource-cell');
    if (frame) {
      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'code-circle', color: 'var(--icon-link)', width: '16px', height: '16px'};
      icon.classList.add('link', 'elements-panel');
      icon.onclick = async(): Promise<void> => {
        Host.userMetrics.issuesPanelResourceOpened(issueCategory, AffectedItem.Element);
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (frame) {
          const ownerNode = await frame.getOwnerDOMNodeOrDocument();
          if (ownerNode) {
            void Common.Revealer.reveal(ownerNode);
          }
        }
      };
      icon.title = i18nString(UIStrings.clickToRevealTheFramesDomNodeIn);
      frameCell.appendChild(icon);
    }
    frameCell.appendChild(document.createTextNode(url));
    frameCell.onmouseenter = (): void => {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
      if (frame) {
        void frame.highlight();
      }
    };
    frameCell.onmouseleave = (): void => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return frameCell;
  }

  protected createRequestCell(affectedRequest: Protocol.Audits.AffectedRequest, options: CreateRequestCellOptions = {}):
      HTMLElement {
    const requestCell = document.createElement('td');
    requestCell.classList.add('affected-resource-cell');
    const requestLinkIcon = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
    requestLinkIcon.data = {...options, affectedRequest, requestResolver: this.requestResolver, displayURL: true};
    requestCell.appendChild(requestLinkIcon);
    return requestCell;
  }

  protected async createElementCell(
      {backendNodeId, nodeName, target}: IssuesManager.Issue.AffectedElement,
      issueCategory: IssuesManager.Issue.IssueCategory): Promise<Element> {
    if (!target) {
      const cellElement = document.createElement('td');
      cellElement.textContent = nodeName || i18nString(UIStrings.unavailable);
      return cellElement;
    }

    function sendTelemetry(): void {
      Host.userMetrics.issuesPanelResourceOpened(issueCategory, AffectedItem.Element);
    }

    const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, backendNodeId);
    const anchorElement = (await Common.Linkifier.Linkifier.linkify(deferredDOMNode)) as HTMLElement;
    anchorElement.textContent = nodeName;
    anchorElement.addEventListener('click', () => sendTelemetry());
    anchorElement.addEventListener('keydown', (event: Event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        sendTelemetry();
      }
    });
    const cellElement = document.createElement('td');
    cellElement.classList.add('affected-resource-element', 'devtools-link');
    cellElement.appendChild(anchorElement);
    return cellElement;
  }

  protected appendSourceLocation(
      element: HTMLElement,
      sourceLocation: {url: string, scriptId?: Protocol.Runtime.ScriptId, lineNumber: number, columnNumber?: number}|
      undefined,
      target: SDK.Target.Target|null|undefined): void {
    const sourceCodeLocation = document.createElement('td');
    sourceCodeLocation.classList.add('affected-source-location');
    if (sourceLocation) {
      const maxLengthForDisplayedURLs = 40;  // Same as console messages.
      // TODO(crbug.com/1108503): Add some mechanism to be able to add telemetry to this element.
      const linkifier = new Components.Linkifier.Linkifier(maxLengthForDisplayedURLs);
      const sourceAnchor = linkifier.linkifyScriptLocation(
          target || null, sourceLocation.scriptId || null, sourceLocation.url as Platform.DevToolsPath.UrlString,
          sourceLocation.lineNumber, {columnNumber: sourceLocation.columnNumber, inlineFrameIndex: 0});
      sourceCodeLocation.appendChild(sourceAnchor);
    }
    element.appendChild(sourceCodeLocation);
  }

  protected appendColumnTitle(header: HTMLElement, title: string, additionalClass: string|null = null): void {
    const info = document.createElement('td');
    info.classList.add('affected-resource-header');
    if (additionalClass) {
      info.classList.add(additionalClass);
    }
    info.textContent = title;
    header.appendChild(info);
  }

  protected createIssueDetailCell(textContent: string, additionalClass: string|null = null): HTMLTableDataCellElement {
    const cell = document.createElement('td');
    cell.textContent = textContent;
    if (additionalClass) {
      cell.classList.add(additionalClass);
    }
    return cell;
  }

  protected appendIssueDetailCell(element: HTMLElement, textContent: string, additionalClass: string|null = null):
      HTMLTableDataCellElement {
    const cell = this.createIssueDetailCell(textContent, additionalClass);
    element.appendChild(cell);
    return cell;
  }

  abstract update(): void;
}
