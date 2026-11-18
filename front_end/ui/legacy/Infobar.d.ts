import '../kit/kit.js';
import type * as Common from '../../core/common/common.js';
import * as Buttons from '../components/buttons/buttons.js';
import { type LitTemplate } from '../lit/lit.js';
import { Widget } from './Widget.js';
export type DetailsRowMessage = Element | string | LitTemplate;
export interface ViewInput {
    type: Type;
    text: string;
    actions?: InfobarAction[];
    hasDisableSetting: boolean;
    jslogContext?: string;
    detailsRows: readonly DetailsRowMessage[];
    onDisable: () => void;
    onAction: (action: InfobarAction) => void;
    onDismiss: () => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement | ShadowRoot) => void;
export declare const DEFAULT_VIEW: View;
export declare class Infobar extends Widget<ShadowRoot> {
    #private;
    constructor(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>, jslogContext?: string, view?: View);
    constructor(element?: HTMLElement, view?: View);
    static create(type: Type, text: string, actions?: InfobarAction[], disableSetting?: Common.Settings.Setting<boolean>, jslogContext?: string, view?: View): Infobar | null;
    get type(): Type;
    set type(type: Type);
    get text(): string;
    set text(text: string);
    get actions(): InfobarAction[] | undefined;
    set actions(actions: InfobarAction[] | undefined);
    get disableSetting(): Common.Settings.Setting<boolean> | null;
    set disableSetting(disableSetting: Common.Settings.Setting<boolean> | null);
    get jslogContext(): string | undefined;
    set jslogContext(jslogContext: string | undefined);
    get detailsRows(): readonly DetailsRowMessage[];
    set detailsRows(detailsRows: readonly DetailsRowMessage[]);
    get onClose(): (() => void) | null;
    set onClose(callback: (() => void) | null);
    dispose(): void;
    setText(text: string): void;
    setCloseCallback(callback: (() => void) | null): void;
    setParentView(parentView: Widget): void;
    wasShown(): void;
    wasHidden(): void;
    performUpdate(): void;
    createDetailsRowMessage(message: DetailsRowMessage): void;
}
export interface InfobarAction {
    text: string;
    delegate: (() => void) | null;
    dismiss: boolean;
    buttonVariant?: Buttons.Button.Variant;
    jslogContext?: string;
}
export declare const enum Type {
    WARNING = "warning",
    INFO = "info",
    ISSUE = "issue",
    ERROR = "error"
}
