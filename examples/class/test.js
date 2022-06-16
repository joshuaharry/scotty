
const pt = require("./index.js");
const Point = pt.Point;
const shift = pt.shift;
 
function test() {
   const o = new Point(5);
   const o2 = shift(o);

   return typeof(o.toStr()) === "string";
   return typeof(o2.toStr()) === "string";
}


if (!test()) throw "failed";
