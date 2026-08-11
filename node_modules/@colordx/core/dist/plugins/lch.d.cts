import { m as LchColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toLch(precision?: number): LchColor;
        toLchString(precision?: number): string;
    }
}
declare const lch: Plugin;

export { lch as default };
