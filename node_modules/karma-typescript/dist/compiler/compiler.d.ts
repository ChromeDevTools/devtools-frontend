import { Logger } from "log4js";
import { Configuration } from "../shared/configuration";
import { File } from "../shared/file";
import { Project } from "../shared/project";
import { CompileCallback } from "./compile-callback";
export declare class Compiler {
    private config;
    private log;
    private project;
    private cachedProgram;
    private compiledFiles;
    private compilerHost;
    private emitQueue;
    private errors;
    private hostGetSourceFile;
    private program;
    private compileDeferred;
    constructor(config: Configuration, log: Logger, project: Project);
    compile(file: File, callback: CompileCallback): void;
    private compileProject;
    private setupRecompile;
    private onProgramCompiled;
    private getSourceFile;
    private isQueued;
    private runDiagnostics;
    private outputDiagnostics;
    private fileExtensionIs;
    private endsWith;
}
