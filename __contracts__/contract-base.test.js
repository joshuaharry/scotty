/*=====================================================================*/
/*    .../jscontract/scotty/__contracts__/contract-base.test.js        */
/*    -------------------------------------------------------------    */
/*    Author      :  manuel serrano                                    */
/*    Creation    :  Tue Feb 18 17:29:10 2020                          */
/*    Last change :  Thu Jul 21 19:56:31 2022 (serrano)                */
/*    Copyright   :  2020-22 manuel serrano                            */
/*    -------------------------------------------------------------    */
/*    Test suite for JS contracts                                      */
/*=====================================================================*/
"use strict";
"use hopscript";
const assert = require("assert");
const CT = require("./contract-base.js");

const not_a_contract = [57];

/*---------------------------------------------------------------------*/
/*    predicates                                                       */
/*---------------------------------------------------------------------*/
assert.ok(CT.isObject({ x: 3 }), "isObject.1");
assert.ok(!CT.isObject(undefined), "isObject.2");
assert.ok(
  CT.isFunction((x) => x),
  "isFunction.1"
);
assert.ok(!CT.isFunction("a string"), "isFunction.2");
assert.ok(CT.isString("3"), "isString.1");
assert.ok(!CT.isString(3), "isString.2");
assert.ok(CT.isBoolean(false), "isBoolean.1");
assert.ok(!CT.isBoolean(undefined), "isBoolean.2");
assert.ok(CT.isNumber(3), "isNumber.1");
assert.ok(!CT.isNumber("a string"), "isNumber.2");

/*
 * CTFlat
 */
assert.ok((() => 3 === CT.CTFlat(CT.isNumber).wrap(3))(), "ctflat.1");
assert.throws(
  () => {
    CT.CTFlat(CT.isNumber).wrap("3");
  },
  /blaming: pos/,
  "ctflat.2"
);

/*
 * CTFunction
 */
assert.throws(
  () => {
    function f(x) {
      return x + 1;
    }
    var wf = CT.CTFunction(true, [CT.isString], CT.isString).wrap(f);
    wf(3);
    return true;
  },
  /blaming: neg/,
  "ctfunction.1.succeed"
);
assert.ok(
  (() => {
    function f(x) {
      return x + 1;
    }
    var wf = CT.CTFunction(CT.trueCT, [CT.isString], CT.isString).wrap(f);
    wf("3");
    return true;
  })(),
  "ctfunction.1.fail"
);
assert.throws(
  () => {
    function f(x) {
      return 1;
    }
    var wf = CT.CTFunction(true, [CT.isString], CT.isString).wrap(f);
    wf("3");
    return true;
  },
  /blaming: pos/,
  "ctfunction.2.fail"
);
assert.throws(
  () => {
    function f(x) {
      return "x";
    }
    var wf = CT.CTFunction(true, [CT.isString, CT.isNumber], CT.isString).wrap(
      f
    );
    wf("3", "3");
    return true;
  },
  /blaming: neg/,
  "ctfunction.3.fail"
);
assert.ok(
  (() => {
    function f(x) {
      return "x";
    }
    var wf = CT.CTFunction(true, [CT.isString, CT.isNumber], CT.isString).wrap(
      f
    );
    wf("3", 3);
    return true;
  })(),
  "ctfunction.3.pass"
);
assert.throws(
  () => {
    function f(x) {
      return "x";
    }
    function hasg(x) {
      return "g" in x;
    }
    var wf = CT.CTFunction(hasg, [CT.isString, CT.isNumber], CT.isString).wrap(
      f
    );
    var o = { f: wf };
    o.f("3", 3);
    return true;
  },
  /blaming: pos/,
  "ctfunction.4.fail"
);
assert.ok(
  (() => {
    function f(x) {
      return x + 1;
    }
    var wf = CT.CTFunction(true, [1], 2).wrap(f);
    wf(1);
    return true;
  })(),
  "ctfunction.5.succeed"
);
assert.ok(
  (() => {
    function f() {
      return "abc";
    }
    var wf = CT.CTFunction(CT.trueCT, [], CT.isString).wrap(f);
    wf();
    return true;
  })(),
  "ctfunction.6.succeed"
);
assert.throws(
  () => {
    function f() {
      return "abc";
    }
    var wf = CT.CTFunction(CT.trueCT, [], 123).wrap(f);
    wf();
  },
  /blaming: pos/,
  "ctfunction.6.fail"
);
assert.ok(
  (() => {
    function f(x, ...y) {
      return parseInt(x) + y.length;
    }
    var wf = CT.CTFunction(
      true,
      [CT.isString, { contract: CT.isNumber, dotdotdot: true }],
      CT.isNumber
    ).wrap(f);
    wf("3");
    wf("3", 1);
    wf("3", 1, 2);
    wf("3", 1, 2, 3);
    return true;
  })(),
  "ctfunction.7.succeed"
);
assert.throws(
  () => {
    function f(x, ...y) {
      return parseInt(x) + y.length;
    }
    var wf = CT.CTFunction(
      true,
      [CT.isString, { contract: CT.isNumber, dotdotdot: true }],
      CT.isNumber
    ).wrap(f);
    wf();
    return true;
  },
  /blaming: neg/,
  "ctfunction.8.succeed"
);
assert.throws(
  () => {
    function f(x, ...y) {
      return parseInt(x) + y.length;
    }
    var wf = CT.CTFunction(
      true,
      [CT.isString, { contract: CT.isNumber, dotdotdot: true }],
      CT.isNumber
    ).wrap(f);
    wf(1);
    return true;
  },
  /blaming: neg/,
  "ctfunction.9.succeed"
);
assert.throws(
  () => {
    function f(x, ...y) {
      return parseInt(x) + y.length;
    }
    var wf = CT.CTFunction(
      true,
      [CT.isString, { contract: CT.isNumber, dotdotdot: true }],
      CT.isNumber
    ).wrap(f);
    wf("1", 1, 2, "3");
    return true;
  },
  /blaming: neg/,
  "ctfunction.10.succeed"
);
assert.ok(
  (() => {
    function f(x, y = 1, z = true) {
      return parseInt(x) + y + (z ? 10 : -10);
    }
    var wf = CT.CTFunction(
      true,
      [
        CT.isString,
        { contract: CT.isNumber, optional: true },
        { contract: CT.isBoolean, optional: true },
      ],
      CT.isNumber
    ).wrap(f);
    wf("1", 1, false);
    wf("1", 1);
    wf("1");
    return true;
  })(),
  "ctfunction.11.succeed"
);
assert.throws(
  () => {
    const posp = n => n >= 0

    // Pos -> Bool
    const posToBoolean = CT.CTFunction(true, [posp], CT.isBoolean);
    // (Pos -> Bool) -> Number
    const posToBoolTonumber = CT.CTFunction(true, [posToBoolean], CT.isNumber);

    function impl(f) {
	f(-4)
	return 0;
    }

      const ctimpl = posToBoolTonumber.wrap(impl);
      const lt_100 = x => true;
      ctimpl(lt_100)
  },
  /blaming: pos/,
  "ctfunction.12.succeed"
);

