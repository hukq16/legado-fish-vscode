import * as vscode from 'vscode';

import axios from 'axios';

const isUrl = require('is-url');

enum leafType {
    bookname,
    contents,
    chapter
}


export class DepNodeProvider implements vscode.TreeDataProvider<BookNode> {
    constructor() { }

    getTreeItem(element: BookNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BookNode): Thenable<BookNode[]> {
        if (element) {
            // Return children of the element
            return Promise.resolve([]);
        } else {
            // Return root elements for the tree
            return Promise.resolve(this.getbooklist());
        }
    }


    public getbooklist(): BookNode[] {
        let webServeUrl: string =
        vscode.workspace.getConfiguration().get("legado-fish-vscode.webServeUrl") || "";
      webServeUrl = webServeUrl.replace(/^\s+|[\/\s]+$/, "");
        let getfullbookurl = `${webServeUrl}/getBookshelf`;
        console.log(getfullbookurl);
        if (isUrl(getfullbookurl)) {
                fetchData(getfullbookurl).then(data => {
                    if (data) {
                        console.log("Received data:", data);
                        if (data.isSuccess){
                            let booklist = data.data;
                            console.log("Booklist:", booklist);
                            let bookNodes: BookNode[] = [];
                            booklist.forEach((book: any) => {
                                let bookNode = new BookNode(book.name, vscode.TreeItemCollapsibleState.Collapsed, leafType.bookname);
                                bookNodes.push(bookNode);
                            });
                            return bookNodes;
                        }
                    } else {
                        console.log("No data received.");
                    }
                }).catch(error => {
                    console.error("Error while fetching data:", error);
                });
        }
        
        return [];
       
    }
}



export class BookNode extends vscode.TreeItem {
    // nodetype: leafType;
    children: BookNode[] = [];

    constructor(
        public readonly label: string,
        // private readonly version: string,

        public readonly collapsibleState: vscode.TreeItemCollapsibleState,

        public readonly nodetype: leafType,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.nodetype = nodetype;
        // this.tooltip = `${this.label}-${this.version}`;
        // this.description = this.version;
    }
}


async function fetchData(url: string): Promise<any> {
    try {
        const response = await axios.get(url);
        return response.data;  // axios 自动处理 JSON 数据
    } catch (error) {
        console.error("Fetching data failed:", error);
        return null;
    }
}


export class BookTextViewProvider implements vscode.WebviewViewProvider {

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }


    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = getWebviewContent();

        webviewView.onDidDispose(() => {
            this._view = undefined;
        });
    }
    public update() {
        if (this._view) {
            this._view.webview.html = getWebviewContent();
        }
    }
}

function getWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, World!</h1>
    <p>This is a legado terminal reader in VSCode.</p>
</body>
</html>`;
}