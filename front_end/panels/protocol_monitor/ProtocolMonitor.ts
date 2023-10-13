// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as DataGrid from '../../ui/components/data_grid/data_grid.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';

import * as Components from './components/components.js';
import protocolMonitorStyles from './protocolMonitor.css.js';

const UIStrings = {
  /**
   *@description Text for one or a group of functions
   */
  method: 'Method',
  /**
   * @description Text in Protocol Monitor. Title for a table column which shows in which direction
   * the particular protocol message was travelling. Values in this column will either be 'sent' or
   * 'received'.
   */
  type: 'Type',
  /**
   * @description Text in Protocol Monitor of the Protocol Monitor tab. Noun relating to a network request.
   */
  request: 'Request',
  /**
   *@description Title of a cell content in protocol monitor. A Network response refers to the act of acknowledging a
  network request. Should not be confused with answer.
   */
  response: 'Response',
  /**
   *@description Text for timestamps of items
   */
  timestamp: 'Timestamp',
  /**
   *@description Title of a cell content in protocol monitor. It describes the time between sending a request and receiving a response.
   */
  elapsedTime: 'Elapsed time',
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
   *@description Text to open the CDP editor with the selected command
   */
  editAndResend: 'Edit and resend',
  /**
   *@description Cell text content in Protocol Monitor of the Protocol Monitor tab
   *@example {30} PH1
   */
  sMs: '{PH1} ms',
  /**
   *@description Text in Protocol Monitor of the Protocol Monitor tab
   */
  noMessageSelected: 'No message selected',
  /**
   *@description Text in Protocol Monitor for the save button
   */
  save: 'Save',
  /**
   *@description Text in Protocol Monitor to describe the sessions column
   */
  session: 'Session',
  /**
   *@description A placeholder for an input in Protocol Monitor. The input accepts commands that are sent to the backend on Enter. CDP stands for Chrome DevTools Protocol.
   */
  sendRawCDPCommand: 'Send a raw `CDP` command',
  /**
   * @description A tooltip text for the input in the Protocol Monitor panel. The tooltip describes what format is expected.
   */
  sendRawCDPCommandExplanation:
      'Format: `\'Domain.commandName\'` for a command without parameters, or `\'{"command":"Domain.commandName", "parameters": {...}}\'` as a JSON object for a command with parameters. `\'cmd\'`/`\'method\'` and `\'args\'`/`\'params\'`/`\'arguments\'` are also supported as alternative keys for the `JSON` object.',

  /**
   * @description A label for a select input that allows selecting a CDP target to send the commands to.
   */
  selectTarget: 'Select a target',
  /**
   * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  showCDPCommandEditor: 'Show CDP command editor',
  /**
   * @description Tooltip for the the console sidebar toggle in the Console panel. Command to
   * open/show the sidebar.
   */
  hideCDPCommandEditor: 'Hide  CDP command editor',
  /**
   * @description Screen reader announcement when the sidebar is shown in the Console panel.
   */
  CDPCommandEditorShown: 'CDP command editor shown',
  /**
   * @description Screen reader announcement when the sidebar is hidden in the Console panel.
   */
  CDPCommandEditorHidden: 'CDP command editor hidden',
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/ProtocolMonitor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const timeRenderer = (value: DataGrid.DataGridUtils.CellValue): LitHtml.TemplateResult => {
  return LitHtml.html`${i18nString(UIStrings.sMs, {PH1: String(value)})}`;
};

export const buildProtocolMetadata = (domains: Iterable<ProtocolDomain>):
    Map<string, {parameters: Components.JSONEditor.Parameter[], description: string, replyArgs: string[]}> => {
      const metadataByCommand:
          Map<string, {parameters: Components.JSONEditor.Parameter[], description: string, replyArgs: string[]}> =
              new Map();
      for (const domain of domains) {
        for (const command of Object.keys(domain.metadata)) {
          metadataByCommand.set(command, domain.metadata[command]);
        }
      }
      return metadataByCommand;
    };

const metadataByCommand = buildProtocolMetadata(
    ProtocolClient.InspectorBackend.inspectorBackend.agentPrototypes.values() as Iterable<ProtocolDomain>);
const typesByName = ProtocolClient.InspectorBackend.inspectorBackend.typeMap;
const enumsByName = ProtocolClient.InspectorBackend.inspectorBackend.enumMap;
export interface Message {
  id?: number;
  method: string;
  error: Object;
  result: Object;
  params: Object;
  sessionId?: string;
}
export interface LogMessage {
  id?: number;
  domain: string;
  method: string;
  params: Object;
  type: 'send'|'recv';
}

export interface ProtocolDomain {
  readonly domain: string;
  readonly metadata: {
    [commandName: string]: {parameters: Components.JSONEditor.Parameter[], description: string, replyArgs: string[]},
  };
}

export class ProtocolMonitorDataGrid extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  private started: boolean;
  private startTime: number;
  private readonly requestTimeForId: Map<number, number>;
  private readonly dataGridRowForId: Map<number, DataGrid.DataGridUtils.Row>;
  private readonly infoWidget: InfoWidget;
  private readonly dataGridIntegrator: DataGrid.DataGridControllerIntegrator.DataGridControllerIntegrator;
  private readonly filterParser: TextUtils.TextUtils.FilterParser;
  private readonly suggestionBuilder: UI.FilterSuggestionBuilder.FilterSuggestionBuilder;
  private readonly textFilterUI: UI.Toolbar.ToolbarInput;
  private messages: LogMessage[] = [];
  private isRecording: boolean = false;
  readonly selector: UI.Toolbar.ToolbarComboBox;
  #commandAutocompleteSuggestionProvider = new CommandAutocompleteSuggestionProvider();
  #selectedTargetId?: string;
  #commandInput: UI.Toolbar.ToolbarInput;
  constructor(splitWidget: UI.SplitWidget.SplitWidget) {
    super(true);
    this.started = false;
    this.startTime = 0;
    this.dataGridRowForId = new Map();
    this.requestTimeForId = new Map();
    const topToolbar = new UI.Toolbar.Toolbar('protocol-monitor-toolbar', this.contentElement);
    this.contentElement.classList.add('protocol-monitor');
    const recordButton = new UI.Toolbar.ToolbarToggle(i18nString(UIStrings.record), 'record-start', 'record-stop');
    recordButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      recordButton.setToggled(!recordButton.toggled());
      this.setRecording(recordButton.toggled());
    });
    recordButton.setToggleWithRedColor(true);
    topToolbar.appendToolbarItem(recordButton);
    recordButton.setToggled(true);

    const clearButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.clearAll), 'clear');
    clearButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      this.messages = [];
      this.dataGridIntegrator.update({...this.dataGridIntegrator.data(), rows: []});
      this.infoWidget.render(null);
    });
    topToolbar.appendToolbarItem(clearButton);

    const saveButton = new UI.Toolbar.ToolbarButton(i18nString(UIStrings.save), 'download');
    saveButton.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, () => {
      void this.saveAsFile();
    });
    topToolbar.appendToolbarItem(saveButton);
    this.selector = this.#createTargetSelector();
    this.infoWidget = new InfoWidget();
    const dataGridInitialData: DataGrid.DataGridController.DataGridControllerData = {
      paddingRowsCount: 100,
      showScrollbar: true,
      columns: [
        {
          id: 'type',
          title: i18nString(UIStrings.type),
          sortable: true,
          widthWeighting: 1,
          visible: true,
          hideable: true,
          styles: {
            'text-align': 'center',
          },
        },
        {
          id: 'method',
          title: i18nString(UIStrings.method),
          sortable: false,
          widthWeighting: 5,
          visible: true,
          hideable: false,
        },
        {
          id: 'request',
          title: i18nString(UIStrings.request),
          sortable: false,
          widthWeighting: 5,
          visible: true,
          hideable: true,
        },
        {
          id: 'response',
          title: i18nString(UIStrings.response),
          sortable: false,
          widthWeighting: 5,
          visible: true,
          hideable: true,
        },
        {
          id: 'elapsedTime',
          title: i18nString(UIStrings.elapsedTime),
          sortable: true,
          widthWeighting: 2,
          visible: false,
          hideable: true,
        },
        {
          id: 'timestamp',
          title: i18nString(UIStrings.timestamp),
          sortable: true,
          widthWeighting: 5,
          visible: false,
          hideable: true,
        },
        {
          id: 'target',
          title: i18nString(UIStrings.target),
          sortable: true,
          widthWeighting: 5,
          visible: false,
          hideable: true,
        },
        {
          id: 'session',
          title: i18nString(UIStrings.session),
          sortable: true,
          widthWeighting: 5,
          visible: false,
          hideable: true,
        },
      ],
      rows: [],
      contextMenus: {
        bodyRow:
            (menu: UI.ContextMenu.ContextMenu, columns: readonly DataGrid.DataGridUtils.Column[],
             row: Readonly<DataGrid.DataGridUtils.Row>): void => {
              const methodColumn = DataGrid.DataGridUtils.getRowEntryForColumnId(row, 'method');
              const typeColumn = DataGrid.DataGridUtils.getRowEntryForColumnId(row, 'type');
              /**
               * You can click the "Edit and resend" item in the context menu to be
               * taken to the CDP editor with the filled with the selected command.
               */
              menu.editSection().appendItem(i18nString(UIStrings.editAndResend), () => {
                if (!methodColumn.value) {
                  return;
                }
                const parameters = this.infoWidget.request;
                const targetId = this.infoWidget.targetId;
                const command = String(methodColumn.value);
                if (splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain) {
                  splitWidget.toggleSidebar();
                }
                this.dispatchEventToListeners(Events.CommandChange, {command, parameters, targetId});
              });

              /**
               * You can click the "Filter" item in the context menu to filter the
               * protocol monitor entries to those that match the method of the
               * current row.
               */
              menu.editSection().appendItem(i18nString(UIStrings.filter), () => {
                const methodColumn = DataGrid.DataGridUtils.getRowEntryForColumnId(row, 'method');
                this.textFilterUI.setValue(`method:${methodColumn.value}`, true);
              });

              /**
               * You can click the "Documentation" item in the context menu to be
               * taken to the CDP Documentation site entry for the given method.
               */
              menu.footerSection().appendItem(i18nString(UIStrings.documentation), () => {
                if (!methodColumn.value) {
                  return;
                }
                const [domain, method] = String(methodColumn.value).split('.');
                const type = typeColumn.value === 'sent' ? 'method' : 'event';
                Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(
                    `https://chromedevtools.github.io/devtools-protocol/tot/${domain}#${type}-${method}` as
                    Platform.DevToolsPath.UrlString);
              });
            },
      },
    };

    this.dataGridIntegrator =
        new DataGrid.DataGridControllerIntegrator.DataGridControllerIntegrator(dataGridInitialData);

    this.dataGridIntegrator.dataGrid.addEventListener('cellfocused', event => {
      const focusedRow = event.data.row;
      const infoWidgetData = {
        request: DataGrid.DataGridUtils.getRowEntryForColumnId(focusedRow, 'request'),
        response: DataGrid.DataGridUtils.getRowEntryForColumnId(focusedRow, 'response'),
        target: DataGrid.DataGridUtils.getRowEntryForColumnId(focusedRow, 'target'),
        type:
            DataGrid.DataGridUtils.getRowEntryForColumnId(focusedRow, 'type').title as 'sent' | 'received' | undefined,
      };
      this.infoWidget.render(infoWidgetData);
    });

    this.dataGridIntegrator.dataGrid.addEventListener('newuserfiltertext', event => {
      this.textFilterUI.setValue(event.data.filterText, /* notify listeners */ true);
    });
    const split = new UI.SplitWidget.SplitWidget(true, true, 'protocol-monitor-panel-split', 250);
    split.show(this.contentElement);
    split.setMainWidget(this.dataGridIntegrator);
    split.setSidebarWidget(this.infoWidget);
    const keys = ['method', 'request', 'response', 'type', 'target', 'session'];
    this.filterParser = new TextUtils.TextUtils.FilterParser(keys);
    this.suggestionBuilder = new UI.FilterSuggestionBuilder.FilterSuggestionBuilder(keys);

    this.textFilterUI = new UI.Toolbar.ToolbarInput(
        i18nString(UIStrings.filter), '', 1, .2, '', this.suggestionBuilder.completions.bind(this.suggestionBuilder),
        true);
    this.textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, event => {
      const query = event.data as string;
      const filters = this.filterParser.parse(query);
      this.dataGridIntegrator.update({...this.dataGridIntegrator.data(), filters});
    });
    const bottomToolbar = new UI.Toolbar.Toolbar('protocol-monitor-bottom-toolbar', this.contentElement);
    bottomToolbar.appendToolbarItem(splitWidget.createShowHideSidebarButton(
        i18nString(UIStrings.showCDPCommandEditor), i18nString(UIStrings.hideCDPCommandEditor),
        i18nString(UIStrings.CDPCommandEditorShown), i18nString(UIStrings.CDPCommandEditorHidden)));
    this.#commandInput = this.#createCommandInput();
    bottomToolbar.appendToolbarItem(this.#commandInput);
    bottomToolbar.appendToolbarItem(this.selector);
    const shadowRoot = bottomToolbar.element?.shadowRoot;
    const inputBar = shadowRoot?.querySelector('.toolbar-input');
    const tabSelector = shadowRoot?.querySelector('.toolbar-select-container');

    const populateToolbarInput = (): void => {
      const editorWidget = splitWidget.sidebarWidget();
      if (!(editorWidget instanceof EditorWidget)) {
        return;
      }
      const commandJson = editorWidget.jsonEditor.getCommandJson();
      const targetId = editorWidget.jsonEditor.targetId;
      if (targetId) {
        const selectedIndex = this.selector.options().findIndex(option => option.value === targetId);
        if (selectedIndex !== -1) {
          this.selector.setSelectedIndex(selectedIndex);
          this.#selectedTargetId = targetId;
        }
      }
      if (commandJson) {
        this.#commandInput.setValue(commandJson);
      }
    };

    splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, (event => {
                                   if (event.data === 'OnlyMain') {
                                     populateToolbarInput();

                                     inputBar?.setAttribute('style', 'display:flex; flex-grow: 1');
                                     tabSelector?.setAttribute('style', 'display:flex');
                                   } else {
                                     const {command, parameters} = parseCommandInput(this.#commandInput.value());
                                     this.dispatchEventToListeners(
                                         Events.CommandChange, {command, parameters, targetId: this.#selectedTargetId});
                                     inputBar?.setAttribute('style', 'display:none');
                                     tabSelector?.setAttribute('style', 'display:none');
                                   }
                                 }));
    topToolbar.appendToolbarItem(this.textFilterUI);
  }

  #createCommandInput(): UI.Toolbar.ToolbarInput {
    const placeholder = i18nString(UIStrings.sendRawCDPCommand);
    const accessiblePlaceholder = placeholder;
    const growFactor = 1;
    const shrinkFactor = 0.2;
    const tooltip = i18nString(UIStrings.sendRawCDPCommandExplanation);
    const input = new UI.Toolbar.ToolbarInput(
        placeholder, accessiblePlaceholder, growFactor, shrinkFactor, tooltip,
        this.#commandAutocompleteSuggestionProvider.buildTextPromptCompletions, false);
    input.addEventListener(UI.Toolbar.ToolbarInput.Event.EnterPressed, () => {
      this.#commandAutocompleteSuggestionProvider.addEntry(input.value());
      const {command, parameters} = parseCommandInput(input.value());
      this.onCommandSend(command, parameters, this.#selectedTargetId);
    });
    return input;
  }

  #createTargetSelector(): UI.Toolbar.ToolbarComboBox {
    const selector = new UI.Toolbar.ToolbarComboBox(() => {
      this.#selectedTargetId = selector.selectedOption()?.value;
    }, i18nString(UIStrings.selectTarget));
    selector.setMaxWidth(120);
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const syncTargets = (): void => {
      selector.removeOptions();
      for (const target of targetManager.targets()) {
        selector.createOption(`${target.name()} (${target.inspectedURL()})`, target.id());
      }
    };
    targetManager.addEventListener(SDK.TargetManager.Events.AvailableTargetsChanged, syncTargets);
    syncTargets();
    return selector;
  }

  onCommandSend(command: string, parameters: object, target?: string): void {
    const test = ProtocolClient.InspectorBackend.test;
    const targetManager = SDK.TargetManager.TargetManager.instance();
    const selectedTarget = target ? targetManager.targetById(target) : null;
    const sessionId = selectedTarget ? selectedTarget.sessionId : '';
    // TS thinks that properties are read-only because
    // in TS test is defined as a namespace.
    // @ts-ignore
    test.sendRawMessage(command, parameters, () => {}, sessionId);
  }

  static instance(opts: {forceNew: null|boolean} = {forceNew: null}): ProtocolMonitorImpl {
    const {forceNew} = opts;
    if (!protocolMonitorImplInstance || forceNew) {
      protocolMonitorImplInstance = new ProtocolMonitorImpl();
    }

    return protocolMonitorImplInstance;
  }

  override wasShown(): void {
    if (this.started) {
      return;
    }
    this.registerCSSFiles([protocolMonitorStyles]);
    this.started = true;
    this.startTime = Date.now();
    this.setRecording(true);
  }

  private setRecording(recording: boolean): void {
    this.isRecording = recording;
    const test = ProtocolClient.InspectorBackend.test;
    if (recording) {
      // TODO: TS thinks that properties are read-only because
      // in TS test is defined as a namespace.
      // @ts-ignore
      test.onMessageSent = this.messageSent.bind(this);
      // @ts-ignore
      test.onMessageReceived = this.messageReceived.bind(this);
    } else {
      // @ts-ignore
      test.onMessageSent = null;
      // @ts-ignore
      test.onMessageReceived = null;
    }
  }

  private targetToString(target: SDK.Target.Target|null): string {
    if (!target) {
      return '';
    }
    return target.decorateLabel(
        `${target.name()} ${target === SDK.TargetManager.TargetManager.instance().rootTarget() ? '' : target.id()}`);
  }

  // eslint-disable
  private messageReceived(message: Message, target: ProtocolClient.InspectorBackend.TargetBase|null): void {
    if (this.isRecording) {
      this.messages.push({...message, type: 'recv', domain: '-'});
    }
    if ('id' in message && message.id) {
      const existingRow = this.dataGridRowForId.get(message.id);
      if (!existingRow) {
        return;
      }
      const allExistingRows = this.dataGridIntegrator.data().rows;
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

          if (cell.columnId === 'elapsedTime') {
            const requestTime = this.requestTimeForId.get(message.id as number);
            if (requestTime) {
              return {
                ...cell,
                value: Date.now() - requestTime,
                renderer: timeRenderer,
              };
            }
          }

          return cell;
        }),
      };

      const newRowsArray = [...this.dataGridIntegrator.data().rows];
      newRowsArray[matchingExistingRowIndex] = newRowWithUpdate;

      // Now we've updated the message, it won't be updated again, so we can delete it from the tracking map.
      this.dataGridRowForId.delete(message.id);
      this.dataGridIntegrator.update({
        ...this.dataGridIntegrator.data(),
        rows: newRowsArray,
      });
      return;
    }

    const sdkTarget = target as SDK.Target.Target | null;
    const responseIcon = new IconButton.Icon.Icon();
    responseIcon.data = {iconName: 'arrow-down', color: 'var(--icon-request)', width: '16px', height: '16px'};
    const newRow: DataGrid.DataGridUtils.Row = {
      cells: [
        {columnId: 'method', value: message.method, title: message.method},
        {columnId: 'request', value: '', renderer: DataGrid.DataGridRenderers.codeBlockRenderer},
        {
          columnId: 'response',
          value: JSON.stringify(message.params),
          renderer: DataGrid.DataGridRenderers.codeBlockRenderer,
        },
        {
          columnId: 'timestamp',
          value: Date.now() - this.startTime,
          renderer: timeRenderer,
        },
        {columnId: 'elapsedTime', value: ''},
        {columnId: 'type', value: responseIcon, title: 'received', renderer: DataGrid.DataGridRenderers.iconRenderer},
        {columnId: 'target', value: this.targetToString(sdkTarget)},
        {columnId: 'session', value: message.sessionId || ''},
      ],
      hidden: false,
    };

    this.dataGridIntegrator.update({
      ...this.dataGridIntegrator.data(),
      rows: this.dataGridIntegrator.data().rows.concat([newRow]),
    });
  }

  private messageSent(
      message: {domain: string, method: string, params: Object, id: number, sessionId?: string},
      target: ProtocolClient.InspectorBackend.TargetBase|null): void {
    if (this.isRecording) {
      this.messages.push({...message, type: 'send'});
    }

    const sdkTarget = target as SDK.Target.Target | null;
    const requestResponseIcon = new IconButton.Icon.Icon();
    requestResponseIcon
        .data = {iconName: 'arrow-up-down', color: 'var(--icon-request-response)', width: '16px', height: '16px'};
    const newRow: DataGrid.DataGridUtils.Row = {
      styles: {
        '--override-data-grid-row-background-color': 'var(--sys-color-surface3)',
      },
      cells: [
        {columnId: 'method', value: message.method, title: message.method},
        {
          columnId: 'request',
          value: JSON.stringify(message.params),
          renderer: DataGrid.DataGridRenderers.codeBlockRenderer,
        },
        {columnId: 'response', value: '(pending)', renderer: DataGrid.DataGridRenderers.codeBlockRenderer},
        {
          columnId: 'timestamp',
          value: Date.now() - this.startTime,
          renderer: timeRenderer,
        },
        {columnId: 'elapsedTime', value: '(pending)'},
        {
          columnId: 'type',
          value: requestResponseIcon,
          title: 'sent',
          renderer: DataGrid.DataGridRenderers.iconRenderer,
        },
        {columnId: 'target', value: String(sdkTarget?.id())},
        {columnId: 'session', value: message.sessionId || ''},
      ],
      hidden: false,
    };
    this.requestTimeForId.set(message.id, Date.now());
    this.dataGridRowForId.set(message.id, newRow);
    this.dataGridIntegrator.update({
      ...this.dataGridIntegrator.data(),
      rows: this.dataGridIntegrator.data().rows.concat([newRow]),
    });
  }

  private async saveAsFile(): Promise<void> {
    const now = new Date();
    const fileName = 'ProtocolMonitor-' + Platform.DateUtilities.toISO8601Compact(now) + '.json' as
        Platform.DevToolsPath.RawPathString;
    const stream = new Bindings.FileUtils.FileOutputStream();

    const accepted = await stream.open(fileName);
    if (!accepted) {
      return;
    }

    void stream.write(JSON.stringify(this.messages, null, '  '));
    void stream.close();
  }
}

