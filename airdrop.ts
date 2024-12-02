import {lockingBytecodeToCashAddress, hexToBin} from "@bitauth/libauth"
import { Wallet, TokenSendRequest } from "mainnet-js";
import { queryNftAddresses, getTapSwapOrigin } from "./queryChainGraph.js"
import 'dotenv/config';

// Config parameter
const airdropToTapswap = true;

const seedphase = process.env.SEEDPHRASE;
const derivationPathAddress = process.env.DERIVATIONPATH;
const tokenIdFungible = process.env.TOKENID_FUNGIBLE;
const tokenIdNfts = process.env.TOKENID_NFTS;
const airdropAmountNft = process.env.AIRDOP_AMOUNT_NFT;

if(!seedphase || !tokenIdFungible || !tokenIdNfts || !airdropAmountNft) throw new Error("missing .env variables")

// Initialize wallet & check balance
const wallet = await Wallet.fromSeed(seedphase, derivationPathAddress);
const walletAddress = wallet.getDepositAddress();
const balance = await wallet.getBalance();
const tokenBalance = await wallet.getTokenBalance(tokenIdFungible);
console.log(`wallet address: ${walletAddress}`);
if(typeof balance == "number" || !balance.sat) throw new Error("Error in wallet.getBalance()")
console.log(`Bch amount in walletAddress is ${balance.bch}bch or ${balance.sat}sats`);
if(balance.sat < 10_000) throw new Error("Wallet does not have enough BCH to start the airdrop!");

// Get airdrop list
const finalList = await getListRecipients();

// Get airdrop stats
const totalNfts = finalList.reduce((accumulator, currentValue) => accumulator + currentValue[1],0,);
const totalAirdrop = totalNfts * parseInt(airdropAmountNft);
console.log("totalNfts ", totalNfts);
console.log("totalAirdrop ", totalAirdrop);
if(tokenBalance < totalAirdrop) throw new Error("Wallet does not have enough tokens to execute the airdrop!");

// Start airdrop
await airdropTokens(finalList);

type recipient = [address: string, airdropAmount: number]

// sends a separate transaction per address
async function airdropTokens(listRecipients: recipient[]){
  for(let i = 0; i<listRecipients.length; i++){
    console.log(`payout ${i+1} of the ${listRecipients.length}`);
    const element = listRecipients[i];
    const destinationAddress = element[0];
    const airdropAmountAddress = element[1] * parseInt(airdropAmountNft as string);
  
    const airdropOutput = new TokenSendRequest({
      cashaddr: destinationAddress,
      value: 1000,
      tokenId: tokenIdFungible as string,
      amount: airdropAmountAddress
    });
    const { txId } = await wallet.send([airdropOutput]);
    console.log(txId);
  }
}

async function getListRecipients() {
    // note: chaingraph only returns first 5000 results
    const resultNftAddresses = await queryNftAddresses(tokenIdNfts as string,0);
    const nftAddresses = resultNftAddresses.output;

    const nftsPerAddress: Record<string, number> = {};
    for(const element of nftAddresses) {
      let address = getAddressFromLockingBytecode(element.locking_bytecode)
      // Logic for P2SH addresses (Tapswap contracts)
      if(address.startsWith("bitcoincash:p")){
        if(!airdropToTapswap) continue;
        console.log("\n"+address);
        console.log(element.transaction_hash);
        const lockingBytecode2 = await getTapSwapOrigin(element.transaction_hash.slice(2));
        address = getAddressFromLockingBytecode(lockingBytecode2)
        console.log(address)
      }
       nftsPerAddress[address] = (nftsPerAddress[address] || 0) + 1;
    };
    let listRecipients: recipient[] = [];
    for (const address in nftsPerAddress) {
      listRecipients.push([address, nftsPerAddress[address]]);
    }
    // sort list recipient
    listRecipients.sort((a, b) =>  b[1] - a[1]);
    console.log(listRecipients);
    return listRecipients
}

function getAddressFromLockingBytecode(lockingBytecode: string){
  const prefix = "bitcoincash"
  // remove chaingraph prefix for bytearray if needed
  if(lockingBytecode.startsWith("\\x")) lockingBytecode = lockingBytecode.slice(2)
  const bytecode = hexToBin(lockingBytecode)
  const addressResult = lockingBytecodeToCashAddress({ bytecode, prefix });
  if(typeof addressResult == "string") throw new Error("Error in lockingBytecodeToCashAddress")
  return addressResult.address
}