// check errors happen at the right time
assert.throws(
  () => {
    CT.CTFunction(true, [not_a_contract], true);
  },
  /CTFunction, argument 1: not a contract/,
  "ctfunction.arg1-check"
);
assert.throws(
  () => {
    CT.CTFunction(true, [true], not_a_contract);
  },
  /CTFunction, range: not a contract/,
  "ctfunction.arg2-check"
);
assert.throws(
  () => {
    CT.CTFunction(not_a_contract, [true], true);
  },
  /CTFunction, self argument: not a contract/,
  "ctfunction.arg2-check"
);

/*---------------------------------------------------------------------*/
/*    CTFMethod ...                                                    */
/*---------------------------------------------------------------------*/
assert.ok(
  (() => {
    function CTOR(x) {
      this.x = x;
    }
    function getX() {
      return this.x;
    }

    CTOR.prototype.getX = CT.CTFunction(true, [], CT.isNumber).wrap(getX);

    const o1 = new CTOR(1),
      o2 = new CTOR(2);

    return o1.getX() === 1 && o2.getX() === 2;
  })(),
  "ctmethod.1"
);

assert.ok(
  (() => {
    function CTOR(x) {
      this.x = x;
    }
    function getX() {
      return this.x;
    }

    CTOR.prototype.getX = CT.CTFunction(true, [], CT.isNumber).wrap(getX);

    const o1 = new CTOR(1),
      o2 = new CTOR(2);

    return (
      CTOR.prototype.getX.apply(o1, []) === 1 &&
      CTOR.prototype.getX.apply(o2, []) === 2
    );
  })(),
  "ctmethod.2"
);

assert.throws(() => {
  function CTOR(x) {
    this.x = x;
  }
  function getX() {
    return this.x;
  }

  CTOR.prototype.getX = CT.CTFunction(true, [], CT.isNumber).wrap(getX);

  const o1 = new CTOR(1);

  return CTOR.prototype.getX.apply(o1, [1]) === 1;
}, "ctmethod.3");

assert.throws(() => {
  function CTOR(x) {
    this.x = x;
  }
  function getX() {
    return this.x;
  }

  CTOR.prototype.getX = CT.CTFunction(true, [], CT.isNumber).wrap(getX);

  const o1 = new CTOR(1);

  return CTOR.prototype.getX.call(o1, 1) === 1;
}, "ctmethod.4");

assert.throws(() => {
  function CTOR(x) {
    this.x = x;
  }
  function getX() {
    return this.x;
  }

  CTOR.prototype.getX = CT.CTFunction(true, [CT.isNumber], CT.isNumber).wrap(
    getX
  );

  const o1 = new CTOR(1);

  return CTOR.prototype.getX.call(o1, "not-a-number") === 1;
}, "ctmethod.5");

assert.ok(
  (() => {
    function CTOR(x) {
      this.x = x;
    }
    function getX() {
      return this.x;
    }

    CTOR.prototype.getX = CT.CTFunction(
      CT.CTObject({ x: CT.isNumber, getX: CT.isFunction }),
      [],
      CT.isNumber
    ).wrap(getX);

    const o1 = new CTOR(1);

    return o1.getX() === 1 && CTOR.prototype.getX.apply(o1, []) === 1;
  })(),
  "ctmethod.6"
);

assert.throws(() => {
  function CTOR(x) {
    this.x = x;
  }
  function getX() {
    return this.x;
  }

  CTOR.prototype.getX = CT.CTFunction(
    CT.CTObject({ x: CT.isNumber, getX: CT.isFunction }),
    [],
    CT.isNumber
  ).wrap(getX);

  const o1 = new CTOR(1);
  o1.y = 32;

  return o1.getX() === 1 && CTOR.prototype.getX.apply(o1, []) === 1;
}, "ctmethod.7");

/*---------------------------------------------------------------------*/
/*    CTFunctionD                                                      */
/*---------------------------------------------------------------------*/
assert.deepStrictEqual(CT.__topsort([]), []);
assert.deepStrictEqual(CT.__topsort([{ name: "x" }]), [0]);
assert.deepStrictEqual(CT.__topsort([{ name: "x" }, { name: "y" }]), [0, 1]);
assert.deepStrictEqual(
  CT.__topsort([{ name: "x" }, { name: "y", dep: ["x"] }]),
  [0, 1]
);
assert.deepStrictEqual(
  CT.__topsort([{ name: "x", dep: ["y"] }, { name: "y" }]),
  [1, 0]
);
assert.deepStrictEqual(
  CT.__topsort([
    { name: "a", dep: ["c"] },
    { name: "b" },
    { name: "c", dep: [] },
    { name: "d" },
    { name: "e", dep: ["f"] },
    { name: "f" },
  ]),
  [2, 0, 1, 3, 5, 4]
);
assert.deepStrictEqual(
  CT.__topsort([
    { name: "x", dep: ["y"] },
    { name: "y", dep: ["x"] },
  ]),
  false
);

assert.deepStrictEqual(CT.__find_depended_on([]), []);
assert.deepStrictEqual(
  CT.__find_depended_on([
    { name: "x", dep: ["y"] },
    { name: "y", dep: ["x"] },
  ]),
  [true, true]
);
assert.deepStrictEqual(
  CT.__find_depended_on([{ name: "x" }, { name: "y", dep: ["x"] }]),
  [true, false]
);
assert.deepStrictEqual(CT.__find_depended_on([{ name: "x" }, { name: "y" }]), [
  false,
  false,
]);

assert.ok(
  (() => {
    function f(x) {
      return "y";
    }
    const ctc = CT.CTFunctionD([{ name: "x", ctc: CT.isString }], CT.isString);
    const wf = ctc.wrap(f);
    return wf("x") === "y";
  })(),
  "ctfunctiond.1"
);
assert.ok(
  (() => {
    function f(x, y) {
      return "y";
    }
    const ctc = CT.CTFunctionD(
      [
        { name: "x", ctc: CT.isString },
        { name: "y", ctc: CT.isNumber },
      ],
      CT.isString
    );
    const wf = ctc.wrap(f);
    return wf("x", 1) === "y";
  })(),
  "ctfunctiond.2"
);
assert.ok(
  (() => {
    function f(x, y) {
      return "y";
    }
    const ctc = CT.CTFunctionD(
      [
        { name: "x", ctc: CT.isNumber },
        { name: "y", ctc: (deps) => (y) => deps.x < y, dep: ["x"] },
      ],
      CT.isString
    );
    const wf = ctc.wrap(f);
    return wf(1, 2) === "y";
  })(),
  "ctfunctiond.3"
);
assert.ok(
  (() => {
    function f(x, y) {
      return "y";
    }
    const ctc = CT.CTFunctionD(
      [
        { name: "x", ctc: (deps) => (x) => x < deps.y, dep: ["y"] },
        { name: "y", ctc: CT.isNumber },
      ],
      CT.isString
    );
    const wf = ctc.wrap(f);
    return wf(1, 2) === "y";
  })(),
  "ctfunctiond.4"
);
// check errors happen at the right time
assert.throws(
  () => {
    CT.CTFunctionD([{ name: "x", ctc: not_a_contract }], CT.isString);
  },
  /CTFunctionD, argument 1: not a contract/,
  "ctfunctiond.arg-check"
);
assert.throws(
  () => {
    CT.CTFunctionD([{ name: "x", ctc: CT.isString }], not_a_contract);
  },
  /CTFunctionD, range: not a contract/,
  "ctfunctiond.rng-check"
);

