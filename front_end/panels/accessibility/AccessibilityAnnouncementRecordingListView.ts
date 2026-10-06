// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/components/data_grid/data_grid.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
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
  /**
   * @description Context menu item for copying the announcement message text to the clipboard.
   */
  copyMessage: 'Copy message',
  /**
   * @description Context menu item for copying the announcement element HTML snippet to the clipboard.
   */
  copyElementHtml: 'Copy element HTML',
  /**
   * @description Context menu item to reveal the announcement source element in the Elements panel DOM tree.
   */
  revealInElements: 'Reveal in Elements panel',
  /**
   * @description Context menu item to reveal the announcement source element in the full Accessibility tree.
   */
  revealInA11yTree: 'Reveal in Accessibility tree',
} as const;
const str_ =
    i18n.i18n.registerUIStrings('panels/accessibility/AccessibilityAnnouncementRecordingListView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  items: readonly A11yAnnouncement[];
  selectedItem: A11yAnnouncement|null;
  onContextMenu: (menu: UI.ContextMenu.ContextMenu, item: A11yAnnouncement) => void;
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
              @select=${() => input.onSelect(item)}
              @contextmenu=${(e: CustomEvent<UI.ContextMenu.ContextMenu>) => {
                if (e.detail instanceof UI.ContextMenu.ContextMenu) {
                  input.onContextMenu(e.detail, item);
                }
              }}>
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

const AccessibilityAnnouncementRecordingListViewBase:
    Common.ObjectWrapper.EventMixin<AccessibilityAnnouncementRecordingListView.EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(UI.Widget.VBox);

export class AccessibilityAnnouncementRecordingListView extends AccessibilityAnnouncementRecordingListViewBase {
  #items: readonly A11yAnnouncement[] = [];
  #selectedItem: A11yAnnouncement|null = null;
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

  reset(): void {
    this.#items = [];
    this.#selectedItem = null;
    this.requestUpdate();
  }

  #populateContextMenu(contextMenu: UI.ContextMenu.ContextMenu, item: A11yAnnouncement): void {
    if (item.element) {
      const revealSection = contextMenu.revealSection();
      revealSection.appendItem(i18nString(UIStrings.revealInElements), () => {
        this.dispatchEventToListeners(AccessibilityAnnouncementRecordingListView.Events.REVEAL_IN_ELEMENTS, item);
      }, {jslogContext: 'reveal-in-elements'});
      revealSection.appendItem(i18nString(UIStrings.revealInA11yTree), () => {
        this.dispatchEventToListeners(AccessibilityAnnouncementRecordingListView.Events.REVEAL_IN_A11Y_TREE, item);
      }, {jslogContext: 'reveal-in-a11y-tree'});
    }

    if (item.message) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyMessage), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(item.message);
      }, {jslogContext: 'copy-message'});
    }

    if (item.element) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyElementHtml), () => {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(item.element);
      }, {jslogContext: 'copy-element-html'});
    }
  }

  override performUpdate(): void {
    const input: ViewInput = {
      items: this.#items,
      selectedItem: this.#selectedItem,
      onContextMenu: (contextMenu: UI.ContextMenu.ContextMenu, item: A11yAnnouncement) => {
        this.#populateContextMenu(contextMenu, item);
      },
      onSelect: (item: A11yAnnouncement) => {
        this.selectedItem = item;
        this.dispatchEventToListeners(AccessibilityAnnouncementRecordingListView.Events.ANNOUNCEMENT_SELECTED, item);
      },
      onDeselect: () => {
        this.selectedItem = null;
        this.dispatchEventToListeners(AccessibilityAnnouncementRecordingListView.Events.ANNOUNCEMENT_SELECTED, null);
      },
    };
    this.#view(input, undefined, this.contentElement);
  }
}

export namespace AccessibilityAnnouncementRecordingListView {
  export const enum Events {
    ANNOUNCEMENT_SELECTED = 'announcement-selected',
    REVEAL_IN_ELEMENTS = 'reveal-in-elements',
    REVEAL_IN_A11Y_TREE = 'reveal-in-a11y-tree',
  }

  export interface EventTypes {
    [Events.ANNOUNCEMENT_SELECTED]: A11yAnnouncement|null;
    [Events.REVEAL_IN_ELEMENTS]: A11yAnnouncement;
    [Events.REVEAL_IN_A11Y_TREE]: A11yAnnouncement;
  }
}
