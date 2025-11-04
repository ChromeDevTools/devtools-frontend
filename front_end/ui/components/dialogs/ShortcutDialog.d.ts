import './ButtonDialog.js';
import type * as Platform from '../../../core/platform/platform.js';
declare global {
    interface HTMLElementTagNameMap {
        'devtools-shortcut-dialog': ShortcutDialog;
    }
}
export type ShortcutPart = {
    key: string;
} | {
    joinText: string;
};
export type ShortcutRow = ShortcutPart[] | {
    footnote: string;
};
export interface Shortcut {
    title: string | Platform.UIString.LocalizedString;
    rows: readonly ShortcutRow[];
}
export interface ShortcutDialogData {
    shortcuts: Shortcut[];
    open?: boolean;
    customTitle?: Platform.UIString.LocalizedString;
}
export declare class ShortcutDialog extends HTMLElement {
    #private;
    get data(): ShortcutDialogData;
    set data(data: ShortcutDialogData);
    prependElement(element: HTMLElement): void;
}
