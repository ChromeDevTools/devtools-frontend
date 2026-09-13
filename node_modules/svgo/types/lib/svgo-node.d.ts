export * from './svgo.js';
/**
 * If you write a tool on top of svgo you might need a way to load svgo config.
 * You can also specify relative or absolute path and customize current working
 * directory.
 *
 * @type {<T extends string | null>(configFile?: T, cwd?: string) => Promise<T extends string ? import('./svgo.js').Config : import('./svgo.js').Config | null>}
 */
export declare const loadConfig: <T extends string | null>(configFile?: T, cwd?: string) => Promise<T extends string ? import('./svgo.js').Config : import('./svgo.js').Config | null>;
/**
 * The core of SVGO.
 *
 * @param {string} input
 * @param {import('./svgo.js').Config=} config
 * @returns {import('./svgo.js').Output}
 */
export declare const optimize: (input: string, config?: import('./svgo.js').Config | undefined) => import('./svgo.js').Output;
