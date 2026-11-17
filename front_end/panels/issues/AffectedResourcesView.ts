// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as IssuesManager from '../../models/issues_manager/issues_manager.js';
import * as Logs from '../../models/logs/logs.js';
import type * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as RequestLinkIcon from '../../ui/components/request_link_icon/request_link_icon.js';
import {Icon} from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, nothing, render} from '../../ui/lit/lit.js';
import * as PanelsCommon from '../common/common.js';

import type {IssueView} from './IssueView.js';

const {classMap, ref} = Directives;

const UIStrings = {
  /**
   * @description Fallback text in the Issues panel when a frame URL is unknown in the affected resources table.
   */
  unknown: 'Unknown',
  /**
   * @description Tooltip in the Issues panel for the button to reveal a frame's DOM node in the Elements panel.
   */
  clickToRevealTheFramesDomNodeIn: 'Click to reveal the frame’s DOM node in the Elements panel',
  /**
   * @description Fallback text in the Issues panel when an HTML element is unavailable in the affected resources table.
   */
  unavailable: 'Unavailable',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/issues/AffectedResourcesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export const enum AffectedItem {
  COOKIE = 'Cookie',
  DIRECTIVE = 'Directive',
  ELEMENT = 'Element',
  REQUEST = 'Request',
  SOURCE = 'Source',
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

export interface FrameCellData {
  url: string;
  hasFrame: boolean;
  onReveal: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function renderFrameCell(frame: FrameCellData|undefined): LitTemplate {
  if (!frame) {
    return html`<td></td>`;
  }
  // clang-format off
  return html`
    <td class="affected-resource-cell"
        @mouseenter=${frame.onMouseEnter}
        @mouseleave=${frame.onMouseLeave}>
      ${frame.hasFrame ? html`
        <devtools-button
          class="elements-panel"
          .data=${{
            variant: Buttons.Button.Variant.ICON,
            iconName: 'code-circle',
            // On devtools-button (ui/components/buttons/button.css), Size.MICRO sets both
            // --button-width/--button-height and --icon-size to --sys-size-8 (16x16),
            // matching the previous 16x16 medium icon size.
            size: Buttons.Button.Size.MICRO,
            title: i18nString(UIStrings.clickToRevealTheFramesDomNodeIn),
            accessibleLabel: i18nString(UIStrings.clickToRevealTheFramesDomNodeIn),
            jslogContext: 'elements-panel',
          } as Buttons.Button.ButtonData}
          @click=${frame.onReveal}>
        </devtools-button>
      ` : nothing}
      ${frame.url}
    </td>
  `;
  // clang-format on
}

export interface ViewInput {
  resourceNameWithCount: string;
  labelClass?: string;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const labelClasses: Record<string, boolean> = {'affected-resource-label': true};
  if (input.labelClass) {
    labelClasses[input.labelClass] = true;
  }
  render(html`<div class=${classMap(labelClasses)}>${input.resourceNameWithCount}</div>`, target);
};

export interface TableViewInput {
  onTableRef: (table: HTMLTableElement) => void;
}

export type TableView = (input: TableViewInput, output: undefined, target: HTMLElement) => void;

export const TABLE_VIEW: TableView = (input, _output, target) => {
  render(html`<table class="affected-resource-list" ${ref(e => {
           if (e instanceof HTMLTableElement) {
             input.onTableRef(e);
           }
         })}></table>`,
         target);
};

/**
 * The base class for all affected resource views. It provides basic scaffolding
 * as well as machinery for resolving request and frame ids to SDK objects.
 */
export abstract class AffectedResourcesView extends UI.TreeOutline.TreeElement {
  readonly #parentView: IssueView;
  readonly #view: View;
  protected issue: IssuesManager.IssueAggregator.AggregatedIssue;
  protected affectedResources: HTMLElement;
  #affectedResourcesCount = 0;
  #resourceNameWithCount = '';
  #frameListeners: Common.EventTarget.EventDescriptor[] = [];
  #unresolvedFrameIds = new Set<string>();
  protected requestResolver: Logs.RequestResolver.RequestResolver;

  constructor(parent: IssueView, issue: IssuesManager.IssueAggregator.AggregatedIssue, jslogContext: string,
              view: View = DEFAULT_VIEW, tableView: TableView = TABLE_VIEW) {
    super(/* title */ undefined, /* expandable */ undefined, jslogContext);
    this.#parentView = parent;
    this.#view = view;
    this.issue = issue;
    this.toggleOnClick = true;
    this.#render();

    const body = new UI.TreeOutline.TreeElement();
    let table: HTMLTableElement|undefined;
    tableView({
      onTableRef: el => {
        table = el;
      },
    },
              undefined, body.listItemElement);
    if (!table) {
      throw new Error('The affected resources table view did not render a table');
    }
    this.appendChild(body);
    this.affectedResources = table;
    this.requestResolver = new Logs.RequestResolver.RequestResolver(Logs.NetworkLog.NetworkLog.instance());
  }

  setIssue(issue: IssuesManager.IssueAggregator.AggregatedIssue): void {
    this.issue = issue;
  }

  #render(): void {
    const input: ViewInput = {
      resourceNameWithCount: this.#resourceNameWithCount,
      labelClass: this.getAffectedResourcesLabelClass(),
    };
    this.#view(input, undefined, this.listItemElement);
  }

  protected getAffectedResourcesLabelClass(): string|undefined {
    return undefined;
  }

  protected abstract getResourceNameWithCount(count: number): string;

  protected updateAffectedResourceCount(count: number): void {
    this.#affectedResourcesCount = count;
    this.#resourceNameWithCount = this.getResourceNameWithCount(count);
    this.#render();
    this.hidden = this.#affectedResourcesCount === 0;
    this.#parentView.updateAffectedResourceVisibility();
  }

  isEmpty(): boolean {
    return this.#affectedResourcesCount === 0;
  }

  clear(): void {
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
    if (!frame?.url) {
      this.#unresolvedFrameIds.add(frameId);
      if (!this.#frameListeners.length) {
        const addListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FRAME_ADDED_TO_TARGET, this.#onFrameChanged, this);
        const navigateListener = SDK.FrameManager.FrameManager.instance().addEventListener(
            SDK.FrameManager.Events.FRAME_NAVIGATED, this.#onFrameChanged, this);
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

  protected createFrameCellData(frameId: Protocol.Page.FrameId,
                                issueCategory: IssuesManager.Issue.IssueCategory): FrameCellData {
    const frame = this.#resolveFrameId(frameId);
    const url = frame && (frame.unreachableUrl() || frame.url) || i18nString(UIStrings.unknown);
    return {
      url,
      hasFrame: Boolean(frame),
      onReveal: async () => {
        Host.userMetrics.issuesPanelResourceOpened(issueCategory, AffectedItem.ELEMENT);
        const currentFrame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (currentFrame) {
          const ownerNode = await currentFrame.getOwnerDOMNodeOrDocument();
          if (ownerNode) {
            void Common.Revealer.reveal(ownerNode);
          }
        }
      },
      onMouseEnter: () => {
        const currentFrame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
        if (currentFrame) {
          void currentFrame.highlight();
        }
      },
      onMouseLeave: () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
      },
    };
  }

  protected createFrameCell(frameId: Protocol.Page.FrameId,
                            issueCategory: IssuesManager.Issue.IssueCategory): HTMLElement {
    const frame = this.#resolveFrameId(frameId);
    const url = frame && (frame.unreachableUrl() || frame.url) || i18nString(UIStrings.unknown);

    const frameCell = document.createElement('td');
    frameCell.classList.add('affected-resource-cell');
    if (frame) {
      const icon = new Icon();
      icon.name = 'code-circle';
      icon.classList.add('link', 'elements-panel', 'medium');
      icon.onclick = async () => {
        Host.userMetrics.issuesPanelResourceOpened(issueCategory, AffectedItem.ELEMENT);
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
    frameCell.onmouseenter = () => {
      const frame = SDK.FrameManager.FrameManager.instance().getFrame(frameId);
      if (frame) {
        void frame.highlight();
      }
    };
    frameCell.onmouseleave = () =>
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight(SDK.TargetManager.TargetManager.instance());
    return frameCell;
  }

  protected createRequestCell(affectedRequest: Protocol.Audits.AffectedRequest,
                              options: CreateRequestCellOptions = {}): HTMLElement {
    const requestCell = document.createElement('td');
    requestCell.classList.add('affected-resource-cell');
    const requestLinkIcon = new RequestLinkIcon.RequestLinkIcon.RequestLinkIcon();
    requestLinkIcon.data = {...options, affectedRequest, requestResolver: this.requestResolver, displayURL: true};
    requestCell.appendChild(requestLinkIcon);
    return requestCell;
  }

  protected async createElementCell({backendNodeId, nodeName, target}: IssuesManager.Issue.AffectedElement,
                                    issueCategory: IssuesManager.Issue.IssueCategory): Promise<Element> {
    if (!target) {
      const cellElement = document.createElement('td');
      cellElement.textContent = nodeName || i18nString(UIStrings.unavailable);
      return cellElement;
    }

    function sendTelemetry(): void {
      Host.userMetrics.issuesPanelResourceOpened(issueCategory, AffectedItem.ELEMENT);
    }

    const deferredDOMNode = new SDK.DOMModel.DeferredDOMNode(target, backendNodeId);
    const anchor = PanelsCommon.DOMLinkifier.Linkifier.instance().linkify(
        deferredDOMNode, {textContent: nodeName || undefined, onClick: sendTelemetry});
    const cellElement = document.createElement('td');
    cellElement.classList.add('affected-resource-element', 'devtools-link');
    render(anchor, cellElement);
    return cellElement;
  }

  abstract update(): void;
}
