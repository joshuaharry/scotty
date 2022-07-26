# scotty
A tool for compiling types into contracts.

## Installing
Run:

```sh
npm install
sh build/build.sh
sudo npm install -g .
```

That will put `scotty` onto your $PATH. 

For now, the types have to be placed in `~/.scotty/DefinitelyTyped` so that they can be copied.


## Modifying Scotty

To modify the compiler:

  1. edit `src/compiler.ts`
  2. rebuild with `sh build/buid.sh`

This will generate a new `dist/compiler.js` file. This is all what's needed.

To modify the contract library:

  1. edit `__contracts__/contract-base.js`
  2. rebuild with `sh build/buid.sh`
  

## Usage
scotty - A tool for experimenting with compiling types to contracts.

usage: scotty [command]

command:
  help                Display this help message and exit.
  validate            Validate that scotty can function correctly on the current machine.
  identity-mode       Compile types to contracts in identity mode.
  proxy-mode          Compile types to contracts in proxy mode.
  full-mode           Compile types to contracts in full mode.
  compile-only        Compile types to stdout.

You need to run `scotty` inside an existing JavaScript package. If operating manually,
the workflow would look something like:

```sh
cd ~
git clone https://github.com/eugeneware/ffprobe
cd ~/ffprobe
scotty identity-mode
npm install
npm test
```

You could then `cd` into `~/ffprobe` and experiment with the code in there.


## Examples

The direction `examples` contains some examples that were used when
developping scotty.
