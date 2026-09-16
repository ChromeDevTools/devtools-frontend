import type FastGlob from 'fast-glob';

export type GlobEntry = FastGlob.Entry;

export type GlobTask = {
	readonly patterns: string[];
	readonly options: Options;
};

export type ExpandDirectoriesOption =
	| boolean
	| readonly string[]
	| {files?: readonly string[]; extensions?: readonly string[]};

type FastGlobOptionsWithoutCwd = Omit<FastGlob.Options, 'cwd'>;

export type Options = {
	/**
	If set to `true`, `globby` will automatically glob directories for you. If you define an `Array` it will only glob files that matches the patterns inside the `Array`. You can also define an `Object` with `files` and `extensions` like in the example below.

	Note that if you set this option to `false`, you won't get back matched directories unless you set `onlyFiles: false`.

	@default true

	@example
	```
	import {globby} from 'globby';

	const paths = await globby('images', {
		expandDirectories: {
			files: ['cat', 'unicorn', '*.jpg'],
			extensions: ['png']
		}
	});

	console.log(paths);
	//=> ['cat.png', 'unicorn.png', 'cow.jpg', 'rainbow.jpg']
	```
	*/
	readonly expandDirectories?: ExpandDirectoriesOption;

	/**
	Respect ignore patterns in `.gitignore` files that apply to the globbed files.

	When enabled, globby searches for `.gitignore` files from the current working directory downward, and if a Git repository is detected (by finding a `.git` directory), it also respects `.gitignore` files in parent directories up to the repository root. This matches Git's actual behavior where patterns from parent `.gitignore` files apply to subdirectories.

	Gitignore patterns take priority over user patterns, matching Git's behavior. To include gitignored files, set this to `false`.

	The `ignore` option applies to the results only. A pattern that could name an ignore file, such as `'**\/.gitignore'`, is not used when searching for the ignore files, so it hides them from the results without disabling this option.

	Performance: Globby reads `.gitignore` files before globbing and hands fast-glob patterns for the directories it can prove are ignored, so whole ignored directories (like large `node_modules` or build outputs) are skipped during traversal instead of being enumerated and filtered afterwards. This holds even when negation patterns (like `!important.log`) or parent `.gitignore` files are present: only the rules that provably cannot be re-included by a negation are used to skip directories, while the final filtering always matches Git's behavior. To read fewer ignore files, use `ignoreFiles: '.gitignore'` to target only the root ignore file.

	@default false
	*/
	readonly gitignore?: boolean;

	/**
	Glob patterns to look for ignore files, which are then used to ignore globbed files.

	This is a more generic form of the `gitignore` option, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

	The `ignore` option applies to the results only, as with the `gitignore` option.

	Performance tip: Using a specific path like `'.gitignore'` is much faster than recursive patterns.

	@default undefined
	*/
	readonly ignoreFiles?: string | readonly string[];

	/**
	When only negation patterns are provided (e.g., `['!*.json']`), automatically prepend a catch-all pattern (`**\/*`) to match all files before applying negations.

	Set to `false` to return an empty array when only negation patterns are provided. This can be useful when patterns are user-controlled, to avoid unexpectedly matching all files.

	@default true

	@example
	```
	import {globby} from 'globby';

	// Default behavior: matches all files except .json
	await globby(['!*.json']);
	//=> ['file.txt', 'image.png', ...]

	// Disable expansion: returns empty array
	await globby(['!*.json'], {expandNegationOnlyPatterns: false});
	//=> []
	```
	*/
	readonly expandNegationOnlyPatterns?: boolean;

	/**
	The current working directory in which to search.

	@default process.cwd()
	*/
	readonly cwd?: URL | string;
} & FastGlobOptionsWithoutCwd;

export type GlobbyOptions = Options & {
	/**
	Respect ignore patterns in the global gitignore file configured via `git config core.excludesfile`.

	Values from `[include]` and `gitdir` or `gitdir/i` `[includeIf]` sections inside those user-level config files are also respected.

	Patterns in the global gitignore are treated as root-level patterns, matching Git's own behavior.

	This option only reads the user-level Git config (`GIT_CONFIG_GLOBAL`, `$XDG_CONFIG_HOME/git/config`, and `~/.gitconfig`). When `core.excludesfile` is unset, it falls back to Git's default user-level ignore file at `$XDG_CONFIG_HOME/git/ignore` or `~/.config/git/ignore`. Repository `.git/config` and system config are intentionally not consulted. Other `includeIf` predicates such as `onbranch:` are intentionally not supported.

	When used with a custom `fs`, `globby()` and `globbyStream()` also require `fs.promises.stat` or `fs.stat`, and `globbySync()` requires `statSync`.

	@default false
	*/
	readonly globalGitignore?: boolean;
};

