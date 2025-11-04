import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
interface SettingItem {
    iconName: string;
    text: Common.UIString.LocalizedString;
}
interface AiSettingParams {
    settingName: Platform.UIString.LocalizedString;
    iconName: string;
    settingDescription: Platform.UIString.LocalizedString;
    enableSettingText: Common.UIString.LocalizedString;
    settingItems: SettingItem[];
    toConsiderSettingItems: SettingItem[];
    learnMoreLink: {
        url: string;
        linkJSLogContext: string;
    };
    settingExpandState: {
        isSettingExpanded: boolean;
        expandSettingJSLogContext: string;
    };
}
interface ViewInput {
    disabledReasons: string[];
    sharedDisclaimerBulletPoints: Array<{
        icon: string;
        text: Common.UIString.LocalizedString | Lit.TemplateResult;
    }>;
    settingToParams: Map<Common.Settings.Setting<boolean>, AiSettingParams>;
    expandSetting(setting: Common.Settings.Setting<boolean>): void;
    toggleSetting(setting: Common.Settings.Setting<boolean>, ev: Event): void;
}
type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const AI_SETTINGS_TAB_DEFAULT_VIEW: View;
export declare class AISettingsTab extends UI.Widget.VBox {
    #private;
    constructor(view?: View);
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export {};
