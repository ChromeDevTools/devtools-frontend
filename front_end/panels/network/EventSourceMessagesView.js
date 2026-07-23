// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import eventSourceMessagesViewStyles from './eventSourceMessagesView.css.js';
const { repeat } = Directives;
const UIStrings = {
    /**
     * @description Text in Event Source Messages View of the Network panel
     */
    id: 'Id',
    /**
     * @description Text that refers to some types
     */
    type: 'Type',
    /**
     * @description Text in Event Source Messages View of the Network panel
     */
    data: 'Data',
    /**
     * @description Text that refers to the time
     */
    time: 'Time',
    /**
     * @description Data grid name for Event Source data grids
     */
    eventSource: 'Event Source',
    /**
     * @description A context menu item in the Resource Web Socket Frame View of the Network panel
     */
    copyMessage: 'Copy message',
    /**
     * @description Text to clear everything
     */
    clearAll: 'Clear all',
    /**
     * @description Example for placeholder text
     */
    filterByRegex: 'Filter using regex (example: https?)',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/EventSourceMessagesView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
    <style>
      ${eventSourceMessagesViewStyles}
    </style>
    <div class="event-source-messages-view">
      <devtools-toolbar>
        <devtools-button title=${i18nString(UIStrings.clearAll)} .iconName=${'clear'}
            @click=${input.onClear}
            .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
            .jslogContext=${'clear'}></devtools-button>
        <devtools-toolbar-input
            type="filter"
            placeholder=${i18nString(UIStrings.filterByRegex)}
            @change=${input.onFilterChanged}
            .value=${input.filterSetting.get()}
            style="flex-grow: 0.4"></devtools-toolbar-input>
      </devtools-toolbar>
      <devtools-data-grid name=${i18nString(UIStrings.eventSource)} autoscroll striped
        .template=${html `
          <table>
            <thead>
              <tr>
                <th id="id" weight="8" sortable>${i18nString(UIStrings.id)}</th>
                <th id="type" weight="8" sortable>${i18nString(UIStrings.type)}</th>
                <th id="data" weight="88">${i18nString(UIStrings.data)}</th>
                <th id="time" weight="8" sortable sort="ascending">${i18nString(UIStrings.time)}</th>
              </tr>
            </thead>
            <tbody>
              ${repeat(input.messages, message => message, message => {
        const date = new Date(message.time * 1000);
        return html `<tr @contextmenu=${(e) => {
            e.preventDefault();
            input.onRowContextMenu(message, e);
        }}>
                                <td>${message.eventId}</td>
                                <td>${message.eventName}</td>
                                <td>${message.data}</td>
                                <td title=${date.toLocaleString()} data-value=${message.time}>${formatTime(date)}</td></tr>`;
    })}
            </tbody>
          </table>
        `}>
      </devtools-data-grid>
    </div>
  `, target);
    // clang-format on
};
export class EventSourceMessagesView extends UI.Widget.VBox {
    request;
    messageFilterSetting;
    filterRegex = null;
    #view;
    constructor(request, view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('event-stream').track({ resize: true })}` });
        this.#view = view;
        this.request = request;
        this.messageFilterSetting =
            Common.Settings.Settings.instance().createSetting('network-event-source-message-filter', '');
        const filter = this.messageFilterSetting.get();
        this.setFilter(filter);
    }
    wasShown() {
        super.wasShown();
        this.request.addEventListener(SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        this.request.removeEventListener(SDK.NetworkRequest.Events.EVENT_SOURCE_MESSAGE_ADDED, this.messageAdded, this);
    }
    messageAdded(event) {
        const message = event.data;
        if (!this.messageFilter(message)) {
            return;
        }
        this.requestUpdate();
    }
    messageFilter(message) {
        return !this.filterRegex || this.filterRegex.test(message.eventName) || this.filterRegex.test(message.eventId) ||
            this.filterRegex.test(message.data);
    }
    clearMessages() {
        clearMessageOffsets.set(this.request, this.request.eventSourceMessages().length);
        this.requestUpdate();
    }
    onFilterChanged(event) {
        const inputElement = event.target;
        const text = inputElement.value;
        this.messageFilterSetting.set(text);
        this.setFilter(text);
        this.requestUpdate();
    }
    setFilter(text) {
        this.filterRegex = null;
        if (text) {
            try {
                this.filterRegex = new RegExp(text, 'i');
            }
            catch {
                // this regex will never match any input
                this.filterRegex = new RegExp('(?!)', 'i');
            }
        }
    }
    onRowContextMenu(message, event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyMessage), Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText.bind(Host.InspectorFrontendHost.InspectorFrontendHostInstance, message.data), { jslogContext: 'copy' });
        void contextMenu.show();
    }
    performUpdate() {
        let messages = this.request.eventSourceMessages();
        const offset = clearMessageOffsets.get(this.request) || 0;
        messages = messages.slice(offset);
        messages = messages.filter(this.messageFilter.bind(this));
        const input = {
            messages,
            filterSetting: this.messageFilterSetting,
            onClear: this.clearMessages.bind(this),
            onFilterChanged: this.onFilterChanged.bind(this),
            onRowContextMenu: this.onRowContextMenu.bind(this),
        };
        this.#view(input, {}, this.contentElement);
    }
}
function formatTime(d) {
    return ('0' + d.getHours()).substr(-2) + ':' + ('0' + d.getMinutes()).substr(-2) + ':' +
        ('0' + d.getSeconds()).substr(-2) + '.' + ('00' + d.getMilliseconds()).substr(-3);
}
const clearMessageOffsets = new WeakMap();
//# sourceMappingURL=EventSourceMessagesView.js.map