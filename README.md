# CW-E2E
Test automation scaffold for CosmWasm smart contracts

## Usage
To create a new test module, duplicate `__tests__/template.ts` and just start
adding code. The base template initializes three accounts from which
transactions can be sent. The main "admin" account uses the mnemonic of the seed
user included in the Juno localnet docker environment. The default setup
procedure then tries to ensure that each of the remaining two test accounts have
a minimum balance of 1 JUNOX at the start of each test suite.