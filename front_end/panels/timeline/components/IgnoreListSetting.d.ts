import '../../../ui/components/menus/menus.js';
import * as Common from '../../../core/common/common.js';
import * as UI from '../../../ui/legacy/legacy.js';
interface ViewInput {
    ignoreListEnabled: boolean;
    regexes: Common.Settings.RegExpSettingItem[];
    newRegexValue: string;
    newRegexChecked: boolean;
    onExistingRegexEnableToggle: (regex: Common.Settings.RegExpSettingItem, checked: boolean) => void;
    onRemoveRegexByIndex: (index: number) => void;
    onNewRegexInputBlur: (value: string) => void;
    onNewRegexInputChange: (value: string) => void;
    onNewRegexInputFocus: (value: string) => void;
    onNewRegexAdd: (value: string) => void;
    onNewRegexCancel: () => void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class IgnoreListSetting extends UI.Widget.Widget {
    #private;
    static createWidgetElement(): UI.Widget.WidgetElement<IgnoreListSetting>;
    constructor(element?: HTMLElement, view?: View);
    performUpdate(): void;
}
/**
 * Returns if a new regex string is valid to be added to the ignore list.
 * Note that things like duplicates are handled by the IgnoreList for us.
 *
 * @param inputValue the text input from the user we need to validate.
 */
export declare function regexInputIsValid(inputValue: string): boolean;
export {};
