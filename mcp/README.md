# MCP

This is the entrypoint for
[chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp).
Unlike other entrypoints in front_end, the build output of this one is not
consumed (yet). Instead, `chrome-devtools-mcp` integrates files exported here
and their transitive dependencies into its own build.
