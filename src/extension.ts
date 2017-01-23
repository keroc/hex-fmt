'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';
import {HexLine} from './hexline';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "ihex" is now active!');

    // create a new byte counter
    let hexDoc = new HexDocument();

    var disposable = commands.registerCommand('extension.sayHello', () => {
        hexDoc.updateByteCount();
    });

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(hexDoc);
    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

class HexDocument {

    private _statusBarItem: StatusBarItem;

    public updateByteCount() {

        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an Hex file
        if (doc.languageId === "hex") {
            let binSize = this._updateDoc(doc);

            // Update the status bar
            if (binSize < 1024) {
                this._statusBarItem.text = `${binSize} B`;
            } else {
                binSize /= 1024;
                this._statusBarItem.text = `${binSize} KB`;
            }
            this._statusBarItem.show();
        } else { 
            this._statusBarItem.hide();
        }
    }

    public _updateDoc(doc: TextDocument): number {

        let docContent = doc.getText();

        let hexLines = docContent.split("\n");
        let docSize = 0;        
        for (let i = 0; i < hexLines.length; i++) {
            let hex = new HexLine(hexLines[i]);
            docSize += hex.size()
        }

        return docSize;
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}