import * as convertSourceMap from "convert-source-map";
export declare class BundleItem {
    moduleName: string;
    filename?: string;
    source?: string;
    sourceMap?: convertSourceMap.SourceMapConverter;
    dependencies: BundleItem[];
    ast?: acorn.Node;
    lookupName?: string;
    transformedScript: boolean;
    constructor(moduleName: string, filename?: string, source?: string, sourceMap?: convertSourceMap.SourceMapConverter, dependencies?: BundleItem[]);
    isNpmModule(): boolean;
    isScript(): boolean;
    isTypingsFile(): boolean;
    isTypescriptFile(): boolean;
}
