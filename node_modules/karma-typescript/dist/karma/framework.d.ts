import { ConfigOptions } from "karma";
import { Bundler } from "../bundler/bundler";
import { Resolver } from "../bundler/resolve/resolver";
import { Configuration } from "../shared/configuration";
export declare class Framework {
    create: (karmaConfig: ConfigOptions, helper: any, logger: any) => void;
    private log;
    private stringify;
    constructor(bundler: Bundler, config: Configuration, resolver: Resolver);
    private replacer;
}