let protocolMonitorImplInstance: ProtocolMonitorImpl;
export class ProtocolMonitorImpl extends UI.Widget.VBox {
  #split: UI.SplitWidget.SplitWidget;
  #editorWidget = new EditorWidget();
  #protocolMonitorDataGrid: ProtocolMonitorDataGrid;
  // This width corresponds to the optimal width to use the editor properly
  // It is randomly chosen
  #sideBarMinWidth = 400;
  constructor() {
    super(true);
    this.#split =
        new UI.SplitWidget.SplitWidget(true, false, 'protocol-monitor-split-container', this.#sideBarMinWidth);
    this.#split.show(this.contentElement);
    this.#protocolMonitorDataGrid = new ProtocolMonitorDataGrid(this.#split);
    this.#protocolMonitorDataGrid.addEventListener(Events.CommandChange, event => {
      this.#editorWidget.jsonEditor.displayCommand(event.data.command, event.data.parameters, event.data.targetId);
    });

    this.#editorWidget.element.style.overflow = 'hidden';
    this.#split.setMainWidget(this.#protocolMonitorDataGrid);
    this.#split.setSidebarWidget(this.#editorWidget);
    this.#split.hideSidebar(true);
    this.#editorWidget.addEventListener(Events.CommandSent, event => {
      this.#protocolMonitorDataGrid.onCommandSend(event.data.command, event.data.parameters, event.data.targetId);
    });
  }

  static instance(opts: {forceNew: null|boolean} = {forceNew: null}): ProtocolMonitorImpl {
    const {forceNew} = opts;
    if (!protocolMonitorImplInstance || forceNew) {
      protocolMonitorImplInstance = new ProtocolMonitorImpl();
    }
    return protocolMonitorImplInstance;
  }
}

