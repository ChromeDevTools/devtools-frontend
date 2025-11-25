import {
  nodeResolve,
} from '@rollup/plugin-node-resolve';

export default [
  {
    input: 'node_modules/to-valid-identifier/index.js',
    output: {
      file: 'dist/to-valid-identifier.cjs',
      format: 'cjs',
    },
    plugins: [
      nodeResolve(),
    ],
  },
];
