import { Loader, LoaderSync, Options, OptionsSync } from './index';
export declare type Config = any;
export declare type CosmiconfigResult = {
    config: Config;
    filepath: string;
    isEmpty?: boolean;
} | null;
export interface InternalOptions {
    usePackagePropInConfigFiles?: boolean;
    metaConfigFilePath: string | null;
}
export interface ExplorerOptions extends Required<Options>, InternalOptions {
}
export interface ExplorerOptionsSync extends Required<OptionsSync>, InternalOptions {
}
export declare type Cache = Map<string, CosmiconfigResult>;
export declare type LoadedFileContent = Config | null | undefined;
export interface Loaders {
    [key: string]: Loader;
}
export interface LoadersSync {
    [key: string]: LoaderSync;
}
//# sourceMappingURL=types.d.ts.map