# GN TypeScript integration

To integrate [gn] with [TypeScript], this directory contains a `ts_library` action to compile TypeScript and JavaScript sources with the TypeScript compiler `tsc`.

To use the action, import the [`typescript.gni`] file:

```python
import("../../third_party/typescript/typescript.gni")
```

After importing, you can now use the `ts_library` action to define a GN task that compiles with `tsc`:

```python
ts_library("my_typescript_library") {
  sources = [
    "foo.ts",
  ]
}

ts_library("my_javascript_library") {
  sources = [
    "bar.js",
  ]
}

ts_library("my_mixed_library") {
  sources = [
    "typescript.ts",
    "javascript.js",
  ]
}
```

The sources will be compiled with `tsc` and generate corresponding output in the `gen` folder in the `out` directory.

To depend on other `ts_libraries`, specify the `deps`:

```python
ts_library("my_user_library") {
  sources = [
    "dependent.ts",
  ]

  deps = [
    ":my_mixed_library",
  ]
}
```

`deps` use the same notation as [GN `deps`].
Therefore, `ninja` will parallelize compilation of `ts_library` dependencies.

A `ts_library` either needs to specify `sources`, `deps` or both.

For tests compiled with `ts_library`, set `testonly = true`:

```python
ts_library("my_test_library") {
  testonly = true,
  sources = [
    "my_library_test.ts",
  ]

  deps = [
    "../../../../front_end/my_library",
  ]
}
```

Compiling with `testonly = true` will include the type definitions for `Node`, `Chai` and `Mocha`.

To instruct Ninja to execute the `ts_library` task, make sure that there is a dependency chain from `/BUILD.gn` (or `test/*/BUILD.gn`) to the `ts_library` in question.

## Implementation details

A `ts_library` task will generate a `tsconfig.json` based on `/tsconfig.base.json` and write it to disk in the `gen` directory.
Ater that, it will instruct `tsc` to compile the project based on the `tsconfig.json`.

All `deps` are desugared to [project references].
`tsc` will not recursively compile dependencies, Ninja handles that.

Since Ninja does not recompile unchanged actions, all `ts_library` actions generate corresponding `.d.ts` files which specify the public API's of the sources, as well as the `.tsbuildinfo` for efficient recompilation with `tsc`.

There are several global `.d.ts` files added to every `ts_library`.
The `GLOBAL_TYPESCRIPT_DEFINITION_FILES` list in `ts_library.py` contains the list of all definition files.
These files must also be listed as `inputs` in `typescript.gni`.

**Legacy:** For legacy reasons, all non-testonly outputs are also copied to `resources/inspector` in the `out` directory.

[gn]: https://gn.googlesource.com/gn/+/master/docs/reference.md
[TypeScript]: https://www.typescriptlang.org/
[`typescript.gni`]: typescript.gni
[GN `deps`]: https://gn.googlesource.com/gn/+/master/docs/reference.md#var_deps
[project references]: https://www.typescriptlang.org/docs/handbook/project-references.html