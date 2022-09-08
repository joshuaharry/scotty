#!/usr/bin/env node
import compileContracts from "./compiler";
import {
  copySync,
  existsSync,
  readFileSync,
  moveSync,
  writeFileSync,
  writeSync,
  fsyncSync,
  unlinkSync
} from "fs-extra";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const help = (exitCode: number) => {
  console.log(`scotty - A tool for experimenting with compiling types to contracts.

usage: scotty [command]


command:
  help                               Display this help message and exit.
  validate                           Validate that scotty can function correctly on the current machine.
  identity-mode                      Compile types to contracts in identity mode.
  proxy-mode                         Compile types to contracts in proxy mode.
  full-mode                          Compile types to contracts in full mode.
  compile-only                       Compile types to stdout.
  compile-file TYPE.d.ts CONTRACT.js Compile types in FILE to stdout.
`);
  process.exit(exitCode);
};

type Mode = "identity-mode" | "proxy-mode" | "full-mode";

const SCOTTY_BASE = path.join(os.homedir(), ".scotty");
const DT_PATH = path.join(SCOTTY_BASE, "DefinitelyTyped");
const CONTRACTS_PATH = path.join(SCOTTY_BASE, 'contracts');
const COMMIT_PATH = path.join(SCOTTY_BASE, "commit");
const ORIGINAL_DIRECTORY = process.cwd();

const validate = () => {
  try {
    if (!existsSync(DT_PATH)) {
      console.error(
        "*** SCOTTY-FATAL-ERROR: Could not find DefinitelyTyped in ~/.scotty/DefinitelyTyped."
      );
      console.error("Try cloning the repository.");
      process.exit(1);
    }
    if (!existsSync(CONTRACTS_PATH)) {
      console.error("*** SCOTTY-FATAL-ERROR: Could not find contracts librasry in ~/.scotty/contracts");
      console.error("Try making that directory copying the files in __contracts__ there directly.");
      process.exit(1);
    }
    if (!existsSync(COMMIT_PATH)) {
      console.error(
        "*** SCOTTY-FATAL-ERROR: Could not find the commit to check out in ~/.scotty/DefinitelyTyped/commit."
      );
      console.error(
        "Try creating the file with the commit you would like to explore."
      );
      process.exit(1);
    }
    process.chdir(DT_PATH);
    const commit = readFileSync(COMMIT_PATH, { encoding: "utf8" }).trim();
    execSync(`git checkout ${commit}`);
    console.log("Validation successful.");
    process.chdir(ORIGINAL_DIRECTORY);
  } catch (err) {
    console.error("*** SCOTTY-FATAL-ERROR: while validating:", err);
    process.exit(1);
  }
};

const replaceImportString = "./__REPLACE_ME__.js";
const replaceOriginalString = "__ORIGINAL_UNTYPED_MODULE__.js";

function replaceImport(code: string, mode: Mode, contractpath?: string): string {
  switch (mode) {
    case "identity-mode": {
      return code.replace(replaceImportString, "./contract-identity-mode.js");
    }
    case "proxy-mode": {
      return code.replace(replaceImportString, "./contract-proxy-mode.js");
    }
    case "full-mode": {
      return code.replace(replaceImportString, "./contract-base.js");
    }
  }
};

function replaceLinter(mainDirectory : string, linter : string) {
    const toReplace = path.join(
	mainDirectory,
	"node_modules",
	".bin",
	linter
    );
    console.log("replaceLinter " + linter + " [" + toReplace + "]");
    if (!existsSync(toReplace)) return;
    unlinkSync(toReplace);
    writeFileSync(toReplace,
		  "#!/bin/sh\necho ignore " + linter + "\n",
		  { mode : "755" });
    console.log("replaceLinter done", toReplace);
}

const compileAndSwap = (mode: Mode) => {
  const pkgDirectory = process.cwd();
  const mainPath = require.resolve(pkgDirectory);
  const seps = ORIGINAL_DIRECTORY.split(path.sep)
  const packageName = seps[seps.length - 1];
  const mainDirectory = path.dirname(mainPath);
  if (!existsSync(mainPath)) {
    console.error(`*** SCOTTY-FATAL-ERROR: Could not find file ${mainPath}`);
    process.exit(1);
  }
  const typePath = path.join(DT_PATH, "types", packageName, "index.d.ts");
  if (!existsSync(typePath)) {
    console.error(`*** SCOTTY-FATAL-ERROR: Could not find types for ${packageName}, missing file: ${typePath}`);
    process.exit(1);
  }
  copySync(typePath, path.join(process.cwd(), 'index.d.ts'));
  const code = replaceImport(compileContracts(), mode);
  const __ORIGINAL_UNTYPED_MODULE__ = path.join(
    mainDirectory,
    "__ORIGINAL_UNTYPED_MODULE__.js"
  );
  if (!existsSync(__ORIGINAL_UNTYPED_MODULE__)) {
    moveSync(mainPath, __ORIGINAL_UNTYPED_MODULE__);
  }
  writeFileSync(mainPath, code);
  copySync(CONTRACTS_PATH, mainDirectory, { recursive: true });

  replaceLinter(pkgDirectory, "eslint");
  replaceLinter(pkgDirectory, "jest");
  replaceLinter(pkgDirectory, "jshint");
  replaceLinter(pkgDirectory, "jslint");
  replaceLinter(pkgDirectory, "semistandard");
  replaceLinter(pkgDirectory, "standard");
  replaceLinter(pkgDirectory, "xo");
};

function compileOnly() {
  const mainPath = require.resolve(process.cwd());
  const seps = ORIGINAL_DIRECTORY.split(path.sep)
  const packageName = seps[seps.length - 1];
  const mainDirectory = path.dirname(mainPath);
  if (!existsSync(mainPath)) {
    console.error(`*** SCOTTY-FATAL-ERROR: Could not find file ${mainPath}`);
    process.exit(1);
  }
  const typePath = path.join(DT_PATH, "types", packageName, "index.d.ts");
  if (!existsSync(typePath)) {
    console.error(`*** SCOTTY-FATAL-ERROR: Could not find types for ${packageName}`);
    process.exit(1);
  }
  const code = replaceImport(compileContracts(), "full-mode");
  writeSync(process.stdout.fd, code);
};

function compileFile(fileName: string, contractpath: string) {
  if (!existsSync(fileName)) {
    console.error(`*** SCOTTY-FATAL-ERROR: Could not find file ${fileName}`);
    process.exit(1);
  }
   const code = compileContracts({ fileName, language: "typescript"})
      .replace(replaceImportString, contractpath)
      .replace(replaceOriginalString, fileName.replace(/d.ts/, "js"));
  writeSync(process.stdout.fd, code);
};

const parseArgv = (argv: string[]) => {
  const el = argv[0];
  switch (el) {
    case "help":
    case "-h":
    case "--help": {
      return help(0);
    }
    case "validate": {
      return validate();
    }
    case "identity-mode": 
    case "proxy-mode": 
    case "full-mode": {
      return compileAndSwap(el);
    }
    case "compile-only":
      return compileOnly();
    case "compile-file":
      if (argv.length < 3) {
         return help(1);
      } else {
         return compileFile(argv[1], argv[2]);
      }
    default: {
      console.error("*** SCOTTY-FATAL-ERROR: Could not recognize command.\n");
      return help(1);
    }
  }
};

if (require.main === module) {
  parseArgv(process.argv.slice(2));
}
