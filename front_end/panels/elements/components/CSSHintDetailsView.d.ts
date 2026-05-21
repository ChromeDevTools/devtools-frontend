import '../../../ui/kit/kit.js';
import '../../../ui/legacy/legacy.js';
import { type LitTemplate } from '../../../ui/lit/lit.js';
interface Hint {
    getMessage(): LitTemplate | string;
    getPossibleFixMessage(): LitTemplate | string | null;
    getLearnMoreLink(): string | undefined;
}
export declare class CSSHintDetailsView extends HTMLElement {
    #private;
    constructor(authoringHint: Hint);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-hint-details-view': CSSHintDetailsView;
    }
}
export {};
