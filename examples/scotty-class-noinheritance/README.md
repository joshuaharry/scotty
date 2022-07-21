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
  

### How to use the files:

```
mkdir ~/.scotty/DefinitelyTyped/types/scotty-class-noinheritance
cp index.d.ts ~/.scotty/DefinitelyTyped/types/scotty-class-noinheritance
scotty full-mode
npm test
```


