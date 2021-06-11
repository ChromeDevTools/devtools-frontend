import { FilterPattern, createFilter } from '@rollup/pluginutils'
import { Options, minifyHTMLLiterals } from 'minify-html-literals'
import { Plugin, TransformResult } from 'rollup'

function minifyHTML ({
  include,
  exclude,
  options
}: {
  include?: FilterPattern
  exclude?: FilterPattern
  options?: Options
} = {}): Plugin {
  return {
    name: 'minify-html-template-literals',
    transform: (code: string, id: string): TransformResult => {
      if (include || exclude) {
        const filter = createFilter(include, exclude)
        if (!filter(id)) return null
      }
      const result = minifyHTMLLiterals(code, { fileName: id, ...options })
      return result ? result.code : null
    }
  }
}

export default minifyHTML
