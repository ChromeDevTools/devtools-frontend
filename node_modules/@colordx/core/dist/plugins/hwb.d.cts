import { j as HwbColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toHwb(precision?: number): HwbColor;
        toHwbString(precision?: number): string;
    }
}
declare const hwb: Plugin;

export { hwb as default };