/*
 * CTOr
 */
assert.throws(() => {
  CT.CTOrImplicitChoice(CT.isString, CT.isNumber).wrap(undefined);
}, "ctor.1");
assert.ok(
  (() => {
    CT.CTOrImplicitChoice(CT.isString, CT.isNumber).wrap("x");
    return true;
  })(),
  "ctor.2"
);
assert.ok(
  (() => {
    CT.CTOrImplicitChoice(CT.isString, CT.isNumber).wrap(3);
    return true;
  })(),
  "ctor.3"
);
assert.ok(
  (() => {
    function f_(x) {
      return "x";
    }
    const f = CT.CTOrImplicitChoice(
      CT.CTFunction(true, [CT.isString], CT.isString),
      CT.isNumber
    ).wrap(f_);
    f("x");
    return true;
  })(),
  "ctor.4"
);
assert.throws(
  () => {
    const f = CT.CTOrImplicitChoice(
      CT.CTFunction(true, [CT.isString], CT.isString),
      CT.isNumber
    ).wrap((x) => 3);
    f("x");
  },
  /blaming: pos/,
  "ctor.5"
);
assert.throws(
  () => {
    const f = CT.CTOrImplicitChoice(
      CT.CTFunction(true, [CT.isString], CT.isString),
      CT.isNumber
    ).wrap((x) => "x");
    f(3);
  },
  /blaming: neg/,
  "ctor.6"
);

assert.throws(
    () => {
        const f = CT.CTOrImplicitChoice(
            CT.CTFunction(true, [CT.isString], CT.isString),
            CT.CTFunction(true, [CT.isNumber], CT.isNumber)
        ).wrap((x) => "x");
        f(3);
    },
    /blaming: neg/,
    "ctor.7"
)
assert.ok(
    (() => {
        const f = CT.CTOrImplicitChoice(
            CT.CTFunction(true, [CT.isString], CT.isString),
            CT.CTFunction(true, [CT.isString], CT.isNumber)
        ).wrap((x) => "x");
        return f("y") == "x";
    })(),
    "ctor.8"
)
assert.ok(
  (() => {
      CT.CTOrImplicitChoice(CT.isString, CT.isNumber, CT.isBoolean).wrap("x");
    return true;
  })(),
  "ctor.9a"
);
assert.ok(
  (() => {
      CT.CTOrImplicitChoice(CT.isString, CT.isNumber, CT.isBoolean).wrap(11);
    return true;
  })(),
  "ctor.9b"
);
assert.ok(
  (() => {
      CT.CTOrImplicitChoice(CT.isString, CT.isNumber, CT.isBoolean).wrap(true);
    return true;
  })(),
  "ctor.9c"
);

