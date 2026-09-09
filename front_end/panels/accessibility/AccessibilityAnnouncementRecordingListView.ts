// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';

import accessibilityAnnouncementRecordingListViewStyles from './accessibilityAnnouncementRecordingListView.css.js';
import {
  type A11yAnnouncement,
  AnnouncementApi,
} from './AccessibilityAnnouncementRecordingView.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Column header for the announcement timestamp.
   */
  time: 'Time',
  /**
   * @description Column header for the API type (DOM aria-live vs JS ariaNotify).
   */
  api: 'API',
  /**
   * @description Column header for the politeness level (e.g. polite, assertive).
   */
  politeness: 'Politeness',
  /**
   * @description Column header for the announcement message text.
   */
  message: 'Message',
  /**
   * @description Value for DOM aria-live announcements in the API column.
   */
  ariaLive: 'ARIA live',
  /**
   * @description Value for JS ariaNotify announcements in the API column.
   */
  jsTriggered: 'JS-triggered',
  /**
   * @description Accessible title for the announcements data grid.
   */
  ariaLiveRecordingList: 'Accessibility Announcements',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityAnnouncementRecordingListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  items: readonly A11yAnnouncement[];
  selectedItem: A11yAnnouncement|null;
  onSelect: (item: A11yAnnouncement) => void;
  onDeselect: () => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(html`
    <style>${accessibilityAnnouncementRecordingListViewStyles}</style>
    <devtools-data-grid
      name=${i18nString(UIStrings.ariaLiveRecordingList)}
      striped
      class="flex-auto"
      @deselect=${input.onDeselect}>
      <table>
        <tr>
          <th id="time" sortable fixed width="110px" align="right">
            ${i18nString(UIStrings.time)}
          </th>
          <th id="api" sortable fixed width="110px">
            ${i18nString(UIStrings.api)}
          </th>
          <th id="politeness" sortable fixed width="90px">
            ${i18nString(UIStrings.politeness)}
          </th>
          <th id="message" sortable width="300px">
            ${i18nString(UIStrings.message)}
          </th>
        </tr>
        ${input.items.map(item => {
          const timeString = new Date(item.time).toLocaleTimeString(i18n.DevToolsLocale.DevToolsLocale.instance().locale);
          const apiDisplay = item.api === AnnouncementApi.JS_TRIGGERED ?
              i18nString(UIStrings.jsTriggered) :
              i18nString(UIStrings.ariaLive);

          return html`
            <tr
              ?selected=${item === input.selectedItem}
              @select=${() => input.onSelect(item)}>
              <td data-value=${item.time}>
                <span>${timeString}</span>
              </td>
              <td>${apiDisplay}</td>
              <td>${item.politeness}</td>
              <td title=${item.message}>
                ${item.message}
              </td>
            </tr>`;
        })}
      </table>
    </devtools-data-grid>`,
    target);
  // clang-format on
};

export class AccessibilityAnnouncementRecordingListView extends UI.Widget.VBox {
  #items: readonly A11yAnnouncement[] = [];
  #selectedItem: A11yAnnouncement|null = null;
  #onSelect: ((item: A11yAnnouncement|null) => void)|null = null;
  readonly #view: View;

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  set items(items: readonly A11yAnnouncement[]) {
    if (this.#items === items) {
      return;
    }
    this.#items = items;
    this.requestUpdate();
  }

  get items(): readonly A11yAnnouncement[] {
    return this.#items;
  }

  set selectedItem(item: A11yAnnouncement|null) {
    if (this.#selectedItem === item) {
      return;
    }
    this.#selectedItem = item;
    this.requestUpdate();
  }

  get selectedItem(): A11yAnnouncement|null {
    return this.#selectedItem;
  }

  set onSelect(onSelect: (item: A11yAnnouncement|null) => void) {
    this.#onSelect = onSelect;
  }

  reset(): void {
    this.#items = [];
    this.#selectedItem = null;
    this.requestUpdate();
  }

  override performUpdate(): void {
    const input: ViewInput = {
      items: this.#items,
      selectedItem: this.#selectedItem,
      onSelect: (item: A11yAnnouncement) => {
        this.selectedItem = item;
        this.#onSelect?.(item);
      },
      onDeselect: () => {
        this.selectedItem = null;
        this.#onSelect?.(null);
      },
    };
    this.#view(input, undefined, this.contentElement);
  }
}
