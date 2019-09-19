import { Logger } from "log4js";
import { Configuration } from "../../shared/configuration";
import { BundleItem } from "../bundle-item";
import { DependencyWalker } from "../dependency-walker";
import { SourceReader } from "./source-reader";
export declare class Resolver {
    private config;
    private dependencyWalker;
    private log;
    private sourceReader;
    private shims;
    private bowerPackages;
    private filenameCache;
    private lookupNameCache;
    constructor(config: Configuration, dependencyWalker: DependencyWalker, log: Logger, sourceReader: SourceReader);
    initialize(): void;
    resolveModule(requiringModule: string, bundleItem: BundleItem, buffer: BundleItem[], onModuleResolved: (bundleItem: BundleItem) => void): void;
    private tryResolveTypingAsJavascript;
    private cacheBowerPackages;
    private isInFilenameCache;
    private resolveCompilerPathModulename;
    private resolveFilename;
    private resolveDependencies;
}
