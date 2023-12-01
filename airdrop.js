import {lockingBytecodeToCashAddress, hexToBin} from "@bitauth/libauth"
import { Wallet, TokenSendRequest } from "mainnet-js";
import { queryNftAddresses, getTapSwapOrigin } from "./queryChainGraph.js"
import 'dotenv/config';

const seedphase = process.env.SEEDPHRASE;
const derivationPathAddress = process.env.DERIVATIONPATH;
const tokenIdFungible = process.env.TOKENID_FUNGIBLE;
const tokenIdNfts = process.env.TOKENID_NFTS;
const airdropAmountNft = process.env.AIRDOP_AMOUNT_NFT;

const airdropToTapswap = true;

// Initialize wallet & check balance
const wallet = await Wallet.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
const tokenBalance = await wallet.getTokenBalance(tokenIdFungible);
console.log(`wallet address: ${walletAddress}`);
console.log(`Bch amount in walletAddress is ${balance.bch}bch or ${balance.sat}sats`);
if(balance.sat < 10_000) throw new Error("Wallet does not have enough BCH to start the airdrop!");

// Get airdrop list
const finalList = await getListRecipients();

// Get airdrop stats
const totalNfts = finalList.reduce((accumulator, currentValue) => accumulator + currentValue[1],0,);
const totalAirdrop = totalNfts * airdropAmountNft;
console.log("totalNfts ", totalNfts);
console.log("totalAirdrop ", totalAirdrop);
if(tokenBalance < totalAirdrop) throw new Error("Wallet does not have enough tokens to execute the airdrop!");

// Start airdrop
await airdropTokens(finalList);

async function airdropTokens(listRecipients){
  for(let i = 0; i<listRecipients.length; i++){
    console.log(`payout ${i+1} of the ${listRecipients.length}`);
    const element = listRecipients[i];
    const destinationAddress = element[0];
    const airdropAmountAddress = element[1] * airdropAmountNft;
  
    const airdropOutput = new TokenSendRequest({
      cashaddr: destinationAddress,
      value: 1000,
      tokenId: tokenIdFungible,
      amount: airdropAmountAddress
    });
    const { txId } = await wallet.send([airdropOutput]);
    console.log(txId);
  }
}

async function getListRecipients() {
    // note: chaingraph only returns first 5000 results
    const resultNftAddresses = await queryNftAddresses(tokenIdNfts,0);
    const nftAddresses = resultNftAddresses.data.output;

    const nftsPerAddress = {};
    for(const element of nftAddresses) {
      const lockingBytecode = element.locking_bytecode;
        let address = lockingBytecodeToCashAddress(hexToBin(lockingBytecode.slice(2)), "bitcoincash");
        // Logic for P2SH addresses (Tapswap contracts)
        if(address.startsWith("bitcoincash:p")){
          if(!airdropToTapswap) continue;
          console.log("\n"+address);
          console.log(element.transaction_hash);
          const lockingBytecode2 = await getTapSwapOrigin(element.transaction_hash.slice(2));
          address = lockingBytecodeToCashAddress(hexToBin(lockingBytecode2.slice(2)), "bitcoincash");
          console.log(address)
        }
        nftsPerAddress[address] = (nftsPerAddress[address] || 0) + 1;
    };
    let sortable = [];
    for (const address in nftsPerAddress) {
        sortable.push([address, nftsPerAddress[address]]);
    }
    // sort list recipient
    sortable.sort((a, b) =>  b[1] - a[1]);
    console.log(sortable);
    return sortable
}
