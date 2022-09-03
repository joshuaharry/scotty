
const num = require("./index.js");
 
function test() {
   const z = new num.Zero();
   const o = new num.OddNat(z);
   const t = new num.EvenNat(o);

   console.log("t instanceof num.EvenNat", t instanceof num.EvenNat);
   console.log("t.toNum() =", t.toNum()); // printf t.toNum() = 2

   try {
     console.log(new num.EvenNat(z)); // raises a contract violation
     console.log("should have failed...");
     return false;
   } catch (e) {
     return e.toString().match(/blaming/);
   }
}

if (!test()) {
   console.log("failed");
} else {
   console.log("test passed.");
}
