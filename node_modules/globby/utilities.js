import fs from 'node:fs';
import path from 'node:path';
import {promisify} from 'node:util';
import fastGlob from 'fast-glob';
import gitIgnore, {isPathValid} from 'ignore';
import isPathInside from 'is-path-inside';
import micromatch from 'micromatch';
import slash from 'slash';

export const isNegativePattern = pattern => pattern[0] === '!';

/**
Normalize a root-anchored pattern to be relative.

On Unix, patterns starting with `/` are interpreted as absolute paths from the filesystem root. This causes inconsistent behavior across platforms since Windows uses different path roots (like `C:\`).

This function strips leading `/` only for root-anchored glob patterns (e.g., `/**`, `/*.txt`, `/foo`), not for real absolute filesystem paths (e.g., `/Users/foo/bar`, `/home/user/project`).

The heuristic: if the pattern has multiple path segments and the first segment contains no glob characters, it's treated as a real absolute path and left unchanged.

@param {string} pattern - The pattern to normalize.
*/
export const normalizeAbsolutePatternToRelative = pattern => {
	if (!pattern.startsWith('/')) {
		return pattern;
	}

	const inner = pattern.slice(1);
	const firstSlashIndex = inner.indexOf('/');
	const firstSegment = firstSlashIndex > 0 ? inner.slice(0, firstSlashIndex) : inner;

	// Preserve real absolute paths (multi-segment, non-glob first component like /Users/foo/bar)
	if (firstSlashIndex > 0 && !fastGlob.isDynamicPattern(firstSegment)) {
		return pattern;
	}

	// Strip leading / from root-anchored globs (/**, /*.txt, /foo, /{src,dist}/**)
	return inner;
};

const absolutePrefixesMatch = (positivePrefix, negativePrefix) => negativePrefix === positivePrefix;

/**
Get the leading static prefix from an absolute pattern.

@param {string} pattern - The pattern to inspect.
@returns {string|undefined} Static absolute prefix, for example `/tmp/project`.
*/
export const getStaticAbsolutePathPrefix = pattern => {
	if (!path.isAbsolute(pattern)) {
		return undefined;
	}

	const staticSegments = [];
	for (const segment of pattern.split('/')) {
		if (!segment) {
			continue;
		}

		if (fastGlob.isDynamicPattern(segment)) {
			break;
		}

		staticSegments.push(segment);
	}

	return staticSegments.length === 0 ? undefined : `/${staticSegments.join('/')}`;
};

/**
Normalize a negative pattern while preserving true absolute paths when needed.

@param {string} pattern - A negative pattern without the leading `!`.
@param {string[]} [positiveAbsolutePathPrefixes] - Static prefixes from previous positive absolute patterns.
@param {boolean} [hasRelativePositivePattern] - Whether a relative positive pattern has been seen before this negation.
@returns {string} Normalized pattern.
*/
export const normalizeNegativePattern = (pattern, positiveAbsolutePathPrefixes = [], hasRelativePositivePattern = false) => {
	// Non-absolute patterns pass through unchanged.
	if (!pattern.startsWith('/')) {
		return pattern;
	}

	const normalizedPattern = normalizeAbsolutePatternToRelative(pattern);

	// Dynamic root-anchored patterns (e.g. `/{src,dist}/**`) are always normalized to relative.
	if (normalizedPattern !== pattern) {
		return normalizedPattern;
	}

	// In mixed relative/absolute pattern sets, keep root-anchored literals cwd-relative.
	if (hasRelativePositivePattern) {
		return pattern.slice(1);
	}

	// Literal absolute patterns are treated as cwd-relative unless they clearly target
	// the same absolute filesystem area as a positive absolute pattern seen so far.
	const negativeAbsolutePathPrefix = getStaticAbsolutePathPrefix(pattern);
	const preserveAsAbsolutePattern = negativeAbsolutePathPrefix !== undefined
		&& positiveAbsolutePathPrefixes.some(positiveAbsolutePathPrefix => absolutePrefixesMatch(positiveAbsolutePathPrefix, negativeAbsolutePathPrefix));

	return preserveAsAbsolutePattern ? pattern : pattern.slice(1);
};

export const bindFsMethod = (object, methodName) => {
	const method = object?.[methodName];
	return typeof method === 'function' ? method.bind(object) : undefined;
};

// Only used as a fallback for legacy fs implementations
export const promisifyFsMethod = (object, methodName) => {
	const method = object?.[methodName];
	if (typeof method !== 'function') {
		return undefined;
	}

	return promisify(method.bind(object));
};

