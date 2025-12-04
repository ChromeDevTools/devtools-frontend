// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { JSONEditor } from './JSONEditor.js';
import protocolMonitorStyles from './protocolMonitor.css.js';
const { styleMap } = Directives;
const { widgetConfig, widgetRef } = UI.Widget;
const UIStrings = {
    /**
     * @description Text for one or a group of functions
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
     * @description Title of a cell content in protocol monitor. A Network response refers to the act of acknowledging a
     * network request. Should not be confused with answer.
     */
    response: 'Response',
    /**
     * @description Text for timestamps of items
     */
    timestamp: 'Timestamp',
    /**
     * @description Title of a cell content in protocol monitor. It describes the time between sending a request and receiving a response.
     */
    elapsedTime: 'Elapsed time',
    /**
     * @description Text in Protocol Monitor of the Protocol Monitor tab
     */
    target: 'Target',
    /**
     * @description Text to record a series of actions for analysis
     */
    record: 'Record',
    /**
     * @description Text to clear everything
     */
    clearAll: 'Clear all',
    /**
     * @description Text to filter result items
     */
    filter: 'Filter',
    /**
     * @description Text for the documentation of something
     */
    documentation: 'Documentation',
    /**
     * @description Text to open the CDP editor with the selected command
     */
    editAndResend: 'Edit and resend',
    /**
     * @description Cell text content in Protocol Monitor of the Protocol Monitor tab
     * @example {30} PH1
     */
    sMs: '{PH1} ms',
    /**
     * @description Text in Protocol Monitor of the Protocol Monitor tab
     */
    noMessageSelected: 'No message selected',
    /**
     * @description Text in Protocol Monitor of the Protocol Monitor tab if no message is selected
     */
    selectAMessageToView: 'Select a message to see its details',
    /**
     * @description Text in Protocol Monitor for the save button
     */
    save: 'Save',
    /**
     * @description Text in Protocol Monitor to describe the sessions column
     */
    session: 'Session',
    /**
     * @description A placeholder for an input in Protocol Monitor. The input accepts commands that are sent to the backend on Enter. CDP stands for Chrome DevTools Protocol.
     */
    sendRawCDPCommand: 'Send a raw `CDP` command',
    /**
     * @description A tooltip text for the input in the Protocol Monitor panel. The tooltip describes what format is expected.
     */
    sendRawCDPCommandExplanation: 'Format: `\'Domain.commandName\'` for a command without parameters, or `\'{"command":"Domain.commandName", "parameters": {...}}\'` as a JSON object for a command with parameters. `\'cmd\'`/`\'method\'` and `\'args\'`/`\'params\'`/`\'arguments\'` are also supported as alternative keys for the `JSON` object.',
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
};
const str_ = i18n.i18n.registerUIStrings('panels/protocol_monitor/ProtocolMonitor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const buildProtocolMetadata = (domains) => {
    const metadataByCommand = new Map();
    for (const domain of domains) {
        for (const command of Object.keys(domain.metadata)) {
            metadataByCommand.set(command, domain.metadata[command]);
        }
    }
    return metadataByCommand;
};
const metadataByCommand = buildProtocolMetadata(ProtocolClient.InspectorBackend.inspectorBackend.agentPrototypes.values());
const typesByName = ProtocolClient.InspectorBackend.inspectorBackend.typeMap;
const enumsByName = ProtocolClient.InspectorBackend.inspectorBackend.enumMap;
export const DEFAULT_VIEW = (input, output, target) => {
    // clang-format off
    render(html `
        <style>${UI.inspectorCommonStyles}</style>
        <style>${protocolMonitorStyles}</style>
        <devtools-split-view name="protocol-monitor-split-container"
                             direction="column"
                             sidebar-initial-size="400"
                             sidebar-visibility=${input.sidebarVisible ? 'visible' : 'hidden'}
                             @change=${(e) => input.onSplitChange(e.detail === 'OnlyMain')}>
          <div slot="main" class="vbox protocol-monitor-main">
            <devtools-toolbar class="protocol-monitor-toolbar"
                               jslog=${VisualLogging.toolbar('top')}>
               <devtools-button title=${i18nString(UIStrings.record)}
                                .iconName=${'record-start'}
                                .toggledIconName=${'record-stop'}
                                .jslogContext=${'protocol-monitor.toggle-recording'}
                                .variant=${"icon_toggle" /* Buttons.Button.Variant.ICON_TOGGLE */}
                                .toggleType=${"red-toggle" /* Buttons.Button.ToggleType.RED */}
                                .toggled=${true}
                                @click=${(e) => input.onRecord(e.target.toggled)}>
               </devtools-button>
              <devtools-button title=${i18nString(UIStrings.clearAll)}
                               .iconName=${'clear'}
                               .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                               .jslogContext=${'protocol-monitor.clear-all'}
                               @click=${() => input.onClear()}></devtools-button>
              <devtools-button title=${i18nString(UIStrings.save)}
                               .iconName=${'download'}
                               .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                               .jslogContext=${'protocol-monitor.save'}
                               @click=${() => input.onSave()}></devtools-button>
              <devtools-toolbar-input type="filter"
                                      list="filter-suggestions"
                                      style="flex-grow: 1"
                                      value=${input.filter}
                                      @change=${(e) => input.onFilterChanged(e.detail)}>
                <datalist id="filter-suggestions">
                  ${input.filterKeys.map(key => html `
                        <option value=${key + ':'}></option>
                        <option value=${'-' + key + ':'}></option>`)}
                </datalist>
              </devtools-toolbar-input>
            </devtools-toolbar>
            <devtools-split-view direction="column" sidebar-position="second"
                                 name="protocol-monitor-panel-split" sidebar-initial-size="250">
              <devtools-data-grid
                  striped
                  slot="main"
                  .filters=${input.parseFilter(input.filter)}>
                <table>
                    <tr>
                      <th id="type" sortable style="text-align: center" hideable weight="1">
                        ${i18nString(UIStrings.type)}
                      </th>
                      <th id="method" weight="5">
                        ${i18nString(UIStrings.method)}
                      </th>
                      <th id="request" hideable weight="5">
                        ${i18nString(UIStrings.request)}
                      </th>
                      <th id="response" hideable weight="5">
                        ${i18nString(UIStrings.response)}
                      </th>
                      <th id="elapsed-time" sortable hideable weight="2">
                        ${i18nString(UIStrings.elapsedTime)}
                      </th>
                      <th id="timestamp" sortable hideable weight="5">
                        ${i18nString(UIStrings.timestamp)}
                      </th>
                      <th id="target" sortable hideable weight="5">
                        ${i18nString(UIStrings.target)}
                      </th>
                      <th id="session" sortable hideable weight="5">
                        ${i18nString(UIStrings.session)}
                      </th>
                    </tr>
                    ${input.messages.map(message => html `
                      <tr @select=${() => input.onSelect(message)}
                          @contextmenu=${(e) => input.onContextMenu(message, e.detail)}
                          style="--override-data-grid-row-background-color: var(--sys-color-surface3)">
                        ${'id' in message ? html `
                          <td title="sent">
                            <devtools-icon name="arrow-up-down" class="medium" style="color: var(--icon-request-response);">
                            </devtools-icon>
                          </td>` : html `
                          <td title="received">
                            <devtools-icon name="arrow-down" class="medium" style="color: var(--icon-request);">
                            </devtools-icon>
                          </td>`}
                        <td>${message.method}</td>
                        <td>${message.params ? html `<code>${JSON.stringify(message.params)}</code>` : ''}</td>
                        <td>
                          ${message.result ? html `<code>${JSON.stringify(message.result)}</code>` :
        message.error ? html `<code>${JSON.stringify(message.error)}</code>` :
            'id' in message ? '(pending)' : ''}
                        </td>
                        <td data-value=${message.elapsedTime || 0}>
                          ${!('id' in message) ? '' :
        message.elapsedTime ? i18nString(UIStrings.sMs, { PH1: String(message.elapsedTime) })
            : '(pending)'}
                        </td>
                        <td data-value=${message.requestTime}>${i18nString(UIStrings.sMs, { PH1: String(message.requestTime) })}</td>
                        <td>${targetToString(message.target)}</td>
                        <td>${message.sessionId || ''}</td>
                      </tr>`)}
                  </table>
              </devtools-data-grid>
              <devtools-widget .widgetConfig=${widgetConfig(InfoWidget, {
        request: input.selectedMessage?.params,
        response: input.selectedMessage?.result || input.selectedMessage?.error,
        type: !input.selectedMessage ? undefined :
            ('id' in input?.selectedMessage) ? 'sent'
                : 'received',
    })}
                  class="protocol-monitor-info"
                  slot="sidebar"></devtools-widget>
            </devtools-split-view>
            <devtools-toolbar class="protocol-monitor-bottom-toolbar"
               jslog=${VisualLogging.toolbar('bottom')}>
              <devtools-button .title=${input.sidebarVisible ? i18nString(UIStrings.hideCDPCommandEditor) : i18nString(UIStrings.showCDPCommandEditor)}
                               .iconName=${input.sidebarVisible ? 'left-panel-close' : 'left-panel-open'}
                               .variant=${"toolbar" /* Buttons.Button.Variant.TOOLBAR */}
                               .jslogContext=${'protocol-monitor.toggle-command-editor'}
                               @click=${() => input.onToggleSidebar()}></devtools-button>
              </devtools-button>
              <devtools-toolbar-input id="command-input"
                                      style=${styleMap({
        'flex-grow': 1,
        display: input.sidebarVisible ? 'none' : 'flex'
    })}
                                      value=${input.command}
                                      list="command-input-suggestions"
                                      placeholder=${i18nString(UIStrings.sendRawCDPCommand)}
                                      title=${i18nString(UIStrings.sendRawCDPCommandExplanation)}
                                      @change=${(e) => input.onCommandChange(e.detail)}
                                      @submit=${(e) => input.onCommandSubmitted(e.detail)}>
                <datalist id="command-input-suggestions">
                  ${input.commandSuggestions.map(c => html `<option value=${c}></option>`)}
                </datalist>
              </devtools-toolbar-input>
              <select class="target-selector"
                      title=${i18nString(UIStrings.selectTarget)}
                      style=${styleMap({ display: input.sidebarVisible ? 'none' : 'flex' })}
                      jslog=${VisualLogging.dropDown('target-selector').track({ change: true })}
                      @change=${(e) => input.onTargetChange(e.target.value)}>
                ${input.targets.map(target => html `
                  <option jslog=${VisualLogging.item('target').track({ click: true })}
                          value=${target.id()} ?selected=${target.id() === input.selectedTargetId}>
                    ${target.name()} (${target.inspectedURL()})
                  </option>`)}
              </select>
            </devtools-toolbar>
          </div>
          <devtools-widget slot="sidebar"
              .widgetConfig=${widgetConfig(JSONEditor, { metadataByCommand, typesByName, enumsByName })}
              ${widgetRef(JSONEditor, e => { output.editorWidget = e; })}>
          </devtools-widget>
        </devtools-split-view>`, target);
    // clang-format on
};
export class ProtocolMonitorImpl extends UI.Panel.Panel {
    started;
    startTime;
    messageForId = new Map();
    filterParser;
    #filterKeys = ['method', 'request', 'response', 'target', 'session'];
    #commandAutocompleteSuggestionProvider = new CommandAutocompleteSuggestionProvider();
    #selectedTargetId;
    #command = '';
    #sidebarVisible = false;
    #view;
    #messages = [];
    #selectedMessage;
    #filter = '';
    #editorWidget;
    #targetsBySessionId = new Map();
    constructor(view = DEFAULT_VIEW) {
        super('protocol-monitor', true);
        this.#view = view;
        this.started = false;
        this.startTime = 0;
        this.#filterKeys = ['method', 'request', 'response', 'type', 'target', 'session'];
        this.filterParser = new TextUtils.TextUtils.FilterParser(this.#filterKeys);
        this.#selectedTargetId = 'main';
        this.performUpdate();
        this.#editorWidget.addEventListener("submiteditor" /* JSONEditorEvents.SUBMIT_EDITOR */, event => {
            this.onCommandSend(event.data.command, event.data.parameters, event.data.targetId);
        });
        SDK.TargetManager.TargetManager.instance().addEventListener("AvailableTargetsChanged" /* SDK.TargetManager.Events.AVAILABLE_TARGETS_CHANGED */, () => {
            this.requestUpdate();
        });
        SDK.TargetManager.TargetManager.instance().observeTargets(this);
    }
    targetAdded(target) {
        this.#targetsBySessionId.set(target.sessionId, target);
    }
    targetRemoved(target) {
        this.#targetsBySessionId.delete(target.sessionId);
    }
    #populateToolbarInput() {
        const commandJson = this.#editorWidget.getCommandJson();
        const targetId = this.#editorWidget.targetId;
        if (targetId) {
            this.#selectedTargetId = targetId;
        }
        if (commandJson) {
            this.#command = commandJson;
            this.requestUpdate();
        }
    }
    performUpdate() {
        const viewInput = {
            messages: this.#messages,
            selectedMessage: this.#selectedMessage,
            sidebarVisible: this.#sidebarVisible,
            command: this.#command,
            commandSuggestions: this.#commandAutocompleteSuggestionProvider.allSuggestions(),
            filterKeys: this.#filterKeys,
            filter: this.#filter,
            parseFilter: this.filterParser.parse.bind(this.filterParser),
            onSplitChange: (onlyMain) => {
                if (onlyMain) {
                    this.#populateToolbarInput();
                    this.#sidebarVisible = false;
                }
                else {
                    const { command, parameters } = parseCommandInput(this.#command);
                    this.#editorWidget.displayCommand(command, parameters, this.#selectedTargetId);
                    this.#sidebarVisible = true;
                }
                this.requestUpdate();
            },
            onRecord: (recording) => {
                this.setRecording(recording);
            },
            onClear: () => {
                this.#messages = [];
                this.messageForId.clear();
                this.requestUpdate();
            },
            onSave: () => {
                void this.saveAsFile();
            },
            onSelect: (message) => {
                this.#selectedMessage = message;
                this.requestUpdate();
            },
            onContextMenu: this.#populateContextMenu.bind(this),
            onCommandChange: (command) => {
                this.#command = command;
            },
            onCommandSubmitted: (input) => {
                this.#commandAutocompleteSuggestionProvider.addEntry(input);
                const { command, parameters } = parseCommandInput(input);
                this.onCommandSend(command, parameters, this.#selectedTargetId);
            },
            onFilterChanged: (filter) => {
                this.#filter = filter;
                this.requestUpdate();
            },
            onTargetChange: (targetId) => {
                this.#selectedTargetId = targetId;
            },
            onToggleSidebar: () => {
                this.#sidebarVisible = !this.#sidebarVisible;
                this.requestUpdate();
            },
            targets: SDK.TargetManager.TargetManager.instance().targets(),
            selectedTargetId: this.#selectedTargetId,
        };
        const that = this;
        const viewOutput = {
            set editorWidget(value) {
                that.#editorWidget = value;
            }
        };
        this.#view(viewInput, viewOutput, this.contentElement);
    }
    #populateContextMenu(message, menu) {
        /**
         * You can click the "Edit and resend" item in the context menu to be
         * taken to the CDP editor with the filled with the selected command.
         */
        menu.editSection().appendItem(i18nString(UIStrings.editAndResend), () => {
            if (!this.#selectedMessage) {
                return;
            }
            const parameters = this.#selectedMessage.params;
            const targetId = this.#selectedMessage.target?.id() || '';
            const command = message.method;
            this.#command = JSON.stringify({ command, parameters });
            if (!this.#sidebarVisible) {
                this.#sidebarVisible = true;
                this.requestUpdate();
            }
            else {
                this.#editorWidget.displayCommand(command, parameters, targetId);
            }
        }, { jslogContext: 'edit-and-resend', disabled: !('id' in message) });
        /**
         * You can click the "Filter" item in the context menu to filter the
         * protocol monitor entries to those that match the method of the
         * current row.
         */
        menu.editSection().appendItem(i18nString(UIStrings.filter), () => {
            this.#filter = `method:${message.method}`;
            this.requestUpdate();
        }, { jslogContext: 'filter' });
        /**
         * You can click the "Documentation" item in the context menu to be
         * taken to the CDP Documentation site entry for the given method.
         */
        menu.footerSection().appendItem(i18nString(UIStrings.documentation), () => {
            const [domain, method] = message.method.split('.');
            const type = 'id' in message ? 'method' : 'event';
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(`https://chromedevtools.github.io/devtools-protocol/tot/${domain}#${type}-${method}`);
        }, { jslogContext: 'documentation' });
    }
    onCommandSend(command, parameters, target) {
        const test = ProtocolClient.InspectorBackend.test;
        const targetManager = SDK.TargetManager.TargetManager.instance();
        const selectedTarget = target ? targetManager.targetById(target) : null;
        const sessionId = selectedTarget ? selectedTarget.sessionId : '';
        // TS thinks that properties are read-only because
        // in TS test is defined as a namespace.
        // @ts-expect-error
        test.sendRawMessage(command, parameters, () => { }, sessionId);
    }
    wasShown() {
        super.wasShown();
        if (this.started) {
            return;
        }
        this.started = true;
        this.startTime = Date.now();
        this.setRecording(true);
    }
    setRecording(recording) {
        const test = ProtocolClient.InspectorBackend.test;
        if (recording) {
            // @ts-expect-error
            test.onMessageSent = this.messageSent.bind(this);
            // @ts-expect-error
            test.onMessageReceived = this.messageReceived.bind(this);
        }
        else {
            test.onMessageSent = null;
            test.onMessageReceived = null;
        }
    }
    messageReceived(message) {
        if ('id' in message && message.id) {
            const existingMessage = this.messageForId.get(message.id);
            if (!existingMessage) {
                return;
            }
            existingMessage.result = message.result;
            existingMessage.error = message.error;
            existingMessage.elapsedTime = Date.now() - this.startTime - existingMessage.requestTime;
            // Now we've updated the message, it won't be updated again, so we can delete it from the tracking map.
            this.messageForId.delete(message.id);
            this.requestUpdate();
            return;
        }
        const target = message.sessionId !== undefined ? this.#targetsBySessionId.get(message.sessionId) : undefined;
        this.#messages.push({
            method: message.method,
            sessionId: message.sessionId,
            target,
            requestTime: Date.now() - this.startTime,
            result: message.params,
        });
        this.requestUpdate();
    }
    messageSent(message) {
        const target = message.sessionId !== undefined ? this.#targetsBySessionId.get(message.sessionId) : undefined;
        const messageRecord = {
            method: message.method,
            params: message.params,
            id: message.id,
            sessionId: message.sessionId,
            target,
            requestTime: Date.now() - this.startTime,
        };
        this.#messages.push(messageRecord);
        this.requestUpdate();
        this.messageForId.set(message.id, messageRecord);
    }
    async saveAsFile() {
        const now = new Date();
        const fileName = 'ProtocolMonitor-' + Platform.DateUtilities.toISO8601Compact(now) + '.json';
        const stream = new Bindings.FileUtils.FileOutputStream();
        const accepted = await stream.open(fileName);
        if (!accepted) {
            return;
        }
        const rowEntries = this.#messages.map(m => ({ ...m, target: m.target?.id() }));
        void stream.write(JSON.stringify(rowEntries, null, '  '));
        void stream.close();
    }
}
export class CommandAutocompleteSuggestionProvider {
    #maxHistorySize = 200;
    #commandHistory = new Set();
    constructor(maxHistorySize) {
        if (maxHistorySize !== undefined) {
            this.#maxHistorySize = maxHistorySize;
        }
    }
    allSuggestions() {
        const newestToOldest = [...this.#commandHistory].reverse();
        newestToOldest.push(...metadataByCommand.keys());
        return newestToOldest;
    }
    buildTextPromptCompletions = async (expression, prefix, force) => {
        if (!prefix && !force && expression) {
            return [];
        }
        const newestToOldest = this.allSuggestions();
        return newestToOldest.filter(cmd => cmd.startsWith(prefix)).map(text => ({
            text,
        }));
    };
    addEntry(value) {
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
const INFO_WIDGET_VIEW = (input, _output, target) => {
    // clang-format off
    render(html `<devtools-widget .widgetConfig=${widgetConfig(UI.TabbedPane.TabbedPane, {
        tabs: [
            {
                id: 'request',
                title: i18nString(UIStrings.request),
                view: input.type === undefined ?
                    new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected), i18nString(UIStrings.selectAMessageToView)) :
                    SourceFrame.JSONView.JSONView.createViewSync(input.request || null),
                enabled: input.type === 'sent',
                selected: input.selectedTab === 'request',
            },
            {
                id: 'response',
                title: i18nString(UIStrings.response),
                view: input.type === undefined ?
                    new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.noMessageSelected), i18nString(UIStrings.selectAMessageToView)) :
                    SourceFrame.JSONView.JSONView.createViewSync(input.response || null),
                selected: input.selectedTab === 'response',
            }
        ]
    })}>
  </devtools-widget>`, target);
    // clang-format on
};
export class InfoWidget extends UI.Widget.VBox {
    #view;
    request;
    response;
    type;
    constructor(element, view = INFO_WIDGET_VIEW) {
        super(element);
        this.#view = view;
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            request: this.request,
            response: this.response,
            type: this.type,
            selectedTab: this.type !== 'sent' ? 'response' : undefined,
        }, undefined, this.contentElement);
    }
}
export function parseCommandInput(input) {
    // If input cannot be parsed as json, we assume it's the command name
    // for a command without parameters. Otherwise, we expect an object
    // with "command"/"method"/"cmd" and "parameters"/"params"/"args"/"arguments" attributes.
    let json = null;
    try {
        json = JSON.parse(input);
    }
    catch {
    }
    const command = json ? json.command || json.method || json.cmd || '' : input;
    const parameters = json?.parameters || json?.params || json?.args || json?.arguments || {};
    return { command, parameters };
}
function targetToString(target) {
    if (!target) {
        return '';
    }
    return target.decorateLabel(`${target.name()} ${target === SDK.TargetManager.TargetManager.instance().rootTarget() ? '' : target.id()}`);
}
//# sourceMappingURL=ProtocolMonitor.js.map