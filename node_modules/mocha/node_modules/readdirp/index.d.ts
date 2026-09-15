/**
 * Recursive version of readdir. Exposes a streaming API and promise API.
 * Streaming API allows to use a small amount of RAM.
 *
 * @module
 * @example
```js
import readdirp from 'readdirp';
for await (const entry of readdirp('.')) {
  const {path} = entry;
  console.log(`${JSON.stringify({path})}`);
}
```
 */
/*! readdirp - MIT License (c) 2012-2019 Thorsten Lorenz, Paul Miller (https://paulmillr.com) */
import type { Dirent, Stats } from 'node:fs';
import { Readable } from 'node:stream';
/** Path in file system. */
export type Path = string;
/** Emitted entry. Contains relative & absolute path, basename, and either stats or dirent. */
export interface EntryInfo {
    path: string;
    fullPath: string;
    stats?: Stats;
    dirent?: Dirent;
    basename: string;
}
/** Path or dir entries (files) */
export type PathOrDirent = Dirent | Path;
/** Filterer for files */
export type Tester = (entryInfo: EntryInfo) => boolean;
export type Predicate = string[] | string | Tester;
export declare const EntryTypes: {
    readonly FILE_TYPE: "files";
    readonly DIR_TYPE: "directories";
    readonly FILE_DIR_TYPE: "files_directories";
    readonly EVERYTHING_TYPE: "all";
};
export type EntryType = (typeof EntryTypes)[keyof typeof EntryTypes];
/**
 * Options for readdirp.
 * * type: files, directories, or both
 * * lstat: whether to use symlink-friendly stat
 * * depth: max depth
 * * alwaysStat: whether to use stat (more resources) or dirent
 * * highWaterMark: streaming param, specifies max amount of resources per entry
 */
export type ReaddirpOptions = {
    root: string;
    fileFilter?: Predicate;
    directoryFilter?: Predicate;
    type?: EntryType;
    lstat?: boolean;
    depth?: number;
    alwaysStat?: boolean;
    highWaterMark?: number;
};
/** Directory entry. Contains path, depth count, and files. */
export interface DirEntry {
    /** Undefined when the directory could not be read (a 'warn' was emitted). */
    files: PathOrDirent[] | undefined;
    depth: number;
    path: Path;
}
/** Readable readdir stream, emitting new files as they're being listed. */
interface PendingDir {
    path: Path;
    depth: number;
    pending?: Promise<DirEntry>;
}
export declare class ReaddirpStream extends Readable {
    /**
     * Directories discovered but not yet emitted from. Listings are read
     * lazily (on pop, plus one prefetch) instead of eagerly on discovery:
     * keeping whole listings for every queued dir balloons RAM on wide trees.
     */
    parents: PendingDir[];
    reading: boolean;
    parent?: DirEntry;
    _stat: Function;
    _maxDepth: number;
    _wantsDir: boolean;
    _wantsFile: boolean;
    _wantsEverything: boolean;
    _root: Path;
    _isDirent: boolean;
    _statsProp: 'dirent' | 'stats';
    _rdOptions: {
        encoding: 'utf8';
        withFileTypes: boolean;
    };
    _fileFilter: Tester;
    _directoryFilter: Tester;
    _relStart: number;
    constructor(options?: Partial<ReaddirpOptions>);
    _read(batch: number): Promise<void>;
    _exploreDir(path: Path, depth: number): Promise<DirEntry>;
    _formatEntry(dirent: PathOrDirent, path: Path): EntryInfo | undefined | Promise<EntryInfo | undefined>;
    _onError(err: Error): void;
    _getEntryType(entry: EntryInfo): '' | 'file' | 'directory' | Promise<'' | 'file' | 'directory'>;
    _getSymlinkEntryType(entry: EntryInfo): Promise<'' | 'file' | 'directory'>;
    _includeAsFile(entry: EntryInfo): boolean | undefined;
}
/**
 * Streaming version: Reads all files and directories in given root recursively.
 * Consumes ~constant small amount of RAM.
 * @param root Root directory
 * @param options Options to specify root (start directory), filters and recursion depth
 */
export declare function readdirp(root: Path, options?: Partial<ReaddirpOptions>): ReaddirpStream;
/**
 * Promise version: Reads all files and directories in given root recursively.
 * Compared to streaming version, will consume a lot of RAM e.g. when 1 million files are listed.
 * @returns array of paths and their entry infos
 */
export declare function readdirpPromise(root: Path, options?: Partial<ReaddirpOptions>): Promise<EntryInfo[]>;
export default readdirp;
