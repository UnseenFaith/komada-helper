import * as fs from 'fs-extra'
import * as jsonfile from 'jsonfile'
import * as path from 'path'
import * as pathType from 'path-type'
import { commands, window, workspace, ExtensionContext, SnippetString, Uri } from 'vscode'

export async function activate (context: ExtensionContext) {

	const snippets = jsonfile.readFileSync(path.join(__dirname, '../snippets/komada.json'))

	const newPiece = commands.registerCommand('komadaHelper.newPiece', async () => {

		if (!workspace.rootPath) return window.showErrorMessage('You must have a workspace opened.')

		let pieceType: string = await window.showQuickPick(pieceTypes, { placeHolder: 'Select piece type' })
		if (!pieceType) return

		pieceType = pieceType.toLowerCase()
		const pieceTypePlural: string = `${pieceType}s`

		let newFilePath: string = path.join(workspace.rootPath, pieceTypePlural)

		// Commands, unlike other piece types, have categories, wich are subfolders
		if (pieceType === 'command') {
			let folderName: string = await window.showQuickPick(
				fs.ensureDir(newFilePath).then(() => {
					return fs.readdir(newFilePath).then(fileNames => {
						fileNames = fileNames.filter(fileName => pathType.dirSync(path.join(newFilePath, fileName)))
						fileNames.unshift('Create new folder')
						return fileNames
					})
				}),
				{ placeHolder: 'Select folder' }
			)
			if (!folderName) return

			if (folderName === 'Create new folder') folderName = await window.showInputBox({ prompt: 'Enter folder name', placeHolder: 'Folder' })

			newFilePath = path.join(newFilePath, folderName)
		}

		// Events get a picker because we know what events exist
		const pieceName: string = (pieceType === 'event')
			? await window.showQuickPick(Object.keys(events), { placeHolder: 'Select event' })
			: await window.showInputBox({ prompt: `Enter the name of the ${pieceType}`, placeHolder: 'Name' })
		if (!pieceName) return

		newFilePath = path.format({
			dir: newFilePath,
			name: pieceName,
			ext: '.js'
		} as any) // The type definition of path.format() is wrong :/

		if (fs.existsSync(newFilePath)) return window.showErrorMessage(`A file called "${pieceName}.js" already exists`)

		fs.outputFileSync(newFilePath, '')

		const textDocument = await workspace.openTextDocument(Uri.file(newFilePath))
		await window.showTextDocument(textDocument)
		const editor = window.activeTextEditor
		if (!editor) return
		let snippet =
		editor.insertSnippet(generateSnippet(snippets, pieceType, pieceName))
	})

	const init = commands.registerCommand('komadaHelper.init', async () => {
		const entryFileFullPath = path.resolve(workspace.rootPath, 'komada.js')
		if (!fs.existsSync(entryFileFullPath)) fs.outputFile(entryFileFullPath, '')
		const terminal = window.createTerminal('Komada')
		terminal.show()
		terminal.sendText('npm init -y')
		terminal.sendText('npm install komada')
	})

	context.subscriptions.push(newPiece)
	context.subscriptions.push(init)

}

function generateSnippet (snippets, pieceType: string, name: string) {
	let content: string = snippets[`Create new Komada ${pieceType}`].body.replace('${1:${TM_FILENAME}}', name)
	// tslint:disable-next-line:curly
	if (pieceType === 'event') {
		content = events[name]
			? content.replace('...args', events[name])
			: content.replace('(client, ...args)', '(client)')
	}

	return new SnippetString(content)
}

export function deactivate () {}

// const templates = {
// 	command: 'exports.run = async (client, msg, [...args]) => {\n  \/\/ Place Code Here\n};\n\nexports.conf = {\n  enabled: true,\n  runIn: [\"text\", \"group\", \"dm\"],\n  aliases: [],\n  permLevel: 0,\n  botPerms: [],\n  requiredFuncs: [],\n  cooldown: 0\n};\n\nexports.help = {\n  name: \"NAME\",\n  description: \"\",\n  usage: \"\",\n  usageDelim: \"\",\n  extendedHelp: \"\"\n};\n',
// 	event: 'exports.run = (client, ...args) => {\n  \/\/ Place Code Here\n};\n',
// 	extendable: 'exports.conf = {\n  type: \"get\" || \"method\",\n  method: \"NAME\",\n  appliesTo: [],\n};\n\nexports.extend = function () {\n \/\/ Place Code Here\n};\n',
// 	finalizer: 'exports.run = (client, msg, mes, start) => {\n  \/\/ Place Code Here\n};\n',
// 	function: 'module.exports = (...args) => {\n  \/\/ Place Code Here\n};\n\nmodule.exports.conf = {\n  requiredModules: []\n};\n\nmodule.exports.help = {\n  name: \"NAME\",\n  type: \"functions\",\n  description: \"\",\n};\n',
// 	inhibitor: 'exports.conf = {\n  enabled: true,\n  priority: 0,\n};\n\nexports.run = (client, msg, cmd) => {\n  \/\/ Place Code Here\n};\n',
// 	monitor: 'exports.conf = {\n  enabled: true,\n  ignoreBots: false,\n  ignoreSelf: false,\n};\n\nexports.run = (client, msg) => {\n  \/\/ Place Code Here\n};\n',
// 	indexFile: 'const komada = require(\"komada\")\n\nconst client = new komada.Client({\n  ownerID: \"your-user-id\",\n  prefix: \"!\"\n})\n\nclient.login(\"your-bot-token\")'
// }

const pieceTypes = ['Command', 'Event', 'Extendable', 'Finalizer', 'Function', 'Inhibitor', 'Monitor']

const events = {
	ready: null, guildCreate: 'guild', guildDelete: 'guild', guildUpdate: 'oldGuild, newGuild', guildUnavailable: 'guild', guildMemberAdd: 'member', guildMemberRemove: 'member', guildMemberUpdate: 'oldMember, newMember', guildMemberAvailable: 'member', guildMemberSpeaking: 'member, speaking', guildMembersChunk: 'members, guild', roleCreate: 'role', roleDelete: 'role', roleUpdate: 'oldRole, newRole', emojiCreate: 'emoji', emojiDelete: 'emoji', emojiUpdate: 'oldEmoji, newEmoji', guildBanAdd: 'guild, user', guildBanRemove: 'guild, user', channelCreate: 'channel', channelDelete: 'channel', channelUpdate: 'oldChannel, newChannel', channelPinsUpdate: 'channel, time', message: 'message', messageDelete: 'message', messageUpdate: 'oldMessage, newMessage', messageDeleteBulk: 'messages', messageReactionAdd: 'messageReaction, user', messageReactionRemove: 'messageReaction, user', messageReactionRemoveAll: 'message', userUpdate: 'oldUser, newUser', userNoteUpdate: 'user, oldNote, newNote', clientUserSettingsUpdate: 'clientUserSettings', presenceUpdate: 'oldMember, newMember', voiceStateUpdate: 'oldMember, newMember', typingStart: 'channel, user', typingStop: 'channel, user', disconnect: 'event', reconnecting: null, error: 'error', warn: 'info', debug: 'info'
}
