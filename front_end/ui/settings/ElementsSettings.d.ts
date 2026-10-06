import * as Common from '../../core/common/common.js';
export declare const showUAShadowDOMSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const domWordWrapSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showHTMLCommentsSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const highlightNodeOnHoverInOverlaySettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showDetailedInspectTooltipSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const cssAnimationsOnlyWhenAnimationsTabOpenSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const collapseNonContributingCSSRulesSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showInactiveCSSRulesSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showEventListenersForAncestorsSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export interface AdornerSetting {
    adorner: string;
    isEnabled: boolean;
}
export declare const adornerSettingsSettingDescriptor: Common.Settings.SettingDescriptor<AdornerSetting[]>;
export declare const showCSSPropertyDocumentationOnHoverSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showFrameworkListenersSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
