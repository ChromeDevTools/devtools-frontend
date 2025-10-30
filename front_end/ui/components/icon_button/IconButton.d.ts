import './Icon.js';
export interface IconWithTextData {
    iconName: string;
    iconColor?: string;
    iconWidth?: string;
    iconHeight?: string;
    text?: string;
}
export interface IconButtonData {
    clickHandler?: () => void;
    groups: IconWithTextData[];
    leadingText?: string;
    trailingText?: string;
    accessibleName?: string;
    compact?: boolean;
}
export declare class IconButton extends HTMLElement {
    #private;
    set data(data: IconButtonData);
    get data(): IconButtonData;
}
declare global {
    interface HTMLElementTagNameMap {
        'icon-button': IconButton;
    }
}
