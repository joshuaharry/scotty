export class Num {
   toNum() : number;
   constructor()
}

export class Zero extends Num {
   constructor()
}

class EvenNat extends Num {
 pred: OddNat;
 constructor(pred: OddNat);
}

class OddNat extends Num {
 pred: EvenNat | Zero;
 constructor(pred: EvenNat | Zero);
}
