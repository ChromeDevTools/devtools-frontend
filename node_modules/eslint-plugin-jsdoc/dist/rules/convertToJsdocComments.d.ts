declare const _default: {
    create(context: import("eslint").Rule.RuleContext): {
        [x: string]: (((node: import("eslint").AST.Program & {
            parent: null;
        }) => void) & ((node: import("eslint").AST.Program) => void)) | ((codePath: import("eslint").Rule.CodePath, node: import("eslint").Rule.Node) => void) | ((segment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | ((fromSegment: import("eslint").Rule.CodePathSegment, toSegment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | ((node: import("eslint").Rule.Node) => void) | ((node: import("estree").CatchClause & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ClassBody & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").Identifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: (import("estree").SimpleLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").RegExpLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").BigIntLiteral & import("eslint").Rule.NodeParentExtension)) => void) | ((node: import("estree").MethodDefinition & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").PrivateIdentifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: (import("estree").AssignmentProperty & import("eslint").Rule.NodeParentExtension) | (import("estree").Property & import("eslint").Rule.NodeParentExtension)) => void) | ((node: import("estree").PropertyDefinition & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").SpreadElement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").Super & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").SwitchCase & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").TemplateElement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").VariableDeclarator & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ArrayExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ArrowFunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").AssignmentExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").AwaitExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").BinaryExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").SimpleCallExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ChainExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ClassExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ConditionalExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").FunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ImportExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").LogicalExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").MemberExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").MetaProperty & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").NewExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ObjectExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").SequenceExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").TaggedTemplateExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").TemplateLiteral & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ThisExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").UnaryExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").UpdateExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").YieldExpression & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ClassDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").FunctionDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ImportDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ExportNamedDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ExportDefaultDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ExportAllDeclaration & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ImportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ImportDefaultSpecifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ImportNamespaceSpecifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ExportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ObjectPattern & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ArrayPattern & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").RestElement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").AssignmentPattern & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ExpressionStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").BlockStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").StaticBlock & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").EmptyStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").DebuggerStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").WithStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ReturnStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").LabeledStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").BreakStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ContinueStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").IfStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").SwitchStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ThrowStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").TryStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").WhileStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").DoWhileStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ForStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ForInStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").ForOfStatement & import("eslint").Rule.NodeParentExtension) => void) | ((node: import("estree").VariableDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        onCodePathStart?: ((codePath: import("eslint").Rule.CodePath, node: import("eslint").Rule.Node) => void) | undefined;
        onCodePathEnd?: ((codePath: import("eslint").Rule.CodePath, node: import("eslint").Rule.Node) => void) | undefined;
        onCodePathSegmentStart?: ((segment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | undefined;
        onCodePathSegmentEnd?: ((segment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | undefined;
        onUnreachableCodePathSegmentStart?: ((segment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | undefined;
        onUnreachableCodePathSegmentEnd?: ((segment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | undefined;
        onCodePathSegmentLoop?: ((fromSegment: import("eslint").Rule.CodePathSegment, toSegment: import("eslint").Rule.CodePathSegment, node: import("eslint").Rule.Node) => void) | undefined;
        Program?: (((node: import("eslint").AST.Program & {
            parent: null;
        }) => void) & ((node: import("eslint").AST.Program) => void)) | undefined;
        "Program:exit"?: (((node: import("eslint").AST.Program & {
            parent: null;
        }) => void) & ((node: import("eslint").AST.Program) => void)) | undefined;
        Property?: ((node: (import("estree").AssignmentProperty & import("eslint").Rule.NodeParentExtension) | (import("estree").Property & import("eslint").Rule.NodeParentExtension)) => void) | undefined;
        "Property:exit"?: ((node: (import("estree").AssignmentProperty & import("eslint").Rule.NodeParentExtension) | (import("estree").Property & import("eslint").Rule.NodeParentExtension)) => void) | undefined;
        CatchClause?: ((node: import("estree").CatchClause & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "CatchClause:exit"?: ((node: import("estree").CatchClause & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ClassDeclaration?: ((node: import("estree").ClassDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ClassDeclaration:exit"?: ((node: import("estree").ClassDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ClassExpression?: ((node: import("estree").ClassExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ClassExpression:exit"?: ((node: import("estree").ClassExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ClassBody?: ((node: import("estree").ClassBody & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ClassBody:exit"?: ((node: import("estree").ClassBody & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        Identifier?: ((node: import("estree").Identifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "Identifier:exit"?: ((node: import("estree").Identifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        Literal?: ((node: (import("estree").SimpleLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").RegExpLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").BigIntLiteral & import("eslint").Rule.NodeParentExtension)) => void) | undefined;
        "Literal:exit"?: ((node: (import("estree").SimpleLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").RegExpLiteral & import("eslint").Rule.NodeParentExtension) | (import("estree").BigIntLiteral & import("eslint").Rule.NodeParentExtension)) => void) | undefined;
        ArrayExpression?: ((node: import("estree").ArrayExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ArrayExpression:exit"?: ((node: import("estree").ArrayExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ArrowFunctionExpression?: ((node: import("estree").ArrowFunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ArrowFunctionExpression:exit"?: ((node: import("estree").ArrowFunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        AssignmentExpression?: ((node: import("estree").AssignmentExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "AssignmentExpression:exit"?: ((node: import("estree").AssignmentExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        AwaitExpression?: ((node: import("estree").AwaitExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "AwaitExpression:exit"?: ((node: import("estree").AwaitExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        BinaryExpression?: ((node: import("estree").BinaryExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "BinaryExpression:exit"?: ((node: import("estree").BinaryExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        CallExpression?: ((node: import("estree").SimpleCallExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "CallExpression:exit"?: ((node: import("estree").SimpleCallExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        NewExpression?: ((node: import("estree").NewExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "NewExpression:exit"?: ((node: import("estree").NewExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ChainExpression?: ((node: import("estree").ChainExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ChainExpression:exit"?: ((node: import("estree").ChainExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ConditionalExpression?: ((node: import("estree").ConditionalExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ConditionalExpression:exit"?: ((node: import("estree").ConditionalExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        FunctionExpression?: ((node: import("estree").FunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "FunctionExpression:exit"?: ((node: import("estree").FunctionExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ImportExpression?: ((node: import("estree").ImportExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ImportExpression:exit"?: ((node: import("estree").ImportExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        LogicalExpression?: ((node: import("estree").LogicalExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "LogicalExpression:exit"?: ((node: import("estree").LogicalExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        MemberExpression?: ((node: import("estree").MemberExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "MemberExpression:exit"?: ((node: import("estree").MemberExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        MetaProperty?: ((node: import("estree").MetaProperty & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "MetaProperty:exit"?: ((node: import("estree").MetaProperty & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ObjectExpression?: ((node: import("estree").ObjectExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ObjectExpression:exit"?: ((node: import("estree").ObjectExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        SequenceExpression?: ((node: import("estree").SequenceExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "SequenceExpression:exit"?: ((node: import("estree").SequenceExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        TaggedTemplateExpression?: ((node: import("estree").TaggedTemplateExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "TaggedTemplateExpression:exit"?: ((node: import("estree").TaggedTemplateExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        TemplateLiteral?: ((node: import("estree").TemplateLiteral & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "TemplateLiteral:exit"?: ((node: import("estree").TemplateLiteral & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ThisExpression?: ((node: import("estree").ThisExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ThisExpression:exit"?: ((node: import("estree").ThisExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        UnaryExpression?: ((node: import("estree").UnaryExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "UnaryExpression:exit"?: ((node: import("estree").UnaryExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        UpdateExpression?: ((node: import("estree").UpdateExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "UpdateExpression:exit"?: ((node: import("estree").UpdateExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        YieldExpression?: ((node: import("estree").YieldExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "YieldExpression:exit"?: ((node: import("estree").YieldExpression & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        FunctionDeclaration?: ((node: import("estree").FunctionDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "FunctionDeclaration:exit"?: ((node: import("estree").FunctionDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        MethodDefinition?: ((node: import("estree").MethodDefinition & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "MethodDefinition:exit"?: ((node: import("estree").MethodDefinition & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ImportDeclaration?: ((node: import("estree").ImportDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ImportDeclaration:exit"?: ((node: import("estree").ImportDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ExportNamedDeclaration?: ((node: import("estree").ExportNamedDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ExportNamedDeclaration:exit"?: ((node: import("estree").ExportNamedDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ExportDefaultDeclaration?: ((node: import("estree").ExportDefaultDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ExportDefaultDeclaration:exit"?: ((node: import("estree").ExportDefaultDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ExportAllDeclaration?: ((node: import("estree").ExportAllDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ExportAllDeclaration:exit"?: ((node: import("estree").ExportAllDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ImportSpecifier?: ((node: import("estree").ImportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ImportSpecifier:exit"?: ((node: import("estree").ImportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ImportDefaultSpecifier?: ((node: import("estree").ImportDefaultSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ImportDefaultSpecifier:exit"?: ((node: import("estree").ImportDefaultSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ImportNamespaceSpecifier?: ((node: import("estree").ImportNamespaceSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ImportNamespaceSpecifier:exit"?: ((node: import("estree").ImportNamespaceSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ExportSpecifier?: ((node: import("estree").ExportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ExportSpecifier:exit"?: ((node: import("estree").ExportSpecifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ObjectPattern?: ((node: import("estree").ObjectPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ObjectPattern:exit"?: ((node: import("estree").ObjectPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ArrayPattern?: ((node: import("estree").ArrayPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ArrayPattern:exit"?: ((node: import("estree").ArrayPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        RestElement?: ((node: import("estree").RestElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "RestElement:exit"?: ((node: import("estree").RestElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        AssignmentPattern?: ((node: import("estree").AssignmentPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "AssignmentPattern:exit"?: ((node: import("estree").AssignmentPattern & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        PrivateIdentifier?: ((node: import("estree").PrivateIdentifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "PrivateIdentifier:exit"?: ((node: import("estree").PrivateIdentifier & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        PropertyDefinition?: ((node: import("estree").PropertyDefinition & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "PropertyDefinition:exit"?: ((node: import("estree").PropertyDefinition & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        SpreadElement?: ((node: import("estree").SpreadElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "SpreadElement:exit"?: ((node: import("estree").SpreadElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ExpressionStatement?: ((node: import("estree").ExpressionStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ExpressionStatement:exit"?: ((node: import("estree").ExpressionStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        BlockStatement?: ((node: import("estree").BlockStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "BlockStatement:exit"?: ((node: import("estree").BlockStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        StaticBlock?: ((node: import("estree").StaticBlock & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "StaticBlock:exit"?: ((node: import("estree").StaticBlock & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        EmptyStatement?: ((node: import("estree").EmptyStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "EmptyStatement:exit"?: ((node: import("estree").EmptyStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        DebuggerStatement?: ((node: import("estree").DebuggerStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "DebuggerStatement:exit"?: ((node: import("estree").DebuggerStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        WithStatement?: ((node: import("estree").WithStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "WithStatement:exit"?: ((node: import("estree").WithStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ReturnStatement?: ((node: import("estree").ReturnStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ReturnStatement:exit"?: ((node: import("estree").ReturnStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        LabeledStatement?: ((node: import("estree").LabeledStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "LabeledStatement:exit"?: ((node: import("estree").LabeledStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        BreakStatement?: ((node: import("estree").BreakStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "BreakStatement:exit"?: ((node: import("estree").BreakStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ContinueStatement?: ((node: import("estree").ContinueStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ContinueStatement:exit"?: ((node: import("estree").ContinueStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        IfStatement?: ((node: import("estree").IfStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "IfStatement:exit"?: ((node: import("estree").IfStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        SwitchStatement?: ((node: import("estree").SwitchStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "SwitchStatement:exit"?: ((node: import("estree").SwitchStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ThrowStatement?: ((node: import("estree").ThrowStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ThrowStatement:exit"?: ((node: import("estree").ThrowStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        TryStatement?: ((node: import("estree").TryStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "TryStatement:exit"?: ((node: import("estree").TryStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        WhileStatement?: ((node: import("estree").WhileStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "WhileStatement:exit"?: ((node: import("estree").WhileStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        DoWhileStatement?: ((node: import("estree").DoWhileStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "DoWhileStatement:exit"?: ((node: import("estree").DoWhileStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ForStatement?: ((node: import("estree").ForStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ForStatement:exit"?: ((node: import("estree").ForStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ForInStatement?: ((node: import("estree").ForInStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ForInStatement:exit"?: ((node: import("estree").ForInStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        ForOfStatement?: ((node: import("estree").ForOfStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "ForOfStatement:exit"?: ((node: import("estree").ForOfStatement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        VariableDeclaration?: ((node: import("estree").VariableDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "VariableDeclaration:exit"?: ((node: import("estree").VariableDeclaration & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        Super?: ((node: import("estree").Super & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "Super:exit"?: ((node: import("estree").Super & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        SwitchCase?: ((node: import("estree").SwitchCase & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "SwitchCase:exit"?: ((node: import("estree").SwitchCase & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        TemplateElement?: ((node: import("estree").TemplateElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "TemplateElement:exit"?: ((node: import("estree").TemplateElement & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        VariableDeclarator?: ((node: import("estree").VariableDeclarator & import("eslint").Rule.NodeParentExtension) => void) | undefined;
        "VariableDeclarator:exit"?: ((node: import("estree").VariableDeclarator & import("eslint").Rule.NodeParentExtension) => void) | undefined;
    };
    meta: {
        docs: {
            description: string;
            url: string;
        };
        fixable: "code";
        messages: {
            blockCommentsJsdocStyle: string;
            lineCommentsJsdocStyle: string;
        };
        schema: {
            additionalProperties: false;
            properties: {
                allowedPrefixes: {
                    description: string;
                    items: {
                        type: "string";
                    };
                    type: "array";
                };
                contexts: {
                    description: string;
                    items: {
                        anyOf: ({
                            type: "string";
                            additionalProperties?: undefined;
                            properties?: undefined;
                        } | {
                            additionalProperties: false;
                            properties: {
                                context: {
                                    type: "string";
                                };
                                inlineCommentBlock: {
                                    type: "boolean";
                                };
                            };
                            type: "object";
                        })[];
                    };
                    type: "array";
                };
                contextsAfter: {
                    description: string;
                    items: {
                        anyOf: ({
                            type: "string";
                            additionalProperties?: undefined;
                            properties?: undefined;
                        } | {
                            additionalProperties: false;
                            properties: {
                                context: {
                                    type: "string";
                                };
                                inlineCommentBlock: {
                                    type: "boolean";
                                };
                            };
                            type: "object";
                        })[];
                    };
                    type: "array";
                };
                contextsBeforeAndAfter: {
                    description: string;
                    items: {
                        anyOf: ({
                            type: "string";
                            additionalProperties?: undefined;
                            properties?: undefined;
                        } | {
                            additionalProperties: false;
                            properties: {
                                context: {
                                    type: "string";
                                };
                                inlineCommentBlock: {
                                    type: "boolean";
                                };
                            };
                            type: "object";
                        })[];
                    };
                    type: "array";
                };
                enableFixer: {
                    description: string;
                    type: "boolean";
                };
                enforceJsdocLineStyle: {
                    description: string;
                    enum: string[];
                    type: "string";
                };
                lineOrBlockStyle: {
                    description: string;
                    enum: string[];
                    type: "string";
                };
            };
            type: "object";
        }[];
        type: "suggestion";
    };
};
export default _default;
//# sourceMappingURL=convertToJsdocComments.d.ts.map