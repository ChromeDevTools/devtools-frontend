// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Network from '../network/network.js';
import type * as Protocol from '../../generated/protocol.js';

import type {IssueView} from './IssueView.js';

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
  *@description Title for a link to a request in the network panel
  */
  clickToShowRequestInTheNetwork: 'Click to show request in the network panel',
  /**
  *@description Title for an unavailable link a request in the network panel
  */
  requestUnavailableInTheNetwork: 'Request unavailable in the network panel, try reloading the inspected page',
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

export const extractShortPath = (path: string): string => {
  // 1st regex matches everything after last '/'
  // if path ends with '/', 2nd regex returns everything between the last two '/'
  return (/[^/]+$/.exec(path) || /[^/]+\/$/.exec(path) || [''])[0];
};

export interface CreateRequestCellOptions {
  linkToPreflight?: boolean;
  highlightHeader?: {section: Network.NetworkSearchScope.UIHeaderSection, name: string};
}


/**
 * The base class for all affected resource views. It provides basic scaffolding
 * as well as machinery for resolving request and frame ids to SDK objects.
 */
export abstract class AffectedResourcesView extends UI.TreeOutline.TreeElement {
  private readonly parentView: IssueView;
  protected affectedResourcesCountElement: HTMLElement;
  protected affectedResources: HTMLElement;
  private affectedResourcesCount: number;
  private networkListener: Common.EventTarget.EventDescriptor|null;
  private frameListeners: Common.EventTarget.EventDescriptor[];
  private unresolvedRequestIds: Set<string>;
  private unresolvedFrameIds: Set<string>;

  /**
   * @param resourceName - Singular and plural of the affected resource name.
   */
  constructor(parent: IssueView) {
    super();
    this.toggleOnClick = true;
    this.parentView = parent;
    this.affectedResourcesCountElement = this.createAffectedResourcesCounter();

    this.affectedResources = this.createAffectedResources();
    this.affectedResourcesCount = 0;
    this.networkListener = null;
    this.frameListeners = [];
    this.unresolvedRequestIds = new Set();
    this.unresolvedFrameIds = new Set();
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
    this.affectedResourcesCount = count;
    this.affectedResourcesCountElement.textContent = this.getResourceNameWithCount(count);
    this.hidden = this.affectedResourcesCount === 0;
    this.parentView.updateAffectedResourceVisibility();
  }

  isEmpty(): boolean {
    return this.affectedResourcesCount === 0;
  }

  clear(): void {
    this.affectedResources.textContent = '';
  }

  expandIfOneResource(): void {
    if (this.affectedResourcesCount === 1) {
      this.expand();
    }
  }

  /**
   * This function resolves a requestId to network requests. If the requestId does not resolve, a listener is installed
   * that takes care of updating the view if the network request is added. This is useful if the issue is added before
   * the network request gets reported.
   */
  protected resolveRequestId(requestId: string): SDK.NetworkRequest.NetworkRequest[] {
    const requests = Logs.NetworkLog.NetworkLog.instance().requestsForId(requestId);
    if (!requests.length) {
      this.unresolvedRequestIds.add(requestId);
      if (!this.networkListener) {
        this.networkListener = Logs.NetworkLog.NetworkLog.instance().addEventListener(
            Logs.NetworkLog.Events.RequestAdded, this.onRequestAdded, this);
      }
    }
    return requests;
  }

