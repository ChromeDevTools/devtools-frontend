# Registering Extensions

Extensions can add functionality to the DevTools application.
Each extension is declared up front, using declarative registration calls.
The implementation for each extension lives in their respective folder, which are lazy-loaded to ensure a performant startup process of the DevTools application.

There are multiple types of extensions, including how DevTools handles its own internal business logic or to declare user-facing features with localized strings.
There are 4 main types of extensions:

* `UI.ActionRegistration.Action`
* `UI.View.View`
* `Common.Settings.Setting`
* General type lookups.

Each specific extension is documented in the README of their respective folder.

The registration of a particular extension implemented in `module` must always be declared in a `<module>-meta.ts` in the same folder.
The meta files should be included by all relevant entrypoints.
If you want to make functionality available in all DevTools entrypoints, you can import it in `shell.js`.

For example, the meta declaration file is called `network-meta.ts` and defined in `network/BUILD.gn`:
```python
devtools_entrypoint("meta") {
	entrypoint = "network-meta.ts"
	deps = [
		":bundle",
		"../root:bundle",
		"../ui:bundle",
	]
}
```
The meta `devtools_entrypoint` is added as a dependency to `front_end/BUILD.gn`.
