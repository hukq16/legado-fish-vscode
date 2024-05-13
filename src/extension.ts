// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { DepNodeProvider, BookTextViewProvider, BookNode } from './booktree';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "legado-fish-vscode" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const treeDataProvider2 = new DepNodeProvider();
	const treeView = vscode.window.createTreeView('legado-fish', {
		treeDataProvider: treeDataProvider2
	});

	context.subscriptions.push(treeView);
	const provider = new BookTextViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider("legado-panel-webview", provider));

	vscode.commands.registerCommand('legado-fish.refreshEntry', () =>
		treeDataProvider2.refresh()
	);

	const command = vscode.commands.registerCommand('legado-fish.showText', (node: BookNode) => {
		vscode.commands.executeCommand("legado-panel-webview.focus");
		provider.update(node);
	});
}

