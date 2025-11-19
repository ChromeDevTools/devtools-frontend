function f2()
{
    var a = 0; // This is too early for the breakpoint
    var b = 1; // The breakpoint should happen here
    var c = 3;
    var d = 4;
    var e = 5;
    var f = "The code went past the breakpoint!";
    return 0;
}
