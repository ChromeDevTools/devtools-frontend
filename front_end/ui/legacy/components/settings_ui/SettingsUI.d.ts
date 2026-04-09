import * as Common from '../../../../core/common/common.js';
import { type TemplateResult } from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';
export declare function createSettingCheckbox(name: Common.UIString.LocalizedString, setting: Common.Settings.Setting<boolean>, tooltip?: string): UI.UIUtils.CheckboxLabel;
export declare function renderSettingSelect(setting: Common.Settings.Setting<unknown>, subtitle?: string): TemplateResult;
export declare const createControlForSetting: (setting: Common.Settings.Setting<unknown>, subtitle?: string) => HTMLElement | null;
