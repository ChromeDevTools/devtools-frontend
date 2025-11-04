import '../icon_button/icon_button.js';
import * as Common from '../../../core/common/common.js';
export declare class SettingDeprecationWarning extends HTMLElement {
    #private;
    set data(data: Common.Settings.Deprecation);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-setting-deprecation-warning': SettingDeprecationWarning;
    }
}
