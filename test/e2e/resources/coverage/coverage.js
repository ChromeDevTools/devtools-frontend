function outer(index) {

  function inner1(a) {
    return a + 1;
  }

  function inner2(a) {
    return a + 2;
  }

  function inner3(a) { return a + 3; } function inner4(a) { return a + 4; } function inner5(a) { return a + 5; }

  if (index === 7) {
    console.error('This will never happen!');
  }

  // Make sure these are not collected.
  if (!self.__funcs)
    self.__funcs = [inner1, inner2, inner3, inner4, inner5];
  return self.__funcs[index];
}

function performActions() {
  return outer(1)(0) + outer(3)(0);
} function outer2() {
  return outer(0)(0);
}
