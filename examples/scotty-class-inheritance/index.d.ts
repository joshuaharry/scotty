export class Point {
  x:number;
  y:number;
   
  constructor(x:number, y:number);

  toNum(): number;
  toStr(): string;
}

export class Point extends Point3d {
  z:number;
  
  constructor(x:number, y:number, z:number);
}

export function shift(p:Point): Point;
