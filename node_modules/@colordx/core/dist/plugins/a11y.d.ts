import { A as AnyColor, s as Plugin } from '../colordx-DmR1sN5A.js';

declare module '@colordx/core' {
    interface Colordx {
        luminance(): number;
        contrast(color?: AnyColor | Colordx): number;
        isReadable(background?: AnyColor, options?: {
            level?: 'AA' | 'AAA';
            size?: 'normal' | 'large';
        }): boolean;
        readableScore(background?: AnyColor): 'AAA' | 'AA' | 'AA large' | 'fail';
        minReadable(background?: AnyColor): Colordx;
        apcaContrast(background?: AnyColor): number;
        isReadableApca(background?: AnyColor, options?: {
            size?: 'normal' | 'large';
        }): boolean;
    }
}
declare const a11y: Plugin;

export { a11y as default };