export type GitignoreOptions = {
	/**
	The current working directory in which to search.

	@default process.cwd()
	*/
	readonly cwd?: URL | string;

	/**
	Suppress errors when encountering directories or files without read permissions.

	By default, fast-glob only suppresses `ENOENT` errors. Set to `true` to suppress any error.

	@default false
	*/
	readonly suppressErrors?: boolean;

	/**
	Specifies the maximum depth of ignore file search relative to the start directory.

	@default Infinity
	*/
	readonly deep?: number;

	/**
	Glob patterns to exclude from ignore file search.

	Unlike the `ignore` option of `globby()`, which applies to the results only, this one excludes files from the search itself, so a pattern that names an ignore file stops that file from being read.

	@default []
	*/
	readonly ignore?: string | readonly string[];

	/**
	Indicates whether to traverse descendants of symbolic link directories.

	@default true
	*/
	readonly followSymbolicLinks?: boolean;

	/**
	Specifies the maximum number of concurrent requests from a reader to read directories.

	@default os.cpus().length
	*/
	readonly concurrency?: number;

	/**
	Throw an error when symbolic link is broken if `true` or safely return `lstat` call if `false`.

	@default false
	*/
	readonly throwErrorOnBrokenSymbolicLink?: boolean;

	/**
	Custom file system implementation (useful for testing or virtual file systems).

	The custom fs must also provide `readFile`/`readFileSync` methods.

	@default undefined
	*/
	readonly fs?: FastGlob.Options['fs'];
};

export type GlobbyFilterFunction = (path: URL | string) => boolean;

type AsyncIterableReadable<Value> = Omit<NodeJS.ReadableStream, typeof Symbol.asyncIterator> & {
	[Symbol.asyncIterator](): NodeJS.AsyncIterator<Value>;
};

/**
A readable stream that yields string paths from glob patterns.
*/
export type GlobbyStream = AsyncIterableReadable<string>;

/**
A readable stream that yields `GlobEntry` objects from glob patterns when `objectMode` is enabled.
*/
export type GlobbyEntryStream = AsyncIterableReadable<GlobEntry>;

/**
Find files and directories using glob patterns.

Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use `path.posix.join()` instead of `path.join()`.

Windows: Patterns with backslashes will silently fail. Use `path.posix.join()` or `convertPathToPattern()`.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns). Supports negation patterns to exclude files. When using only negation patterns (like `['!*.json']`), globby implicitly prepends a catch-all pattern to match all files before applying negations.
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns The matching paths.

@example
```
import {globby} from 'globby';

const paths = await globby(['*', '!cake']);

console.log(paths);
//=> ['unicorn', 'rainbow']
```

@example
```
import {globby} from 'globby';

// Negation-only patterns match all files except the negated ones
const paths = await globby(['!*.json', '!*.xml'], {cwd: 'config'});

console.log(paths);
//=> ['config.js', 'settings.yaml']
```
*/
export function globby(
	patterns: string | readonly string[],
	options: GlobbyOptions & ({objectMode: true} | {stats: true})
): Promise<GlobEntry[]>;
export function globby(
	patterns: string | readonly string[],
	options?: GlobbyOptions
): Promise<string[]>;

/**
Find files and directories using glob patterns.

Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use `path.posix.join()` instead of `path.join()`.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns The matching paths.
*/
export function globbySync(
	patterns: string | readonly string[],
	options: GlobbyOptions & ({objectMode: true} | {stats: true})
): GlobEntry[];
export function globbySync(
	patterns: string | readonly string[],
	options?: GlobbyOptions
): string[];

