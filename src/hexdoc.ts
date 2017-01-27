import {window, workspace, Disposable, StatusBarAlignment, StatusBarItem, TextDocument, Position, Selection, Range, TextEdit, WorkspaceEdit} from 'vscode';
import {HexLine} from './hexline';

export class HexDocument {
    private _hexLines: HexLine[];
    private _statusBarItem: StatusBarItem;
    private _size: number;

    public updateStatusBar() {

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

        let pos = editor.selection.active;
        let doc = editor.document;

        // Only update status if an Hex file
        if (doc.languageId === "hex") {
            this._updateDoc(doc);

            // Update the size
            if (this._size < 1024) {
                this._statusBarItem.text = `$(file-binary) ${this._size} B`;
            } else {
                let showableSize = this._size / 1024;
                this._statusBarItem.text = `$(file-binary) ${showableSize} KB`;
            }

            // Update the address
            if(this._hexLines[pos.line].isData()) {
                let address = this._hexLines[pos.line].charToAddress(pos.character);
                if(address >= 0) {
                    this._statusBarItem.text += ` $(mention) 0x${address.toString(16).toUpperCase()}`;
                }
            }

            this._statusBarItem.show();
        } else { 
            this._statusBarItem.hide();
        }
    }

    public goToAddress(address: number) : boolean {
        for(let i = 0; i < this._hexLines.length; i++) {
            let char = this._hexLines[i].addressToChar(address);
            if(char >= 0) {
                // Get the current text editor
                let editor = window.activeTextEditor;
                let pos = new Position(i, char);
                let sel = new Selection(pos, pos);
                
                // Set the new position
                editor.selection = sel;
                return true;
            }
        }

        return false;
    }

    public repair() : number {

        // Create the workspace edit
        let workspaceEdit = new WorkspaceEdit();
        let doc = window.activeTextEditor.document;
        let edits = [];

        for(let i = 0; i < this._hexLines.length; i++)
        {
            if(this._hexLines[i].isBroken()) {
                if(this._hexLines[i].repair()) {
                    // Build the text Edit
                    let range = doc.lineAt(i).range;
                    edits.push(new TextEdit(range, this._hexLines[i].toString()));
                }
            }
        }

        // Do the edition
        if(edits.length > 0) {
            workspaceEdit.set(doc.uri, edits);
            workspace.applyEdit(workspaceEdit);
        }

        return edits.length;
    }

    private _updateDoc(doc: TextDocument) {
        let offset = 0;
        this._hexLines = [];
        this._size = 0;        
        for (let i = 0; i < doc.lineCount; i++) {
            this._hexLines.push(new HexLine(doc.lineAt(i).text, offset));
            
            // Update size
            this._size += this._hexLines[i].size();

            // Check if a new offset is set
            if(this._hexLines[i].isExtendedAddress())
            {
                offset = this._hexLines[i].extAddress();
            }
        }
    }

    dispose() {
        this._statusBarItem.dispose();
    }
}