export class CommandAutocompleteSuggestionProvider {
  #maxHistorySize = 200;
  #commandHistory = new Set<string>();

  constructor(maxHistorySize?: number) {
    if (maxHistorySize !== undefined) {
      this.#maxHistorySize = maxHistorySize;
    }
  }

  buildTextPromptCompletions =
      async(expression: string, prefix: string, force?: boolean): Promise<UI.SuggestBox.Suggestions> => {
    if (!prefix && !force && expression) {
      return [];
    }

    const newestToOldest = [...this.#commandHistory].reverse();
    newestToOldest.push(...metadataByCommand.keys());
    return newestToOldest.filter(cmd => cmd.startsWith(prefix)).map(text => ({
                                                                      text,
                                                                    }));
  };

  addEntry(value: string): void {
    if (this.#commandHistory.has(value)) {
      this.#commandHistory.delete(value);
    }
    this.#commandHistory.add(value);
    if (this.#commandHistory.size > this.#maxHistorySize) {
      const earliestEntry = this.#commandHistory.values().next().value;
      this.#commandHistory.delete(earliestEntry);
    }
  }
}

export class InfoWidget extends UI.Widget.VBox {
  private readonly tabbedPane: UI.TabbedPane.TabbedPane;
  request: {[x: string]: unknown};
  targetId = '';
  constructor() {
    super();
    this.tabbedPane = new UI.TabbedPane.TabbedPane();
    this.tabbedPane.appendTab('request', i18nString(UIStrings.request), new UI.Widget.Widget());
    this.tabbedPane.appendTab('response', i18nString(UIStrings.response), new UI.Widget.Widget());
    this.tabbedPane.show(this.contentElement);
    this.tabbedPane.selectTab('response');
    this.request = {};
    this.render(null);
  }

