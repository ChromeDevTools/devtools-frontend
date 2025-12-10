import * as Common from '../../core/common/common.js';
export interface GreenDevSettings {
    inDevToolsFloaty: Common.Settings.Setting<boolean>;
    inlineWidgets: Common.Settings.Setting<boolean>;
    aiAnnotations: Common.Settings.Setting<boolean>;
}
export declare class Prototypes {
    private constructor();
    static instance(): Prototypes;
    isEnabled(setting: 'inDevToolsFloaty' | 'inlineWidgets' | 'aiAnnotations'): boolean;
    settings(): Readonly<GreenDevSettings>;
}
