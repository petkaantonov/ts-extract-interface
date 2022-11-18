import * as vscode from "vscode"
import { extractInterface }  from "./extract-interface"

export const writeExtracted = function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return
    }
    const { document, selection } = editor;

    const selectionLine = selection.end.line;
    const interfaceString = document.getText(selection)
    const promise = extractInterface(interfaceString)

    const edit = new vscode.WorkspaceEdit();
    const lastLine = document.lineAt(selectionLine);
    promise.then(extracted => {
        edit.insert(document.uri, lastLine.range.end, extracted);
        return vscode.workspace.applyEdit(edit)
    })
}

export const activate = function (context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('extension.writeExtracted', writeExtracted);
    context.subscriptions.push(disposable);
}

export const deactivate = function () {}
