# Komada

Quickly create new pieces and check the `schema.json` on your [Komada](https://komada.js.org/) Discord bot.

## Features

### `schema.json` [schema](schema/schema.json)

The `schema.json` gets IntelliSense, validation and default values.

### Creating new pieces

There are [snippets](snippets/komada.json) included for every piece type and the entry (index) file. These new piece snippets have tabstops at configuration points for given piece.

You can easily create new pieces with the `newPiece` command. After a couple of questions a new file is created and the corresponding snippet is inserted.

### Init

The `Komada: Initialize new bot` command will create a `package.json`, install komada and create the entry file and piece folders.

## Usage

To get the `schema.json` IntelliSense, you just have to call the file `schema.json`.

To create a new piece, use the `Komada: Create new piece` command and go through the configuration.

The snippets are named like `komadaCommand`, where you replace `Command` with a piece type. The special case is `komadaIndex` wich is the entry file where you create the Komada client.

## License

[MIT](license)