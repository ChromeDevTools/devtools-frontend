# Tsickle - TypeScript to Closure Translator [![Build Status](https://circleci.com/gh/angular/tsickle.svg?style=svg)](https://circleci.com/gh/angular/tsickle) [![Windows build](https://ci.appveyor.com/api/projects/status/puxdblmlqbofqqt1/branch/master?svg=true)](https://ci.appveyor.com/project/alexeagle/tsickle/branch/master)

Tsickle converts TypeScript code into a form acceptable to the [Closure
Compiler]. This allows using TypeScript to transpile your sources, and then
using Closure Compiler to bundle and optimize them, while taking advantage of
type information in Closure Compiler.

[closure compiler]: https://github.com/google/closure-compiler/

## What conversion means

A (non-exhaustive) list of the sorts of transformations Tsickle applies:

- inserts Closure-compatible JSDoc annotations on functions/classes/etc
- converts ES6 modules into `goog.module` modules
- generates externs.js from TypeScript d.ts (and `declare`, see below)
- declares types for class member variables
- translates `export * from ...` into a form Closure accepts
- converts TypeScript enums into a form Closure accepts
- reprocesses all jsdoc to strip Closure-invalid tags

In general the goal is that you write valid TypeScript and Tsickle handles
making it valid Closure Compiler code.

## Warning: work in progress

We already use tsickle within Google to minify our apps (including those using
Angular), but we have less experience using tsickle with the various JavaScript
builds that are seen outside of Google.

We would like to make tsickle usable for everyone but right now if you'd like
to try it you should expect to spend some time debugging and reporting bugs.

## Usage

Tsickle is a library, designed to be used by a larger program that interacts
with TypeScript and the Closure compiler.

Some known clients are:

1. Within Google we use tsickle inside the [Bazel build
   system](https://bazel.build/). That code is published as
   open source as part of [Bazel's nodejs/TypeScript
   build rules](https://bazelbuild.github.io/rules_nodejs/).
1. [tscc](https://github.com/theseanl/tscc) wraps tsickle and
   closure compiler, and interops with rollup.
1. We publish a simple demo program in the `demo/` subdirectory.

## Design details

### Output format

Tsickle is designed to do whatever is necessary to make the code acceptable by
Closure compiler. We view its output as a necessary intermediate form for
communicating to the Closure compiler, and not something for humans. This means
the tsickle output may be kind of ugly to read. Its only real use is to pass it
on to the compiler.

For one example, the syntax of types tsickle produces are specific to Closure.
The type `{!Foo}` means "Foo, excluding null" and a type alias becomes a `var`
statement that is tagged with `@typedef`.

Tsickle emits modules using Closure's `goog.module` module system. This system
is similar to but different from ES modules, and was supported by Closure before
the ES module system was finalized.

### Differences from TypeScript

Closure and TypeScript are not identical. Tsickle hides most of the
differences, but users must still be aware of some differences.

#### `declare`

Any declaration in a `.d.ts` file, as well as any declaration tagged with
`declare ...`, is intepreted by Tsickle as a name that should be preserved
through Closure compilation (i.e. not renamed into something shorter). Use it
any time the specific string names of your fields are significant. That would
most often happen when the object either coming from outside your program, or
being passed out of the program.

Example:

    declare interface JSONResult {
        username: string;
    }
    let r = JSON.parse(input) as JSONResult;
    console.log(r.username);

By adding `declare` to the interface (or if it were in a `.d.ts` file), Tsickle
will inform Closure that it must use exactly the field name `.username` (and not
e.g. `.a`) in the output JS. This matters for this example because the input
JSON probably uses the string `'username'` and not whatever name Closure would
invent for it. (Note: `declare` on an interface has no additional meaning in
pure TypeScript.)

#### Exporting decorators

An exporting decorator is a decorator that has `@ExportDecoratedItems` in its
JSDoc.

The names of elements that have an exporting decorator are preserved through
the Closure compilation process by applying an `@export` tag to them.

Example:

    /** @ExportDecoratedItems */
    function myDecorator() {
      // ...
    }

    @myDecorator()
    class DoNotRenameThisClass { ... }

## Development

### Dependencies

- nodejs. Install from your operating system's package manger, by following
  instructions on https://nodejs.org/en/, or by using
  [NVM](https://github.com/nvm-sh/nvm)
- yarn. Install from your operating system's package manager or by following
  [instructions on yarnpkg.com](https://yarnpkg.com/en/docs/install).
- bazel. Install from your operating system's package manager or by [following
  instructions here](https://docs.bazel.build/versions/master/install.html).

### One-time setup

Run `bazel run @nodejs//:yarn` to install dependencies.

### Bazel install

We use [bazel](https://bazel.build/) to build, and are pinned to a specific
version of it in `package.json` for reproducible builds. The build rules check
for a compatible version of bazel, so it is generally safe to use your local
installed version. If in doubt, you can run `yarn bazel` instead of `bazel` in
any of the below commands to make sure you are using the right version.

### Test commands

- `ibazel test test:unit_test` executes the unit tests in watch mode (use `bazel test test:unit_test` for a single run),
- `bazel test test:e2e_test` executes the e2e tests,
- `bazel test test:golden_test` executes the golden tests,
- `node check_format.js` checks the source code formatting using
  `clang-format`,
- `yarn test` runs unit tests, e2e tests and checks the source code formatting.

### Debugging

You can debug tests by using `bazel run` and passing `--node_options=--inspect`
or `--node_options=--inspect-brk` (to suspend execution directly after startup).

For example, to debug a specific golden test:

```shell
TEST_FILTER=my_golden_test ibazel run //test:golden_test -- --node_options=--inspect-brk
```

Then open [about:inspect] in Chrome and choose "about:inspect". Chrome will
launch a debugging session on any node process that starts with a debugger
listening on one of the listed ports. The tsickle tests and Chrome both default
to `localhost:9229`, so things should work out of the box.

The break in specific code locations you can add `debugger;` statements in the
source code.

Note: IDEs such as VS Code have support for the inspect protocol, but the
integration does not work due to bazel's complex directory layout.

### Updating Goldens

Run `UPDATE_GOLDENS=y bazel run test:golden_test` to have the test suite update
the goldens in `test_files/...`.

### Environment variables

Pass the flag `--action_env=TEST_FILTER=<REGEX>` to bazel test to limit the
end-to-end test (found in `test_files/...`) run tests with a name matching the
regex.

### Releasing

On a new branch, run

```
# tsickle releases are all minor releases for now, see npm help version.
$ npm version minor
```

This will update the version in `package.json`, commit the changes, and
create a git tag.

Push the branch and get it reviewed, but _do not merge_. If you click
the "rebase and merge" button in the Github UI it changes the commit,
so the git tag that was created would point at the wrong commit.

Instead, push the branch to master directly via:

```
$ git push origin mybranch:master
```

Note that Github will block non-fast-forward pushes to master, so if
there have been other intervening commits you'll need to recreate the
release.

Also push the tag.

```
$ git push origin v0.32.0  # but use correct version
```

Once the versioned tag is pushed to Github the release (as found on
https://github.com/angular/tsickle/releases) will be implicitly created.

Run `bazel run :npm_package.publish` from the master branch
(you must be logged into the `angular` shared npm account).
