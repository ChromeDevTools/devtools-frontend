# DevTools foundation

DevTools foundation is the core business logic of DevTools: mainly core/ and models/.
The difference between "foundation" and the rest of DevTools is
that the code is targeted not just for the browser, but also the Node.js runtime.
As such, allowed use of APIs is restricted to what is available in both runtimes.

A `DevToolsUniverse` is a concrete, encapsulated instance of "foundation" scoped
to a single root CDP target. It is valid to create multiple `DevToolsUniverse`
instances simultaneously.