export const normalizeDirectoryPatternForFastGlob = pattern => {
	if (!pattern.endsWith('/')) {
		return pattern;
	}

	const trimmedPattern = pattern.replace(/\/+$/u, '');
	if (!trimmedPattern) {
		return '/**';
	}

	// Special case for '**/' to avoid producing '**/**/**'
	if (trimmedPattern === '**') {
		return '**/**';
	}

	const hasLeadingSlash = trimmedPattern.startsWith('/');
	const patternBody = hasLeadingSlash ? trimmedPattern.slice(1) : trimmedPattern;
	const hasInnerSlash = patternBody.includes('/');
	const needsRecursivePrefix = !hasLeadingSlash && !hasInnerSlash && !trimmedPattern.startsWith('**/');
	const recursivePrefix = needsRecursivePrefix ? '**/' : '';

	return `${recursivePrefix}${trimmedPattern}/**`;
};

/**
Extract the parent directory prefix from a pattern (e.g., '../' or '../../').

Note: Patterns should have trailing slash after '..' (e.g., '../foo' not '..foo'). The directoryToGlob function ensures this in the normal pipeline.

@param {string} pattern - The pattern to analyze.
@returns {string} The parent directory prefix, or empty string if none.
*/
export const getParentDirectoryPrefix = pattern => {
	const normalizedPattern = isNegativePattern(pattern) ? pattern.slice(1) : pattern;
	const match = normalizedPattern.match(/^(\.\.\/)+/);
	return match ? match[0] : '';
};

/**
Adjust ignore patterns to match the relative base of the main patterns.

When patterns reference parent directories, ignore patterns starting with globstars need to be adjusted to match from the same base directory. This ensures intuitive behavior where ignore patterns work correctly with parent directory patterns.

This is analogous to how node-glob normalizes path prefixes (see node-glob issue #309) and how Rust ignore crate strips path prefixes before matching.

@param {string[]} patterns - The main glob patterns.
@param {string[]} ignorePatterns - The ignore patterns to adjust.
@returns {string[]} Adjusted ignore patterns.
*/
export const adjustIgnorePatternsForParentDirectories = (patterns, ignorePatterns) => {
	// Early exit for empty arrays
	if (patterns.length === 0 || ignorePatterns.length === 0) {
		return ignorePatterns;
	}

	// Get parent directory prefixes for all patterns (empty string if no prefix)
	const parentPrefixes = patterns.map(pattern => getParentDirectoryPrefix(pattern));

	// Check if all patterns have the same parent prefix
	const firstPrefix = parentPrefixes[0];
	if (!firstPrefix) {
		return ignorePatterns; // No parent directories in any pattern
	}

	const allSamePrefix = parentPrefixes.every(prefix => prefix === firstPrefix);
	if (!allSamePrefix) {
		return ignorePatterns; // Mixed bases - don't adjust
	}

	// Adjust ignore patterns that start with **/
	return ignorePatterns.map(pattern => {
		// Only adjust patterns starting with **/ that don't already have a parent reference
		if (pattern.startsWith('**/') && !pattern.startsWith('../')) {
			return firstPrefix + pattern;
		}

		return pattern;
	});
};

/**
Find the git root directory by searching upward for a .git directory.

@param {string} cwd - The directory to start searching from.
@param {Object} [fsImplementation] - Optional fs implementation.
@returns {string|undefined} The git root directory path, or undefined if not found.
*/
const getAsyncStatMethod = fsImplementation =>
	bindFsMethod(fsImplementation?.promises, 'stat')
	?? bindFsMethod(fs.promises, 'stat');

const getStatSyncMethod = fsImplementation => {
	if (fsImplementation) {
		return bindFsMethod(fsImplementation, 'statSync');
	}

	return bindFsMethod(fs, 'statSync');
};

const pathHasGitDirectory = stats => Boolean(stats?.isDirectory?.() || stats?.isFile?.());

const buildPathChain = (startPath, rootPath) => {
	const chain = [];
	let currentPath = startPath;

	chain.push(currentPath);

	while (currentPath !== rootPath) {
		const parentPath = path.dirname(currentPath);
		if (parentPath === currentPath) {
			break;
		}

		currentPath = parentPath;
		chain.push(currentPath);
	}

	return chain;
};

