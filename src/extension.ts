import * as fs from 'fs-extra'
import * as isit from 'isit'
import * as path from 'path'
import * as pathType from 'path-type'
import * as vscode from 'vscode'

export async function activate (context: vscode.ExtensionContext) {

	const newPiece = vscode.commands.registerCommand('komadaHelper.newPiece', async () => {

		if (!vscode.workspace.rootPath) return vscode.window.showErrorMessage('No workspace open')

		let pieceType: string = await vscode.window.showQuickPick(pieceTypes, { placeHolder: 'Select piece type' })
		if (!isit('non-empty string', pieceType)) return
		pieceType = pieceType.toLowerCase()
		const pieceTypePlural: string = `${pieceType}s`
		let newFilePath: string = path.join(vscode.workspace.rootPath, pieceTypePlural)

		if (pieceType === 'command') {
			let folderName: string = await vscode.window.showQuickPick(
				fs.ensureDir(newFilePath).then(() => fs.readdir(newFilePath).then(fileNames => {
					const fileNames2 = fileNames.filter(async fileName => await pathType.dir(path.join(newFilePath, fileName)))
					fileNames2.unshift('Create new folder')
					return fileNames2
				})), { placeHolder: 'Select folder' }
			)

			if (folderName === 'Create new folder') folderName = await vscode.window.showInputBox({ prompt: 'Enter folder name', placeHolder: 'Folder' })

			if (!isit('non-empty string', folderName)) return

			newFilePath = path.join(newFilePath, folderName)
		}

		const pieceName: string = pieceType === 'event'
			? await vscode.window.showQuickPick(Object.keys(events), { placeHolder: 'Select event' })
			: await vscode.window.showInputBox({ prompt: `Enter the name of the ${pieceType}`, placeHolder: 'Name' })

		if (!isit('non-empty string', pieceName)) return

		newFilePath = path.format({
			dir: newFilePath,
			name: pieceName,
			ext: '.js'
		} as any)

		if (fs.existsSync(newFilePath)) return vscode.window.showErrorMessage(`A file called "${pieceName}.js" already exists`)

		fs.outputFileSync(newFilePath, generateFileContent(pieceType, pieceName))

		vscode.workspace.openTextDocument(vscode.Uri.file(newFilePath)).then(textDocument => vscode.window.showTextDocument(textDocument))
	})

	const init = vscode.commands.registerCommand('komadaHelper.init', async () => {
		const entryFileFullPath = path.resolve(vscode.workspace.rootPath, 'komada.js')
		if (!fs.existsSync(entryFileFullPath)) fs.outputFile(entryFileFullPath, templates.indexFile)
		const terminal = vscode.window.createTerminal('Komada')
		terminal.show()
		terminal.sendText('npm init -y')
		terminal.sendText('npm install komada')
	})

	context.subscriptions.push(newPiece)
	context.subscriptions.push(init)

}

function generateFileContent (type: string, name: string): string {
	let content = templates[type].replace('NAME', name)
	if (type === 'event') content = content.replace('...args', events[name])
	return content
}

export function deactivate () { }

const templates = {
	command: 'exports.run = async (client, msg, [...args]) => {\n  \/\/ Place Code Here\n};\n\nexports.conf = {\n  enabled: true,\n  runIn: [\"text\", \"group\", \"dm\"],\n  aliases: [],\n  permLevel: 0,\n  botPerms: [],\n  requiredFuncs: [],\n  cooldown: 0\n};\n\nexports.help = {\n  name: \"NAME\",\n  description: \"\",\n  usage: \"\",\n  usageDelim: \"\",\n  extendedHelp: \"\"\n};\n',
	event: 'exports.run = (client, ...args) => {\n  \/\/ Place Code Here\n};\n',
	extendable: 'exports.conf = {\n  type: \"get\" || \"method\",\n  method: \"NAME\",\n  appliesTo: [],\n};\n\nexports.extend = function () {\n \/\/ Place Code Here\n};\n',
	finalizer: 'exports.run = (client, msg, mes, start) => {\n  \/\/ Place Code Here\n};\n',
	function: 'module.exports = (...args) => {\n  \/\/ Place Code Here\n};\n\nmodule.exports.conf = {\n  requiredModules: []\n};\n\nmodule.exports.help = {\n  name: \"NAME\",\n  type: \"functions\",\n  description: \"\",\n};\n',
	inhibitor: 'exports.conf = {\n  enabled: true,\n  priority: 0,\n};\n\nexports.run = (client, msg, cmd) => {\n  \/\/ Place Code Here\n};\n',
	monitor: 'exports.conf = {\n  enabled: true,\n  ignoreBots: false,\n  ignoreSelf: false,\n};\n\nexports.run = (client, msg) => {\n  \/\/ Place Code Here\n};\n',
	indexFile: 'const komada = require(\"komada\")\n\nconst client = new komada.Client({\n  ownerID: \"your-user-id\",\n  prefix: \"!\"\n})\n\nclient.login(\"your-bot-token\")'
}

const pieceTypes = ['Command', 'Event', 'Extendable', 'Finalizer', 'Function', 'Inhibitor', 'Monitor']

const events = {
	ready: '', guildCreate: 'guild', guildDelete: 'guild', guildUpdate: 'oldGuild, newGuild', guildUnavailable: 'guild', guildMemberAdd: 'member', guildMemberRemove: 'member', guildMemberUpdate: 'oldMember, newMember', guildMemberAvailable: 'member', guildMemberSpeaking: 'member, speaking', guildMembersChunk: 'members, guild', roleCreate: 'role', roleDelete: 'role', roleUpdate: 'oldRole, newRole', emojiCreate: 'emoji', emojiDelete: 'emoji', emojiUpdate: 'oldEmoji, newEmoji', guildBanAdd: 'guild, user', guildBanRemove: 'guild, user', channelCreate: 'channel', channelDelete: 'channel', channelUpdate: 'oldChannel, newChannel', channelPinsUpdate: 'channel, time', message: 'message', messageDelete: 'message', messageUpdate: 'oldMessage, newMessage', messageDeleteBulk: 'messages', messageReactionAdd: 'messageReaction, user', messageReactionRemove: 'messageReaction, user', messageReactionRemoveAll: 'message', userUpdate: 'oldUser, newUser', userNoteUpdate: 'user, oldNote, newNote', clientUserSettingsUpdate: 'clientUserSettings', presenceUpdate: 'oldMember, newMember', voiceStateUpdate: 'oldMember, newMember', typingStart: 'channel, user', typingStop: 'channel, user', disconnect: 'event', reconnecting: '', error: 'error', warn: 'info', debug: 'info'
}
