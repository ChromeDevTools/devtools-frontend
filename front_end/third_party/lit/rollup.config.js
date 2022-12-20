import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";
import { terser } from "rollup-plugin-terser";

export default ['directive', 'directives', 'decorators', 'lit'].flatMap(filename => ([
  {
    input: `./src/${filename}.js`,
    output: {
      format: "es",
      file: `lib/${filename}.js`,
      sourcemap: true,
    },
    plugins: [nodeResolve(), terser()],
  },
  {
    input: `./src/${filename}.d.ts`,
    output: {
      format: "es",
      file: `lib/${filename}.d.ts`
    },
    plugins: [
      dts({ respectExternal: true }),
    ],
  },
]));
