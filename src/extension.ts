import * as findDown from 'finddown-sync'
import * as fs from 'fs-extra'
import * as jsonfile from 'jsonfile'
import * as path from 'path'
import * as pathType from 'path-type'
import { commands, window, workspace, ExtensionContext, QuickPickItem, SnippetString, Uri } from 'vscode'

export async function activate (context: ExtensionContext) {

	const eventStorage = getEvents()

	const snippets = jsonfile.readFileSync(path.join(__dirname, '../../snippets/komada.json'))

	const newPiece = commands.registerCommand('komada-helper.newPiece', async () => {

		if (!workspace.rootPath) return window.showErrorMessage('You must have a workspace opened.')

		let pieceType: string = await window.showQuickPick(pieceTypes, { placeHolder: 'Select piece type' })
		if (!pieceType) return

		pieceType = pieceType.toLowerCase()
		const pieceTypePlural: string = `${pieceType}s`

		let newPiecePath: string = getBaseFolder(pieceTypePlural)

		// Commands, unlike other piece types, have categories, wich are subfolders
		if (pieceType === 'command') {
			let { label: folderName } = await window.showQuickPick(
				fs.ensureDir(newPiecePath).then(() => {
					return fs.readdir(newPiecePath).then(fileNames => {
						let quickPickItems: QuickPickItem[] = fileNames
							.filter(fileName => pathType.dirSync(path.join(newPiecePath, fileName)))
							.map(fileName => {
								return { label: fileName, description: path.join('commands', fileName) }
							})
						quickPickItems.unshift({ label: NEW_CATEGORY, description: 'Create a new command category (aka folder)' }, { label: NO_FOLDER, description: '' })
						return quickPickItems
					})
				}),
				{
					placeHolder: 'Choose command category',
					ignoreFocusOut: true
				}
			)
			if (!folderName) return

			if (folderName !== NO_FOLDER) {
				if (folderName === NEW_CATEGORY) folderName = await window.showInputBox({
					prompt: 'Enter category name',
					placeHolder: 'Category name',
					ignoreFocusOut: true
				})
				newPiecePath = path.join(newPiecePath, folderName)
			}
		}

		let pieceName: string
		// Events get a picker because we know what events exist
		// tslint:disable-next-line:curly
		if (pieceType === 'event') {
			({ label: pieceName } = await window.showQuickPick(
				Object.keys(eventStorage.events).map(key => {
					return {
						label: key,
						description: eventStorage.events[key].description
					} as QuickPickItem
				}),
				{ placeHolder: 'Select event', ignoreFocusOut: true, matchOnDescription: true }
			))
		} else pieceName = await window.showInputBox({
			prompt: `Enter the name of the ${pieceType}`,
			placeHolder: 'Name'
		}
		)
		if (!pieceName) return

		newPiecePath = path.format({
			dir: newPiecePath,
			name: pieceName,
			ext: '.js'
		} as any) // The type definition of path.format() is wrong :/

		if (fs.existsSync(newPiecePath)) return window.showErrorMessage(`A file called "${pieceName}.js" already exists`)

		fs.outputFileSync(newPiecePath, '')

		const textDocument = await workspace.openTextDocument(Uri.file(newPiecePath))
		const editor = await window.showTextDocument(textDocument)
		editor.insertSnippet(generateSnippet(snippets, eventStorage, pieceType, pieceName))
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
			editor.insertSnippet(generateSnippet(snippets, eventStorage, 'entry file'))
		}

		pieceTypes.forEach(pieceType => fs.ensureDir(path.join(workspace.rootPath, `${pieceType.toLowerCase()}s`)))
	})

	context.subscriptions.push(newPiece)
	context.subscriptions.push(init)

}

function getBaseFolder (pieceTypePlural) {
	let commandsDirs: string[] = findDown('*commands', { cwd: workspace.rootPath })

	let baseDir = workspace.rootPath
	if (commandsDirs && commandsDirs.length > 0) {
		let match = commandsDirs.find(dirOrFilePath => {
			if (dirOrFilePath.includes('node_modules') || !fs.statSync(dirOrFilePath).isDirectory()) return false
			return true
		})
		if (match) baseDir = path.join(match, '..')
	}

	let newPiecePath: string = path.join(baseDir, pieceTypePlural)
	return newPiecePath
}

function generateSnippet (snippets, eventStorage: EventStore, pieceType: string, name: string = '') {
	// tslint:disable-next-line:no-invalid-template-strings
	let content: string = snippets[`Create new Komada ${pieceType}`].body.replace('${1:${TM_FILENAME}}', name)
	// tslint:disable-next-line:curly
	if (pieceType === 'event') {
		// If there are no arguments, like for the ready event, remove arguments
		content = eventStorage.events[name].arguments
			? content.replace('...args', eventStorage.events[name].arguments)
			: content.replace('(client, ...args)', '(client)')
	}

	return new SnippetString(content)
}

export function deactivate () { }

const NEW_CATEGORY = 'Create a new category'
const NO_FOLDER = "Don't put in a category"

const pieceTypes = ['Command', 'Event', 'Extendable', 'Finalizer', 'Function', 'Inhibitor', 'Monitor']

class EventStore {

