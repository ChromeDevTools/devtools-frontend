import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { JSONEditor, type Parameter } from './JSONEditor.js';
export declare const buildProtocolMetadata: (domains: Iterable<ProtocolDomain>) => Map<string, {
    parameters: Parameter[];
    description: string;
    replyArgs: string[];
}>;
export interface Message {
    id?: number;
    method: string;
    error?: Record<string, unknown>;
    result?: Record<string, unknown>;
    params?: Record<string, unknown>;
    requestTime: number;
    elapsedTime?: number;
    sessionId?: string;
    target?: SDK.Target.Target;
}
export interface LogMessage {
    id?: number;
    domain: string;
    method: string;
    params: Object;
    type: 'send' | 'recv';
}
export interface ProtocolDomain {
    readonly domain: string;
    readonly metadata: Record<string, {
        parameters: Parameter[];
        description: string;
        replyArgs: string[];
    }>;
}
export interface ViewInput {
    messages: Message[];
    selectedMessage?: Message;
    sidebarVisible: boolean;
    command: string;
    commandSuggestions: string[];
    filterKeys: string[];
    filter: string;
    parseFilter: (filter: string) => TextUtils.TextUtils.ParsedFilter[];
    onRecord: (record: boolean) => void;
    onClear: () => void;
    onSave: () => void;
    onSplitChange: (onlyMain: boolean) => void;
    onSelect: (e: Message | undefined) => void;
    onContextMenu: (message: Message, menu: UI.ContextMenu.ContextMenu) => void;
    onFilterChanged: (filter: string) => void;
    onCommandChange: (command: string) => void;
    onCommandSubmitted: (input: string) => void;
    onTargetChange: (targetId: string) => void;
    onToggleSidebar: () => void;
    targets: SDK.Target.Target[];
    selectedTargetId: string;
}
export interface ViewOutput {
    editorWidget: JSONEditor;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ProtocolMonitorImpl extends UI.Panel.Panel implements SDK.TargetManager.Observer {
    #private;
    private started;
    private startTime;
    private readonly messageForId;
    private readonly filterParser;
    constructor(view?: View);
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    performUpdate(): void;
    onCommandSend(command: string, parameters: object, target?: string): void;
    wasShown(): void;
    private setRecording;
    private messageReceived;
    private messageSent;
    private saveAsFile;
}
export declare class CommandAutocompleteSuggestionProvider {
    #private;
    constructor(maxHistorySize?: number);
    allSuggestions(): string[];
    buildTextPromptCompletions: (expression: string, prefix: string, force?: boolean) => Promise<UI.SuggestBox.Suggestions>;
    addEntry(value: string): void;
}
interface InfoWidgetViewInput {
    request: Record<string, unknown> | undefined;
    response: Record<string, unknown> | undefined;
    type: 'sent' | 'received' | undefined;
    selectedTab: 'request' | 'response' | undefined;
}
type InfoWidgetView = (input: InfoWidgetViewInput, output: undefined, target: HTMLElement) => void;
export declare class InfoWidget extends UI.Widget.VBox {
    #private;
    request: Record<string, unknown> | undefined;
    response: Record<string, unknown> | undefined;
    type: 'sent' | 'received' | undefined;
    constructor(element: HTMLElement, view?: InfoWidgetView);
    performUpdate(): void;
}
export declare function parseCommandInput(input: string): {
    command: string;
    parameters: Record<string, unknown>;
};
export {};