const findGitRootInChain = async (paths, statMethod) => {
	for (const directory of paths) {
		const gitPath = path.join(directory, '.git');

		try {
			const stats = await statMethod(gitPath); // eslint-disable-line no-await-in-loop
			if (pathHasGitDirectory(stats)) {
				return directory;
			}
		} catch {
			// Ignore errors and continue searching
		}
	}

	return undefined;
};

const findGitRootSyncUncached = (cwd, fsImplementation) => {
	const statSyncMethod = getStatSyncMethod(fsImplementation);
	if (!statSyncMethod) {
		return undefined;
	}

	const currentPath = path.resolve(cwd);
	const {root} = path.parse(currentPath);
	const chain = buildPathChain(currentPath, root);

	for (const directory of chain) {
		const gitPath = path.join(directory, '.git');
		try {
			const stats = statSyncMethod(gitPath);
			if (pathHasGitDirectory(stats)) {
				return directory;
			}
		} catch {
			// Ignore errors and continue searching
		}
	}

	return undefined;
};

export const findGitRootSync = (cwd, fsImplementation) => {
	if (typeof cwd !== 'string') {
		throw new TypeError('cwd must be a string');
	}

	return findGitRootSyncUncached(cwd, fsImplementation);
};

const findGitRootAsyncUncached = async (cwd, fsImplementation) => {
	const statMethod = getAsyncStatMethod(fsImplementation);
	if (!statMethod) {
		return findGitRootSync(cwd, fsImplementation);
	}

	const currentPath = path.resolve(cwd);
	const {root} = path.parse(currentPath);
	const chain = buildPathChain(currentPath, root);

	return findGitRootInChain(chain, statMethod);
};

export const findGitRoot = async (cwd, fsImplementation) => {
	if (typeof cwd !== 'string') {
		throw new TypeError('cwd must be a string');
	}

	return findGitRootAsyncUncached(cwd, fsImplementation);
};

/**
Get paths to all .gitignore files from git root to cwd (inclusive).

@param {string} gitRoot - The git root directory.
@param {string} cwd - The current working directory.
@returns {string[]} Array of .gitignore file paths to search for.
*/
const isWithinGitRoot = (gitRoot, cwd) => {
	const resolvedGitRoot = path.resolve(gitRoot);
	const resolvedCwd = path.resolve(cwd);
	return resolvedCwd === resolvedGitRoot || isPathInside(resolvedCwd, resolvedGitRoot);
};

export const getParentGitignorePaths = (gitRoot, cwd) => {
	if (gitRoot && typeof gitRoot !== 'string') {
		throw new TypeError('gitRoot must be a string or undefined');
	}

	if (typeof cwd !== 'string') {
		throw new TypeError('cwd must be a string');
	}

	// If no gitRoot provided, return empty array
	if (!gitRoot) {
		return [];
	}

	if (!isWithinGitRoot(gitRoot, cwd)) {
		return [];
	}

	const chain = buildPathChain(path.resolve(cwd), path.resolve(gitRoot));

	return [...chain]
		.reverse()
		.map(directory => path.join(directory, '.gitignore'));
};

