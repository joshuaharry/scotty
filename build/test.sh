#!/bin/sh
jest
node ./__contracts__/contract-base.test.js
node ./__contracts__/contract-identity-mode.test.js
node ./__contracts__/contract-proxy-mode.test.js