assert.throws(
    () => {
	const CTarr2 = CT.CTOrImplicitChoice(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = ["1",2];
	const ct2a2 = CTarr2.wrap(a2);
	const c2a20 = ct2a2[0];
	const c2a21 = ct2a2[1];
    },
    /blaming: pos/,
    "ctor.10"
)

assert.throws(
    () => {
	const CTarr2 = CT.CTOrImplicitChoice(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = [];
	const ct2a2 = CTarr2.wrap(a2);
	ct2a2[0] = "string";
    },
    /blaming: neg/,
    "ctor.11"
)
assert.throws(
    () => {
	const CTarr2 = CT.CTOrImplicitChoice(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = [];
	const ct2a2 = CTarr2.wrap(a2);
	ct2a2[0] = 1;
    },
    /blaming: neg/,
    "ctor.12"
)

assert.throws(
  () => {
    const orfn = CT.CTOrImplicitChoice(
      CT.CTFunction(true, [CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isNumber], CT.isString))
    const f = function(x) {
      if (x === 0) return "x"
      return x
    }
    const fc = orfn.wrap(f)
    fc(0)
    fc(1)
  },
  /blaming: pos/,
  "ctor.13"
)


// check errors happen at the right time
assert.throws(
  () => {
    CT.CTOrImplicitChoice(not_a_contract, true);
  },
  /CTOrImplicitChoice: not a contract/,
  "ctor.arg1-check"
);
assert.throws(
  () => {
    CT.CTOrImplicitChoice(true, not_a_contract);
  },
  /CTOrImplicitChoice: not a contract/,
  "ctor.arg2-check"
);

assert.ok(
  (() => {
    CT.CTOr().wrap("x");
    return true;
  })(),
  "ctor.n.1"
);
assert.throws(() => {
  CT.CTOr(CT.isString, CT.isNumber).wrap(undefined);
}, "ctor.n.2");
assert.ok(
  (() => {
    CT.CTOr(CT.isString, CT.isNumber).wrap("x");
    return true;
  })(),
  "ctor.n.3"
);
assert.ok(
  (() => {
    CT.CTOr(CT.isString,
            CT.isNumber,
            CT.CTFunction(true, [CT.isString], CT.isString)).wrap(
              "x"
            );
    return true;
  })(),
  "ctor.n.4"
);
assert.ok(
  (() => {
    const f =
    CT.CTOr(CT.isString,
            CT.isNumber,
            CT.CTFunction(true, [CT.isString], CT.isString)).wrap(
              (x) => x + "y"
            );
    return (f("x") === "xy")
  })(),
  "ctor.n.5"
);


/*---------------------------------------------------------------------*/
/*    CTObject                                                         */
/*---------------------------------------------------------------------*/
assert.ok(
  (() => {
    const tree = CT.CTObject({});
    const o = tree.wrap({});
    return true;
  })(),
  "ctobject.1"
);
assert.throws(
  () => {
    const tree = CT.CTObject({ l: CT.isString, r: CT.isObject });
    const o = tree.wrap({ l: "x", r: undefined });
    o.l;
    o.r;
  },
  /blaming: pos/,
  "ctobject.2"
);
assert.ok(
  (() => {
    const tree = CT.CTObject({ l: CT.isString, r: CT.isNumber });
    const o = tree.wrap({ l: "x", r: 3 });
    return o.l === "x" && o.r === 3;
  })(),
  "ctobject.3"
);
assert.ok(
  (() => {
    const person = CT.CTObject({
      id: CT.isNumber,
      prop: { contract: CT.CTOr(CT.isString, CT.isBoolean), index: "string" },
    });
    const o = person.wrap({
      id: 23,
      name: "foo",
      firstname: "bar",
      alive: true,
    });
    return o.id === 23 && o.name === "foo" && o.alive;
  })(),
  "ctobject.4"
);
assert.throws(
  () => {
    const person = CT.CTObject({
      id: CT.isNumber,
      prop: { contract: CT.CTOrImplicitChoice(CT.isString, CT.isBoolean), index: "string" },
    });
    const o = person.wrap({ id: 23, name: "foo", firstname: "bar", alive: 23 });
    return o.id === 23 && o.name === "foo" && o.alive;
  },
  /CTOr no arguments applied.*\n.*blaming: pos/,
  "ctobject.index"
);
assert.throws(
  () => {
    const person = CT.CTObject({
      id: CT.isNumber,
      prop: { contract: CT.CTOr(CT.isString, CT.isBoolean), index: "number" },
    });
    const o = person.wrap({ id: 23, name: "foo", firstname: "bar" });
    return o.id === 23 && o.name === "foo";
  },
  /Object mismatch.*\n.*blaming: pos/,
  "ctobject.index.2"
);

assert.ok(
  (() => {
    const example = CT.CTObject({
      id: {
        contract: CT.numberCT,
        optional: true,
      },
      name: {
        contract: CT.stringCT,
        optional: true,
      },
    });
    const exampleWrapped = example.wrap({});
    return Object.keys(exampleWrapped).length === 0;
  })()
);

assert.ok(
  (() => {
    const fn = (obj) => {
      obj.name;
      return true;
    };
    const fnContract = CT.CTFunction(
      CT.trueCT,
      [
        CT.CTObject({
          name: {
            contract: CT.stringCT,
            optional: true,
          },
        }),
      ],
      CT.booleanCT
    );
    const fnWithCt = fnContract.wrap(fn);
    return fnWithCt({});
  })()
);

{
  const example = CT.CTObject({
    id: {
      contract: CT.numberCT,
      optional: true,
    },
    name: {
      contract: CT.stringCT,
      optional: true,
    },
  });
  const exampleWrapped = example.wrap({});
  assert.ok(exampleWrapped.id === undefined);
}

assert.ok(
  (() => {
    const fn = ({ name, nickName }) => name || nickName || "neither";
    const fnContract = CT.CTFunction(
      CT.trueCT,
      [
        CT.CTObject({
          name: {
            contract: CT.stringCT,
            optional: true,
          },
          nickName: {
            contract: CT.stringCT,
            optional: true,
          },
        }),
      ],
      CT.stringCT
    );
    const fnWithCt = fnContract.wrap(fn);
    // I think this should work...
    return fnWithCt({ name: "hello" }) === "hello";
  })()
);

assert.ok(
  (() => {
    const example = CT.CTObject({
      id: {
        contract: CT.numberCT,
        optional: true,
      },
      name: {
        contract: CT.stringCT,
        optional: true,
      },
    });
    const exampleWrapped = example.wrap({});
    return exampleWrapped.id === undefined;
  })()
);

assert.ok(
  (() => {
    const example = CT.CTObject({
      id: {
        contract: CT.numberCT,
        optional: true,
      },
      name: {
        contract: CT.stringCT,
        optional: true,
      },
    });
    const exampleContract = example.wrap({ id: 3 });
    return exampleContract.id === 3;
  })()
);

assert.ok(
  (() => {
    const example = CT.CTObject({
      id: {
        contract: CT.numberCT,
        optional: true,
      },
      name: {
        contract: CT.stringCT,
        optional: true,
      },
    });
    const exampleContract = example.wrap({ name: "hi" });
    return exampleContract.name === "hi";
  })()
);

assert.ok(
  (() => {
    const example = CT.CTObject({
      id: {
        contract: CT.numberCT,
        optional: true,
      },
      name: {
        contract: CT.stringCT,
        optional: true,
      },
    });
    const exampleContract = example.wrap({ id: 3, name: "hi" });
    return exampleContract.name === "hi" && exampleContract.id === 3;
  })()
);

// check errors happen at the right time
assert.throws(
  () => {
    CT.CTObject({ x: not_a_contract });
  },
  /CTObject: not a contract/,
  "ctobject.arg-check"
);

assert.throws(
  () => {
    CT.CTObject({ x: CT.isString, y: CT.isObject }).wrap({});
  },
  /Object mismatch, expecting "{x, y}"/,
  "ctojbect.tostring"
);

// check function and object
assert.ok(
  (() => {
    const fn = ({ name }) => name || "Bob";
    const fnContract = CT.CTFunction(
      CT.trueCT,
      [
        CT.CTObject({
          name: {
            contract: CT.stringCT,
            optional: true,
          },
        }),
      ],
      CT.stringCT
    );
    const fnWithCt = fnContract.wrap(fn);
    return fnWithCt({ name: "hello" }) === "hello";
  })()
);

// constructors (new)
assert.ok(
   (() => {
      function CTOR(x) {
        this.x = x;
      }

      const cto = CT.CTObject({ x: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isNumber], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR(1);
      return o1.x;
   })(),
   "ctor.1"
);

assert.throws(
   () => {
      function CTOR(x) {
        this.x = x;
      }
      CTOR.prototype.y = 20;

      const cto = CT.CTObject({ x: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isNumber], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR("1");
      return o1.x;
   },
   "ctor.2"
);

assert.throws(
   () => {
      function CTOR(x) {
        this.x = x;
      }
      CTOR.prototype.y = 20;

      const cto = CT.CTObject({ x: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isString], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR("1");
      return o1.x;
   },
   "ctor.2"
);

// object with prototype chains
assert.ok(
   (() => {
      function CTOR(x) {
        this.x = x;
      }
      CTOR.prototype.y = 20;

      const cto = CT.CTObject({ x: CT.isNumber }, { y: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isNumber], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR(1);
      return o1.x + o1.y;
   })(),
   "prototype.1"
);

assert.throws(
   () => {
      function CTOR(x) {
        this.x = x;
      }
      CTOR.prototype.y = 20;

      const cto = CT.CTObject({ x: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isNumber], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR(1);
      return o1.x + o1.y;
   },
   /blaming: pos/,
   "prototype.2"
);

assert.throws(
   () => {
      function CTOR(x) {
        this.x = x;
      }

      const cto = CT.CTObject({}, { x: CT.isNumber });
      const ctf = CT.CTFunction(cto, [CT.isNumber], CT.trueCT);
      const CTCTOR = ctf.wrap(CTOR);
      const o1 = new CTCTOR(1);
      return o1.x;
   },
   /blaming: pos/,
   "prototype.3"
);

/*---------------------------------------------------------------------*/
/*    CTInstance                                                       */
/*---------------------------------------------------------------------*/

assert.throws(
  () => {
    class C {}
    const ctc = CT.CTInstance("C",{},{},C,undefined);
    const o = ctc.wrap(undefined);
  },
  /blaming: pos/,
  "ctinstance.0"
);
assert.ok(
  (() => {
    class C {}
    const tree = CT.CTInstance("C",{},{},C,undefined);
    const o = tree.wrap(new C());
    return true;
  })(),
  "ctinstance.1"
);
assert.ok(
  (() => {
    class C {f; constructor() {this.f = 1;} }
    const tree = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const o = tree.wrap(new C()).f;
    return true;
  })(),
  "ctinstance.2"
);
assert.throws(
  () => {
    class C {f; constructor() {this.f = "a string";} }
    const tree = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const o = tree.wrap(new C()).f;
  },
  /blaming: pos/,
  "ctinstance.3"
);
assert.ok(
  (() => {
    class C {m(x) { return 1 };}
    const mctc = CT.CTFunction(CT.CTRec(() => C_CTC),[CT.isNumber],CT.isNumber);
    const C_CTC = CT.CTInstance("C", {}, {m : mctc}, C, undefined);
    const o = C_CTC.wrap(new C()).m(1);
    return true;
  })(),
  "ctinstance.4"
);
assert.throws(
  () => {
    class C {m(x) { return 1 };}
    const mctc = CT.CTFunction(CT.CTRec(() => C_CTC),[CT.isNumber],CT.isNumber);
    const C_CTC = CT.CTInstance("C", {}, {m : mctc}, C, undefined);
    const o = C_CTC.wrap(new C()).m("a string");
  },
  /blaming: neg/,
  "ctinstance.5"
);
assert.throws(
  () => {
    class C {f; constructor() {this.f = "a string";} }
    class D extends C {g; constructor() {super(); this.g = "a string";} }
    const CTC1 = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const CTC2 = CT.CTInstance("C",{g : CT.isNumber},{},D,CTC1);
    const o = CTC2.wrap(new D()).f;
  },
  /blaming: pos/,
  "ctinstance.6"
);
assert.throws(
  () => {
    class C { constructor() {} }
    class D extends C {g; constructor() {super(); this.g = 1;} }
    const CTC1 = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const CTC2 = CT.CTInstance("C",{g : CT.isNumber},{},D,CTC1);
    const o = CTC2.wrap(new D());
  },
  /blaming: pos/,
  "ctinstance.7"
);
assert.throws(
  () => {
    class C { f; constructor() { this.f = 1; } }
    class D extends C { constructor() {super(); } }
    const CTC1 = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const CTC2 = CT.CTInstance("C",{g : CT.isNumber},{},D,CTC1);
    const o = CTC2.wrap(new D());
  },
  /blaming: pos/,
  "ctinstance.8"
);

assert.ok((() => {
    class C {
        cache;
        constructor() {
            this.cache=false;
        }
        get_value() {
            if (!this.cache) this.cache=this.compute_value();
            return this.cache;
        };
        compute_value() { return 1; };
    }
    class D extends C {
        a_field = 1;
        compute_value() {
            return this.a_field;
        }
    }
    const C_ctc = CT.CTInstance(
        "C",
        {},
        {
            get_value : CT.CTFunction(CT.CTRec(() => C_ctc),[],CT.isNumber),
            compute_value : CT.CTFunction(CT.CTRec(() => C_ctc),[],CT.isNumber)
        },
        C, undefined
    );
    const D_ctc = CT.CTInstance(
        "D",
        {
            a_field : CT.isNumber
        }, {
            compute_value : CT.CTFunction(CT.CTRec(() => D_ctc),[],CT.isNumber)
        },
        D,
        C_ctc);
    const o = D_ctc.wrap(new D())
    o.get_value();
    return o.get_value() == 1;
})(),
	  "ctinstance.9"
	 );


assert.ok(
    (() => {

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
	
	var Num$InstanceContract =
	    CT.CTInstance(
		"Num",
		{},
		{
		    toNum: CT.CTFunction(
			CT.CTRec(() => Num$InstanceContract),
			[],
			CT.numberCT
		    ),
		},
		Num,
		undefined
	    );
	
	
	var Num$ClassContract = CT.CTClass(
	    CT.CTRec(() => Num$InstanceContract),
	    []
	);
	var Zero$InstanceContract = CT.anyCT;
	var Zero$ClassContract = CT.CTClass(
	    CT.CTRec(() => Zero$InstanceContract),
	    []
	);
	var EvenNat$InstanceContract =
	    CT.CTInstance(
		"EvenNat",
		{
		    pred: CT.CTRec(() => OddNat$InstanceContract),
		},
		{},
		EvenNat,
		Num$InstanceContract
	    );

	var EvenNat$ClassContract = CT.CTClass(
	    CT.CTRec(() => EvenNat$InstanceContract),
	    [CT.CTRec(() => OddNat$InstanceContract)]
	);
	var OddNat$InstanceContract = 
	    CT.CTInstance(
		"OddNat",
		{
		    pred: CT.CTOr(
			CT.CTRec(() => EvenNat$InstanceContract),
			CT.CTRec(() => Zero$InstanceContract)
		    ),
		},
		{},
		OddNat,
		Num$InstanceContract
	    );

	var OddNat$ClassContract = CT.CTClass(
	    CT.CTRec(() => OddNat$InstanceContract),
	    [
		CT.CTOr(
		    CT.CTRec(() => EvenNat$InstanceContract),
		    CT.CTRec(() => Zero$InstanceContract)
		),
	    ]
	);
	var num_Zero = Zero$ClassContract.wrap(Zero);
	var num_EvenNat = EvenNat$ClassContract.wrap(EvenNat);
	var num_OddNat = OddNat$ClassContract.wrap(OddNat);

	const z = new num_Zero();
	const o = new num_OddNat(z);
	const t = new num_EvenNat(o);

	t.toNum()


	return true;
    })(),
  "ctinstance.10a"
);

assert.throws(
  () => {
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
	
	var Num$InstanceContract =
	    CT.CTInstance(
		"Num",
		{},
		{
		    toNum: CT.CTFunction(
			CT.CTRec(() => Num$InstanceContract),
			[],
			CT.numberCT
		    ),
		},
		Num,
		undefined
	    );
	
	
	var Num$ClassContract = CT.CTClass(
	    CT.CTRec(() => Num$InstanceContract),
	    []
	);
	var Zero$InstanceContract = CT.anyCT;
	var Zero$ClassContract = CT.CTClass(
	    CT.CTRec(() => Zero$InstanceContract),
	    []
	);
	var EvenNat$InstanceContract =
	    CT.CTInstance(
		"EvenNat",
		{
		    pred: CT.CTRec(() => OddNat$InstanceContract),
		},
		{},
		EvenNat,
		Num$InstanceContract
	    );

	var EvenNat$ClassContract = CT.CTClass(
	    CT.CTRec(() => EvenNat$InstanceContract),
	    [CT.CTRec(() => OddNat$InstanceContract)]
	);
	var OddNat$InstanceContract = 
	    CT.CTInstance(
		"OddNat",
		{
		    pred: CT.CTOr(
			CT.CTRec(() => EvenNat$InstanceContract),
			CT.CTRec(() => Zero$InstanceContract)
		    ),
		},
		{},
		OddNat,
		Num$InstanceContract
	    );

	var OddNat$ClassContract = CT.CTClass(
	    CT.CTRec(() => OddNat$InstanceContract),
	    [
		CT.CTOr(
		    CT.CTRec(() => EvenNat$InstanceContract),
		    CT.CTRec(() => Zero$InstanceContract)
		),
	    ]
	);
	var num_Zero = Zero$ClassContract.wrap(Zero);
	var num_EvenNat = EvenNat$ClassContract.wrap(EvenNat);
	var num_OddNat = OddNat$ClassContract.wrap(OddNat);

	const z = new num_Zero();
	const o = new num_OddNat(z);
	const t = new num_EvenNat(o);

        new num_EvenNat(z)


	return true;
    },
  /blaming: neg/,
  "ctinstance.10b"
)

assert.throws(
  () => {
    class C { f; constructor() { this.f = 1; } }
    class D extends C { constructor() {super(); } }
    const CTC1 = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const CTC2 = CT.CTInstance("C",{g : CT.isNumber},{},D,CTC1);
    const o = CTC2.wrap(new D());
  },
  /with own property g/,
  "ctinstance.11a"
);

assert.throws(
  () => {
    class C { f; constructor() { this.f = 1; } }
    class D extends C { constructor() {super(); } }
    const CTC1 = CT.CTInstance("C",{f : CT.isNumber},{},C,undefined);
    const CTC2 = CT.CTInstance("C",{g : CT.isNumber},{},D,CTC1);
    const o = CTC2.wrap(new C());
  },
  /that is an instanceof "class D/,
  "ctinstance.11b"
);

assert.throws(
  () => {
    class C { f; constructor() { this.f = "one"; } }
    const CTC1 = CT.CTInstance(
      "C",
      {},
      {f : { contract : CT.CTFunction(CT.anyCT,[],CT.isNumber)} },
      C);
    const o = CTC1.wrap(new C()).f;
  },
  /blaming: pos/,
  "ctinstance.12"
);

assert.ok(
  (() => {
    class C {
      get f1() { return 5; }
      set f2(nv) { }
    }
    const ctc = CT.CTInstance(
      "C",
      {},
      {f1 : { contract : CT.isNumber, getter: true },
       f2 : { contract : CT.isNumber, setter: true }},
      C);
    const o = ctc.wrap(new C())
    o.f2=1;
    return o.f1 == 5;
  })(),
  "ctinstance.13"
);

assert.throws(
  () => {
    class C {
      get f1() { return "five"; }
      set f2(nv) { }
    }
    const ctc = CT.CTInstance(
      "C",
      {},
      {f1 : { contract : CT.CTFunction(CT.anyCT,[],CT.isNumber), getter: true },
       f2 : { contract : CT.CTFunction(CT.anyCT,[],CT.isNumber), setter: true }},
      C);
    const o = ctc.wrap(new C()).f1
  },
  /blaming: pos/,
  "ctinstance.14"
);

assert.throws(
  () => {
    class C {
      get f1() { return "five"; }
      set f2(nv) { }
    }
    const ctc = CT.CTInstance(
      "C",
      {},
      {f1 : { contract : CT.isNumber, getter: true },
       f2 : { contract : CT.isNumber, setter: true }},
      C);
    const o = ctc.wrap(new C()).f2="six";
  },
  /blaming: neg/,
  "ctinstance.15"
);

/*---------------------------------------------------------------------*/
/*    CTClass                                                          */
/*---------------------------------------------------------------------*/

assert.throws(
  () => {
    CT.CTClass(true, [CT.isString], CT.isNumber).wrap(undefined);
  },
  /SCOTTY-CONTRACT-VIOLATION: CTClass/,
  "ctfunction.correct-name-in-error-message"
);

assert.throws(
  () => {
    function f(x) {
      return 123;
    }
    var wf = CT.CTClass(true, [CT.isString], CT.isNumber).wrap(f);
    console.log(wf("x"));
  },
  /blaming: neg/,
  "ctfunction.new.fail"
);


/*---------------------------------------------------------------------*/
/*    CTRec                                                            */
/*---------------------------------------------------------------------*/
assert.throws(
  () => {
    const t2 = CT.CTRec(() => CT.isString);
    const o2 = t2.wrap(undefined);
  },
  /blaming: pos/,
  "ctrec.0"
);
assert.ok(
  (() => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    tree.wrap("x");
    return true;
  })(),
  "ctrec.1"
);
assert.ok(
  (() => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    tree.wrap({ l: "x", r: "y" });
    return true;
  })(),
  "ctrec.2"
);
assert.ok(
  (() => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    tree.wrap({ l: "x", r: { l: "y", r: "z" } });
    return true;
  })(),
  "ctrec.3"
);
assert.throws(
  () => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    tree.wrap(undefined);
  },
  /blaming: pos/,
  "ctrec.4"
);
assert.throws(
  () => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    const o = tree.wrap({ l: "x", r: undefined });
    o.l;
    o.r;
  },
  /blaming: pos/,
  "ctrec.5"
);
assert.ok(
  (() => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    const o = tree.wrap({ l: "x", r: { l: undefined, r: "x" } });
    return o.l === "x";
  })(),
  "ctrec.6"
);
assert.throws(
  () => {
    const tree = CT.CTOr(
      CT.isString,
      CT.CTObject({ l: CT.CTRec(() => tree), r: CT.CTRec(() => tree) })
    );
    const o = tree.wrap({ l: "x", r: { l: undefined, r: "x" } });
    o.l;
    o.r.l;
  },
  /blaming: pos/,
  "ctrec.7"
);

/*---------------------------------------------------------------------*/
/*    CTArray                                                          */
/*---------------------------------------------------------------------*/
assert.ok(
  (() => {
    return 0 === CT.CTArray(CT.isNumber).wrap([]).length;
  })(),
  "ctarray.0"
);
assert.ok(
  (() => {
    return 11 === CT.CTArray(CT.isNumber).wrap([11])[0];
  })(),
  "ctarray.1"
);
assert.throws(
  () => {
    CT.CTArray(CT.isNumber).wrap(["string"])[0];
  },
  /blaming: pos/,
  "ctarray.2"
);
assert.throws(
  () => {
    CT.CTArray(CT.isNumber).wrap([11, "string", 22])[1];
  },
  /blaming: pos/,
  "ctarray.3"
);
assert.ok(
  (() => {
    return 22 === CT.CTArray(CT.isNumber).wrap([11, "string", 22])[2];
  })(),
  "ctarray.4"
);
// check errors happen at the right time
assert.throws(
  () => {
    CT.CTArray(CT.isNumber, { immutable: true }).wrap([11, 22])[0] = 11;
  },
  /blaming: neg/,
  "ctarray.5"
);
assert.throws(
  () => {
    CT.CTArray(not_a_contract);
  },
  /CTArray: not a contract/,
  "ctarray.arg-check"
);

/*
 * CTAnd
 */

assert.ok(
  (() => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString)
    );
    function f(x, y) {
      return x + y;
    }
    const wf = plus_ctc.wrap(f);
    return 3 === wf(1, 2);
  })(),
  "ctand.1"
);
assert.ok(
  (() => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString)
    );
    function f(x, y) {
      return x + y;
    }
    const wf = plus_ctc.wrap(f);
    return "12" === wf("1", "2");
  })(),
  "ctand.2"
);
assert.ok(
  (() => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString),
      CT.CTFunction(true, [CT.isBoolean, CT.isBoolean], CT.isBoolean)
    );
    function f(x, y) {
      return CT.isBoolean(x) ? x && y : x + y;
    }
    const wf = plus_ctc.wrap(f);
    return false === wf(true, false);
  })(),
  "ctand.3a"
);
assert.ok(
  (() => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString),
      CT.CTFunction(true, [CT.isBoolean, CT.isBoolean], CT.isBoolean)
    );
    function f(x, y) {
      return CT.isBoolean(x) ? x && y : x + y;
    }
    const wf = plus_ctc.wrap(f);
    return 5 === wf(2, 3);
  })(),
  "ctand.3b"
);
assert.ok(
  (() => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString),
      CT.CTFunction(true, [CT.isBoolean, CT.isBoolean], CT.isBoolean)
    );
    function f(x, y) {
      return CT.isBoolean(x) ? x && y : x + y;
    }
    const wf = plus_ctc.wrap(f);
    return "xy" === wf("x", "y");
  })(),
  "ctand.3c"
);

