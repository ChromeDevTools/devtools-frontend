import * as Common from '../../../../core/common/common.js';
export declare class ContrastInfo extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    private contrastRatioThresholds;
    private fgColor;
    constructor(contrastInfo: ContrastInfoType | null);
    isNull(): boolean;
    setColor(fgColor: Common.Color.Legacy, colorFormat?: Common.Color.Format): void;
    colorFormat(): Common.Color.Format | undefined;
    color(): Common.Color.Legacy | null;
    contrastRatio(): number | null;
    contrastRatioAPCA(): number | null;
    contrastRatioAPCAThreshold(): number | null;
    setBgColor(bgColor: Common.Color.Legacy): void;
    bgColor(): Common.Color.Legacy | null;
    private updateContrastRatio;
    contrastRatioThreshold(level: string): number | null;
}
export declare const enum Events {
    CONTRAST_INFO_UPDATED = "ContrastInfoUpdated"
}
export interface EventTypes {
    [Events.CONTRAST_INFO_UPDATED]: void;
}
export interface ContrastInfoType {
    backgroundColors: string[] | null;
    computedFontSize: string;
    computedFontWeight: string;
}
