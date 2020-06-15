// eslint-disable-next-line node/no-unsupported-features/es-syntax
export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/acorn-numeric-separator.js",
      format: "cjs",
      sourcemap: true
    },
    {
      file: "dist/acorn-numeric-separator.mjs",
      format: "es",
      sourcemap: true
    }
  ]
}
