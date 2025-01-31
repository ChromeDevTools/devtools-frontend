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
import {html, nothing, render} from '../../ui/lit/lit.js';

import developerResourcesListViewStyles from './developerResourcesListView.css.js';

const UIStrings = {
  /**
   *@description Text for the status of something
   */
  status: 'Status',
  /**
   *@description Text for web URLs
   */
  url: 'URL',
  /**
   *@description Text for the initiator of something
   */
  initiator: 'Initiator',
  /**
   *@description Text in Coverage List View of the Coverage tab
   */
  totalBytes: 'Total Bytes',
  /**
   *@description Text for errors
   */
  error: 'Error',
  /**
   *@description Title for the Developer resources tab
   */
  developerResources: 'Developer resources',
  /**
   *@description Text for a context menu entry
   */
  copyUrl: 'Copy URL',
  /**
   * @description Text for a context menu entry. Command to copy a URL to the clipboard. The initiator
   * of a request is the entity that caused this request to be sent.
   */
  copyInitiatorUrl: 'Copy initiator URL',
  /**
   *@description Text for the status column of a list view
   */
  pending: 'pending',
  /**
   *@description Text for the status column of a list view
   */
  success: 'success',
  /**
   *@description Text for the status column of a list view
   */
  failure: 'failure',
  /**
   *@description Accessible text for the value in bytes in memory allocation.
   */
  sBytes: '{n, plural, =1 {# byte} other {# bytes}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/developer_resources/DeveloperResourcesListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const {withThousandsSeparator} = Platform.NumberUtilities;

export interface ViewInput {
  items: SDK.PageResourceLoader.PageResource[];
  highlight: (element: Element, textContent: string, columnId: string) => void;
  filters: TextUtils.TextUtils.ParsedFilter[];
  onContextMenu: (e: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => void;
  onInitiatorMouseEnter: (frameId: Protocol.Page.FrameId|null) => void;
  onInitiatorMouseLeave: () => void;
}

export interface ViewOutput {}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export class DeveloperResourcesListView extends UI.Widget.VBox {
  #items: SDK.PageResourceLoader.PageResource[] = [];
  #selectedItem: SDK.PageResourceLoader.PageResource|null = null;
  readonly #view: View;
  #filters: TextUtils.TextUtils.ParsedFilter[] = [];
  constructor(view: View = (input, output, target) => {
    // clang-format off
        render(html`
            <devtools-data-grid
              name=${i18nString(UIStrings.developerResources)}
              striped
              .filters=${input.filters}
               @contextmenu=${input.onContextMenu}
              class="flex-auto"
            >
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
                  <th id="error-message" sortable width="200px">
                    ${i18nString(UIStrings.error)}
                  </th>
                </tr>
                ${input.items.map(item => html`
                  <tr selected=${(item === this.#selectedItem) || nothing}
                      data-url=${item.url ?? nothing}
                      data-initiator-url=${item.initiator.initiatorUrl ?? nothing}>
                    <td>${item.success === true  ? i18nString(UIStrings.success) :
                          item.success === false ? i18nString(UIStrings.failure) :
                                                   i18nString(UIStrings.pending)}</td>
                    <td title=${item.url} aria-label=${item.url}>${(() => {
                        const url = renderUrl(item.url);
                        input.highlight(url, item.url, 'url');
                        return url;
                      })()}</td>
                    <td title=${item.initiator.initiatorUrl || ''}
                        aria-label=${item.initiator.initiatorUrl || ''}
                        @mouseenter=${() => input.onInitiatorMouseEnter(item.initiator.frameId)}
                        @mouseleave=${input.onInitiatorMouseLeave}
                    >${item.initiator.initiatorUrl || ''}</td>
                    <td aria-label=${item.size !== null ? i18nString(UIStrings.sBytes, {n: item.size}) : nothing}
                        data-value=${item.size ?? nothing}>${
                      item.size !== null ?  html`<span>${withThousandsSeparator(item.size)}</span>` : ''}</td>
                    <td class="error-message">${(() => {
                        const cell = document.createElement('span');
                        if (item.errorMessage) {
                          cell.textContent = item.errorMessage;
                          input.highlight(cell, item.errorMessage, 'error-message');
                        }
                        return cell;
                      })()}</td>
                  </tr>`)}
              </table>
            </devtools-data-grid>`,
            target, {host: input});  // eslint-disable-line rulesdir/lit-host-this
    // clang-format on
    function renderUrl(url: string): HTMLElement {
      const outer = document.createElement('div');
      UI.ARIAUtils.setHidden(outer, true);
      outer.setAttribute('part', 'url-outer');
      const domain = outer.createChild('div');
      domain.setAttribute('part', 'url-prefix');
      const path = outer.createChild('div');
      path.setAttribute('part', 'url-suffix');
      const splitURL = /^(.*)(\/[^/]*)$/.exec(url);
      domain.textContent = splitURL ? splitURL[1] : url;
      path.textContent = splitURL ? splitURL[2] : '';
      return outer;
    }
  }) {
    super(true);
    this.#view = view;
    this.registerRequiredCSS(developerResourcesListViewStyles);
  }

  select(item: SDK.PageResourceLoader.PageResource): void {
    this.#selectedItem = item;
    this.requestUpdate();
  }

  selectedItem(): SDK.PageResourceLoader.PageResource|null {
    return this.#selectedItem;
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

  updateFilterAndHighlight(filters: TextUtils.TextUtils.ParsedFilter[]): void {
    this.#filters = filters;
    this.requestUpdate();
  }

  getNumberOfVisibleItems(): number {
    return parseInt(this.contentElement.querySelector('devtools-data-grid')?.getAttribute('aria-rowcount') || '', 10) ??
        0;
  }

  override performUpdate(): void {
    const input = {
      items: this.#items,
      filters: this.#filters,
      highlight: this.#highlight.bind(this),
      onContextMenu: (e: CustomEvent<{menu: UI.ContextMenu.ContextMenu, element: HTMLElement}>) => {
        if (e.detail?.element) {
          this.#populateContextMenu(e.detail.menu, e.detail.element);
        }
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

  #highlight(element: Element, textContent: string, columnId: string): void {
    const filter = this.#filters.find(filter => filter.key?.split(',')?.includes(columnId));
    if (!filter?.regex || element.querySelector('.filter-highlight')) {
      return;
    }
    const matches = filter.regex.exec(textContent);
    if (!matches || !matches.length) {
      return;
    }
    const range = new TextUtils.TextRange.SourceRange(matches.index, matches[0].length);
    UI.UIUtils.highlightRangesWithStyleClass(element, [range], 'filter-highlight');
    for (const el of element.querySelectorAll('.filter-highlight')) {
      el.setAttribute('part', 'filter-highlight');
    }
  }
}
