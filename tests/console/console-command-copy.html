<html>
<head>
<script src="../../http/tests/inspector/inspector-test.js"></script>
<script src="../../http/tests/inspector/console-test.js"></script>
<script>

function test()
{
    var results = [];
    var testCases = [
        "copy('qwerty')",
        "copy(document.querySelector('p'))",
        "copy({foo:'bar'})",
        "var a = {}; a.b = a; copy(a)",
        "copy(NaN)",
        "copy(Infinity)",
        "copy(null)",
        "copy(undefined)",
        "copy(1)",
        "copy(true)",
        "copy(false)",
        "copy(null)"
    ];

    function copyText(text) {
        results.push(text);
        if (results.length === testCases.length) {
            results.sort();
            for (var result of results)
                InspectorTest.addResult("InspectorFrontendHost.copyText: " + result);
            InspectorTest.completeTest();
        }
    }

    InspectorFrontendHost.copyText = copyText;
    for (var i = 0; i < testCases.length; ++i)
        InspectorTest.RuntimeAgent.evaluate(testCases[i], "", true);
}

</script>
</head>

<body onload="runTest()">
<p>
    Tests that console's copy command is copying into front-end buffer.
</p>

</body>
</html>
