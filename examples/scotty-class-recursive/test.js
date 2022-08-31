
const num = require("./index.js");
 
function test() {
   const z = new num.Zero();
   const o = new num.OddNat(z);
   const t = new num.EvenNat(o);

   console.log("t.toNum() =", t.toNum()); // printf t.toNum() = 2

   try {
     console.log(new num.EvenNat(z)); // raises a contract violation
     return false;
   } catch (e) {
     return e.toString().match(/blaming/);
   }
}

if (!test()) throw "failed";