assert.throws(
  () => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isString)
    );
    function f(x, y) {
      return x + y;
    }
    const wf = plus_ctc.wrap(f);
    wf(1, "2");
  },
  /blaming: neg/,
  "ctand.4"
);
assert.throws(
  () => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isString, CT.isString], CT.isNumber)
    );
    function f(x, y) {
      return 3;
    }
    const wf = plus_ctc.wrap(f);
    wf(1, "2");
  },
  /blaming: neg/,
  "ctand.5"
);
assert.throws(
  () => {
    const plus_ctc = CT.CTAnd(
      CT.CTFunction(true, [CT.isNumber, CT.isNumber], CT.isNumber),
      CT.CTFunction(true, [CT.isNumber, CT.isBoolean], CT.isNumber)
    );
    function f(x, y) {
      return 3;
    }
    const wf = plus_ctc.wrap(f);
    wf(1, "2");
  },
  /Predicate `isBoolean' not satisfied for value `2'.*\n.*blaming: neg/,
  "ctand.6"
);

assert.ok(
  (() => {
    function even(x) {
      return x % 2 == 0;
    }
    function pos(x) {
      return x > 0;
    }
    function odd(x) {
      return x % 2 != 0;
    }
    function neg(x) {
      return x < 0;
    }
    const even_to_even_and_pos_to_pos = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [even], even),
      CT.CTFunction(CT.trueCT, [pos], pos)
    );
    const odd_to_odd_and_neg_to_neg = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [odd], odd),
      CT.CTFunction(CT.trueCT, [neg], neg)
    );
    const ee_a_pp_or_oo_a_nn = CT.CTOr(
      even_to_even_and_pos_to_pos,
      odd_to_odd_and_neg_to_neg
    );

    function id(x) {
      return x;
    }
    const f =  ee_a_pp_or_oo_a_nn.wrap(id);
    return 21 == f(21);
  })(),
  "ctand.7a"
);

