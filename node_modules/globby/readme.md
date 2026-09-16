# globby

> User-friendly glob matching

Based on [`fast-glob`](https://github.com/mrmlnc/fast-glob) but adds a bunch of useful features.

## Features

- Promise API
- Multiple patterns
- Negated patterns: `['foo*', '!foobar']`
- Negation-only patterns: `['!foobar']` → matches all files except `foobar`
- Expands directories: `foo` → `foo/**/*`
- Supports `.gitignore` and similar ignore config files
- Supports `URL` as `cwd`

## Install

```sh
npm install globby
```

## Usage

```
├── unicorn
├── cake
└── rainbow
```

```js
import {globby} from 'globby';

const paths = await globby(['*', '!cake']);

console.log(paths);
//=> ['unicorn', 'rainbow']
```

## API

Note that glob patterns can only contain forward-slashes, not backward-slashes, so if you want to construct a glob pattern from path components, you need to use `path.posix.join()` instead of `path.join()`.

**Windows:** Patterns with backslashes will silently fail. Use `path.posix.join()` or [`convertPathToPattern()`](#convertpathtopatternpath).

### globby(patterns, options?)

Returns a `Promise<string[]>` of matching paths.

#### patterns

Type: `string | string[]`

See supported `minimatch` [patterns](https://github.com/isaacs/minimatch#usage).

#### options

Type: `object`

See the [`fast-glob` options](https://github.com/mrmlnc/fast-glob#options-3) in addition to the ones below.

##### expandDirectories

Type: `boolean | string[] | object`\
Default: `true`

If set to `true`, `globby` will automatically glob directories for you. If you define an `Array` it will only glob files that matches the patterns inside the `Array`. You can also define an `object` with `files` and `extensions` like below:

```js
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

Note that if you set this option to `false`, you won't get back matched directories unless you set `onlyFiles: false`.

##### gitignore

Type: `boolean`\
Default: `false`

Respect ignore patterns in `.gitignore` files that apply to the globbed files.

When enabled, globby searches for `.gitignore` files from the current working directory downward, and if a Git repository is detected (by finding a `.git` directory), it also respects `.gitignore` files in parent directories up to the repository root. This matches Git's actual behavior where patterns from parent `.gitignore` files apply to subdirectories.

Gitignore patterns take priority over user patterns, matching Git's behavior. To include gitignored files, set this to `false`.

The `ignore` option applies to the results only. A pattern that could name an ignore file, such as `'**/.gitignore'`, is not used when searching for the ignore files, so it hides them from the results without disabling this option.

**Performance:** Globby reads `.gitignore` files before globbing and hands fast-glob patterns for the directories it can prove are ignored, so whole ignored directories (like large `node_modules` or build outputs) are skipped during traversal instead of being enumerated and filtered afterwards. This holds even when negation patterns (like `!important.log`) or parent `.gitignore` files are present: only the rules that provably cannot be re-included by a negation are used to skip directories, while the final filtering always matches Git's behavior. To read fewer ignore files, use `ignoreFiles: '.gitignore'` to target only the root ignore file.

##### globalGitignore

Type: `boolean`\
Default: `false`

Respect ignore patterns in the global gitignore file configured via `git config core.excludesfile`.

Values from `[include]` and `gitdir` or `gitdir/i` `[includeIf]` sections inside those user-level config files are also respected.

Patterns in the global gitignore are treated as root-level patterns, matching Git's own behavior.

This option only reads the user-level Git config (`GIT_CONFIG_GLOBAL`, `$XDG_CONFIG_HOME/git/config`, and `~/.gitconfig`). When `core.excludesfile` is unset, it falls back to Git's default user-level ignore file at `$XDG_CONFIG_HOME/git/ignore` or `~/.config/git/ignore`. Repository `.git/config` and system config are intentionally not consulted. Other `includeIf` predicates such as `onbranch:` are intentionally not supported.

##### ignoreFiles

Type: `string | string[]`\
Default: `undefined`

Glob patterns to look for ignore files, which are then used to ignore globbed files.

This is a more generic form of the `gitignore` option, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

The `ignore` option applies to the results only, as with the [`gitignore`](#gitignore) option.

**Performance tip:** Using a specific path like `'.gitignore'` is much faster than recursive patterns.

##### expandNegationOnlyPatterns

Type: `boolean`\
Default: `true`

When only negation patterns are provided (e.g., `['!*.json']`), automatically prepend a catch-all pattern (`**/*`) to match all files before applying negations.

Set to `false` to return an empty array when only negation patterns are provided. This can be useful when patterns are user-controlled, to avoid unexpectedly matching all files.

```js
import {globby} from 'globby';

// Default behavior: matches all files except .json
await globby(['!*.json']);
//=> ['file.txt', 'image.png', ...]

// Disable expansion: returns empty array
await globby(['!*.json'], {expandNegationOnlyPatterns: false});
//=> []
```

##### fs

Type: [`FileSystemAdapter`](https://github.com/mrmlnc/fast-glob#fs)\
Default: `undefined`

Custom file system implementation (useful for testing or virtual file systems).

**Note:** When using `gitignore`, `ignoreFiles`, or `globalGitignore`, the custom fs must also provide `readFile`/`readFileSync` methods. With `globalGitignore`, `globby()` and `globbyStream()` also require `fs.promises.stat` or `fs.stat`, and `globbySync()` requires `fs.statSync`.

### globbySync(patterns, options?)

Returns `string[]` of matching paths.

### globbyStream(patterns, options?)

Returns a [`stream.Readable`](https://nodejs.org/api/stream.html#stream_readable_streams) of matching paths.

For example, loop over glob matches in a [`for await...of` loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) like this:

```js
import {globbyStream} from 'globby';

for await (const path of globbyStream('*.tmp')) {
	console.log(path);
}
```

### convertPathToPattern(path)

Converts a path to a pattern by escaping special glob characters like `()`, `[]`, `{}`. On Windows, also converts backslashes to forward slashes.

Use this when your literal paths contain characters with special meaning in globs.

```js
import {globby, convertPathToPattern} from 'globby';

// ❌ Fails - parentheses are glob syntax
await globby('C:/Program Files (x86)/*.txt');
//=> []

// ✅ Works
const base = convertPathToPattern('C:/Program Files (x86)');
await globby(`${base}/*.txt`);
//=> ['C:/Program Files (x86)/file.txt']
```

[Learn more.](https://github.com/mrmlnc/fast-glob#convertpathtopatternpath)

### generateGlobTasks(patterns, options?)

Returns an `Promise<object[]>` in the format `{patterns: string[], options: Object}`, which can be passed as arguments to [`fast-glob`](https://github.com/mrmlnc/fast-glob). This is useful for other globbing-related packages.

Note that you should avoid running the same tasks multiple times as they contain a file system cache. Instead, run this method each time to ensure file system changes are taken into consideration.

### generateGlobTasksSync(patterns, options?)

Returns an `object[]` in the format `{patterns: string[], options: Object}`, which can be passed as arguments to [`fast-glob`](https://github.com/mrmlnc/fast-glob). This is useful for other globbing-related packages.

Takes the same arguments as `generateGlobTasks`.

### isDynamicPattern(patterns, options?)

Returns a `boolean` of whether there are any special glob characters in the `patterns`.

Note that the options affect the results.

This function is backed by [`fast-glob`](https://github.com/mrmlnc/fast-glob#isdynamicpatternpattern-options).

### isGitIgnored(options?)

Returns a `Promise<(path: URL | string) => boolean>` indicating whether a given path is ignored via a `.gitignore` file.

#### options

Type: `object`

##### cwd

Type: `URL | string`\
Default: `process.cwd()`

The current working directory in which to search.

##### suppressErrors

Type: `boolean`\
Default: `false`

Suppress errors when encountering directories or files without read permissions.

##### deep

Type: `number`\
Default: `Infinity`

Maximum depth to search for `.gitignore` files.

- `0` - Only search in the start directory
- `1` - Search in the start directory and one level of subdirectories
- `2` - Search in the start directory and two levels of subdirectories

##### ignore

Type: `string | string[]`\
Default: `[]`

Glob patterns to exclude from `.gitignore` file search.

Unlike the `ignore` option of [`globby()`](#options), which applies to the results only, this one excludes files from the search itself, so a pattern that names an ignore file stops that file from being read.

##### followSymbolicLinks

Type: `boolean`\
Default: `true`

Indicates whether to traverse descendants of symbolic link directories.

##### concurrency

Type: `number`\
Default: `os.cpus().length`

Specifies the maximum number of concurrent requests from a reader to read directories.

##### throwErrorOnBrokenSymbolicLink

Type: `boolean`\
Default: `false`

Throw an error when symbolic link is broken if `true` or safely return `lstat` call if `false`.

##### fs

Type: [`FileSystemAdapter`](https://github.com/mrmlnc/fast-glob#fs)\
Default: `undefined`

Custom file system implementation (useful for testing or virtual file systems).

**Note:** The custom fs must provide `readFile`/`readFileSync` methods for reading `.gitignore` files.

```js
import {isGitIgnored} from 'globby';

const isIgnored = await isGitIgnored();

console.log(isIgnored('some/file'));
```

```js
// Suppress errors when encountering unreadable directories
const isIgnored = await isGitIgnored({suppressErrors: true});
```

```js
// Limit search depth and exclude certain directories
const isIgnored = await isGitIgnored({
	deep: 2,
	ignore: ['**/node_modules/**', '**/dist/**']
});
```

### isGitIgnoredSync(options?)

Returns a `(path: URL | string) => boolean` indicating whether a given path is ignored via a `.gitignore` file.

See [`isGitIgnored`](#isgitignoredoptions) for options.


### isIgnoredByIgnoreFiles(patterns, options?)

Returns a `Promise<(path: URL | string) => boolean>` indicating whether a given path is ignored via the ignore files.

This is a more generic form of the `isGitIgnored` function, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

#### patterns

Type: `string | string[]`

Glob patterns to look for ignore files.

#### options

Type: `object`

See [`isGitIgnored` options](#isgitignoredoptions) for all available options.

```js
import {isIgnoredByIgnoreFiles} from 'globby';

const isIgnored = await isIgnoredByIgnoreFiles("**/.gitignore");

console.log(isIgnored('some/file'));
```

```js
// Suppress errors when encountering unreadable directories
const isIgnored = await isIgnoredByIgnoreFiles("**/.eslintignore", {suppressErrors: true});
```

```js
// Limit search depth and concurrency
const isIgnored = await isIgnoredByIgnoreFiles("**/.prettierignore", {
	deep: 3,
	concurrency: 4
});
```

### isIgnoredByIgnoreFilesSync(patterns, options?)

Returns a `(path: URL | string) => boolean` indicating whether a given path is ignored via the ignore files.

This is a more generic form of the `isGitIgnoredSync` function, allowing you to find ignore files with a [compatible syntax](http://git-scm.com/docs/gitignore). For instance, this works with Babel's `.babelignore`, Prettier's `.prettierignore`, or ESLint's `.eslintignore` files.

See [`isIgnoredByIgnoreFiles`](#isignoredbyignorefilespatterns-options) for patterns and options.

```js
import {isIgnoredByIgnoreFilesSync} from 'globby';

const isIgnored = isIgnoredByIgnoreFilesSync("**/.gitignore");

console.log(isIgnored('some/file'));
```

## Globbing patterns

Just a quick overview.

- `*` matches any number of characters, but not `/`
- `?` matches a single character, but not `/`
- `**` matches any number of characters, including `/`, as long as it's the only thing in a path part
- `{}` allows for a comma-separated list of "or" expressions
- `!` at the beginning of a pattern will negate the match

### Negation patterns

Globby supports negation patterns to exclude files. There are two ways to use them:

**With positive patterns:**
```js
await globby(['src/**/*.js', '!src/**/*.test.js']);
// Matches all .js files except test files
```

**Negation-only patterns:**
```js
await globby(['!*.json', '!*.xml'], {cwd: 'config'});
// Matches all files in config/ except .json and .xml files
```

When using only negation patterns, globby implicitly prepends `**/*` to match all files, then applies the negations. This means `['!*.json', '!*.xml']` is equivalent to `['**/*', '!*.json', '!*.xml']`.

**Note:** The prepended `**/*` pattern respects the `dot` option. By default, dotfiles (files starting with `.`) are not matched unless you set `dot: true`.

[Various patterns and expected matches.](https://github.com/sindresorhus/multimatch/blob/main/test/test.js)

## Related

- [multimatch](https://github.com/sindresorhus/multimatch) - Match against a list instead of the filesystem
- [matcher](https://github.com/sindresorhus/matcher) - Simple wildcard matching
- [del](https://github.com/sindresorhus/del) - Delete files and directories
- [make-dir](https://github.com/sindresorhus/make-dir) - Make a directory and its parents if needed
