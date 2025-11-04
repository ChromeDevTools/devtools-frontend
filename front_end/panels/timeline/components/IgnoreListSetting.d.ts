import '../../../ui/components/menus/menus.js';
export declare class IgnoreListSetting extends HTMLElement {
    #private;
    constructor();
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-perf-ignore-list-setting': IgnoreListSetting;
    }
}
/**
 * Returns if a new regex string is valid to be added to the ignore list.
 * Note that things like duplicates are handled by the IgnoreList for us.
 *
 * @param inputValue the text input from the user we need to validate.
 */
export declare function regexInputIsValid(inputValue: string): boolean;
