# Komada

Quickly create new pieces and check the `schema.json` on your [Komada](https://komada.js.org/) Discord bot.

## Features

### `schema.json` schema

The `schema.json` gets IntelliSense, validation and default values.

### Creating new pieces

There are snippets included for every piece type and the entry (index) file. These new piece snippets have tabstops at configuration points for given piece.

You can easily create new pieces with the `newPiece` command. After a couple of questions a new file is created and the corresponding snippet is inserted.

### Init

TODO

## Usage

To get the `schema.json` IntelliSense, you just have to call the file `schema.json`.

To create a new piece, use the `Komada: Create new piece` command and go through the configuration.

The snippets are named like `komadaCommand`, where you replace `komadaCommand` with the name of a piece. The special case is `komadaIndex` wich is the entry file where you create the Komada client.

## License

[MIT](license)