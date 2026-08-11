import { h as HsvColor, s as Plugin } from '../colordx-DmR1sN5A.cjs';

declare module '@colordx/core' {
    interface Colordx {
        toHsv(precision?: number): HsvColor;
        toHsvString(precision?: number): string;
    }
}
declare const hsv: Plugin;

export { hsv as default };
