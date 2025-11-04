import * as Common from '../../../../core/common/common.js';
type Label = 'RGBA' | 'HSLA' | 'HWBA' | 'lchA' | 'labA' | 'xyzA';
interface ColorFormatSpec {
    label: Label;
    toValues(color: Common.Color.Color): [string, string, string, string];
    fromValues(values: [string, string, string, string]): Common.Color.Color | null;
}
export type SpectrumColorFormat = Exclude<Common.Color.Format, Common.Color.Format.RGBA | Common.Color.Format.HSLA | Common.Color.Format.HWBA | Common.Color.Format.HEXA>;
export declare const colorFormatSpec: Record<Exclude<SpectrumColorFormat, Common.Color.Format.HEX>, ColorFormatSpec>;
export {};
