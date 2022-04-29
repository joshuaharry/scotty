#!/usr/bin/env node
import compileContracts from "./compiler";
import {
  copySync,
  existsSync,
  readFileSync,
  moveSync,
  writeFileSync,
} from "fs-extra";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const help = (exitCode: number) => {
  console.log(`scotty - A tool for experimenting with compiling types to contracts.

usage: scotty [command]

command:
  help                Display this help message and exit.
  validate            Validate that scotty can function correctly on the current machine.
  identity-mode       Compile types to contracts in identity mode.
  proxy-mode          Compile types to contracts in proxy mode.
  full-mode           Compile types to contracts in full mode.
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
        "Fatal error: Could not find DefinitelyTyped in ~/.scotty/DefinitelyTyped."
      );
      console.error("Try cloning the repository.");
      process.exit(1);
    }
    if (!existsSync(CONTRACTS_PATH)) {
      console.error("Fatal error: Could not find contracts librasry in ~/.scotty/contracts");
      console.error("Try making that directory copying the files in __contracts__ there directly.");
      process.exit(1);
    }
    if (!existsSync(COMMIT_PATH)) {
      console.error(
        "Fatal error: Could not find the commit to check out in ~/.scotty/DefinitelyTyped/commit."
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
    console.error("Fatal error while validating:", err);
    process.exit(1);
  }
};

const replaceImport = (code: string, mode: Mode): string => {
  const replaceString = "./__REPLACE_ME__.js";
  switch (mode) {
    case "identity-mode": {
      return code.replace(replaceString, "./contract-identity-mode.js");
    }
    case "proxy-mode": {
      return code.replace(replaceString, "./contract-proxy-mode.js");
    }
    case "full-mode": {
      return code.replace(replaceString, "./contract-base.js");
    }
  }
};

const compileAndSwap = (mode: Mode) => {
  const mainPath = require.resolve(".");
  const packageName = path.dirname(ORIGINAL_DIRECTORY);
  const mainDirectory = path.dirname(mainPath);
  if (!existsSync(mainPath)) {
    console.error(`Fatal error: Could not find file ${mainPath}`);
    process.exit(1);
  }
  const typePath = path.join(DT_PATH, "types", packageName, "index.d.ts");
  if (!existsSync(typePath)) {
    console.error(`Fatal error: Could not types for ${packageName}`);
    process.exit(1);
  }
  copySync(typePath, mainDirectory);
  const code = replaceImport(compileContracts(), mode);
  const __ORIGINAL_UNTYPED_CODE__ = path.join(
    mainDirectory,
    "__ORIGINAL_UNTYPED_CODE__.js"
  );
  if (!existsSync(__ORIGINAL_UNTYPED_CODE__)) {
    moveSync(mainPath, __ORIGINAL_UNTYPED_CODE__);
  }
  writeFileSync(mainPath, code);
  copySync(CONTRACTS_PATH, mainDirectory, { recursive: true });
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
      validate();
      return compileAndSwap(el);
    }
    default: {
      console.error("Fatal error: Could not recognize command.\n");
      return help(1);
    }
  }
};

if (require.main === module) {
  parseArgv(process.argv.slice(2));
}
