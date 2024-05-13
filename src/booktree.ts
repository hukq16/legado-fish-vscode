import * as vscode from 'vscode';


const isUrl = require('is-url');

enum leafType {
    bookname,
    chapter
}


export class DepNodeProvider implements vscode.TreeDataProvider<BookNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<BookNode | undefined | null | void> = new vscode.EventEmitter<BookNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BookNode | undefined | null | void> = this._onDidChangeTreeData.event;
    booklist: BookNode[] = [];
    public chapterlist: string[] = [];
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }


    constructor() { }

    getTreeItem(element: BookNode): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BookNode): Thenable<BookNode[]> {
        if (element) {
            // Return children of the element
            if (element.nodetype === leafType.bookname) {
                return this.getchapterlist(element.bookurl);
            }
            else {
                return Promise.resolve([]);
            }

        } else {
            // Return root elements for the tree
            return this.getbooklist();
        }
    }


    public async getbooklist(): Promise<BookNode[]> {
        let webServeUrl: string =
            vscode.workspace.getConfiguration().get("legado-fish-vscode.webServeUrl") || "";
        webServeUrl = webServeUrl.replace(/^\s+|[\/\s]+$/, "");
        let getfullbookurl = `${webServeUrl}/getBookshelf`;
        console.log(getfullbookurl);
        let bookNodes: BookNode[] = [];
        if (isUrl(getfullbookurl)) {
            const blistdata = await fetchData(getfullbookurl);

            if (blistdata) {
                // console.log("Received data:", blistdata);
                if (blistdata.isSuccess) {
                    let booklist = blistdata.data;
                    console.log("Booklist:", booklist);

                    booklist.forEach((book: any) => {
                        let bookNode = new BookNode(book.name, vscode.TreeItemCollapsibleState.Collapsed, leafType.bookname, book.bookUrl);
                        bookNodes.push(bookNode);
                    });
                    return Promise.resolve(bookNodes);
                }

            }

            // return Promise.resolve([]);

        }
        return Promise.resolve([]);
    }

    public async getchapterlist(bookurl: string): Promise<BookNode[]> {
        let webServeUrl: string =
            vscode.workspace.getConfiguration().get("legado-fish-vscode.webServeUrl") || "";
        webServeUrl = webServeUrl.replace(/^\s+|[\/\s]+$/, "");
        let getfullchapterurl = `${webServeUrl}/getChapterList?url=` + encodeURIComponent(bookurl);
        console.log(getfullchapterurl);
        let chapternodes: BookNode[] = [];
        if (isUrl(getfullchapterurl)) {
            const clistdata = await fetchData(getfullchapterurl);

            if (clistdata) {
                // console.log("Received data:", clistdata);
                if (clistdata.isSuccess) {
                    let chapterlist = clistdata.data;
                    console.log("Chapterlist:", chapterlist);

                    chapterlist.forEach((chapter: any) => {
                        let ChapterNode = new BookNode(chapter.title, vscode.TreeItemCollapsibleState.None, leafType.chapter, bookurl, chapter.index);
                        chapternodes.push(ChapterNode);
                    });
                    return Promise.resolve(chapternodes);
                }

            }

            // return Promise.resolve([]);

        }
        return Promise.resolve([]);
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
        public readonly bookurl: string,
        public readonly index?: number,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.nodetype = nodetype;
        this.bookurl = bookurl;
        this.index = index;
        if (this.nodetype === leafType.chapter) {
            this.command = {
                command: 'legado-fish.showText', // 命令标识符
                title: 'showtext', // 仅描述性标题
                arguments: [this] // 可选，传递当前节点或其他参数
            };
        }
        // this.tooltip = `${this.label}-${this.version}`;
        // this.description = this.version;
    }
}


async function fetchData(url: string): Promise<any> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();  // 解析 JSON 数据并返回
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;  // 重新抛出错误以便调用者可以捕获
    }
}


export class BookTextViewProvider implements vscode.WebviewViewProvider {

