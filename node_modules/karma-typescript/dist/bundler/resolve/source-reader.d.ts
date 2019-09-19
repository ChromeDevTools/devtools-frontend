import { Logger } from "log4js";
import { Configuration } from "../../shared/configuration";
import { BundleItem } from "../bundle-item";
import { Transformer } from "../transformer";
export declare class SourceReader {
    private config;
    private log;
    private transformer;
    constructor(config: Configuration, log: Logger, transformer: Transformer);
    read(bundleItem: BundleItem, onSourceRead: () => void): void;
    private readFile;
    private assertValidNonScriptSource;
    private createAbstractSyntaxTree;
}
