import * as ts from "typescript";
import { Logger } from "log4js";
import { Configuration } from "./configuration";
export declare enum EventType {
    FileSystemChanged = 0,
    FileContentChanged = 1
}
export declare class Project {
    private config;
    private log;
    private karmaFiles;
    private tsconfig;
    constructor(config: Configuration, log: Logger);
    getKarmaFiles(): string[];
    getTsconfig(): ts.ParsedCommandLine;
    hasCompatibleModuleKind(): boolean;
    getModuleKind(): string;
    handleFileEvent(): EventType;
    private expandKarmaFilePatterns;
    private resolveTsConfig;
    private getTsconfigFilename;
    private getExistingOptions;
    private getConfigFileJson;
    private parseConfigFileJson;
    private assertModuleKind;
    private resolveBasepath;
    private convertOptions;
    private setOptions;
}
