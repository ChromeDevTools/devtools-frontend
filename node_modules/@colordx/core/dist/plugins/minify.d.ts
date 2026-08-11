import { s as Plugin } from '../colordx-DmR1sN5A.js';

interface MinifyOptions {
    hex?: boolean;
    rgb?: boolean;
    hsl?: boolean;
    alphaHex?: boolean;
    transparent?: boolean;
    name?: boolean;
}
declare module '@colordx/core' {
    interface Colordx {
        minify(options?: MinifyOptions): string;
    }
}
declare const minifyPlugin: Plugin;

export { minifyPlugin as default };
