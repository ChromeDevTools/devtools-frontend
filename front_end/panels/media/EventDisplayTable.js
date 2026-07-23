// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import eventDisplayTableStyles from './eventDisplayTable.css.js';
const { widget } = UI.Widget;
const { repeat } = Directives;
const UIStrings = {
    /**
     * @description Text for timestamps of items.
     */
    timestamp: 'Timestamp',
    /**
     * @description The column header for event names.
     */
    eventName: 'Event name',
    /**
     * @description Text for the value of something.
     */
    value: 'Value',
    /**
     * @description The accessible name of a table that displays information about events that occurred
     * while a video/media player was present on the page.
     */
    eventDisplay: 'Event display',
};
const str_ = i18n.i18n.registerUIStrings('panels/media/EventDisplayTable.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `
      <style>${eventDisplayTableStyles}</style>
      <devtools-data-grid row-height='auto' autoscroll striped name=${i18nString(UIStrings.eventDisplay)}
        class="event-display-table-contents-table-container no-border-top-datagrid"
        .template=${html `
          <style>${eventDisplayTableStyles}</style>
          <table>
            <thead>
              <tr>
                <th id="display-timestamp" weight="1">${i18nString(UIStrings.timestamp)}</th>
                <th id="event" weight="2">${i18nString(UIStrings.eventName)}</th>
                <th id="value" weight="7">${i18nString(UIStrings.value)}</th>
              </tr>
            </thead>
            <tbody>
              ${repeat(input.parsedEvents, event => event, event => html `
                <tr>
                  <td class="event-display-table-basic-text-table-entry">${event.displayTimestamp}</td>
                  <td class="event-display-table-basic-text-table-entry">${event.event}</td>
                  <td class="event-display-table-contents-json-wrapper">
                    ${widget(el => new SourceFrame.JSONView.JSONView(new SourceFrame.JSONView.ParsedJSON(event.value, '', ''), true, el))}
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        `}>
      </devtools-data-grid>
    `, 
    // clang-format on
    target);
};
export class PlayerEventsView extends UI.Widget.VBox {
    firstEventTime;
    #view;
    #parsedEvents = [];
    constructor(view = DEFAULT_VIEW) {
        super({ jslog: `${VisualLogging.pane('events')}` });
        this.#view = view;
        this.firstEventTime = 0;
        this.requestUpdate();
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    performUpdate() {
        const viewInput = {
            parsedEvents: this.#parsedEvents,
        };
        this.#view(viewInput, undefined, this.contentElement);
    }
    onEvent(event) {
        if (this.firstEventTime === 0 && typeof event.timestamp === 'number') {
            this.firstEventTime = event.timestamp;
        }
        event = this.subtractFirstEventTime(event);
        const stringified = event.value;
        try {
            const json = JSON.parse(stringified);
            event.event = json.event;
            delete json['event'];
            this.#parsedEvents.push({
                displayTimestamp: event.displayTimestamp,
                event: event.event,
                value: json,
            });
            this.requestUpdate();
        }
        catch {
            // If this is a legacy message event, ignore it for now until they
            // are handled.
        }
    }
    subtractFirstEventTime(event) {
        if (typeof event.timestamp === 'number') {
            event.displayTimestamp = (event.timestamp - this.firstEventTime).toFixed(3);
        }
        return event;
    }
}
//# sourceMappingURL=EventDisplayTable.js.map