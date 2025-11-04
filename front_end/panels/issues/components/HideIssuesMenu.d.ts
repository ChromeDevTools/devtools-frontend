import * as Common from '../../../core/common/common.js';
export interface HiddenIssuesMenuData {
    menuItemLabel: Common.UIString.LocalizedString;
    menuItemAction: () => void;
}
export declare class HideIssuesMenu extends HTMLElement {
    #private;
    set data(data: HiddenIssuesMenuData);
    onMenuOpen(event: Event): void;
    onKeydown(event: KeyboardEvent): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-hide-issues-menu': HideIssuesMenu;
    }
}
