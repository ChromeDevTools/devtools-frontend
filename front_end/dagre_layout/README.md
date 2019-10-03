# Rolling Dagre

## What is dagre?
Dagre is a third-party graph layouting library, which is used by the graph visualizer of
Chrome `DevTools/web_audio`. It implements several research papers about layouting graph.
1. Size: The size of dagre.js 323 KB. The core of dagre.js is 83 KB.
2. Github repo: https://github.com/dagrejs/dagre

## Why should we add Dagre as a module, instead of a folder under web_audio?
Dagre is used by both `DevTools/web_audio` and `DevTools/web_audio_worker`. Therefore,
it seems better to be a module that can be used as a dependency. For example,
`web_audio` constructs `dagre.graphlib.Graph` and sends to `web_audio_worker`, which is a Web Worker that runs `dagre.layout()`.

## Updating Dagre
1. Download from https://github.com/dagrejs/dagre/blob/master/dist/dagre.js
2. Optionally add a comment "// clang-format off" at the beginning of `dagre.js`.