// The wildcards gitignore itself understands, when not escaped. Other characters micromatch
// treats as syntax ((){}, extglobs, alternation) are literal in gitignore.
const GITIGNORE_WILDCARDS = /(?<!\\)[*?[]/u;

const hasGitignoreWildcards = value => GITIGNORE_WILDCARDS.test(value);

// Characters micromatch reads as syntax where gitignore does not. A glob rule containing them
// cannot be translated, and backslash escapes inside a glob cannot be safely carried through
// the path handling below, so such rules are left to the predicate.
const MICROMATCH_ONLY_SYNTAX = /[(){}|\\]/u;

// In gitignore, `\x` means the literal character x.
const unescapeGitignorePattern = value => value.replaceAll(/\\(.)/gu, '$1');

// Normalize ordinary escaped characters for the ignore package, while preserving escapes that it handles as literals. An escaped question mark is widened to a wildcard because the ignore package does not match it literally, and a possible match is safer here than pruning too much.
const normalizeGitignorePatternForIgnore = value => value.replaceAll(/\\(.)/gu, (match, character) => '*[]\\'.includes(character) ? match : character);

// Turn gitignore-literal text into fast-glob-literal text, so characters like `+(` cannot be
// misread as micromatch syntax.
const toLiteralPattern = value => fastGlob.escapePath(unescapeGitignorePattern(value));

const finalSegment = value => value.replace(/\/+$/u, '').split('/').pop();

// A fragment of rule text is not a rule on its own: `#name` would open a comment and `!name` a negation, both of which stop naming anything. Escape the leading character so the fragment keeps naming what it did inside the rule it came from.
const toStandaloneRule = value => value.replace(/^([#!])/u, String.raw`\$1`);

const isInsideCwd = relativePath => relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

/**
Resolve a pattern anchored at the directory of its ignore file into a cwd-relative one.

@param {string} directory - Directory of the ignore file that declared the rule.
@param {string} body - The rule body, relative to that directory.
@param {string} cwd - Directory the glob runs from.
@returns {string|undefined} The cwd-relative pattern, or undefined when it targets something outside the cwd.
*/
const anchorToCwd = (directory, body, cwd) => {
	const relativePath = slash(path.relative(cwd, path.join(directory, body)));
	return isInsideCwd(relativePath) ? relativePath : undefined;
};

// Compare names with the `ignore` package instead of guessing from the syntax, since it is the
// same engine the predicate uses for the real decision.
const createNameComparer = () => {
	const nameMatchers = new Map();
	const matchesName = (pattern, name) => {
		// The name is rule text, not a path: in gitignore `\#foo` names the file `#foo`. `Ignore#ignores()` only accepts a `path.relative()`d string and throws otherwise, so unescape first and treat whatever it still rejects (`.`, `..`, anything anchored) as a possible match.
		const namePath = unescapeGitignorePattern(name);
		if (!isPathValid(namePath)) {
			return true;
		}

		const normalizedPattern = normalizeGitignorePatternForIgnore(pattern);
		let nameMatcher = nameMatchers.get(normalizedPattern);
		if (!nameMatcher) {
			nameMatcher = gitIgnore().add([toStandaloneRule(normalizedPattern)]);
			nameMatchers.set(normalizedPattern, nameMatcher);
		}

		return nameMatcher.ignores(namePath);
	};

	// A negation can only re-include the excluded path itself; nothing below it can be re-included once the directory is excluded. Two globs cannot be compared this way, so treat them as a possible match.
	return (pattern, name) => {
		if (hasGitignoreWildcards(pattern) && hasGitignoreWildcards(name)) {
			return true;
		}

		return hasGitignoreWildcards(name) ? matchesName(name, pattern) : matchesName(pattern, name);
	};
};

const getNegationFinalSegments = rules => rules
	.filter(rule => isNegativePattern(rule.pattern))
	.map(rule => finalSegment(rule.pattern.slice(1)))
	.filter(Boolean);

/**
Check whether any negation in the given rules could re-include a path with one of the given names.

Used after the pruned ignore-file search: a negation found by that search can re-include a directory the prune patterns skipped, which means ignore files inside it were never discovered.

@param {Array<{pattern: string, directory: string}>} rules - Raw ignore-file lines and the directory of the ignore file that declared them.
@param {string[]} names - The guard names returned by `buildPrunePatternsAndGuards`.
@returns {boolean} Whether a negation could name one of them.
*/
export const negationsCouldRescue = (rules, names) => {
	if (names.length === 0) {
		return false;
	}

	const couldNameTheSamePath = createNameComparer();
	return getNegationFinalSegments(rules).some(negation => names.some(name => couldNameTheSamePath(name, negation)));
};

// Brace groups are expanded before the patterns are matched, so every alternative has to be checked on its own: `{**/.gitignore,dist}` names an ignore file even though the text it ends in, `dist}`, names nothing. `generateTasks()` is the only public fast-glob API that hands the expanded alternatives back as text, and it also leaves escaped braces alone.
const expandBraceGroups = pattern => {
	// Skipping the call also keeps the patterns `generateTasks()` rejects, such as an empty one, out of it.
	if (!pattern.includes('{')) {
		return [pattern];
	}

	// A pattern that yields no task, such as a negated one, has no alternatives to check, so fall back to the pattern as written rather than to nothing.
	const expandedPatterns = fastGlob.generateTasks(pattern).flatMap(task => task.patterns);
	return expandedPatterns.length > 0 ? expandedPatterns : [pattern];
};

/**
Drop the `ignore` patterns that could exclude an ignore file from the search that looks for them.

`ignore` excludes paths from the results, while the ignore files decide what is ignored, so it must never be able to hide one of them. See https://github.com/sindresorhus/globby/issues/281

The rest are normally kept unchanged, so that unreadable or unwanted directories are still skipped while searching. Advanced micromatch syntax in the directory portion makes filename comparison unreliable, so optional pruning is disabled for that rare pattern shape. See https://github.com/sindresorhus/globby/pull/259

A pattern that names a directory is safe to keep even when that directory holds an ignore file: nothing inside an excluded directory ends up in the results either. Only the final segment can name the ignore file itself, and a trailing `/**` does not protect it, since fast-glob matches `foo/**` against `foo` as well.

@param {string[]} ignorePatterns - The `ignore` option, as an array.
@param {string[]} searchPatterns - The patterns the ignore files are searched with.
@returns {string[]} The patterns that are left, to be used as the `ignore` option of that search.
*/
export const convertIgnorePatternsForIgnoreFileSearch = (ignorePatterns, searchPatterns) => {
	if (ignorePatterns.length === 0) {
		return ignorePatterns;
	}

	const couldNameTheSamePath = createNameComparer();
	const expandedSearchPatterns = searchPatterns.flatMap(pattern => expandBraceGroups(pattern));

	// Filename comparison is not reliable when micromatch-only syntax appears in the directory part, so skip this optional pruning for that rare pattern shape.
	if (expandedSearchPatterns.some(pattern => MICROMATCH_ONLY_SYNTAX.test(pattern.slice(0, pattern.lastIndexOf('/') + 1)))) {
		return [];
	}

	// The names the search looks for, such as `.gitignore` for the `gitignore` option, or whatever `ignoreFiles` asked for. Only the final segment can name a file; the rest of a search pattern says where to look.
	const ignoreFileNames = expandedSearchPatterns.map(pattern => finalSegment(pattern)).filter(Boolean);

	const couldNameAnIgnoreFile = pattern => {
		// A trailing `/**` excludes the contents of the directory it names, so only that name is left to compare. A wildcard final segment, as in `src/*`, still compares as one: it does not skip `src`, so the search walks in and would then throw the `.gitignore` it finds away.
		const name = finalSegment(pattern.replace(/\/\*\*$/u, ''));

		// Nothing left to compare means the pattern names no path of its own, as with `/`. Treat it as a possible match, since keeping it can only cost a missed ignore file. The same goes for micromatch syntax the comparison below cannot read, such as the extglob in `+(.gitignore)`.
		if (!name || MICROMATCH_ONLY_SYNTAX.test(name)) {
			return true;
		}

		return ignoreFileNames.some(ignoreFileName => MICROMATCH_ONLY_SYNTAX.test(ignoreFileName)
			? hasGitignoreWildcards(name) || micromatch.isMatch(unescapeGitignorePattern(name), ignoreFileName, {dot: true, nocase: true})
			: couldNameTheSamePath(name, ignoreFileName));
	};

	return ignorePatterns.filter(pattern => !expandBraceGroups(pattern).some(expanded => couldNameAnIgnoreFile(expanded)));
};

// Compute the prune pattern for a single rule, or undefined when the rule cannot be skipped safely. The returned object also carries the guard name (if any) whose skipping relies on the rule set being complete.
const getRulePrune = ({pattern, directory}, {cwd, matcher, hasNegations, canSkipAtAnyDepth, canMatchIgnoreFile, gitignoreOnlySearch}) => {
	if (isNegativePattern(pattern)) {
		return undefined;
	}

	const isDirectoryPattern = pattern.endsWith('/');
	const clean = pattern.replace(/\/+$/u, '');
	if (!clean) {
		return undefined;
	}

	// A leading `**/` is gitignore's explicit spelling of "match at any depth"; for a single trailing segment it is identical to the bare name (`**/foo` == `foo`). Drop it so the rule takes the any-depth branch below instead of being treated as an anchored glob.
	const body = clean.startsWith('**/') && !clean.slice(3).includes('/')
		? clean.slice(3)
		: clean;

	if (canMatchIgnoreFile(finalSegment(body))) {
		// Contents-only rules such as `foo/*` still allow traversal to `foo/.gitignore`, so the ignore-file search must read it before pruning foo's contents.
		return undefined;
	}

	const isGlob = hasGitignoreWildcards(body);
	if (isGlob && MICROMATCH_ONLY_SYNTAX.test(body)) {
		return undefined;
	}

	// The leading slash stops the normalizer from prefixing `**/`; the passed value already encodes the depth, and an extra `**/` would un-anchor an anchored rule.
	const toFastGlob = value =>
		normalizeDirectoryPatternForFastGlob(`/${value}${isDirectoryPattern ? '/' : ''}`).replace(/^\//u, '');

	// No separator: matches at any depth below the ignore file that declared it.
	if (!body.includes('/') && canSkipAtAnyDepth(body)) {
		const relativeDirectory = slash(path.relative(cwd, directory));
		const prefix = isInsideCwd(relativeDirectory) ? `${fastGlob.escapePath(relativeDirectory)}/` : '';
		return {pattern: toFastGlob(`${prefix}**/${isGlob ? body : toLiteralPattern(body)}`), guardName: body};
	}

	// Otherwise fall back to the single occurrence beside the ignore file, which names a concrete path that the matcher can verify directly.
	const anchoredBody = body.replace(/^\//u, '');
	const target = anchorToCwd(directory, isGlob ? anchoredBody : unescapeGitignorePattern(anchoredBody), cwd);
	if (target === undefined) {
		return undefined;
	}

	// The guard name is compared against negations as rule text, so it has to keep the escapes the rule was written with; the target has already lost them.
	const guardName = finalSegment(anchoredBody);

	if (isGlob) {
		// A glob does not name a concrete path, so the matcher cannot confirm it is ignored.
		return hasNegations
			? undefined
			: {pattern: toFastGlob(target), guardName};
	}

	if (!matcher(path.resolve(cwd, target) + path.sep).ignored) {
		return undefined;
	}

	// A direct child of the cwd can only be re-included by a rule at or above the cwd, and in a pure gitignore search those rules are all known already. A deeper target has intermediate directories whose ignore files may not have been read yet.
	const needsGuard = !gitignoreOnlySearch || target.includes('/');
	return {
		pattern: toFastGlob(fastGlob.escapePath(target)),
		guardName: needsGuard ? guardName : undefined,
	};
};

/**
Build the ignore patterns handed to fast-glob so it can skip ignored directories while traversing.

The authoritative filter is always the predicate, so these patterns only ever need to be safe:
skipping something the predicate would have kept loses files, while skipping less than possible
merely costs time. Two facts from the gitignore spec make aggressive skipping safe anyway:

- "It is not possible to re-include a file if a parent directory of that file is excluded."
  So a directory that is still ignored once every negation has been applied can be skipped whole.
- A pattern with no separator matches at any depth below its own ignore file, and one with a
  separator is anchored to that file's directory. Working from the raw rules - rather than from
  patterns already rebased onto some other directory - keeps that distinction intact, which is
  what lets this work from a subdirectory of the repository too.

The returned guard names are the directory names whose skipping relies on the given rules being
complete. A caller working from a partial rule set (the ignore-file search) must watch for later
negations that could name one of them; see `negationsCouldRescue`.

@param {Array<{pattern: string, directory: string}>} rules - Raw ignore-file lines and the directory of the ignore file that declared them.
@param {Function} matcher - The authoritative gitignore matcher.
@param {string} cwd - Directory the glob runs from.
@param {Object} [options] - Options.
@param {boolean} [options.gitignoreOnlySearch] - Whether the rule set can only grow through nested `.gitignore` files.
@param {boolean} [options.searchesForGitignoreFiles] - Whether the search includes `.gitignore` files.
@returns {{patterns: string[], guardNames: string[]}} Patterns safe to pass to fast-glob, and the names their safety depends on.
*/
export const buildPrunePatternsAndGuards = (rules, matcher, cwd, {gitignoreOnlySearch = false, searchesForGitignoreFiles = false} = {}) => {
	if (!matcher || !cwd || !rules || rules.length === 0) {
		return {patterns: [], guardNames: []};
	}

	const negationNames = getNegationFinalSegments(rules);
	const couldNameTheSamePath = createNameComparer();
	const context = {
		cwd,
		matcher,
		hasNegations: negationNames.length > 0,
		canSkipAtAnyDepth: pattern => !negationNames.some(name => couldNameTheSamePath(pattern, name)),
		canMatchIgnoreFile: pattern => searchesForGitignoreFiles && couldNameTheSamePath(pattern, '.gitignore'),
		gitignoreOnlySearch,
	};

	const patterns = [];
	const guardNames = [];

	for (const rule of rules) {
		const prune = getRulePrune(rule, context);
		if (!prune) {
			continue;
		}

		patterns.push(prune.pattern);
		if (prune.guardName !== undefined) {
			guardNames.push(prune.guardName);
		}
	}

	return {patterns, guardNames};
};

export const convertPatternsForFastGlob = (rules, matcher, cwd) => buildPrunePatternsAndGuards(rules, matcher, cwd).patterns;