    private _view?: vscode.WebviewView;
    private _lable: string = '';
    private _bookurl: string = '';
    private _index: number = 0;
    private _lablelist: string[] = [];

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
            // Enable javascript in the webview
            enableScripts: true
        };

        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,

            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = getWebviewhelloContent();

        webviewView.onDidDispose(() => {
            this._view = undefined;
        });
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'nextpage':
                        if (this._index === this._lablelist.length - 1) {
                            return;
                        }
                        this._index = this._index + 1, this._lablelist.length - 1;
                        this._lable = this._lablelist[this._index];
                        this.updatepage(this._lable, this._bookurl, this._index);

                        return;
                }
            }
        );
    }
    public async update(chapternode: BookNode) {
        if (this._view) {
            if (chapternode.index !== undefined) {
                this._view.webview.html = await getWebviewContent(chapternode.label, chapternode.bookurl, chapternode.index);
                if (this._bookurl !== chapternode.bookurl || this._lablelist.length === 0) { this._lablelist = await getchapterlistlable(chapternode.bookurl); }
                this._lable = chapternode.label;
                this._bookurl = chapternode.bookurl;
                this._index = chapternode.index;

            }
        }
    }
    public async updatepage(label: string, bookurl: string, index: number) {
        if (this._view) {
            this._view.webview.html = await getWebviewContent(label, bookurl, index);
        }
    }
}

async function getWebviewContent(label: string, bookurl: string, index: number) {

    let originalText = '';

    originalText = await getBookContent(bookurl, index);

    let replacedSpaces = originalText.replace(/\u3000/g, '&nbsp;');

    // 替换 \n 为 <br> 以在HTML中创建新的行
    let htmlContent = convertNewlinesToParagraphs(replacedSpaces);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
    <style>
    p {
        font-size: 14px; /* 所有段落的字体大小设置为18像素 */
        margin-bottom: 4px;
        margin-top: 4px;
    }
    </style>
</head>
<body>

    <h1>${label}</h1>
    ${htmlContent}
    <button id="myButton">下一章</button>
    <script>
        const vscode = acquireVsCodeApi();
        document.getElementById('myButton').addEventListener('click', () => {
            vscode.postMessage({
                command: 'nextpage',
                text: 'Button clicked!'
            });
        });
    </script>
    <script>
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.scrollTo(0, 0); // 更为通用的方法
        }, 100); // 延时100毫秒，根据需要调整
    });
    </script>
</body>
</html>`;
}

function getWebviewhelloContent() {

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
</head>
<body>
    <h1>hello world</h1>
    <p> legado <p>
</body>
</html>`;
}


async function getBookContent(bookurl: string, index: number): Promise<string> {
    let webServeUrl: string =
        vscode.workspace.getConfiguration().get("legado-fish-vscode.webServeUrl") || "";
    webServeUrl = webServeUrl.replace(/^\s+|[\/\s]+$/, "");
    let getfulltexturl = `${webServeUrl}/getBookContent?url=` + encodeURIComponent(bookurl) + `&index=${index}`;
    console.log(getfulltexturl);
    if (isUrl(getfulltexturl)) {
        const textdata = await fetchData(getfulltexturl);

        if (textdata) {
            // console.log("Received data:", textdata);
            if (textdata.isSuccess) {
                let chapterlist = textdata.data;
                // console.log("Chapterlist:", chapterlist);
                return Promise.resolve(chapterlist);
            }

        }

        // return Promise.resolve('');

    }
    return Promise.resolve('');
}


function convertNewlinesToParagraphs(text: string): string {
    // 分割文本为行
    const lines = text.split('\n');
    // 过滤掉空行并将每一行包装在<p>标签中
    const paragraphs = lines.filter(line => line.trim() !== '').map(line => `<p>${line}</p>`);
    // 将所有段落合并成一个字符串
    return paragraphs.join('');
}

async function getchapterlistlable(bookurl: string): Promise<string[]> {
    let webServeUrl: string =
        vscode.workspace.getConfiguration().get("legado-fish-vscode.webServeUrl") || "";
    webServeUrl = webServeUrl.replace(/^\s+|[\/\s]+$/, "");
    let getfullchapterurl = `${webServeUrl}/getChapterList?url=` + encodeURIComponent(bookurl);
    console.log(getfullchapterurl);
    let chapternodes: string[] = [];
    if (isUrl(getfullchapterurl)) {
        const clistdata = await fetchData(getfullchapterurl);

        if (clistdata) {
            // console.log("Received data:", clistdata);
            if (clistdata.isSuccess) {
                let chapterlist = clistdata.data;
                console.log("Chapterlist:", chapterlist);

                chapterlist.forEach((chapter: any) => {
                    let ChapterNode = chapter.title;
                    chapternodes.push(ChapterNode);
                });
                return Promise.resolve(chapternodes);
            }

        }

        // return Promise.resolve([]);

    }
    return Promise.resolve([]);
}