#!/bin/sh
jest
node ./__contract__/contract-base.test.js
node ./__contract__/contract-identity-mode.test.js
node ./__contract__/contract-proxy-mode.test.js
