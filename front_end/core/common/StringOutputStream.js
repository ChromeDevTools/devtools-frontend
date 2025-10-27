"use strict";
export class StringOutputStream {
  #data;
  constructor() {
    this.#data = "";
  }
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
