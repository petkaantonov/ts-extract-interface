import * as ts from "typescript"
import { ClassDeclaration, MethodDeclaration, TypescriptParser } from "typescript-parser"


const parser = new TypescriptParser();

function isString(val: any):  val is string {
    return typeof val === "string"
}

function inferParameterType(p: ts.ParameterDeclaration, sourceText: string): string {
    if (p.initializer) {
        const initializerText = sourceText.slice(p.initializer.pos, p.initializer.end).trim()
        if (["true", "false"].includes(initializerText)) {
            return "boolean"
        } else if (/['"`]/.test(initializerText)) {
            return "string"
        } else if (/^[0-9\.]+$/.test(initializerText)) {
            return "number"
        }
    }
    return "any"
}

function extractInterfaceDefinitionFromFunction(name: string, expressionText: string): string | undefined {
    const sourceFile = ts.createSourceFile(
        "placeholder.ts",
        expressionText,
        ts.ScriptTarget.ESNext,
        true,
        ts.ScriptKind.TS
      );

    for (const st of sourceFile.statements) {
        if (st.kind === ts.SyntaxKind.ExpressionStatement) {
            const binary = st.getChildAt(0)

            if (binary.kind === ts.SyntaxKind.BinaryExpression && binary.getChildAt(2).kind === ts.SyntaxKind.ArrowFunction) {
                const arrow = binary.getChildAt(2)  as ts.ArrowFunction
                return extract(arrow)                
            }
        } else if (st.kind === ts.SyntaxKind.ClassDeclaration) {
            const method = (st as ts.ClassDeclaration).members[0] as ts.MethodDeclaration
            return extract(method)
        }
    }

    function extract(node: ts.MethodDeclaration | ts.ArrowFunction) {
        const hasAsyncModifier = (((node.modifiers || [])) as any[])
            .find(mod => expressionText.slice(mod.pos, mod.end).trim() === "async")
        
        const typeParams = node.typeParameters?.map(tp => expressionText.slice(tp.pos, tp.end).trim())?.join(", ")

        const params = node.parameters.map(p => {
            const name = expressionText.slice(p.name.pos, p.name.end).trim()
            const isOptional = !!(p.initializer || p.questionToken)
            const type = p.type ? expressionText.slice(p.type.pos, p.type.end).trim() : inferParameterType(p, expressionText)
            return `${name}${isOptional ? "?" : ""}: ${type}`
        }).join(", ")
        const body = expressionText.slice(node.body!.pos, node.body!.end)
        let returnType = node.type ? expressionText.slice(node.type.pos, node.type.end).trim()
            : body.includes("return this") ? "this"
            : hasAsyncModifier ? "Promise<void>"
            : "void"
        
        const publicMethod = `${name}${typeParams ? `<${typeParams}>` : ""}(${params}): ${returnType}`
        return publicMethod
    }
}


 export async function extractInterface(sourceString: string) {
    const parsed = await parser.parseSource(sourceString);

    const classDeclaration = parsed.declarations.filter(declaration => declaration instanceof ClassDeclaration)[0] as ClassDeclaration
    const className = classDeclaration.name;

    const classMethods = classDeclaration.methods;
    const pretty: string[] = classMethods
        .filter(method => method.visibility === undefined || method.visibility > 1).map(v => {
            const methodText = `class ThrowAway { ${sourceString.slice(v.start, v.end)} }`
            return extractInterfaceDefinitionFromFunction(v.name, methodText)
        })
        .filter(isString)
    
        
    const fields = classDeclaration.properties.filter(prop => prop.visibility === undefined || prop.visibility > 1)
    pretty.push(...fields.map(v => {
        const expressionText = sourceString.slice(v.start, v.end)
        return extractInterfaceDefinitionFromFunction(v.name, expressionText)

    }).filter(isString))

    const res = `
export interface I${className} {
    ${pretty.join(";\n    ")}
}`

    return res;
}