assert.ok(
  (() => {
    function even(x) {
      return x % 2 == 0;
    }
    function pos(x) {
      return x > 0;
    }
    function odd(x) {
      return x % 2 != 0;
    }
    function neg(x) {
      return x < 0;
    }
    const even_to_even_and_pos_to_pos = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [even], even),
      CT.CTFunction(CT.trueCT, [pos], pos)
    );
    const odd_to_odd_and_neg_to_neg = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [odd], odd),
      CT.CTFunction(CT.trueCT, [neg], neg)
    );
    const ee_a_pp_or_oo_a_nn = CT.CTOr(
      odd_to_odd_and_neg_to_neg,
      even_to_even_and_pos_to_pos
    );

    function id(x) {
      return x;
    }
    const f =  ee_a_pp_or_oo_a_nn.wrap(id);
    return 21 == f(21);
  })(),
  "ctand.7b"
);


assert.throws(
  () => {
    function even(x) {
      return x % 2 == 0;
    }
    function pos(x) {
      return x > 0;
    }
    function odd(x) {
      return x % 2 != 0;
    }
    function neg(x) {
      return x < 0;
    }
    const even_to_even_and_pos_to_pos = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [even], even),
      CT.CTFunction(CT.trueCT, [pos], pos)
    );
    const odd_to_odd_and_neg_to_neg = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [odd], odd),
      CT.CTFunction(CT.trueCT, [neg], neg)
    );
    const ee_a_pp_or_oo_a_nn = CT.CTOr(
      even_to_even_and_pos_to_pos,
      odd_to_odd_and_neg_to_neg
    );

    function id(x) {
      return x;
    }
    const f =  ee_a_pp_or_oo_a_nn.wrap(id);
    return 22 == f(22);
  },
  /blaming: neg/,
  "ctand.7c"
);


