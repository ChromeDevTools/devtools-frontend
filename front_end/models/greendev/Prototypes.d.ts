import * as Common from '../../core/common/common.js';
export interface GreenDevSettings {
    inDevToolsFloaty: Common.Settings.Setting<boolean>;
    inlineWidgets: Common.Settings.Setting<boolean>;
    artifactViewer: Common.Settings.Setting<boolean>;
    aiAnnotations: Common.Settings.Setting<boolean>;
    copyToGemini: Common.Settings.Setting<boolean>;
}
export declare class Prototypes {
    private constructor();
    static instance(): Prototypes;
    /**
     * Returns true if the specific setting is turned on AND the GreenDev flag is enabled
     */
    isEnabled(setting: keyof GreenDevSettings): boolean;
    settings(): Readonly<GreenDevSettings>;
}
