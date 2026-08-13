// Copyright 2018 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as ProtocolClient from '../../core/protocol_client/protocol_client.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../ui/helpers/helpers.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { JSONEditor } from './JSONEditor.js';
import protocolMonitorStyles from './protocolMonitor.css.js';
const { styleMap } = Directives;
const { widget, widgetRef } = UI.Widget;
const UIStrings = {
    /**
     * @description Table column header in the Protocol monitor data grid that displays the CDP method name (for example, Page.navigate or Network.enable).
     */
    method: 'Method',
    /**
     * @description Table column header in the Protocol monitor data grid that indicates message direction ('sent' or 'received').
     */
    type: 'Type',
    /**
     * @description Table column header in the Protocol monitor data grid and tab title in the info widget for sent CDP request parameters.
     */
    request: 'Request',
    /**
     * @description Table column header in the Protocol monitor data grid and tab title in the info widget for received CDP response results or error payloads.
     */
    response: 'Response',
    /**
     * @description Table column header in the Protocol monitor data grid showing the time when the message was sent or received relative to when recording started.
     */
    timestamp: 'Timestamp',
    /**
     * @description Table column header in the Protocol monitor data grid showing the duration between sending a request and receiving a response.
     */
    elapsedTime: 'Elapsed time',
    /**
     * @description Table column header in the Protocol monitor data grid displaying the name and URL of the target associated with the protocol message.
     */
    target: 'Target',
    /**
     * @description Tooltip text for the record button in the Protocol monitor toolbar to start or stop recording CDP messages.
     */
    record: 'Record',
    /**
     * @description Tooltip text for the clear button in the Protocol monitor toolbar that clears the table of recorded CDP messages.
     */
    clearAll: 'Clear all',
    /**
     * @description Context menu action when right-clicking a row in the Protocol monitor data grid to filter the table by that row's method name.
     */
    filter: 'Filter',
    /**
     * @description Context menu action when right-clicking a row in the Protocol monitor data grid to open the official Chrome DevTools Protocol web documentation for the selected method.
     */
    documentation: 'Documentation',
    /**
     * @description Context menu action when right-clicking a row in the Protocol monitor data grid to open the CDP command editor pre-populated with that row's method and parameters.
     */
    editAndResend: 'Edit and resend',
    /**
     * @description Format string for time values in milliseconds shown in the Elapsed time and Timestamp table cells in the Protocol monitor data grid.
     * @example {30} PH1
     */
    sMs: '{PH1} ms',
    /**
     * @description Header text shown in the info widget sidebar tabs when no protocol message is selected in the table.
     */
    noMessageSelected: 'No message selected',
    /**
     * @description Description text shown in the info widget sidebar tabs instructing the user to select a protocol message from the table to inspect its details.
     */
    selectAMessageToView: 'Select a message to see its details',
    /**
     * @description Tooltip text for the save button in the Protocol monitor toolbar that exports the recorded CDP messages as a JSON file.
     */
    save: 'Save',
    /**
     * @description Table column header in the Protocol monitor data grid displaying the CDP session identifier associated with the message.
     */
    session: 'Session',
    /**
     * @description Placeholder text for the command input field in the bottom toolbar of the Protocol monitor panel where raw CDP commands or JSON payloads can be typed and sent.
     */
    sendRawCDPCommand: 'Send a raw CDP command',
    /**
     * @description Tooltip text displayed when hovering over the command input field in the bottom toolbar, explaining the expected syntax for sending raw CDP commands.
     */
    sendRawCDPCommandExplanation: 'Format: \'Domain.commandName\' for a command without parameters, or \'{"command":"Domain.commandName", "parameters": {…}}\' as a JSON object for a command with parameters. \'cmd\'/\'method\' and \'args\'/\'params\'/\'arguments\' are also supported as alternative keys for the JSON object.',
    /**
     * @description Tooltip text for the target selector dropdown in the Protocol monitor and CDP command editor allowing users to choose which CDP target receives commands.
     */
    selectTarget: 'Select target',
    /**
     * @description Tooltip text for the bottom toolbar toggle button when the CDP command editor sidebar is hidden, prompting the user to open/show it.
     */
    showCDPCommandEditor: 'Show CDP command editor',
    /**
     * @description Tooltip text for the bottom toolbar toggle button when the CDP command editor sidebar is visible, prompting the user to hide/close it.
     */
    hideCDPCommandEditor: 'Hide CDP command editor',
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
                  .columnsVisibilitySetting=${input.columnsVisibilitySetting}
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
              <devtools-widget ${widget(InfoWidget, {
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
              ${widget(JSONEditor, { metadataByCommand, typesByName, enumsByName })}
              @submiteditor=${(e) => input.onEditorSubmit(e.detail.command, e.detail.parameters, e.detail.targetId)}
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
    #columnsVisibilitySetting = Common.Settings.Settings.instance().createSetting('protocol-monitor-columns', {});
    constructor(view = DEFAULT_VIEW) {
        super('protocol-monitor', true);
        this.#view = view;
        this.started = false;
        this.startTime = 0;
        this.#filterKeys = ['method', 'request', 'response', 'type', 'target', 'session'];
        this.filterParser = new TextUtils.TextUtils.FilterParser(this.#filterKeys);
        this.#selectedTargetId = 'main';
        this.performUpdate();
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
            onEditorSubmit: (command, parameters, targetId) => {
                this.onCommandSend(command, parameters, targetId);
            },
            columnsVisibilitySetting: this.#columnsVisibilitySetting,
            targets: SDK.TargetManager.TargetManager.instance().targets(),
            selectedTargetId: this.#selectedTargetId,
        };
        const that = this;
        const viewOutput = {
            set editorWidget(value) {
                that.#editorWidget = value;
            },
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
            UIHelpers.openInNewTab(`https://chromedevtools.github.io/devtools-protocol/tot/${domain}#${type}-${method}`);
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
        const stream = new Bindings.FileUtils.FileOutputStream(Workspace.FileManager.FileManager.instance());
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
    render(html `
    <devtools-tabbed-pane>${input.type === undefined ? html `
      <devtools-widget
          id="request" title=${i18nString(UIStrings.request)}
          ?selected=${input.selectedTab === 'request'} disabled
          ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noMessageSelected),
        text: i18nString(UIStrings.selectAMessageToView)
    })}>
      </devtools-widget>
      <devtools-widget
          id="response" title=${i18nString(UIStrings.response)}
          ?selected=${input.selectedTab === 'response'}
          ${widget(UI.EmptyWidget.EmptyWidget, {
        header: i18nString(UIStrings.noMessageSelected),
        text: i18nString(UIStrings.selectAMessageToView)
    })}>
      </devtools-widget>` : html `
      <devtools-widget
          id="request" title=${i18nString(UIStrings.request)}
          ?selected=${input.selectedTab === 'request'} ?disabled=${input.type !== 'sent'}
          ${widget(SourceFrame.JSONView.SearchableJsonView, { jsonObject: input.request })}>
      </devtools-widget>
      <devtools-widget
          id="response" title=${i18nString(UIStrings.response)}
          ?selected=${input.selectedTab === 'response'}
          ${widget(SourceFrame.JSONView.SearchableJsonView, { jsonObject: input.response })}>
      </devtools-widget>`}
    </devtools-tabbed-pane>`, target);
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