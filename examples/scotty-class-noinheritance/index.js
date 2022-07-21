var CT = require("./contract-base.js");

var originalModule = require("./__ORIGINAL_UNTYPED_MODULE__.js");

var Point$ClassContract = CT.CTRec(() =>
  CT.CTObject(
    {
      x: CT.numberCT,
      y: CT.numberCT,
    },
    {
      toNum: CT.CTFunction(Point$ClassContract, [], CT.numberCT),
      toStr: CT.CTFunction(Point$ClassContract, [], CT.stringCT),
    }
  )
);
var PointContract = CT.CTClass(Point$ClassContract, [CT.numberCT, CT.numberCT]);
var shiftContract = CT.CTFunction(
  CT.trueCT,
  [Point$ClassContract],
  Point$ClassContract
);
module.exports = originalModule;
module.exports.Point = PointContract.wrap(originalModule.Point);
module.exports.shift = shiftContract.wrap(originalModule.shift);
