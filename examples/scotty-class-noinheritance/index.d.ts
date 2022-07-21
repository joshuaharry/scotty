 export class Point {
 x:number;
 y:number;
   
 constructor(x:number, y:number);
 toStr(): string;
 toNum(): string;
}

export function Point(): string;
export function shift(p:Point): Point;
