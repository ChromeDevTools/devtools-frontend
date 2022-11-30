import {nodeResolve} from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

export default [{
  input: './bundle.js',
  output: {
    format: 'es',
    dir: '.',
    manualChunks(id) {
      if (/legacy-modes/.test(id)) return 'chunk/legacy';
    },
    chunkFileNames(info) {
      for (let mod of Object.keys(info.modules)) {
        const match = /(@codemirror\/|@replit\/codemirror-)(?<name>[\w-]+)/.exec(mod);
        if (match) {
          const {name} = match.groups;
          if (name === 'view') return 'chunk/codemirror.js';
          if (/lang-/.test(name)) return `chunk/${name.slice(5)}.js`;
          if (name === 'legacy-modes') return 'chunk/legacy.js';
        }
      }
      throw new Error('Failed to determine a chunk name for ' + Object.keys(info.modules));
    },
    entryFileNames: 'codemirror.next.js',
    sourcemap: true,
  },
  plugins: [
    nodeResolve(),
    terser()
  ]
}, {
  input: './bundle.d.ts',
  output: {
    file: './codemirror.next.d.ts',
    format: 'es'
  },
  plugins: [
    dts({respectExternal: true}),
    {
      name: 'delete-trailing-whitespace',
      generateBundle(options, bundle) {
        for (let file of Object.values(bundle)) {
          if (file.code) file.code = file.code.replace(/[ \t]+(\n|$)/g, '$1');
        }
      }
    }
  ]
}];
