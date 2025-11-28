import '../../kit/kit.js';
export interface FileSourceIconData {
    iconType?: string;
    contentType?: string;
    hasDotBadge?: boolean;
    isDotPurple?: boolean;
}
export declare class FileSourceIcon extends HTMLElement {
    #private;
    set data(data: FileSourceIconData);
    get data(): FileSourceIconData;
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-file-source-icon': FileSourceIcon;
    }
}
