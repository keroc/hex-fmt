'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, workspace, commands, Disposable, ExtensionContext} from 'vscode';
import {HexDocument} from './hexdoc'

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {

    // create a new HexDocument
    let hexDoc = new HexDocument();
    let controller = new HexDocumentController(hexDoc);

    var seekDisposable = commands.registerCommand('extension.hexFind', () => {
        // Check this is a .hex file
        if(window.activeTextEditor.document.languageId != "hex")
        {
            window.showErrorMessage("This command is only available with \".hex\" files.");
            return;
        }

        // Display a message box to the user
        window.showInputBox({prompt: 'Type an adress to find'}).then(val => {
            let address = parseInt(val);
            if(address === NaN || address < 0) {
                window.showErrorMessage("Wrong address format.");
                return;
            }

            // Go to the address
            if (!hexDoc.goToAddress(address)) {
                window.showWarningMessage("The address 0x" + address.toString(16) + " was not found.")
            }
        });
    });

    var repairDisposable = commands.registerCommand('extension.repairHex', () => {
        // Check this is a .hex file
        if(window.activeTextEditor.document.languageId != "hex")
        {
            window.showErrorMessage("This command is only available with \".hex\" files.");
            return;
        }

        // Repair the document
        let nbRep = hexDoc.repair();
        if(nbRep > 0) {
            window.showInformationMessage((nbRep === 1) ? "1 record has been repaired." : nbRep + " records have been repaired");
        } else {
            window.showInformationMessage("Nothing has been done.");
        }
    });

    // Add to a list of disposables which are disposed when this extension is deactivated.
    context.subscriptions.push(repairDisposable);
    context.subscriptions.push(seekDisposable);
    context.subscriptions.push(controller);
    context.subscriptions.push(hexDoc);
}

// this method is called when your extension is deactivated
export function deactivate() {
}


class HexDocumentController {
    private _hexDoc: HexDocument;
    private _disposable: Disposable;

    constructor(hexDoc: HexDocument) {
        this._hexDoc = hexDoc;

        // Start right now by updating the document
        this._hexDoc.updateStatusBar();

        // Subscribe to text change event
        let subscriptions: Disposable[] = [];
        window.onDidChangeActiveTextEditor(this._onEdit, this, subscriptions);
        window.onDidChangeTextEditorSelection(this._onEdit, this, subscriptions);
        workspace.onDidSaveTextDocument(this._onSave, this, subscriptions);

        // Create a combined disposable
        this._disposable = Disposable.from(...subscriptions);
    }

    dispose() {
        this._disposable.dispose();
    }

    private _onEdit() {
        this._hexDoc.updateStatusBar();
    }

    private _onSave() {
        // Check this is an .hex file
        if(window.activeTextEditor.document.languageId === "hex" &&
            workspace.getConfiguration("hex-fmt").get("repairOnSave", false)) {
            // Repair and save if needed
            if(this._hexDoc.repair() > 0)
            {
                window.activeTextEditor.document.save();
            }
        }
    }
}