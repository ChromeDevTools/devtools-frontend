import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type CoverageListItem } from './CoverageListView.js';
import { CoverageModel } from './CoverageModel.js';
export interface CoverageViewInput {
    coverageType: number;
    recording: boolean;
    supportsRecordOnReload: boolean;
    textFilter: RegExp | null;
    typeFilter: number | null;
    showContentScriptsSetting: Common.Settings.Setting<boolean>;
    needsReload: 'bfcache-page' | 'prerender-page' | null;
    coverageInfo: CoverageListItem[] | null;
    selectedUrl: Platform.DevToolsPath.UrlString | null;
    statusMessage: string;
    onCoverageTypeChanged: (newValue: number) => void;
    onFilterChanged: (e: string) => void;
    onTypeFilterChanged: (newValue: number) => void;
}
export interface CoverageViewOutput {
    focusResults: () => void;
}
export type View = (input: CoverageViewInput, output: CoverageViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CoverageView extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    static instance(): CoverageView;
    static removeInstance(): void;
    clear(): void;
    toggleRecording(): void;
    isBlockCoverageSelected(): boolean;
    startRecording(options: {
        reload: (boolean | undefined);
        jsCoveragePerBlock: (boolean | undefined);
    } | null): Promise<void>;
    stopRecording(): Promise<void>;
    exportReport(): Promise<void>;
    selectCoverageItemByUrl(url: string): void;
    static readonly EXTENSION_BINDINGS_URL_PREFIX = "extensions::";
    wasShown(): void;
    willHide(): void;
    get model(): CoverageModel | null;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    #private;
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
