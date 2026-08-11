import { s as Plugin } from '../colordx-DmR1sN5A.js';

declare module '@colordx/core' {
    interface Colordx {
        toName(options?: {
            closest?: boolean;
        }): string | undefined;
    }
}
declare const names: Plugin;

export { names as default };
