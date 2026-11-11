import '../../../components/settings/settings.js';
import * as Common from '../../../../core/common/common.js';
import { nothing, type TemplateResult } from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';
export declare function createSettingCheckbox(name: Common.UIString.LocalizedString, setting: Common.Settings.Setting<boolean>, tooltip?: string): UI.UIUtils.CheckboxLabel;
/**
 * @param optionTextOverrides maps option values to the text that is shown instead of the registered option text.
 */
export declare function renderSettingSelect(setting: Common.Settings.Setting<unknown>, subtitle?: string, disabled?: boolean, optionTextOverrides?: ReadonlyMap<string, string>): TemplateResult;
export declare const renderControlForSetting: (setting: Common.Settings.Setting<unknown>, subtitle?: string, disabled?: boolean) => TemplateResult | typeof nothing;
export declare const createControlForSetting: (setting: Common.Settings.Setting<unknown>, subtitle?: string, disabled?: boolean) => HTMLElement | null;
