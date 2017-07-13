'use strict'

import * as vscode from 'vscode'
import * as fs from 'fs'
import { sep, resolve } from 'path'
import * as isit from 'isit'

export function activate (context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('extension.newPiece', async () => {
    if (!vscode.workspace.rootPath) return vscode.window.showErrorMessage('No workspace open')

    let pieceType: string = await vscode.window.showQuickPick([
      'Command',
      'Event',
      'Extendable',
      'Finalizer',
      'Function',
      'Inhibitor',
      'Monitor'
      // tslint:disable-next-line:align
    ], {
      placeHolder: 'Select piece type'
    })

    if (!isit('non-empty string', pieceType)) return

    pieceType = pieceType.toLowerCase()

    const pieceTypePlural: string = `${pieceType.toLowerCase()}s`

    const piecesFolder: string = resolve(`${vscode.workspace.rootPath}${sep}${pieceTypePlural}`)

    if (!fs.existsSync(piecesFolder)) fs.mkdirSync(piecesFolder)

    const folders: string[] = fs.readdirSync(piecesFolder)
      .filter(f => fs.statSync(`${piecesFolder}${sep}${f}`).isDirectory())
    folders.unshift('Create new folder')

    let folderName: string = await vscode.window.showQuickPick(folders, { placeHolder: 'Select folder' })

    if (!isit('non-empty string', folderName)) return

    if (folderName === 'Create new folder') {
      folderName = await vscode.window.showInputBox({
        prompt: 'Enter folder name',
        placeHolder: 'Folder'
      })
      fs.mkdirSync(`${piecesFolder}${sep}${folderName}`)
    }
    const commandName = await vscode.window.showInputBox({
      prompt: `Enter the name of the ${pieceType}`,
      placeHolder: 'Name'
    })

    if (!isit('non-empty string', commandName)) return

    const newFilePath: string = resolve(`${piecesFolder}${sep}${folderName}${sep}${commandName}.js`)

    if (fs.existsSync(newFilePath)) return vscode.window.showErrorMessage('A file with this name already exisists in that folder.')

    fs.writeFileSync(newFilePath, createFileContent(pieceType, commandName))

    vscode.workspace.openTextDocument(vscode.Uri.file(newFilePath)).then(textDocument => vscode.window.showTextDocument(textDocument))
  })

  context.subscriptions.push(disposable)
}

function createFileContent (type: string, name: string) {
  return templates[type].replace('INSERT HERE', name)
}

export function deactivate () { }

const templates: object = {
  command: 'exports.run = async (client, msg, [...args]) => {\r\n  \/\/ Place Code Here\r\n};\r\n\r\nexports.conf = {\r\n  enabled: true,\r\n  runIn: [\"text\", \"group\", \"dm\"],\r\n  aliases: [],\r\n  permLevel: 0,\r\n  botPerms: [],\r\n  requiredFuncs: [],\r\n  cooldown: 0\r\n};\r\n\r\nexports.help = {\r\n  name: \"INSERT HERE\",\r\n  description: \"\",\r\n  usage: \"\",\r\n  usageDelim: \"\",\r\n  extendedHelp: \"\"\r\n};\r\n',
  event: 'exports.run = (client, ...args) => {\r\n  \/\/ Place Code Here\r\n};\r\n',
  extendable: '',
  finalizer: '',
  function: '',
  inhibitor: 'exports.conf = {\r\n  enabled: true,\r\n  priority: 0,\r\n};\r\n\r\nexports.run = (client, msg, cmd) => {\r\n  \/\/ Place Code Here\r\n};\r\n',
  monitor: 'exports.conf = {\r\n  enabled: true,\r\n  ignoreBots: false,\r\n  ignoreSelf: false,\r\n};\r\n\r\nexports.run = (client, msg) => {\r\n  \/\/ Place Code Here\r\n};\r\n'
}
