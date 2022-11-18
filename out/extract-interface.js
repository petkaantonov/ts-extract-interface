"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractInterface = void 0;
const ts = require("typescript");
const typescript_parser_1 = require("typescript-parser");
const parser = new typescript_parser_1.TypescriptParser();
function isString(val) {
    return typeof val === "string";
}
function inferParameterType(p, sourceText) {
    if (p.initializer) {
        const initializerText = sourceText.slice(p.initializer.pos, p.initializer.end).trim();
        if (["true", "false"].includes(initializerText)) {
            return "boolean";
        }
        else if (/['"`]/.test(initializerText)) {
            return "string";
        }
        else if (/^[0-9\.]+$/.test(initializerText)) {
            return "number";
        }
    }
    return "any";
}
function extractInterfaceDefinitionFromFunction(name, expressionText) {
    const sourceFile = ts.createSourceFile("placeholder.ts", expressionText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
    for (const st of sourceFile.statements) {
        if (st.kind === ts.SyntaxKind.ExpressionStatement) {
            const binary = st.getChildAt(0);
            if (binary.kind === ts.SyntaxKind.BinaryExpression && binary.getChildAt(2).kind === ts.SyntaxKind.ArrowFunction) {
                const arrow = binary.getChildAt(2);
                return extract(arrow);
            }
        }
        else if (st.kind === ts.SyntaxKind.ClassDeclaration) {
            const method = st.members[0];
            return extract(method);
        }
    }
    function extract(node) {
        const hasAsyncModifier = ((node.modifiers || []))
            .find(mod => expressionText.slice(mod.pos, mod.end).trim() === "async");
        const typeParams = node.typeParameters?.map(tp => expressionText.slice(tp.pos, tp.end).trim())?.join(", ");
        const params = node.parameters.map(p => {
            const name = expressionText.slice(p.name.pos, p.name.end).trim();
            const isOptional = !!(p.initializer || p.questionToken);
            const type = p.type ? expressionText.slice(p.type.pos, p.type.end).trim() : inferParameterType(p, expressionText);
            return `${name}${isOptional ? "?" : ""}: ${type}`;
        }).join(", ");
        const body = expressionText.slice(node.body.pos, node.body.end);
        let returnType = node.type ? expressionText.slice(node.type.pos, node.type.end).trim()
            : body.includes("return this") ? "this"
                : hasAsyncModifier ? "Promise<void>"
                    : "void";
        const publicMethod = `${name}${typeParams ? `<${typeParams}>` : ""}(${params}): ${returnType}`;
        return publicMethod;
    }
}
async function extractInterface(sourceString) {
    const parsed = await parser.parseSource(sourceString);
    const classDeclaration = parsed.declarations.filter(declaration => declaration instanceof typescript_parser_1.ClassDeclaration)[0];
    const className = classDeclaration.name;
    const classMethods = classDeclaration.methods;
    const pretty = classMethods
        .filter(method => method.visibility === undefined || method.visibility > 1).map(v => {
        const methodText = `class ThrowAway { ${sourceString.slice(v.start, v.end)} }`;
        return extractInterfaceDefinitionFromFunction(v.name, methodText);
    })
        .filter(isString);
    const fields = classDeclaration.properties.filter(prop => prop.visibility === undefined || prop.visibility > 1);
    pretty.push(...fields.map(v => {
        const expressionText = sourceString.slice(v.start, v.end);
        return extractInterfaceDefinitionFromFunction(v.name, expressionText);
    }).filter(isString));
    const res = `
export interface I${className} {
    ${pretty.join(";\n    ")}
}`;
    return res;
}
exports.extractInterface = extractInterface;
//# sourceMappingURL=extract-interface.js.map