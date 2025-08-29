export * from "./types.js";
export function optimize(input: string, config?: import("./types.js").Config | undefined): import("./types.js").Output;
import { VERSION } from './version.js';
import { builtinPlugins } from './builtin.js';
import { mapNodesToParents } from './util/map-nodes-to-parents.js';
import { querySelector } from './xast.js';
import { querySelectorAll } from './xast.js';
import * as _collections from '../plugins/_collections.js';
export { VERSION, builtinPlugins, mapNodesToParents, querySelector, querySelectorAll, _collections };