assert.throws(
  () => {
    function even(x) {
      return x % 2 == 0;
    }
    function pos(x) {
      return x > 0;
    }
    function odd(x) {
      return x % 2 != 0;
    }
    function neg(x) {
      return x < 0;
    }
    const even_to_even_and_pos_to_pos = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [even], even),
      CT.CTFunction(CT.trueCT, [pos], pos)
    );
    const odd_to_odd_and_neg_to_neg = CT.CTAnd(
      CT.CTFunction(CT.trueCT, [odd], odd),
      CT.CTFunction(CT.trueCT, [neg], neg)
    );
    const ee_a_pp_or_oo_a_nn = CT.CTOr(
      even_to_even_and_pos_to_pos,
      odd_to_odd_and_neg_to_neg
    );

    function id(x) {
      return x;
    }
    const f =  ee_a_pp_or_oo_a_nn.wrap(id);
    return -21 == f(-21);
  },
  /blaming: neg/,
  "ctand.7d"
);


assert.throws(
  () => {
    const c1 = CT.CTFunction(true, [CT.CTArray(CT.isString)], CT.isString);
    const c2 = CT.CTFunction(true, [CT.isString], CT.isString);
    const c3 = CT.CTAnd(c1, c2);

    function f() {
      return "foo bar";
    }

    const ctf = c3.wrap(f);
    ctf();
  },
  /Wrong argument number[^]*Wrong argument number/,
  "ctand.8"
);

assert.ok(
  (() => {
    const c1 = CT.CTFunction(true, [CT.CTArray(CT.isString)], CT.isString);
    const c2 = CT.CTFunction(
      true,
      [{ contract: CT.isString, dotdotdot: true }],
      CT.isString
    );
    const c3 = CT.CTAnd(c1, c2);

    function f() {
      return "foo bar";
    }

    const ctf = c3.wrap(f);
    return typeof ctf() === "string";
  })(),
  "ctand.9"
);
assert.ok(
  (() => {
    function even(x) {
      return x % 2 == 0;
    }
    function pos(x) {
      return x > 0;
    }
    function odd(x) {
      return x % 2 != 0;
    }
    function neg(x) {
      return x < 0;
    }
    const even_pos = CT.CTAnd(even, pos);
    const odd_neg = CT.CTAnd(odd, neg);
    return 22 == even_pos.wrap(22) &&
           -3 == odd_neg.wrap(-3);
  })(),
  "ctand.10"
)