  render(data: {
    request: DataGrid.DataGridUtils.Cell|undefined,
    response: DataGrid.DataGridUtils.Cell|undefined,
    target: DataGrid.DataGridUtils.Cell|undefined,
    type: 'sent'|'received'|undefined,
  }|null): void {
    if (!data || !data.request || !data.response || !data.target) {
      this.tabbedPane.changeTabView('request', new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected)));
      this.tabbedPane.changeTabView(
          'response', new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected)));
      return;
    }

    const requestEnabled = data && data.type && data.type === 'sent';
    this.tabbedPane.setTabEnabled('request', Boolean(requestEnabled));
    if (!requestEnabled) {
      this.tabbedPane.selectTab('response');
    }

    const requestParsed = JSON.parse(String(data.request.value) || 'null');
    this.request = requestParsed;
    this.targetId = String(data.target.value);
    this.tabbedPane.changeTabView('request', SourceFrame.JSONView.JSONView.createViewSync(requestParsed));
    const responseParsed =
        data.response.value === '(pending)' ? null : JSON.parse(String(data.response.value) || 'null');
    this.tabbedPane.changeTabView('response', SourceFrame.JSONView.JSONView.createViewSync(responseParsed));
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CommandSent = 'CommandSent',
  CommandChange = 'CommandChange',
}

