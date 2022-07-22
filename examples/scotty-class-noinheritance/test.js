
const pt = require("./index.js");
const Point = pt.Point;
const shift = pt.shift;
 
function test() {
   const o = new Point(5,10);
   const o2 = shift(o);

   try {
      o2.x = "foo";
      return false;
   } catch(e) {
      ;
   }
   console.log("o2=", o2);
   console.log("o.toNum=", o.toNum());
   console.log("o2.toNum=", o2.toNum());
   try {
      console.log("o.toStr=", o.toStr());
      return false;
   } catch(e) {
      ;
   }
   try {
      console.log("o2.toStr=", o2.toStr());
      return false;
   } catch(e) {
      ;
   }
   return true;
}

if (!test()) throw "failed";
