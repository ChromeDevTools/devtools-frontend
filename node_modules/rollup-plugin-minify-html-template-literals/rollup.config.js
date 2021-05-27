const pkg = require('./package.json')
const typescript = require('@rollup/plugin-typescript')

export default {
  input: 'src/index.ts',
  external: Object.keys(pkg.dependencies),
  plugins: [typescript()],
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'auto'
    },
    {
      file: pkg.module,
      format: 'es'
    }
  ]
}
