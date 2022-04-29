const base = require('./contract-base');

const baseExports = Object.entries(base);

const toTrueCT = () => base.trueCT;

const output = {};

for (const [name, exportName] of baseExports) {
  output[name] = (exportName instanceof base.CT) ? base.trueCT : toTrueCT;
}

module.exports = output;
