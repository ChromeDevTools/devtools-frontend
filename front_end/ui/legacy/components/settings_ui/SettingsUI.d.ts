import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';
export declare function createSettingCheckbox(name: Common.UIString.LocalizedString, setting: Common.Settings.Setting<boolean>, tooltip?: string): UI.UIUtils.CheckboxLabel;
export declare const createControlForSetting: (setting: Common.Settings.Setting<unknown>, subtitle?: string) => HTMLElement | null;
