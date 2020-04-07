import { Bundler } from "../bundler/bundler";
import { Compiler } from "../compiler/compiler";
import { Coverage } from "../istanbul/coverage";
import { Configuration } from "../shared/configuration";
export declare class Preprocessor {
    private config;
    create: (helper: any, logger: any) => void;
    private log;
    constructor(bundler: Bundler, compiler: Compiler, config: Configuration, coverage: Coverage);
}
