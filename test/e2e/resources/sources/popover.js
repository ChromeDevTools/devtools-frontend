var object = {foo: 1};
var array = [object, {foo: 5}, {foo: 10}, [42]];

function f1() {
    return object.foo
}

function f2() {
    return array[1].foo
}

function f3(i) {
    return array[i][0]
}
