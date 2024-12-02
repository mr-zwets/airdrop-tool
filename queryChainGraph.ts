import { ChaingraphClient, graphql } from "chaingraph-ts";

const chaingraphUrl = "https://gql.chaingraph.pat.mn/v1/graphql";
const chaingraph = new ChaingraphClient(chaingraphUrl);

export async function getTapSwapOrigin(txidParent:string) {
  const queryParentTxId = graphql(`query parentTxId(
    $txidParent: bytea
  ){
    transaction(
        where: {
          hash: {
            _eq: $txidParent
          }
        }
      ) {
        inputs {
          outpoint_transaction_hash,
          outpoint_index
        }
      }
  }`);
  const result = await chaingraph.query(queryParentTxId, {txidParent: `\\x${txidParent}`});
  if (!result.data) throw new Error('Error in ChainGraph query parentTxId');
  const outpoint = result.data.transaction[0].inputs[0]
  const txid = outpoint.outpoint_transaction_hash.slice(2);
  const vout = outpoint.outpoint_index
  const getLockingBytecode = graphql(`query lockingBytecode(
    $txid: bytea
  ) {
    transaction(
        where: {
          hash: {
            _eq: $txid
          }
        }
      ) {
        outputs {
          locking_bytecode
        }
      }
  }`);
  const result2 = await chaingraph.query(getLockingBytecode, {txid: `\\x${txid}`});
  if (!result2.data) throw new Error('Error in ChainGraph query lockingBytecode');
  return result2.data.transaction[0].outputs[+vout].locking_bytecode;
}

export async function queryNftAddresses(tokenId:string, offset = 0) {
  const queryNftsOnAddress = graphql(`query nftsOnAddress(
    $offset: Int!
    $tokenId: String
  ) {
    output(
      offset: $offset
      where: {
        token_category: {
          _eq: $tokenId
        }
        _and: [
          { nonfungible_token_capability: { _eq: "none" } }
        ]
        _not: { spent_by: {} }
      }
    ) {
      locking_bytecode,
      transaction_hash
    }
  }`);
  const queryResult = await chaingraph.query(queryNftsOnAddress, {tokenId: `\\x${tokenId}`, offset})
  if (!queryResult.data) throw new Error('Error in ChainGraph query nftsOnAddress');
  return queryResult.data;
}