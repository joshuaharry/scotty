class Num {}

class Zero extends Num {
    toNum() {
	return 0;
    }
}

class EvenNat extends Num {
    pred;
    
    constructor(pred) {
	super();
	this.pred = pred;
    }
    
    toNum() {
      return this.pred.toNum() + 1;
   }
}

class OddNat extends Num {
    pred;
    
    constructor(pred) {
	super();
	this.pred = pred;
    }
    
    toNum() {
	return this.pred.toNum() + 1;
    }
}

exports.Num = Num;
exports.EvenNat = EvenNat;
exports.OddNat = OddNat;
exports.Zero = Zero;