export type EventTypes = {
  [Events.CommandSent]: Components.JSONEditor.Command,
  [Events.CommandChange]: Components.JSONEditor.Command,
};

export class EditorWidget extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(UI.Widget.VBox) {
  readonly jsonEditor: Components.JSONEditor.JSONEditor;
  constructor() {
    super();
    this.jsonEditor = new Components.JSONEditor.JSONEditor();
    this.jsonEditor.metadataByCommand = metadataByCommand;
    this.jsonEditor.typesByName = typesByName as Map<string, Components.JSONEditor.Parameter[]>;
    this.jsonEditor.enumsByName = enumsByName;
    this.element.append(this.jsonEditor);
    this.jsonEditor.addEventListener(Components.JSONEditor.SubmitEditorEvent.eventName, (event: Event) => {
      this.dispatchEventToListeners(Events.CommandSent, (event as Components.JSONEditor.SubmitEditorEvent).data);
    });
  }
}

export function parseCommandInput(input: string): {command: string, parameters: {[paramName: string]: unknown}} {
  // If input cannot be parsed as json, we assume it's the command name
  // for a command without parameters. Otherwise, we expect an object
  // with "command"/"method"/"cmd" and "parameters"/"params"/"args"/"arguments" attributes.
  let json = null;
  try {
    json = JSON.parse(input);
  } catch (err) {
  }

  const command = json ? json.command || json.method || json.cmd || '' : input;
  const parameters = json?.parameters || json?.params || json?.args || json?.arguments || {};

  return {command, parameters};
}
