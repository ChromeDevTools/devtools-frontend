import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    label: Platform.UIString.LocalizedString;
    onEnter: (value: string) => void;
    onInputChange: (value: string) => void;
    apply: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class AddDebugInfoURLDialog extends UI.Widget.HBox {
    private url;
    private readonly dialog;
    private readonly callback;
    private constructor();
    static createAddSourceMapURLDialog(callback: (arg0: Platform.DevToolsPath.UrlString) => void): AddDebugInfoURLDialog;
    static createAddDWARFSymbolsURLDialog(callback: (arg0: Platform.DevToolsPath.UrlString) => void): AddDebugInfoURLDialog;
    show(): void;
    private done;
    private onInputChange;
    private apply;
    private onEnter;
}
export {};