assert.throws(
    () => {
	const CTarr2 = CT.CTAnd(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = [];
	const ct2a2 = CTarr2.wrap(a2);
	ct2a2[0] = 1;
	ct2a2[0] = "string";
    },
    /blaming: neg/,
    "ctand.11"
)
assert.throws(
    () => {
	const CTarr2 = CT.CTAnd(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = [1];
	const ct2a2 = CTarr2.wrap(a2);
	ct2a2[0]
    },
    /blaming: pos/,
    "ctand.12"
)
assert.throws(
    () => {
	const CTarr2 = CT.CTAnd(CT.CTArray(CT.isString), CT.CTArray(CT.isNumber));
	const a2 = ["string"];
	const ct2a2 = CTarr2.wrap(a2);
	ct2a2[0]
    },
    /blaming: pos/,
    "ctand.13"
)

/*
 * Minor bugfixes
 */
assert.ok(CT.numberCT.wrap(5));
assert.throws(() => {
  CT.numberCT.wrap("hello");
});
assert.throws(() => {
  CT.objectCT.wrap(null);
});

/*
 * ArrayLike contracts using CTObject
 */
assert.ok(
  (() => {
    const arrayLikeCT = CT.CTObject({
      length: CT.isNumber,
      prop: { contract: CT.isString, index: "string" },
    });
    return arrayLikeCT.wrap({ length: 1, 0: "hello" });
  })()
);

assert.throws(() => {
  const arrayLikeCT = CT.CTObject({
    length: CT.isNumber,
    prop: { contract: CT.isString, index: "string" },
  });
  const x = arrayLikeCT.wrap({ length: "hi", 0: 5 });
  return x.length;
});

assert.throws(() => {
  const arrayLikeCT = CT.CTObject({
    length: CT.isNumber,
    prop: { contract: CT.isString, index: "string" },
  });
  const x = arrayLikeCT.wrap({ length: "hi", 0: 5 });
  return x.length;
});

assert.throws(() => {
  const arrayLikeCT = CT.CTObject({
    length: CT.isNumber,
    prop: { contract: CT.isString, index: "string" },
  });
  const x = arrayLikeCT.wrap({ length: 20, 0: 5 });
  return x[0];
});

assert.ok(CT.arrayBufferCT.wrap(new ArrayBuffer(5)));

assert.throws(() => {
  CT.arrayBufferCT.wrap(5);
});

assert.ok(
  (() => {
    const myWeirdArray = [];
    const mySymbol = Symbol("a-symbol");
    myWeirdArray[mySymbol] = 5;
    const arrayContract = CT.CTArray(CT.anyCT).wrap(myWeirdArray);
    arrayContract[mySymbol];
    return true;
  })()
);

assert.ok(
  (() => {
    CT.nullCT.wrap(null);
    return true;
  })()
);

assert.throws(() => {
  CT.nullCT.wrap(3);
});

assert.ok(
  (() => {
    CT.bufferCT.wrap(Buffer.alloc(3));
    return true;
  })()
);

assert.throws(() => {
  CT.bufferCT.wrap(null);
});

/*---------------------------------------------------------------------*/
/*    Promise                                                          */
/*---------------------------------------------------------------------*/
const cthdl = CT.CTFunction(true, [CT.isNumber], CT.isString);

function makePromise(x) {
  return new Promise((res, rej) => (x ? res(10) : rej("foo")));
}

const ctpromt = CT.CTPromise(cthdl).wrap(makePromise(true));
const ctpromf = CT.CTPromise(cthdl).wrap(makePromise(false));

assert.ok(
  (() => {
    ctpromt
      .then((x) => "x=" + x)
      .then(
        (x) => x,
        (e) => console.log(e)
      );
    return true;
  })()
);

assert.ok(
  (async () => {
    const x = await ctpromt;
    return x;
  })()
);

assert.ok(
  (async () => {
    try {
      const x = await ctpromf;
      throw "Exception not raised";
      return x;
    } catch (e) {
      return true;
    }
  })()
);

ctpromt
  .then((x) => x + 1)
  .then(
    (x) => {
      throw "Exception not raised";
    },
    (e) => true
  );

/*
 * Primitive Constructors
 */
assert.ok(
  (() => {
    const badStr = new String("never do this");
    const newStr = CT.StringCT.wrap(badStr);
    return newStr;
  })()
);

assert.throws(() => {
  CT.StringCT.wrap("This is probably an error.");
});

assert.ok(
  (() => {
    return CT.NumberCT.wrap(new Number(5));
  })()
);

assert.throws(() => {
  return CT.NumberCT.wrap(5);
});

assert.ok(
  (() => {
    return CT.BooleanCT.wrap(new Boolean(false));
  })()
);

assert.throws(() => {
  return CT.BooleanCT.wrap(true);
});

assert.ok(
  (() => {
    const x = Symbol("hi");
    return CT.SymbolCT.wrap(x);
  })()
);

assert.throws(() => {
  return CT.SymbolCT.wrap(false);
});

assert.ok(
  (() => {
    return CT.ObjectCT.wrap(new Object("hello"));
  })()
);

assert.throws(() => {
  return CT.ObjectCT.wrap(5);
});

assert.ok(
  (() => {
    return CT.BigIntCT.wrap(BigInt(5));
  })()
);

assert.throws(() => {
  return CT.BigIntCT.wrap(5);
});

assert.ok(
  (() => {
    return CT.RegExpCT.wrap(RegExp("hi"));
  })()
);

assert.throws(() => {
  return CT.RegExpCT.wrap("hi");
});

/*---------------------------------------------------------------------*/
/*    Error messages                                                   */
/*---------------------------------------------------------------------*/
assert.ok(
  (() => {
    let message = null;
    try {
      const stringLike = {
        toString() {
          return "This is actually an object!";
        },
      };
      CT.stringCT.wrap(stringLike);
    } catch (err) {
      message = err.message;
    }
    return (
      message.includes("keys: {toString}") &&
      message.includes(`value type: object`)
    );
  })()
);

assert.ok(
  (() => {
    let message = null;
    try {
      const stringLike = {
        anotherKey: 5,
      };
      CT.numberCT.wrap(stringLike);
    } catch (err) {
      message = err.message;
    }
    return (
      message.includes("keys: {anotherKey}") &&
      message.includes(`value type: object`)
    );
  })()
);

assert.ok(
  (() => {
    let message = null;
    try {
      CT.numberCT.wrap(null);
    } catch (err) {
      message = err.message;
    }
    return message.includes(`value type: object`) && message.includes(`null`);
  })()
);
{
  let res = CT.__toString(null);
  assert.ok(res === "null");
}
{
  let res = CT.__toString(undefined);
  assert.ok(res === "undefined");
}
{
  let res = CT.__toString(true);
  assert.ok(res === "true");
}
console.log("All tests currently passing!");

