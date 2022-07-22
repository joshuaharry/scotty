
const pt = require("./index.js");
const Point = pt.Point;
const Point3d = pt.Point3d;
const shift = pt.shift;
 
function test() {
   const o = new Point3d(5,10, 20);
   const o2 = shift(o);

   console.log("o=", o);
   console.log("o2=", o2);
   
   try {
      o.z = "foo";
      return false;
   } catch(e) {
      ;
   }
   console.log("o=", o);
   
   console.log("o.toNum=", o.toNum());
   console.log("o2.toNum=", o2.toNum());
   try {
      console.log("o.toStr=", o.toStr());
      console.log("a");
      return false;
   } catch(e) {
      ;
   }
   try {
      console.log("o2.toStr=", o2.toStr());
      console.log("b");
      return false;
   } catch(e) {
      ;
   }
   return true;
}

if (!test()) throw "failed";
