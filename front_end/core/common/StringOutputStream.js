"use strict";
export class StringOutputStream {
  #data = "";
  async write(chunk) {
    this.#data += chunk;
  }
  async close() {
  }
  data() {
    return this.#data;
  }
}
//# sourceMappingURL=StringOutputStream.js.map
