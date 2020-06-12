export default function logicalAssignment(Parser) {
  const acorn = Parser.acorn || require("acorn")
  const tt = acorn.tokTypes
  return class extends Parser {
    // eslint-disable-next-line camelcase
    readToken_pipe_amp(code) { // '|&'
      let next = this.input.charCodeAt(this.pos + 1)
      if (next === code) {
        next = this.input.charCodeAt(this.pos + 2)
        if (next === 61) return this.finishOp(tt.assign, 3)
        return this.finishOp(code === 124 ? tt.logicalOR : tt.logicalAND, 2)
      }
      if (next === 61) return this.finishOp(tt.assign, 2)
      return this.finishOp(code === 124 ? tt.bitwiseOR : tt.bitwiseAND, 1)
    }

    getTokenFromCode(code) {
      return code == 63 ? this.readToken_question() : super.getTokenFromCode(code)
    }

    // eslint-disable-next-line camelcase
    readToken_question() { // '?'
      if (this.options.ecmaVersion >= 11) {
        let next = this.input.charCodeAt(this.pos + 1)
        if (next === 63) {
          next = this.input.charCodeAt(this.pos + 2)
          if (next === 61) return this.finishOp(tt.assign, 3)
          // Check if acorn has nullish coalescing support
          if (tt.coalesce) return this.finishOp(tt.coalesce, 2)
        }
      }
      return this.finishOp(tt.question, 1)
    }
  }
}
