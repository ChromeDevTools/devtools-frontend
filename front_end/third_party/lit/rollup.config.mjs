import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import dts from "rollup-plugin-dts";

export default ['directive', 'directives', 'decorators', 'lit', 'static-html'].flatMap(filename => ([
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
