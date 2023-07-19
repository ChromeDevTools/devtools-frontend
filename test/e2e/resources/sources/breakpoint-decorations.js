function foo()
{
    var p = Promise.resolve().then(() => console.log(42))
        .then(() => console.log(239));
    return p;
}
