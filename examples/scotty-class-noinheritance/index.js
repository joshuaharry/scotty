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
   toNum() {
      return this.x + this.y;
   }
}

function shift(p) {
   return new Point(p.x + 1, p.y + 1);
}

exports.Point = Point;
exports.shift = shift;

 
 
