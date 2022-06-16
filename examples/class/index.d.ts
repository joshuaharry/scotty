 export class Point {
 x:number;
 y:number;
   
 constructor(x:number, y:number) {
      this.x = x;
      this.y = y;
   }
   
   toStr(): string {
      return 0;
   }
}

export function Point(): string;
export function shift(p:Point): Point;
