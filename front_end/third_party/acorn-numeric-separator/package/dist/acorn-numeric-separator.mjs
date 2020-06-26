function withoutAcornBigInt(acorn, Parser) {
  return class extends Parser {
    readInt(radix, len) {
      // Hack: len is only != null for unicode escape sequences,
      // where numeric separators are not allowed
      if (len != null) return super.readInt(radix, len)

      let start = this.pos, total = 0, acceptUnderscore = false;
      for (;;) {
        let code = this.input.charCodeAt(this.pos), val;
        if (code >= 97) val = code - 97 + 10; // a
        else if (code == 95) {
          if (!acceptUnderscore) this.raise(this.pos, "Invalid numeric separator");
          ++this.pos;
          acceptUnderscore = false;
          continue
        } else if (code >= 65) val = code - 65 + 10; // A
        else if (code >= 48 && code <= 57) val = code - 48; // 0-9
        else val = Infinity;
        if (val >= radix) break
        ++this.pos;
        total = total * radix + val;
        acceptUnderscore = true;
      }
      if (this.pos === start) return null
      if (!acceptUnderscore) this.raise(this.pos - 1, "Invalid numeric separator");

      return total
    }

    readNumber(startsWithDot) {
      const token = super.readNumber(startsWithDot);
      let octal = this.end - this.start >= 2 && this.input.charCodeAt(this.start) === 48;
      const stripped = this.getNumberInput(this.start, this.end);
      if (stripped.length < this.end - this.start) {
        if (octal) this.raise(this.start, "Invalid number");
        this.value = parseFloat(stripped);
      }
      return token
    }

    // This is used by acorn-bigint
    getNumberInput(start, end) {
      return this.input.slice(start, end).replace(/_/g, "")
    }
  }
}

function withAcornBigInt(acorn, Parser) {
  return class extends Parser {
    readInt(radix, len) {
      // Hack: len is only != null for unicode escape sequences,
      // where numeric separators are not allowed
      if (len != null) return super.readInt(radix, len)

      let start = this.pos, total = 0, acceptUnderscore = false;
      for (;;) {
        let code = this.input.charCodeAt(this.pos), val;
        if (code >= 97) val = code - 97 + 10; // a
        else if (code == 95) {
          if (!acceptUnderscore) this.raise(this.pos, "Invalid numeric separator");
          ++this.pos;
          acceptUnderscore = false;
          continue
        } else if (code >= 65) val = code - 65 + 10; // A
        else if (code >= 48 && code <= 57) val = code - 48; // 0-9
        else val = Infinity;
        if (val >= radix) break
        ++this.pos;
        total = total * radix + val;
        acceptUnderscore = true;
      }
      if (this.pos === start) return null
      if (!acceptUnderscore) this.raise(this.pos - 1, "Invalid numeric separator");

      return total
    }

    readNumber(startsWithDot) {
      let start = this.pos;
      if (!startsWithDot && this.readInt(10) === null) this.raise(start, "Invalid number");
      let octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
      let octalLike = false;
      if (octal && this.strict) this.raise(start, "Invalid number");
      let next = this.input.charCodeAt(this.pos);
      if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
        let str = this.getNumberInput(start, this.pos);
        // eslint-disable-next-line node/no-unsupported-features/es-builtins
        let val = typeof BigInt !== "undefined" ? BigInt(str) : null;
        ++this.pos;
        if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
        return this.finishToken(acorn.tokTypes.num, val)
      }
      if (octal && /[89]/.test(this.input.slice(start, this.pos))) {
        octal = false;
        octalLike = true;
      }
      if (next === 46 && !octal) { // '.'
        ++this.pos;
        this.readInt(10);
        next = this.input.charCodeAt(this.pos);
      }
      if ((next === 69 || next === 101) && !octal) { // 'eE'
        next = this.input.charCodeAt(++this.pos);
        if (next === 43 || next === 45) ++this.pos; // '+-'
        if (this.readInt(10) === null) this.raise(start, "Invalid number");
      }
      if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) this.raise(this.pos, "Identifier directly after number");
      let str = this.getNumberInput(start, this.pos);
      if ((octal || octalLike) && str.length < this.pos - start) {
        this.raise(start, "Invalid number");
      }

      let val = octal ? parseInt(str, 8) : parseFloat(str);
      return this.finishToken(acorn.tokTypes.num, val)
    }

    parseLiteral(value) {
      const ret = super.parseLiteral(value);
      if (ret.bigint) ret.bigint = ret.bigint.replace(/_/g, "");
      return ret
    }

    readRadixNumber(radix) {
      let start = this.pos;
      this.pos += 2; // 0x
      let val = this.readInt(radix);
      if (val == null) { this.raise(this.start + 2, `Expected number in radix ${radix}`); }
      if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
        let str = this.getNumberInput(start, this.pos);
        // eslint-disable-next-line node/no-unsupported-features/es-builtins
        val = typeof BigInt !== "undefined" ? BigInt(str) : null;
        ++this.pos;
      } else if (acorn.isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
      return this.finishToken(acorn.tokTypes.num, val)
    }

    // This is used by acorn-bigint, which theoretically could be used with acorn@6.2 || acorn@7
    getNumberInput(start, end) {
      return this.input.slice(start, end).replace(/_/g, "")
    }
  }
}

// eslint-disable-next-line node/no-unsupported-features/es-syntax
function numericSeparator(Parser) {
  const acorn = Parser.acorn || require("acorn");
  const withAcornBigIntSupport = (acorn.version.startsWith("6.") && !(acorn.version.startsWith("6.0.") || acorn.version.startsWith("6.1."))) || acorn.version.startsWith("7.");

  return withAcornBigIntSupport ? withAcornBigInt(acorn, Parser) : withoutAcornBigInt(acorn, Parser)
}

export default numericSeparator;
//# sourceMappingURL=acorn-numeric-separator.mjs.map