  private onRequestAdded(event: Common.EventTarget.EventTargetEvent): void {
    const request = event.data as SDK.NetworkRequest.NetworkRequest;
    const requestWasUnresolved = this.unresolvedRequestIds.delete(request.requestId());
    if (this.unresolvedRequestIds.size === 0 && this.networkListener) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.EventTarget.removeEventListeners([this.networkListener]);
      this.networkListener = null;
    }
    if (requestWasUnresolved) {
      this.update();
    }
  }

  /**
   * This function resolves a frameId to a ResourceTreeFrame. If the frameId does not resolve, or hasn't navigated yet,
   * a listener is installed that takes care of updating the view if the frame is added. This is useful if the issue is
   * added before the frame gets reported.
   */
  private resolveFrameId(frameId: Protocol.Page.FrameId): SDK.ResourceTreeModel.ResourceTreeFrame|null {
    const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
    if (!frame || !frame.url) {
      this.unresolvedFrameIds.add(frameId);
      if (!this.frameListeners.length) {
        const addListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameAddedToTarget, this.onFrameChanged, this);
        const navigateListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FrameNavigated, this.onFrameChanged, this);
        this.frameListeners = [addListener, navigateListener];
      }
    }
    return frame;
  }

  private onFrameChanged(event: Common.EventTarget.EventTargetEvent): void {
    const frame = event.data.frame as SDK.ResourceTreeModel.ResourceTreeFrame;
    if (!frame.url) {
      return;
    }
    const frameWasUnresolved = this.unresolvedFrameIds.delete(frame.id);
    if (this.unresolvedFrameIds.size === 0 && this.frameListeners.length) {
      // Stop listening once all requests are resolved.
      Common.EventTarget.EventTarget.removeEventListeners(this.frameListeners);
      this.frameListeners = [];
    }
    if (frameWasUnresolved) {
      this.update();
    }
  }

  protected createFrameCell(frameId: Protocol.Page.FrameId, issue: IssuesManager.Issue.Issue): HTMLElement {
    const frame = this.resolveFrameId(frameId);
    const url = frame && (frame.unreachableUrl() || frame.url) || i18nString(UIStrings.unknown);

    const frameCell = document.createElement('td');
    frameCell.classList.add('affected-resource-cell');
    if (frame) {
      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'elements_panel_icon', color: 'var(--color-link)', width: '16px', height: '16px'};
      icon.classList.add('link', 'elements-panel');
      icon.onclick = async(): Promise<void> => {
        Host.userMetrics.issuesPanelResourceOpened(issue.getCategory(), AffectedItem.Element);
        const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (frame) {
          const ownerNode = await frame.getOwnerDOMNodeOrDocument();
          if (ownerNode) {
            Common.Revealer.reveal(ownerNode);
          }
        }
      };
      UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.clickToRevealTheFramesDomNodeIn));
      frameCell.appendChild(icon);
    }
    frameCell.appendChild(document.createTextNode(url));
    frameCell.onmouseenter = (): void => {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
      if (frame) {
        frame.highlight();
      }
    };
    frameCell.onmouseleave = (): void => SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
    return frameCell;
  }

  protected createRequestCell(request: Protocol.Audits.AffectedRequest, options: CreateRequestCellOptions = {}):
      HTMLElement {
    let url = request.url;
    let filename = url ? extractShortPath(url) : '';
    const requestCell = document.createElement('td');
    requestCell.classList.add('affected-resource-cell');
    const icon = new IconButton.Icon.Icon();
    icon.data = {iconName: 'network_panel_icon', color: 'var(--color-link)', width: '16px', height: '16px'};
    icon.classList.add('network-panel');
    requestCell.appendChild(icon);

    const requests = this.resolveRequestId(request.requestId);
    if (requests.length) {
      const linkToPreflight = options.linkToPreflight ?? false;
      const request = requests[0];
      requestCell.onclick = (): void => {
        const linkedRequest = linkToPreflight ? request.preflightRequest() : request;
        if (!linkedRequest) {
          return;
        }
        if (options.highlightHeader) {
          const requestLocation = Network.NetworkSearchScope.UIRequestLocation.header(
              linkedRequest, options.highlightHeader.section, options.highlightHeader.name);
          Network.NetworkPanel.RequestLocationRevealer.instance().reveal(requestLocation);
        } else {
          Network.NetworkPanel.NetworkPanel.selectAndShowRequest(linkedRequest, Network.NetworkItemView.Tabs.Headers);
        }
      };
      requestCell.classList.add('link');
      url = request.url();
      filename = extractShortPath(url);
      UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.clickToShowRequestInTheNetwork));
    } else {
      UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.requestUnavailableInTheNetwork));
      icon.data = {...icon.data, color: 'var(--issue-color-yellow)'};
    }
    if (url) {
      UI.Tooltip.Tooltip.install(requestCell, url);
    }
    requestCell.appendChild(document.createTextNode(filename));
    return requestCell;
  }

  protected appendSourceLocation(
      element: HTMLElement,
      sourceLocation: {url: string, scriptId?: string, lineNumber: number, columnNumber?: number}|undefined,
      target: SDK.SDKModel.Target|null|undefined): void {
    const sourceCodeLocation = document.createElement('td');
    sourceCodeLocation.classList.add('affected-source-location');
    if (sourceLocation) {
      const maxLengthForDisplayedURLs = 40;  // Same as console messages.
      // TODO(crbug.com/1108503): Add some mechanism to be able to add telemetry to this element.
      const linkifier = new Components.Linkifier.Linkifier(maxLengthForDisplayedURLs);
      const sourceAnchor = linkifier.linkifyScriptLocation(
          target || null, sourceLocation.scriptId || null, sourceLocation.url, sourceLocation.lineNumber,
          {columnNumber: sourceLocation.columnNumber, inlineFrameIndex: 0, className: undefined, tabStop: undefined});
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
