var CT = require("./contract-base.js");

var originalModule = require("./__ORIGINAL_UNTYPED_MODULE__.js");

var Point$ClassContract = CT.CTRec(() =>
  CT.CTObject({
    x: CT.numberCT,
    y: CT.numberCT,
    constructor: CT.CTFunction(
      CT.trueCT,
      [CT.numberCT, CT.numberCT],
      Point$ClassContract
    ),
    toStr: CT.CTFunction(Point$ClassContract, [], CT.stringCT),
  })
);
var PointContract = CT.CTFunction(CT.trueCT, [CT.numberCT, CT.numberCT], CT.trueCT);
var shiftContract = CT.CTFunction(
  CT.trueCT,
  [Point$ClassContract],
  Point$ClassContract
);
module.exports = originalModule;
module.exports.Point = PointContract.wrap(originalModule.Point);
module.exports.shift = shiftContract.wrap(originalModule.shift);
