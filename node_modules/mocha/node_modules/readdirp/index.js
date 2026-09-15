import { lstat, readdir, realpath, stat } from 'node:fs/promises';
import { join as pjoin, resolve as presolve, sep as psep } from 'node:path';
import { Readable } from 'node:stream';
export const EntryTypes = {
    FILE_TYPE: 'files',
    DIR_TYPE: 'directories',
    FILE_DIR_TYPE: 'files_directories',
    EVERYTHING_TYPE: 'all',
};
const defaultOptions = {
    root: '.',
    fileFilter: (_entryInfo) => true,
    directoryFilter: (_entryInfo) => true,
    type: EntryTypes.FILE_TYPE,
    lstat: false,
    depth: 2147483648,
    alwaysStat: false,
    // Throughput is flat from 16 to 65536 (traversal is I/O-bound), but
    // batches of 1024+ entries survive young-gen GC and bloat RSS ~20-60%.
    highWaterMark: 256,
};
Object.freeze(defaultOptions);
const RECURSIVE_ERROR_CODE = 'READDIRP_RECURSIVE_ERROR';
const NORMAL_FLOW_ERRORS = new Set(['ENOENT', 'EPERM', 'EACCES', 'ELOOP', RECURSIVE_ERROR_CODE]);
const ALL_TYPES = [
    EntryTypes.DIR_TYPE,
    EntryTypes.EVERYTHING_TYPE,
    EntryTypes.FILE_DIR_TYPE,
    EntryTypes.FILE_TYPE,
];
const DIR_TYPES = new Set([
    EntryTypes.DIR_TYPE,
    EntryTypes.EVERYTHING_TYPE,
    EntryTypes.FILE_DIR_TYPE,
]);
const FILE_TYPES = new Set([
    EntryTypes.EVERYTHING_TYPE,
    EntryTypes.FILE_DIR_TYPE,
    EntryTypes.FILE_TYPE,
]);
const isNormalFlowError = (error) => NORMAL_FLOW_ERRORS.has(error.code);
const wantBigintFsStats = process.platform === 'win32';
const emptyFn = (_entryInfo) => true;
const normalizeFilter = (filter) => {
    if (filter === undefined)
        return emptyFn;
    if (typeof filter === 'function')
        return filter;
    if (typeof filter === 'string') {
        const fl = filter.trim();
        return (entry) => entry.basename === fl;
    }
    if (Array.isArray(filter)) {
        const trItems = filter.map((item) => item.trim());
        return (entry) => trItems.some((f) => entry.basename === f);
    }
    return emptyFn;
};
export class ReaddirpStream extends Readable {
    /**
     * Directories discovered but not yet emitted from. Listings are read
     * lazily (on pop, plus one prefetch) instead of eagerly on discovery:
     * keeping whole listings for every queued dir balloons RAM on wide trees.
     */
    parents;
    reading;
    parent;
    _stat;
    _maxDepth;
    _wantsDir;
    _wantsFile;
    _wantsEverything;
    _root;
    _isDirent;
    _statsProp;
    _rdOptions;
    _fileFilter;
    _directoryFilter;
    _relStart;
    constructor(options = {}) {
        super({
            objectMode: true,
            autoDestroy: true,
            highWaterMark: options.highWaterMark ?? defaultOptions.highWaterMark,
        });
        const opts = { ...defaultOptions, ...options };
        // Use ?? so an explicit `undefined` in user options doesn't shadow defaults.
        const root = opts.root ?? defaultOptions.root;
        const type = opts.type ?? defaultOptions.type;
        this._fileFilter = normalizeFilter(opts.fileFilter);
        this._directoryFilter = normalizeFilter(opts.directoryFilter);
        const statMethod = opts.lstat ? lstat : stat;
        // Use bigint stats if it's windows and stat() supports options (node 10+).
        if (wantBigintFsStats) {
            this._stat = (path) => statMethod(path, { bigint: true });
        }
        else {
            this._stat = statMethod;
        }
        this._maxDepth =
            opts.depth != null && Number.isSafeInteger(opts.depth) ? opts.depth : defaultOptions.depth;
        this._wantsDir = DIR_TYPES.has(type);
        this._wantsFile = FILE_TYPES.has(type);
        this._wantsEverything = type === EntryTypes.EVERYTHING_TYPE;
        this._root = presolve(root);
        // Every fullPath is `_root + sep + relative path` (see _formatEntry), so
        // the relative path is a slice starting past the root and its trailing
        // separator (which resolved paths lack, except fs roots like '/', 'C:\').
        this._relStart = this._root.endsWith(psep) ? this._root.length : this._root.length + 1;
        this._isDirent = !opts.alwaysStat;
        this._statsProp = this._isDirent ? 'dirent' : 'stats';
        this._rdOptions = { encoding: 'utf8', withFileTypes: this._isDirent };
        // Launch stream with one parent, the root dir, whose readdir starts
        // right away. Explore the resolved root so all parent paths stay
        // absolute even if process.cwd() changes mid-iteration.
        const rootDir = { path: this._root, depth: 1 };
        rootDir.pending = this._exploreDir(this._root, 1);
        this.parents = [rootDir];
        this.reading = false;
        this.parent = undefined;
    }
    async _read(batch) {
        if (this.reading)
            return;
        this.reading = true;
        try {
            while (!this.destroyed && batch > 0) {
                const par = this.parent;
                const fil = par && par.files;
                if (fil && fil.length > 0) {
                    const { path, depth } = par;
                    const slice = fil.splice(0, batch).map((dirent) => this._formatEntry(dirent, path));
                    // In dirent mode _formatEntry is synchronous: skip Promise.all and
                    // its per-entry microtask overhead.
                    const awaited = this._isDirent
                        ? slice
                        : await Promise.all(slice);
                    for (const entry of awaited) {
                        if (!entry)
                            continue;
                        if (this.destroyed)
                            return;
                        // Only symlinks require async work; plain files / dirs resolve synchronously.
                        let entryType = this._getEntryType(entry);
                        if (typeof entryType !== 'string')
                            entryType = await entryType;
                        if (entryType === 'directory' && this._directoryFilter(entry)) {
                            if (depth <= this._maxDepth) {
                                // Lazy: don't readdir until this dir is popped. Keeping whole
                                // listings for every queued dir would balloon RAM on wide trees.
                                this.parents.push({ path: entry.fullPath, depth: depth + 1 });
                            }
                            if (this._wantsDir) {
                                this.push(entry);
                                batch--;
                            }
                        }
                        else if ((entryType === 'file' || this._includeAsFile(entry)) &&
                            this._fileFilter(entry)) {
                            if (this._wantsFile) {
                                this.push(entry);
                                batch--;
                            }
                        }
                    }
                }
                else {
                    const parent = this.parents.pop();
                    if (!parent) {
                        this.push(null);
                        break;
                    }
                    const dir = parent.pending ?? this._exploreDir(parent.path, parent.depth);
                    // Prefetch the next dir so its readdir overlaps with processing
                    // this one's entries. Only the stack top is prefetched, keeping at
                    // most a handful of listings (~tree depth) in RAM at once.
                    const next = this.parents[this.parents.length - 1];
                    if (next && !next.pending) {
                        next.pending = this._exploreDir(next.path, next.depth);
                    }
                    this.parent = await dir;
                    if (this.destroyed)
                        return;
                }
            }
        }
        catch (error) {
            this.destroy(error);
        }
        finally {
            this.reading = false;
        }
    }
    // NOTE: native `readdir(path, { recursive: true })` was evaluated as a
    // replacement for this per-directory traversal and rejected:
    // - Not faster: node implements it in JS, walking directories sequentially
    //   just like this loop, but with extra path bookkeeping. Benchmarks
    //   (node 24): ~10% slower on wide trees, ~40% slower on small ones,
    //   parity on deep ones.
    // - Much more RAM: it buffers the entire subtree listing in one array,
    //   instead of one directory at a time, defeating streaming.
    // - Semantics diverge: it can't limit depth, can't skip directories a
    //   directoryFilter rejects, doesn't follow symlinked dirs, and fails
    //   wholesale (all entries lost) if anything in the subtree is unreadable,
    //   instead of emitting a 'warn' and continuing.
    async _exploreDir(path, depth) {
        let files;
        try {
            files = await readdir(path, this._rdOptions);
        }
        catch (error) {
            this._onError(error);
        }
        return { files, depth, path };
    }
    // Synchronous in dirent mode; returns a promise only when stats are needed.
    _formatEntry(dirent, path) {
        const basename = this._isDirent ? dirent.name : dirent;
        // `path` is always an absolute, normalized parent dir (see _exploreDir
        // seeding in the constructor), so a plain join is enough — resolve()
        // would re-read cwd on every entry.
        const fullPath = pjoin(path, basename);
        // Slice instead of path.relative(): equivalent here (fullPath is always
        // under _root) and avoids several intermediate allocations per entry.
        const entry = { path: fullPath.slice(this._relStart), fullPath, basename };
        if (this._isDirent) {
            entry.dirent = dirent;
            return entry;
        }
        return this._stat(fullPath).then((stats) => {
            entry.stats = stats;
            return entry;
        }, (err) => {
            this._onError(err);
            return undefined;
        });
    }
    _onError(err) {
        if (isNormalFlowError(err) && !this.destroyed) {
            this.emit('warn', err);
        }
        else {
            this.destroy(err);
        }
    }
    // Synchronous for regular files and directories; returns a promise only for
    // symlinks, which need realpath() to be classified.
    _getEntryType(entry) {
        // entry may be undefined, because a warning or an error were emitted
        // and the statsProp is undefined
        if (!entry || !(this._statsProp in entry)) {
            return '';
        }
        const stats = entry[this._statsProp];
        if (stats.isFile())
            return 'file';
        if (stats.isDirectory())
            return 'directory';
        if (stats.isSymbolicLink())
            return this._getSymlinkEntryType(entry);
        return '';
    }
    async _getSymlinkEntryType(entry) {
        const full = entry.fullPath;
        try {
            const entryRealPath = await realpath(full);
            const entryRealPathStats = await lstat(entryRealPath);
            if (entryRealPathStats.isFile()) {
                return 'file';
            }
            if (entryRealPathStats.isDirectory()) {
                const len = entryRealPath.length;
                if (full.startsWith(entryRealPath) && full[len] === psep) {
                    const recursiveError = new Error(`Circular symlink detected: "${full}" points to "${entryRealPath}"`);
                    // @ts-ignore
                    recursiveError.code = RECURSIVE_ERROR_CODE;
                    this._onError(recursiveError);
                    return '';
                }
                return 'directory';
            }
        }
        catch (error) {
            this._onError(error);
        }
        return '';
    }
    _includeAsFile(entry) {
        const stats = entry && entry[this._statsProp];
        return stats && this._wantsEverything && !stats.isDirectory();
    }
}
/**
 * Streaming version: Reads all files and directories in given root recursively.
 * Consumes ~constant small amount of RAM.
 * @param root Root directory
 * @param options Options to specify root (start directory), filters and recursion depth
 */
