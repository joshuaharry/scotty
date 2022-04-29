const base = require("./contract-base");
const idMode = require("./contract-identity-mode");
const assert = require("assert");

{
  const baseKeys = new Set(Object.keys(base));
  const idModeKeys = new Set(Object.keys(idMode));
  for (const key of baseKeys) {
    assert(idModeKeys.has(key));
  }
}

{
  assert(idMode.numberCT.wrap("3") === "3");
}

{
  const plus_ctc = idMode.CTAnd(
    idMode.CTFunction(true, [idMode.isNumber, idMode.isNumber], idMode.isNumber),
    idMode.CTFunction(true, [idMode.isString, idMode.isString], idMode.isString)
  );
  function f(x, y) {
    return x + y;
  }
  const wf = plus_ctc.wrap(f);
  assert('12' === wf(1, "2"));
}

console.log("All tests are currently passing!");
