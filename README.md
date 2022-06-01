# scotty
A tool for compiling types into contracts.

## Installing
Run:

```sh
npm install
sh build/build.sh
npm install -g .
```

That will put `scotty` onto your $PATH. 

For now, the types have to be placed in `~/.scotty/DefinitelyTyped` so that they can be copied.

## Usage
scotty - A tool for experimenting with compiling types to contracts.

usage: scotty [command]

command:
  help                Display this help message and exit.
  validate            Validate that scotty can function correctly on the current machine.
  identity-mode       Compile types to contracts in identity mode.
  proxy-mode          Compile types to contracts in proxy mode.
  full-mode           Compile types to contracts in full mode.

You need to run `scotty` inside an existing JavaScript package. If operating manually,
the workflow would look something like:

```sh
cd ~
git clone https://github.com/eugeneware/ffprobe
cd ~/ffprobe
scotty identity-mode
```

You could then use the commands above to run `scotty`.
