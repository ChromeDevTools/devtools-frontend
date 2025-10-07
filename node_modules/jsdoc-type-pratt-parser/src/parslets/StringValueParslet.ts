import { composeParslet } from './Parslet.js'

export const stringValueParslet = composeParslet({
  name: 'stringValueParslet',
  accept: type => type === 'StringValue',
  parsePrefix: parser => {
    const text = parser.lexer.current.text
    parser.consume('StringValue')
    return {
      type: 'JsdocTypeStringValue',
      value: text.slice(1, -1),
      meta: {
        quote: text.startsWith('\'') ? 'single' : 'double'
      }
    }
  }
})