/**
Find files and directories using glob patterns.

Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use `path.posix.join()` instead of `path.join()`.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns The stream of matching paths.

@example
```
import {globbyStream} from 'globby';

for await (const path of globbyStream('*.tmp')) {
	console.log(path);
}
```
*/
export function globbyStream(
	patterns: string | readonly string[],
	options: GlobbyOptions & ({objectMode: true} | {stats: true})
): GlobbyEntryStream;
export function globbyStream(
	patterns: string | readonly string[],
	options?: GlobbyOptions
): GlobbyStream;

/**
Note that you should avoid running the same tasks multiple times as they contain a file system cache. Instead, run this method each time to ensure file system changes are taken into consideration.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns An object in the format `{pattern: string, options: object}`, which can be passed as arguments to [`fast-glob`](https://github.com/mrmlnc/fast-glob). This is useful for other globbing-related packages.
*/
export function generateGlobTasks(
	patterns: string | readonly string[],
	options?: Options
): Promise<GlobTask[]>;

/**
@see generateGlobTasks

@returns An object in the format `{pattern: string, options: object}`, which can be passed as arguments to [`fast-glob`](https://github.com/mrmlnc/fast-glob). This is useful for other globbing-related packages.
*/
export function generateGlobTasksSync(
	patterns: string | readonly string[],
	options?: Options
): GlobTask[];

/**
Note that the options affect the results.

This function is backed by [`fast-glob`](https://github.com/mrmlnc/fast-glob#isdynamicpatternpattern-options).

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3).
@returns Whether there are any special glob characters in the `patterns`.
*/
export function isDynamicPattern(
	patterns: string | readonly string[],
	options?: FastGlobOptionsWithoutCwd & {
		/**
		The current working directory in which to search.

		@default process.cwd()
		*/
		readonly cwd?: URL | string;
	}
): boolean;

/**
`.gitignore` files matched by the ignore config are not used for the resulting filter function.

@returns A filter function indicating whether a given path is ignored via a `.gitignore` file.

@example
```
import {isGitIgnored} from 'globby';

const isIgnored = await isGitIgnored();

console.log(isIgnored('some/file'));
```
*/
export function isGitIgnored(options?: GitignoreOptions): Promise<GlobbyFilterFunction>;

/**
@see isGitIgnored

@returns A filter function indicating whether a given path is ignored via a `.gitignore` file.
*/
export function isGitIgnoredSync(options?: GitignoreOptions): GlobbyFilterFunction;

/**
Converts a path to a pattern by escaping special glob characters like `()`, `[]`, `{}`. On Windows, also converts backslashes to forward slashes.

Use this when your literal paths contain characters with special meaning in globs.

@param source - A file system path to convert to a safe glob pattern.
@returns The path with special glob characters escaped.

@example
```
import {globby, convertPathToPattern} from 'globby';

// ❌ Fails - parentheses are glob syntax
await globby('C:/Program Files (x86)/*.txt');
//=> []

// ✅ Works
const base = convertPathToPattern('C:/Program Files (x86)');
await globby(`${base}/*.txt`);
//=> ['C:/Program Files (x86)/file.txt']
```
*/
export function convertPathToPattern(source: string): FastGlob.Pattern;

/**
Check if a path is ignored by the ignore files.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns A filter function indicating whether a given path is ignored via the ignore files.

This is a more generic form of the `isGitIgnored` function, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

@example
```
import {isIgnoredByIgnoreFiles} from 'globby';

const isIgnored = await isIgnoredByIgnoreFiles('**\/.gitignore');

console.log(isIgnored('some/file'));
```
*/
export function isIgnoredByIgnoreFiles(
	patterns: string | readonly string[],
	options?: Options
): Promise<GlobbyFilterFunction>;

/**
Check if a path is ignored by the ignore files.

@param patterns - See the supported [glob patterns](https://github.com/sindresorhus/globby#globbing-patterns).
@param options - See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones in this package.
@returns A filter function indicating whether a given path is ignored via the ignore files.

This is a more generic form of the `isGitIgnored` function, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

@see {@link isIgnoredByIgnoreFiles}

@example
```
import {isIgnoredByIgnoreFilesSync} from 'globby';

const isIgnored = isIgnoredByIgnoreFilesSync('**\/.gitignore');

console.log(isIgnored('some/file'));
```
*/
export function isIgnoredByIgnoreFilesSync(
	patterns: string | readonly string[],
	options?: Options
): GlobbyFilterFunction;
