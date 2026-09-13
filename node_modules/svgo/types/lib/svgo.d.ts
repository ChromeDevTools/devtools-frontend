import { builtinPlugins } from './builtin.js';
import { querySelector, querySelectorAll } from './xast.js';
import { mapNodesToParents } from './util/map-nodes-to-parents.js';
import { VERSION } from './version.js';
import * as _collections from '../plugins/_collections.js';
export * from './types.js';
/**
 * The core of SVGO.
 *
 * @param {string} input
 * @param {import('./types.js').Config=} config
 * @returns {import('./types.js').Output}
 */
export declare const optimize: (input: string, config?: import('./types.js').Config | undefined) => import('./types.js').Output;
export { VERSION, builtinPlugins, mapNodesToParents, querySelector, querySelectorAll, _collections, };
