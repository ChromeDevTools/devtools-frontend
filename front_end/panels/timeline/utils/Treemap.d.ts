import * as Trace from '../../../models/trace/trace.js';
interface TreemapNode {
    /** Could be a url, a path component from a source map, or an arbitrary string. */
    name: string;
    resourceBytes: number;
    /** Transfer size of the script. Only set for non-inline top-level script nodes. */
    encodedBytes?: number;
    /** If present, this module is a duplicate. String is normalized source path. See ScriptDuplication.normalizeSource */
    duplicatedNormalizedModuleName?: string;
    children?: TreemapNode[];
}
export type TreemapData = TreemapNode[];
type SourceData = Omit<TreemapNode, 'name' | 'children'>;
/**
 * Opens a new tab to the treemap app and sends the data using URL.fragment
 */
export declare function openTreemap(treemapData: TreemapData, mainDocumentUrl: string, windowNameSuffix: string): void;
/**
 * Returns a tree data structure where leaf nodes are sources (ie. real files from
 * source tree) from a source map, and non-leaf nodes are directories. Leaf nodes
 * have data for bytes, coverage, etc., when available, and non-leaf nodes have the
 * same data as the sum of all descendant leaf nodes.
 */
export declare function makeScriptNode(src: string, sourceRoot: string, sourcesData: Record<string, SourceData>): TreemapNode;
/**
 * Returns an array of nodes, where the first level of nodes represents every script.
 *
 * Every external script has a node.
 * All inline scripts are combined into a single node.
 * If a script has a source map, that node will be created by makeScriptNode.
 *
 * Example return result:
 *  - index.html (inline scripts)
 *  - main.js
 *  - - webpack://
 *  - - - react.js
 *  - - - app.js
 *  - i-have-no-map.js
 */
export declare function createTreemapData(scripts: Trace.Handlers.ModelHandlers.Scripts.ScriptsData, duplication: Trace.Extras.ScriptDuplication.ScriptDuplication): TreemapData;
export {};
