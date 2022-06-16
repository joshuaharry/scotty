class Point {
 x;
 y;
   
 constructor(x, y) {
      this.x = x;
      this.y = y;
   }
   
   toStr() {
      return 0;
   }
}

function shift(p) {
   console.log("in shift...");
   return new Point(this.x + 1, this.y + 1);
}

exports.Point = Point;
exports.shift = shift;

      
   


 
 
