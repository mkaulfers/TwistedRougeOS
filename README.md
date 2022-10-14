# TwistedRougeOS

TwistedRougeOs is a bot dedicated to

## Basic Usage

You will need:

- [Node.JS](https://nodejs.org/en/download) (10.x || 12.x)
- A Package Manager ([npm](https://docs.npmjs.com/getting-started/installing-node))
- Rollup CLI (Optional, install via `npm install -g rollup`)

Download the latest source [here](https://github.com/mkaulfers/TwistedRougeOS) and extract it to a folder.

Open the folder in your terminal and run your package manager to install the required packages and TypeScript declaration files:

```bash
# npm
npm install
```

Fire up your preferred editor with typescript installed and you are good to go!

### Rollup and Code Upload

TwistedRougeOS uses rollup to compile your typescript and upload it to a screeps server.

Move or copy `screeps.test.json` to `screeps.json` and edit it, changing the credentials and optionally adding or removing some of the destinations.

Running `rollup -c` will compile your code and do a "dry run", preparing the code for upload but not actually pushing it. Running `rollup -c --environment DEST:main` will compile your code, and then upload it to a screeps server using the `main` config from `screeps.json`.

You can use `-cw` instead of `-c` to automatically re-run when your source code changes - for example, `rollup -cw --environment DEST:main` will automatically upload your code to the `main` configuration every time your code is changed.

Finally, there are also NPM scripts that serve as aliases for these commands in `package.json` for IDE integration. Running `npm run push-main` is equivalent to `rollup -c --environment DEST:main`, and `npm run watch-sim` is equivalent to `rollup -cw --dest sim`.

#### Important! To upload code to a private server, you must have [screepsmod-auth](https://github.com/ScreepsMods/screepsmod-auth) installed and configured!

## Typings

The type definitions for Screeps come from [typed-screeps](https://github.com/screepers/typed-screeps). If you find a problem or have a suggestion, please open an issue there.

## Documentation

To visit the TS Screep Starter Docs, [click here](https://screepers.gitbook.io/screeps-typescript-starter/).

## Credits

[TS Screeps Starter](https://github.com/screepers/screeps-typescript-starter) - For giving us a starting point for TS
[aTanner Screeps Starter](https://github.com/AydenRennaker/screeps-starter) - For giving an example of multi-file coding in JS

## Useful Links:

[Screeps Snippets](https://github.com/screepers/screeps-snippets)
[aTanner Tutorial Playlist](https://www.youtube.com/playlist?list=PLw9di5JwI6p-HUP0yPUxciaEjrsFb2kR2)
[Tigga RCL 4 in 10k ticks](https://www.youtube.com/watch?v=zKUHmxSCma4)
