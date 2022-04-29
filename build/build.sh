#!/bin/sh
tsc
mkdir -p ~/.scotty
cp -r ./__contracts__ ~/.scotty/contracts
printf "%s\n" "998fe1077af548a7c97fcee5f2057bdb04d3855c" > ~/.scotty/commit
cd ~/.scotty
if [ ! -d ~/.scotty/DefinitelyTyped ]; then
  git clone https://github.com/DefinitelyTyped/DefinitelyTyped
fi
