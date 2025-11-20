function add(a, b) { return a + b; }

function multiline() {
    const a_1 = 1;
    const a_2 = 2;
    const x = add(a_1, a_2);
    const a_3 = 3;
    const a_4 = 4;
    const y = add(a_3, a_4);
    const a_5 = x;
    const a_6 = y;
    const z = add(a_5, a_6);

    console.log(z);
}

function singleline() {
    const a_1 = 1; const a_2 = 2; const x = add(a_1, a_2);
    const a_3 = 3; const a_4 = 4; const y = add(a_3, a_4);
    const a_5 = x; const a_6 = y; const z = add(a_5, a_6);

    console.log(z);
}
//# sourceMappingURL=sourcemap-stepping.map
