// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../host/host.js';
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';  // eslint-disable-line no-unused-vars
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as SDK from '../sdk/sdk.js';
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as Components from '../ui/components/components.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text for one or a group of functions
  */
  method: 'Method',
  /**
  *@description Text in Protocol Monitor of the Protocol Monitor tab
  */
  direction: 'Direction',
  /**
  *@description Text in Protocol Monitor of the Protocol Monitor tab
  */
  request: 'Request',
  /**
  *@description Text for a network response
  */
  response: 'Response',
  /**
  *@description Text for timestamps of items
  */
  timestamp: 'Timestamp',
  /**
  *@description Text in Protocol Monitor of the Protocol Monitor tab
  */
  target: 'Target',
  /**
  *@description Text to record a series of actions for analysis
  */
  record: 'Record',
  /**
  *@description Text to clear everything
  */
  clearAll: 'Clear all',
  /**
  *@description Text to filter result items
  */
  filter: 'Filter',
  /**
  *@description Text for the documentation of something
  */
  documentation: 'Documentation',
  /**
  *@description Cell text content in Protocol Monitor of the Protocol Monitor tab
  *@example {30} PH1
  */
  sMs: '{PH1} ms',
  /**
  *@description Text in Protocol Monitor of the Protocol Monitor tab
  */
  noMessageSelected: 'No message selected',
};
const str_ = i18n.i18n.registerUIStrings('protocol_monitor/ProtocolMonitor.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

/**
 *
 * @param {Components.DataGridUtils.CellValue} value
 */
const timestampRenderer = value => {
  return i18nString(UIStrings.sMs, {PH1: value});
};


export class ProtocolMonitorImpl extends UI.Widget.VBox {
  constructor() {
    super(true);
    this._started = false;
    this._startTime = 0;
    /**
     * @type {!Map<number, !Components.DataGridUtils.Row>}
     */
    this._dataGridRowForId = new Map();
    this.registerRequiredCSS('protocol_monitor/protocolMonitor.css', {enableLegacyPatching: true});
    const topToolbar = new UI.Toolbar.Toolbar('protocol-monitor-toolbar', this.contentElement);
    const recordButton = new UI.Toolbar.ToolbarToggle(
        i18nString(UIStrings.record), 'largeicon-start-recording', 'largeicon-stop-recording');
    recordButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      recordButton.setToggled(!recordButton.toggled());
      this._setRecording(recordButton.toggled());
    });
    recordButton.setToggleWithRedColor(true);
    topToolbar.appendToolbarItem(recordButton);
    recordButton.setToggled(true);

    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'largeicon-clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      this._dataGridIntegrator.update({...this._dataGridIntegrator.data(), rows: []});
    });
    topToolbar.appendToolbarItem(clearButton);

    const split = new UI.SplitWidget.SplitWidget(true, true, 'protocol-monitor-panel-split', 250);
    split.show(this.contentElement);
    this._infoWidget = new InfoWidget();

    /**
     * @type {Components.DataGridController.DataGridControllerData}
     */
    const dataGridInitialData = {
      columns: [
        {
          id: 'method',
          title: i18nString(UIStrings.method),
          sortable: false,
          widthWeighting: 1,
          visible: true,
          hideable: false
        },
        {
          id: 'direction',
          title: i18nString(UIStrings.direction),
          sortable: true,
          widthWeighting: 1,
          visible: false,
          hideable: true
        },
        {
          id: 'request',
          title: i18nString(UIStrings.request),
          sortable: false,
          widthWeighting: 1,
          visible: true,
          hideable: true
        },
        {
          id: 'response',
          title: i18nString(UIStrings.response),
          sortable: false,
          widthWeighting: 1,
          visible: true,
          hideable: true
        },
        {
          id: 'timestamp',
          title: i18nString(UIStrings.timestamp),
          sortable: true,
          widthWeighting: 1,
          visible: false,
          hideable: true
        },
        {
          id: 'target',
          title: i18nString(UIStrings.target),
          sortable: true,
          widthWeighting: 1,
          visible: false,
          hideable: true
        },
      ],
      rows: [],
      contextMenus: {
        bodyRow: (menu, columns, row) => {
          const methodColumn = Components.DataGridUtils.getRowEntryForColumnId(row, 'method');
          const directionColumn = Components.DataGridUtils.getRowEntryForColumnId(row, 'direction');

          /**
           * You can click the "Filter" item in the context menu to filter the
           * protocol monitor entries to those that match the method of the
           * current row.
           */
          menu.defaultSection().appendItem(i18nString(UIStrings.filter), () => {
            const methodColumn = Components.DataGridUtils.getRowEntryForColumnId(row, 'method');
            this._textFilterUI.setValue(`method:${methodColumn.value}`, true);
          });

          /**
           * You can click the "Documentation" item in the context menu to be
           * taken to the CDP Documentation site entry for the given method.
           */
          menu.defaultSection().appendItem(i18nString(UIStrings.documentation), () => {
            if (!methodColumn.value) {
              return;
            }
            const [domain, method] = String(methodColumn.value).split('.');
            const type = directionColumn.value === 'sent' ? 'method' : 'event';
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
                `https://chromedevtools.github.io/devtools-protocol/tot/${domain}#${type}-${method}`);
          });
        }
      }
    };

    this._dataGridIntegrator =
        new Components.DataGridControllerIntegrator.DataGridControllerIntegrator(dataGridInitialData);

    this._dataGridIntegrator.dataGrid.addEventListener(
        'cell-focused', /**
     @param {!Event} event
     */
        event => {
          const focusedEvent = /** @type {Components.DataGrid.BodyCellFocusedEvent} */ (event);
          const focusedRow = focusedEvent.data.row;
          const infoWidgetData = {
            request: Components.DataGridUtils.getRowEntryForColumnId(focusedRow, 'request'),
            response: Components.DataGridUtils.getRowEntryForColumnId(focusedRow, 'response'),
            direction: Components.DataGridUtils.getRowEntryForColumnId(focusedRow, 'direction'),
          };
          this._infoWidget.render(infoWidgetData);
        });

    this._dataGridIntegrator.addEventListener(
        'new-user-filter-text', /**
     @param {*} event
      */
        event => {
          const filterTextEvent = /** @type {Components.DataGrid.NewUserFilterTextEvent} */ (event);
          this._textFilterUI.setValue(filterTextEvent.data.filterText, /* notify listeners */ true);
        });
    split.setMainWidget(this._dataGridIntegrator);
    split.setSidebarWidget(this._infoWidget);
    const keys = ['method', 'request', 'response', 'direction'];
    this._filterParser = new TextUtils.TextUtils.FilterParser(keys);
    this._suggestionBuilder = new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(keys);

    this._textFilterUI = new UI.Toolbar.ToolbarInput(
        i18nString(UIStrings.filter), '', 1, .2, '', this._suggestionBuilder.completions.bind(this._suggestionBuilder),
        true);
    this._textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, event => {
      const query = /** @type {string} */ (event.data);
      const filters = this._filterParser.parse(query);
      this._dataGridIntegrator.update({...this._dataGridIntegrator.data(), filters});
    });
    topToolbar.appendToolbarItem(this._textFilterUI);
  }


  /**
   * @override
   */
  wasShown() {
    if (this._started) {
      return;
    }
    this._started = true;
    this._startTime = Date.now();
    this._setRecording(true);
  }

  /**
   * @param {boolean} recording
   */
  _setRecording(recording) {
    const test = ProtocolClient.InspectorBackend.test;
    if (recording) {
      // TODO: TS thinks that properties are read-only because
      // in TS test is defined as a namespace.
      // @ts-ignore
      test.onMessageSent = this._messageSent.bind(this);
      // @ts-ignore
      test.onMessageReceived = this._messageReceived.bind(this);
    } else {
      // @ts-ignore
      test.onMessageSent = null;
      // @ts-ignore
      test.onMessageReceived = null;
    }
  }

  /**
   * @param {?SDK.SDKModel.Target} target
   * @return {string}
   */
  _targetToString(target) {
    if (!target) {
      return '';
    }
    return target.decorateLabel(
        `${target.name()} ${target === SDK.SDKModel.TargetManager.instance().mainTarget() ? '' : target.id()}`);
  }

  /**
   * @param {*} message
   * @param {?ProtocolClient.InspectorBackend.TargetBase} target
   */
  _messageReceived(message, target) {
    if ('id' in message) {
      const existingRow = this._dataGridRowForId.get(message.id);
      if (!existingRow) {
        return;
      }
      const allExistingRows = this._dataGridIntegrator.data().rows;
      const matchingExistingRowIndex = allExistingRows.findIndex(r => existingRow === r);
      const newRowWithUpdate = {
        ...existingRow,
        cells: existingRow.cells.map(cell => {
          if (cell.columnId === 'response') {
            return {
              ...cell,
              value: JSON.stringify(message.result || message.error),

            };
          }
          return cell;
        })
      };

      const newRowsArray = [...this._dataGridIntegrator.data().rows];
      newRowsArray[matchingExistingRowIndex] = newRowWithUpdate;

      // Now we've updated the message, it won't be updated again, so we can delete it from the tracking map.
      this._dataGridRowForId.delete(message.id);
      this._dataGridIntegrator.update({
        ...this._dataGridIntegrator.data(),
        rows: newRowsArray,
      });
      return;
    }

    const sdkTarget = /** @type {?SDK.SDKModel.Target} */ (target);
    /** @type {!Components.DataGridUtils.Row} */
    const newRow = {
      cells: [
        {columnId: 'method', value: message.method},
        {columnId: 'request', value: '', renderer: Components.DataGridRenderers.codeBlockRenderer}, {
          columnId: 'response',
          value: JSON.stringify(message.params),
          renderer: Components.DataGridRenderers.codeBlockRenderer
        },
        {
          columnId: 'timestamp',
          value: Date.now() - this._startTime,
          renderer: timestampRenderer,
        },
        {columnId: 'direction', value: 'received'}, {columnId: 'target', value: this._targetToString(sdkTarget)}
      ],
      hidden: false,
    };

    this._dataGridIntegrator.update({
      ...this._dataGridIntegrator.data(),
      rows: this._dataGridIntegrator.data().rows.concat([newRow]),
    });
  }

  /**
   * @param {{domain: string, method: string, params: !Object, id: number}} message
   * @param {?ProtocolClient.InspectorBackend.TargetBase} target
   */
  _messageSent(message, target) {
    const sdkTarget = /** @type {?SDK.SDKModel.Target} */ (target);
    /** @type {!Components.DataGridUtils.Row} */
    const newRow = {
      cells: [
        {columnId: 'method', value: message.method}, {
          columnId: 'request',
          value: JSON.stringify(message.params),
          renderer: Components.DataGridRenderers.codeBlockRenderer
        },
        {columnId: 'response', value: '(pending)', renderer: Components.DataGridRenderers.codeBlockRenderer}, {
          columnId: 'timestamp',
          value: Date.now() - this._startTime,
          renderer: timestampRenderer,
        },
        {columnId: 'direction', value: 'sent'}, {columnId: 'target', value: this._targetToString(sdkTarget)}
      ],
      hidden: false,
    };
    this._dataGridRowForId.set(message.id, newRow);
    this._dataGridIntegrator.update({
      ...this._dataGridIntegrator.data(),
      rows: this._dataGridIntegrator.data().rows.concat([newRow]),
    });
  }
}

