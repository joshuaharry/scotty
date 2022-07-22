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

class Point3d extends Point {
   z;
   
   constructor(z) {
      super();
      this.z = z;
   }
   toNum() {
      return this.x + this.y + this.z;
   }
      
exports.Point = Point;
exports.Point3d = Point3d;
exports.shift = shift;

 
 
