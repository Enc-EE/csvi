import * as vscode from 'vscode';
import { getNonce } from './util';

export class CsvEditorProvider implements vscode.CustomTextEditorProvider {

    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new CsvEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(CsvEditorProvider.viewType, provider);
        return providerRegistration;
    }

    private static readonly viewType = 'csvi.csv';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        function updateWebview() {
            let workspaceConfiguration = vscode.workspace.getConfiguration('editor');
            let eol = workspaceConfiguration.get<string>('lineEnding') ?? '\n';

            var text = document.getText();
            var lines = text.split(eol);
            var data = lines.map(x => x.split(','));

            webviewPanel.webview.postMessage({
                type: 'update',
                data: data,
            });
        }

        // Hook up event handlers so that we can synchronize the webview with the text document.
        //
        // The text document acts as our model, so we have to sync change in the document to our
        // editor and sync changes in the editor back to the document.
        // 
        // Remember that a single text document can also be shared between multiple custom
        // editors (this happens for example when you split a custom editor)

        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'addRow':
                    this.addRow(document);
                    return;

                case 'deleteRow':
                    this.deleteRow(document, e.rowIndex);
                    return;

                case 'addColumn':
                    this.addColumn(document);
                    return;

                case 'deleteColumn':
                    this.deleteColumn(document, e.columnIndex);
                    return;

                case 'update':
                    this.update(document, e.rowIndex, e.columnIndex, e.value);
                    return;
            }
        });

        updateWebview();
    }

    private getHtmlForWebview(webview: vscode.Webview): string {

        // Local path to script and css for the webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'csv.js'));

        const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'reset.css'));

        const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'vscode.css'));

        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(
            this.context.extensionUri, 'media', 'csv.css'));

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return /* html */`
        <!DOCTYPE html>
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
        
            <!-- Use a content security policy to only allow loading images from https or from our extension directory, and only allow scripts that have a specific nonce. -->
            <meta http-equiv="Content-Security-Policy"
                content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
        
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
            <link href="${styleResetUri}" rel="stylesheet" />
            <link href="${styleVSCodeUri}" rel="stylesheet" />
            <link href="${styleMainUri}" rel="stylesheet" />
        
            <title>csvi csv</title>
        </head>
        
        <body>
            <div id="main">
                <button id="addColumnBtn">Add Column</button>
                <button id="removeColumnBtn">Remove Column</button>
                <button id="addRowBtn">Add Row</button>
                <button id="removeRowBtn">Remove Row</button>
            </div>
        
            <script nonce="${nonce}" src="${scriptUri}"></script>
        </body>
        
        </html>`;
    }

    private addRow(document: vscode.TextDocument) {
        const edit = new vscode.WorkspaceEdit();

        var numberOfColumns = 0;
        if (document.lineCount > 0) {
            numberOfColumns = document.lineAt(0).text.split(',').length;
        }

        var newValue = '';
        for (let i = 1; i < numberOfColumns; i++) {
            newValue += ',';
        }

        let workspaceConfiguration = vscode.workspace.getConfiguration('editor');
        let eol = workspaceConfiguration.get<string>('lineEnding') ?? '\n';
        let lastLine = document.lineAt(document.lineCount - 1);
        if (!lastLine.range.isEmpty) {
            newValue = eol + newValue;
        }
        edit.insert(
            document.uri,
            lastLine.range.end,
            newValue);

        return vscode.workspace.applyEdit(edit);
    }

    private deleteRow(document: vscode.TextDocument, rowIndex: number) {
        const edit = new vscode.WorkspaceEdit();

        var line = document.lineAt(rowIndex);

        edit.delete(
            document.uri,
            line.rangeIncludingLineBreak);

        return vscode.workspace.applyEdit(edit);
    }

    private addColumn(document: vscode.TextDocument) {
        const edit = new vscode.WorkspaceEdit();

        for (let i = 0; i < document.lineCount; i++) {
            var line = document.lineAt(i);
            edit.insert(
                document.uri,
                line.range.end,
                ',');
        }

        return vscode.workspace.applyEdit(edit);
    }

    private deleteColumn(document: vscode.TextDocument, columnIndex: number) {
        const edit = new vscode.WorkspaceEdit();

        for (let i = 0; i < document.lineCount; i++) {
            var line = document.lineAt(i);
            var columns = line.text.split(',');
            columns.splice(columnIndex, 1);
            edit.replace(
                document.uri,
                line.range,
                columns.join(','));
        }

        return vscode.workspace.applyEdit(edit);
    }

    private update(document: vscode.TextDocument, rowIndex: number, columnIndex: number, value: string) {
        const edit = new vscode.WorkspaceEdit();

        var line = document.lineAt(rowIndex);

        var columns = line.text.split(',');
        columns[columnIndex] = value;

        edit.replace(document.uri, line.range, columns.join(','));

        return vscode.workspace.applyEdit(edit);
    }


}
