"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = exports.writeExtracted = void 0;
const vscode = require("vscode");
const extract_interface_1 = require("./extract-interface");
exports.writeExtracted = function () {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const { document, selection } = editor;
    const selectionLine = selection.end.line;
    const interfaceString = document.getText(selection);
    const promise = extract_interface_1.extractInterface(interfaceString);
    const edit = new vscode.WorkspaceEdit();
    const lastLine = document.lineAt(selectionLine);
    promise.then(extracted => {
        edit.insert(document.uri, lastLine.range.end, extracted);
        return vscode.workspace.applyEdit(edit);
    });
};
exports.activate = function (context) {
    const disposable = vscode.commands.registerCommand('extension.writeExtracted', exports.writeExtracted);
    context.subscriptions.push(disposable);
};
exports.deactivate = function () { };
//# sourceMappingURL=extension.js.map