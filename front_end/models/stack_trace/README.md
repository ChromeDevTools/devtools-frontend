# DevTools Stack Trace Infrastructure

[Design Doc](https://docs.google.com/document/d/1gA3JXnzoeZZSbG8JyHzUcdzWrJl_aoETf7bfJ83BC0Q/edit?usp=sharing)

To create stack trace instances for use in the UI, grab the `Factory` from the `DebuggerWorkspaceBinding`.

If you run into a case where you need to source-map/DWARF a call frame and you can't utilize this module, reach out to one of the OWNERS.

## Module structure

The `stack_trace` module is intentionally split into 2 entrypoints:

  * The public available interface that the UI layer is supposed to use, i.e. the default `bundle` entrypoint.
  * And the actual implementation, whose visibility is restricted to `../bindings`.
