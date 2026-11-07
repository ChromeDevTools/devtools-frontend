import '../../../ui/kit/kit.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../../ui/lit/lit.js';
export interface Hint {
    getMessage(): LitTemplate | string;
    getPossibleFixMessage(): LitTemplate | string | null;
    getLearnMoreLink(): string | undefined;
}
export interface ViewInput {
    authoringHint?: Hint;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CSSHintDetailsView extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    get authoringHint(): Hint | undefined;
    set authoringHint(authoringHint: Hint | undefined);
    performUpdate(): void;
}
