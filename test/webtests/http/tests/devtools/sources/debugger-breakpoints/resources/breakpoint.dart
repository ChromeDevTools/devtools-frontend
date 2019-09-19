void _foo(
    String a, List b) {
  var val1 = a.codeUnits.length as int;
  var val2 = a.runes.last;

  var val3 = b.isNotEmpty
    ? 42
    : null;
  print(val3);
}

void main() {
  _foo("hello", []);
}
