class Test {
  #x = 21;

  getX() {
    return this.#x
  }
}

function test() {
  (new Test).getX();
}
