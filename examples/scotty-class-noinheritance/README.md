An minimal example of class
===========================

This directory contains a dummy package that enables us to experiment with
JavaScript classes and contracts. It contains the definitionn of a class
and a minimalist test suite.


### The files

  - `index.js`: the implementation
  - `index.d.ts`: the type declaration file
  - `test.js`: the test suite
  - `package.json`: the package description
  

### How to use the files

```
mkdir ~/.scotty/DefinitelyTyped/types/scotty-class-noinheritance
cp index.d.ts ~/.scotty/DefinitelyTyped/types/scotty-class-noinheritance
scotty full-mode
npm test
```

### Modifying the package implementation

Running `scotty full-mode` overrides `index.js` with the intrumented
file. The orginal file is renamed `__ORIGINAL_UNTYPED_MODULE__.js`.
If a modification to the module implementation is needed, then,
the orginal content of `index.js` has to be restored first with:

```
mv __ORIGINAL_UNTYPED_MODULE__.js index.js
```

or

```
git checkout index.js
```