export function readdirp(root, options = {}) {
    // @ts-ignore
    let type = options.entryType || options.type;
    if (type === 'both')
        type = EntryTypes.FILE_DIR_TYPE; // backwards-compatibility
    if (!root) {
        throw new Error('readdirp: root argument is required. Usage: readdirp(root, options)');
    }
    else if (typeof root !== 'string') {
        throw new TypeError('readdirp: root argument must be a string. Usage: readdirp(root, options)');
    }
    else if (type && !ALL_TYPES.includes(type)) {
        throw new Error(`readdirp: Invalid type passed. Use one of ${ALL_TYPES.join(', ')}`);
    }
    // Copy options instead of mutating the caller's object.
    const opts = { ...options, root };
    if (type)
        opts.type = type;
    return new ReaddirpStream(opts);
}
/**
 * Promise version: Reads all files and directories in given root recursively.
 * Compared to streaming version, will consume a lot of RAM e.g. when 1 million files are listed.
 * @returns array of paths and their entry infos
 */
export function readdirpPromise(root, options = {}) {
    return new Promise((resolve, reject) => {
        const files = [];
        readdirp(root, options)
            .on('data', (entry) => files.push(entry))
            .on('end', () => resolve(files))
            .on('error', (error) => reject(error));
    });
}
export default readdirp;
