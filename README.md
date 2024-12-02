# CashTokens Airdrop Tool

**A handy Javascript program to airdrop fungible tokens to NFT holders!**

## What it is

A program to import a single-address wallet to airdrop fungible tokens to NFT holders.
The tool uses mainnet-js and chaingraph to do the airdrop.

## Disclaimer

Be careful with any program asking you to fill in your seedphrase!
Verify the source of the program and that is doing what it claims to be doing!

## Installation

```
git clone git@github.com:mr-zwets/airdrop-tool.git
npm install
```

## How to use it

Configure the wallet holding the tokens and the airdrop parameters in a `.env` file in the following way:

```bash
SEEDPHRASE = ""
DERIVATIONPATH = "m/44'/145'/0'/0/0"
TOKENID_FUNGIBLE = "8473d94f604de351cdee3030f6c354d36b257861ad8e95bbc0a06fbab2a2f9cf"
TOKENID_NFTS = "07275f68d14780c737279898e730cec3a7b189a761caf43b4197b60a7c891a97"
AIRDOP_AMOUNT_NFT = "1000000"
```

There is a boolean in the `airdrop.ts` program to enable/disable airdrop to Tapswap addresses.

Finally, run the airdrop tool with

```
npm run airdrop
```