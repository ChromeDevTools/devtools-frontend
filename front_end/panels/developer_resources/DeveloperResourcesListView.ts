// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';

import developerResourcesListViewStyles from './developerResourcesListView.css.js';

const {ref} = Directives;

const UIStrings = {
  /**
   * @description Text for the status of something
   */
  status: 'Status',
  /**
   * @description Text for web URLs
   */
  url: 'URL',
  /**
   * @description Text for the initiator of something
   */
  initiator: 'Initiator',
  /**
   * @description Text in Coverage List View of the Coverage tab
   */
  totalBytes: 'Total Bytes',
  /**
   * @description Column header. The column contains the time it took to load a resource.
   */
  duration: 'Duration',
  /**
   * @description Text for errors
   */
  error: 'Error',
  /**
   * @description Title for the Developer resources tab
   */
  developerResources: 'Developer resources',
  /**
   * @description Text for a context menu entry
   */
  copyUrl: 'Copy URL',
  /**
   * @description Text for a context menu entry. Command to copy a URL to the clipboard. The initiator
   * of a request is the entity that caused this request to be sent.
   */
  copyInitiatorUrl: 'Copy initiator URL',
  /**
   * @description Text for the status column of a list view
   */
  pending: 'pending',
  /**
   * @description Text for the status column of a list view
   */
  success: 'success',
  /**
   * @description Text for the status column of a list view
   */
  failure: 'failure',
  /**
   * @description Accessible text for the value in bytes in memory allocation.
   */
  sBytes: '{n, plural, =1 {# byte} other {# bytes}}',
  /**
   * @description Number of resource(s) match
   */
  numberOfResourceMatch: '{n, plural, =1 {# resource matches} other {# resources match}}',
  /**
   * @description No resource matches
   */
  noResourceMatches: 'No resource matches',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/developer_resources/DeveloperResourcesListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {withThousandsSeparator} = Platform.NumberUtilities;

export interface ViewInput {
  items: SDK.PageResourceLoader.PageResource[];
  selectedItem: SDK.PageResourceLoader.PageResource|null;
  highlight: (element: Element|undefined, textContent: string|undefined, columnId: string) => void;
  filters: TextUtils.TextUtils.ParsedFilter[];
  onContextMenu: (e: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => void;
  onSelect: (e: CustomEvent<HTMLElement>) => void;
  onInitiatorMouseEnter: (frameId: Protocol.Page.FrameId|null) => void;
  onInitiatorMouseLeave: () => void;
}

export type View = (input: ViewInput, output: object, target: HTMLElement) => void;

const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
      <style>${developerResourcesListViewStyles}</style>
      <devtools-data-grid name=${i18nString(UIStrings.developerResources)} striped class="flex-auto"
         .filters=${input.filters} @contextmenu=${input.onContextMenu} @selected=${input.onSelect}>
        <table>
          <tr>
            <th id="status" sortable fixed width="60px">
              ${i18nString(UIStrings.status)}
            </th>
            <th id="url" sortable width="250px">
              ${i18nString(UIStrings.url)}
            </th>
            <th id="initiator" sortable width="80px">
              ${i18nString(UIStrings.initiator)}
            </th>
            <th id="size" sortable fixed width="80px" align="right">
              ${i18nString(UIStrings.totalBytes)}
            </th>
            <th id="duration" sortable fixed width="80px" align="right">
              ${i18nString(UIStrings.duration)}
            </th>
            <th id="error-message" sortable width="200px">
              ${i18nString(UIStrings.error)}
            </th>
          </tr>
          ${input.items.map((item, index) => {
            const splitURL = /^(.*)(\/[^/]*)$/.exec(item.url);
            return html`
            <tr selected=${(item === input.selectedItem) || nothing}
                data-url=${item.url ?? nothing}
                data-initiator-url=${item.initiator.initiatorUrl ?? nothing}
                data-index=${index}>
              <td>${item.success === true  ? i18nString(UIStrings.success) :
                    item.success === false ? i18nString(UIStrings.failure) :
                                             i18nString(UIStrings.pending)}</td>
              <td title=${item.url} aria-label=${item.url}>
                <div aria-hidden="true" part="url-outer"
                     ${ref(e => input.highlight(e, item.url, 'url'))}>
                  <div part="url-prefix">${splitURL ? splitURL[1] : item.url}</div>
                  <div part="url-suffix">${splitURL ? splitURL[2] : ''}</div>
                </div>
              </td>
              <td title=${item.initiator.initiatorUrl || ''}
                  aria-label=${item.initiator.initiatorUrl || ''}
                  @mouseenter=${() => input.onInitiatorMouseEnter(item.initiator.frameId)}
                  @mouseleave=${input.onInitiatorMouseLeave}
              >${item.initiator.initiatorUrl || ''}</td>
              <td aria-label=${item.size !== null ? i18nString(UIStrings.sBytes, {n: item.size}) : nothing}
                  data-value=${item.size ?? nothing}>${
                item.size !== null ?  html`<span>${withThousandsSeparator(item.size)}</span>` : ''}</td>
              <td aria-label=${item.duration !== null ? i18n.TimeUtilities.millisToString(item.duration) : nothing}
                  data-value=${item.duration ?? nothing}>${
                  item.duration !== null ? html`<span>${i18n.TimeUtilities.millisToString(item.duration)}</span>` : ''}</td>
              <td class="error-message">
                ${item.errorMessage ? html`
                <span ${ref(e => input.highlight(e, item.errorMessage, 'error-message'))}>
                  ${item.errorMessage}
                </span>` : nothing}
              </td>
            </tr>`;
          })}
          </table>
        </devtools-data-grid>`,
        target);
  // clang-format on
};

export class DeveloperResourcesListView extends UI.Widget.VBox {
  #items: SDK.PageResourceLoader.PageResource[] = [];
  #selectedItem: SDK.PageResourceLoader.PageResource|null = null;
  #onSelect: ((item: SDK.PageResourceLoader.PageResource|null) => void)|null = null;
  readonly #view: View;
  #filters: TextUtils.TextUtils.ParsedFilter[] = [];
  constructor(element: HTMLElement, view = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  set selectedItem(item: SDK.PageResourceLoader.PageResource|null) {
    this.#selectedItem = item;
    this.requestUpdate();
  }

  set onSelect(onSelect: (item: SDK.PageResourceLoader.PageResource|null) => void) {
    this.#onSelect = onSelect;
  }

  #populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, element: HTMLElement): void {
    const url = element.dataset.url;
    if (url) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyUrl), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(url);
      }, {jslogContext: 'copy-url'});
    }

    const initiatorUrl = element.dataset.initiatorUrl;
    if (initiatorUrl) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyInitiatorUrl), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(initiatorUrl);
      }, {jslogContext: 'copy-initiator-url'});
    }
  }

  set items(items: Iterable<SDK.PageResourceLoader.PageResource>) {
    this.#items = [...items];
    this.requestUpdate();
  }

  reset(): void {
    this.items = [];
    this.requestUpdate();
  }

  set filters(filters: TextUtils.TextUtils.ParsedFilter[]) {
    this.#filters = filters;
    this.requestUpdate();
    void this.updateComplete.then(() => {
      const numberOfResourceMatch =
          Number(this.contentElement.querySelector('devtools-data-grid')?.getAttribute('aria-rowcount')) ?? 0;
      let resourceMatch = '';
      if (numberOfResourceMatch === 0) {
        resourceMatch = i18nString(UIStrings.noResourceMatches);
      } else {
        resourceMatch = i18nString(UIStrings.numberOfResourceMatch, {n: numberOfResourceMatch});
      }
      UI.ARIAUtils.LiveAnnouncer.alert(resourceMatch);
    });
  }

  override performUpdate(): void {
    const input = {
      items: this.#items,
      selectedItem: this.#selectedItem,
      filters: this.#filters,
      highlight: this.#highlight.bind(this),
      onContextMenu: (e: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => {
        if (e.detail?.element) {
          this.#populateContextMenu(e.detail.menu, e.detail.element);
        }
      },
      onSelect: (e: CustomEvent<HTMLElement|null>) => {
        this.#selectedItem = e.detail ? this.#items[Number(e.detail.dataset.index)] : null;
        this.#onSelect?.(this.#selectedItem);
      },
      onInitiatorMouseEnter: (frameId: Protocol.Page.FrameId|null) => {
        const frame = frameId ? SDK.FrameManager.FrameManager.instance().getFrame(frameId) : null;
        if (frame) {
          void frame.highlight();
        }
      },
      onInitiatorMouseLeave: () => {
        SDK.OverlayModel.OverlayModel.hideDOMNodeHighlight();
      },
    };
    const output = {};
    this.#view(input, output, this.contentElement);
  }

  #highlight(element: Element|undefined, textContent: string|undefined, columnId: string): void {
    if (!element || !textContent) {
      return;
    }
    const highlightContainers =
        new Set<Element>([...element.querySelectorAll('.filter-highlight')].map(e => e.parentElement as Element));
    for (const container of highlightContainers) {
      container.textContent = container.textContent;
    }
    const filter = this.#filters.find(filter => filter.key?.split(',')?.includes(columnId));
    if (!filter?.regex) {
      return;
    }
    const matches = filter.regex.exec(element.textContent ?? '');
    if (!matches?.length) {
      return;
    }
    const range = new TextUtils.TextRange.SourceRange(matches.index, matches[0].length);
    UI.UIUtils.highlightRangesWithStyleClass(element, [range], 'filter-highlight');
    for (const el of element.querySelectorAll('.filter-highlight')) {
      el.setAttribute('part', 'filter-highlight');
    }
  }
}