	public events: { [eventName: string]: { arguments: string, description: string } } = {}

	public addEvent (eventName: string, eventArguments: string, description: string) {
		this.events[eventName] = { arguments: eventArguments, description }
		return this
	}

}

function getEvents () {
	const eventStorage = new EventStore()

	eventStorage
		.addEvent('channelCreate', 'channel', 'Emitted whenever a channel is created.')
		.addEvent('channelDelete', 'channel', 'Emitted whenever a channel is deleted.')
		.addEvent('channelPinsUpdate', 'channel, time', 'Emitted whenever the pins of a channel are updated.')
		.addEvent('channelUpdate', 'oldChannel, newChannel', 'Emitted whenever a channel is updated - e.g. name change, topic change.')
		.addEvent('clientUserGuildSettingsUpdate', 'clientUserGuildSettings', "Emitted whenever the client user's settings update.")
		.addEvent('clientUserSettingsUpdate', 'clientUserSettings', "Emitted whenever the client user's settings update.")
		.addEvent('debug', 'info', 'Emitted for general debugging information.')
		.addEvent('disconnect', 'event', "Emitted when the client's WebSocket disconnects and will no longer attempt to reconnect.")
		.addEvent('emojiCreate', 'emoji', 'Emitted whenever a custom emoji is created in a guild.')
		.addEvent('emojiDelete', 'emoji', 'Emitted whenever a custom guild emoji is deleted.')
		.addEvent('emojiUpdate', 'oldEmoji, newEmoji', 'Emitted whenever a custom guild emoji is updated.')
		.addEvent('error', 'error', "Emitted whenever the client's WebSocket encounters a connection error.")
		.addEvent('guildBanAdd', 'guild, user', 'Emitted whenever a member is banned from a guild.')
		.addEvent('guildBanRemove', 'guild, user', 'Emitted whenever a member is unbanned from a guild.')
		.addEvent('guildCreate', 'guild', 'Emitted whenever the client joins a guild.')
		.addEvent('guildDelete', 'guild', 'Emitted whenever a guild is deleted/left.')
		.addEvent('guildMemberAdd', 'member', 'Emitted whenever a user joins a guild.')
		.addEvent('guildMemberAvailable', 'member', 'Emitted whenever a member becomes available in a large guild.')
		.addEvent('guildMemberRemove', 'member', 'Emitted whenever a member leaves a guild, or is kicked.')
		.addEvent('guildMembersChunk', 'members, guild', 'Emitted whenever a chunk of guild members is received. All members come from the same guild.')
		.addEvent('guildMemberSpeaking', 'member, speaking', 'Emitted once a guild member starts/stops speaking.')
		.addEvent('guildMemberUpdate', 'oldMember, newMember', 'Emitted whenever a guild member changes - i.e. new role, removed role, nickname.')
		.addEvent('guildUnavailable', 'guild', 'Emitted whenever a guild becomes unavailable, likely due to a server outage.')
		.addEvent('guildUpdate', 'oldGuild, newGuild', 'Emitted whenever a guild is updated - e.g. name change.')
		.addEvent('message', 'message', 'Emitted whenever a message is created.')
		.addEvent('messageDelete', 'message', 'Emitted whenever a message is deleted.')
		.addEvent('messageDeleteBulk', 'messages', 'Emitted whenever messages are deleted in bulk.')
		.addEvent('messageReactionAdd', 'messageReaction, user', 'Emitted whenever a reaction is added to a message.')
		.addEvent('messageReactionRemove', 'messageReaction, user', 'Emitted whenever a reaction is removed from a message.')
		.addEvent('messageReactionRemoveAll', 'message', 'Emitted whenever all reactions are removed from a message.')
		.addEvent('messageUpdate', 'oldMessage, newMessage', 'Emitted whenever a message is updated - e.g. embed or content change.')
		.addEvent('presenceUpdate', 'oldMember, newMember', "Emitted whenever a guild member's presence changes, or they change one of their details.")
		.addEvent('ready', null, 'Emitted when the client becomes ready to start working.')
		.addEvent('reconnecting', null, 'Emitted whenever the client tries to reconnect to the WebSocket.')
		.addEvent('resume', 'replayed', 'Emitted whenever a WebSocket resumes.')
		.addEvent('roleCreate', 'role', 'Emitted whenever a role is created.')
		.addEvent('roleDelete', 'role', 'Emitted whenever a guild role is deleted.')
		.addEvent('roleUpdate', 'oldRole, newRole', 'Emitted whenever a guild role is updated.')
		.addEvent('typingStart', 'channel, user', 'Emitted whenever a user starts typing in a channel.')
		.addEvent('typingStop', 'channel, user', 'Emitted whenever a user stops typing in a channel.')
		.addEvent('userNoteUpdate', 'user, oldNote, newNote', 'Emitted whenever a note is updated.')
		.addEvent('userUpdate', 'oldUser, newUser', "Emitted whenever a user's details (e.g. username) are changed.")
		.addEvent('voiceStateUpdate', 'oldMember, newMember', 'Emitted whenever a user changes voice state - e.g. joins/leaves a channel, mutes/unmutes.')
		.addEvent('warn', 'info', 'Emitted for general warnings.')

	return eventStorage
}
