import '../../../ui/legacy/legacy.js';
interface Hint {
    getMessage(): string;
    getPossibleFixMessage(): string | null;
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
