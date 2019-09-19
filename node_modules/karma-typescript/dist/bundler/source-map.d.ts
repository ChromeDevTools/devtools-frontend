import * as convertSourceMap from "convert-source-map";
import { Logger } from "log4js";
import { Configuration } from "../shared/configuration";
import { BundleItem } from "./bundle-item";
import { Queued } from "./queued";
export declare class SourceMap {
    private config;
    private log;
    private combiner;
    private line;
    constructor(config: Configuration, log: Logger);
    initialize(bundle: string): void;
    removeSourceMapComment(queued: Queued): string;
    getSourceMap(queued: Queued): convertSourceMap.SourceMapConverter;
    addFile(bundleItem: BundleItem): void;
    offsetLineNumber(wrappedSource: string): void;
    getComment(): string;
    loadFileFromComment(bundleItem: BundleItem): void;
    private cleanupSources;
    private getNumberOfNewlines;
}
