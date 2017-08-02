import * as findDown from 'finddown-sync'
import * as fs from 'fs-extra'
import * as jsonfile from 'jsonfile'
import * as path from 'path'
import * as pathType from 'path-type'
import { commands, window, workspace, ExtensionContext, SnippetString, Uri } from 'vscode'

export async function activate (context: ExtensionContext) {

	const snippets = jsonfile.readFileSync(path.join(__dirname, '../../snippets/komada.json'))

	const newPiece = commands.registerCommand('komada-helper.newPiece', async () => {

		if (!workspace.rootPath) return window.showErrorMessage('You must have a workspace opened.')

		let pieceType: string = await window.showQuickPick(pieceTypes, { placeHolder: 'Select piece type' })
		if (!pieceType) return

		pieceType = pieceType.toLowerCase()
		const pieceTypePlural: string = `${pieceType}s`

		let baseDir: string = findDown('commands' , { cwd: workspace.rootPath })
		baseDir = (!baseDir || baseDir[0].includes('node_modules'))
			? null
			: path.join(baseDir[0], '..')
		let newFilePath: string = path.join(baseDir || workspace.rootPath, pieceTypePlural)

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
		const editor = await window.showTextDocument(textDocument)
		editor.insertSnippet(generateSnippet(snippets, pieceType, pieceName))
	})

	const init = commands.registerCommand('komada-helper.init', async () => {
		const terminal = window.createTerminal('Komada')
		terminal.show()
		terminal.sendText('npm init -y')
		terminal.sendText('npm install komada')

		const entryFileFullPath = path.resolve(workspace.rootPath, 'komada.js')
		if (!fs.existsSync(entryFileFullPath)) {
			fs.outputFile(entryFileFullPath, '')
			const textDocument = await workspace.openTextDocument(Uri.file(entryFileFullPath))
			const editor = await window.showTextDocument(textDocument)
			editor.insertSnippet(generateSnippet(snippets, 'entry file'))
		}

		pieceTypes.forEach(pieceType => fs.ensureDir(path.join(workspace.rootPath, `${pieceType.toLowerCase()}s`)))
	})

	context.subscriptions.push(newPiece)
	context.subscriptions.push(init)

}

function generateSnippet (snippets, pieceType: string, name: string = '') {
	// tslint:disable-next-line:no-invalid-template-strings
	let content: string = snippets[`Create new Komada ${pieceType}`].body.replace('${1:${TM_FILENAME}}', name)
	// tslint:disable-next-line:curly
	if (pieceType === 'event') {
		content = events[name]
			? content.replace('...args', events[name])
			: content.replace('(client, ...args)', '(client)')
	}

	return new SnippetString(content)
}

export function deactivate () { }

const pieceTypes = ['Command', 'Event', 'Extendable', 'Finalizer', 'Function', 'Inhibitor', 'Monitor']

const events = {
	ready: null, guildCreate: 'guild', guildDelete: 'guild', guildUpdate: 'oldGuild, newGuild', guildUnavailable: 'guild', guildMemberAdd: 'member', guildMemberRemove: 'member', guildMemberUpdate: 'oldMember, newMember', guildMemberAvailable: 'member', guildMemberSpeaking: 'member, speaking', guildMembersChunk: 'members, guild', roleCreate: 'role', roleDelete: 'role', roleUpdate: 'oldRole, newRole', emojiCreate: 'emoji', emojiDelete: 'emoji', emojiUpdate: 'oldEmoji, newEmoji', guildBanAdd: 'guild, user', guildBanRemove: 'guild, user', channelCreate: 'channel', channelDelete: 'channel', channelUpdate: 'oldChannel, newChannel', channelPinsUpdate: 'channel, time', message: 'message', messageDelete: 'message', messageUpdate: 'oldMessage, newMessage', messageDeleteBulk: 'messages', messageReactionAdd: 'messageReaction, user', messageReactionRemove: 'messageReaction, user', messageReactionRemoveAll: 'message', userUpdate: 'oldUser, newUser', userNoteUpdate: 'user, oldNote, newNote', clientUserSettingsUpdate: 'clientUserSettings', presenceUpdate: 'oldMember, newMember', voiceStateUpdate: 'oldMember, newMember', typingStart: 'channel, user', typingStop: 'channel, user', disconnect: 'event', reconnecting: null, error: 'error', warn: 'info', debug: 'info'
}
