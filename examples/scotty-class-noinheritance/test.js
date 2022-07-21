
const pt = require("./index.js");
const Point = pt.Point;
const shift = pt.shift;
 
function test() {
   const o = new Point(5,10);
   const o2 = shift(o);

   console.log("o.toStr=", o.toNum());
   console.log("o.toStr=", o.toStr());
/*    console.log("o2.toStr=", o2.toStr());                            */
/*    return typeof(o.toStr()) === "string";                           */
/*    return typeof(o2.toStr()) === "string";                          */
}

if (!test()) throw "failed";