export class InfoWidget extends UI.Widget.VBox {
  constructor() {
    super();
    this._tabbedPane = new UI.TabbedPane.TabbedPane();
    this._tabbedPane.appendTab('request', i18nString(UIStrings.request), new UI.Widget.Widget());
    this._tabbedPane.appendTab('response', i18nString(UIStrings.response), new UI.Widget.Widget());
    this._tabbedPane.show(this.contentElement);
    this._tabbedPane.selectTab('response');
    this.render(null);
  }

  /**
   * @param {{request: Components.DataGridUtils.Cell|undefined, response: Components.DataGridUtils.Cell|undefined, direction: Components.DataGridUtils.Cell|undefined}|null} data
   */
  render(data) {
    if (!data || !data.request || !data.response) {
      this._tabbedPane.changeTabView(
          'request', new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected)));
      this._tabbedPane.changeTabView(
          'response', new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected)));
      return;
    }

    const requestEnabled = data && data.direction && data.direction.value === 'sent';
    this._tabbedPane.setTabEnabled('request', Boolean(requestEnabled));
    if (!requestEnabled) {
      this._tabbedPane.selectTab('response');
    }

    const requestParsed = JSON.parse(String(data.request.value) || 'null');
    this._tabbedPane.changeTabView('request', SourceFrame.JSONView.JSONView.createViewSync(requestParsed));
    const responseParsed = JSON.parse(String(data.response.value) || 'null');
    this._tabbedPane.changeTabView('response', SourceFrame.JSONView.JSONView.createViewSync(responseParsed));
  }
}
