export const EMPTY_ROYALTY = { to: [], percentage: [] };
const EMPTY_BYTES =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const getListingHash = (obj: any) => {
  let sig = EMPTY_BYTES;
  sig = _addAssets(obj.listingAssets, sig);
  for (let i = 0; i < obj.directSwaps.length; i++)
    sig = _addSwapAssets(obj.directSwaps[i], sig);
  for (let i = 0; i < obj.reserves.length; i++) {
    sig = _addAssets(obj.reserves[i].deposit, sig);
    sig = _addAssets(obj.reserves[i].remaining, sig);
    sig = solidityKeccak256(
      ["uint256", "bytes32"],
      [obj.reserves[i].duration, sig]
    );
  }
  sig = _addRoyalty(obj.royalty, sig);
  sig = solidityKeccak256(
    ["address", "uint256", "address", "uint256", "bytes32"],
    [obj.tradeIntendedFor, obj.timePeriod, obj.owner, obj.nonce, sig]
  );
  return sig;
};


const _addAssets = (assets: any, sig:any ) => {
  sig = _addNFTsArray(assets.tokens, assets.tokenIds, sig);

  sig = _addFTsArray(assets.paymentTokens, assets.amounts, sig);

  return sig;
};

const _addSwapAssets = (assets: any, sig: any) => {
  sig = _addSwapNFTsArray(assets.tokens, assets.roots, sig);
  sig = _addFTsArray(assets.paymentTokens, assets.amounts, sig);
  return sig;
};

const _addSwapNFTsArray = (tokens: any, roots: any, sig: any) => {
  for (let i = 0; i < tokens.length; i++) {
    sig = solidityKeccak256(
      ["address", "bytes32", "bytes32"],
      [tokens[i], roots[i], sig]
    );
  }
  return sig;
};

const _addNFTsArray = (tokens: any, tokenIds: any, sig: any) => {
  for (let i = 0; i < tokens.length; i++) {
    sig = solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [tokens[i], tokenIds[i], sig]
    );
  }
  return sig;
};

const _addFTsArray = (tokens: any, amounts: any, sig: any) => {
  for (let i = 0; i < tokens.length; i++) {
    sig = solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [tokens[i], amounts[i], sig]
    );
  }
  return sig;
};

const _addRoyalty = (royalty: any, sig: any) => {
  for (let i = 0; i < royalty.to.length; i++) {
    sig = solidityKeccak256(
      ["address", "uint256", "bytes32"],
      [royalty.to[i], royalty.percentage[i], sig]
    );
  }
  return sig;
};
//////////////

"use strict";

import { BigNumber } from "@ethersproject/bignumber";
import { arrayify, concat, hexlify, zeroPad } from "@ethersproject/bytes";
import { keccak256 as hashKeccak256 } from "@ethersproject/keccak256";
import { sha256 as hashSha256 } from "@ethersproject/sha2";
import { toUtf8Bytes } from "@ethersproject/strings";

const regexBytes = new RegExp("^bytes([0-9]+)$");
const regexNumber = new RegExp("^(u?int)([0-9]*)$");
const regexArray = new RegExp("^(.*)\\[([0-9]*)\\]$");

const Zeros = "0000000000000000000000000000000000000000000000000000000000000000";

import { Logger } from "@ethersproject/logger";
export const version = "solidity/5.7.0";
const logger = new Logger(version);


function _pack(type: string, value: any, isArray?: boolean): Uint8Array {
    switch(type) {
        case "address":
            if (isArray) { return zeroPad(value, 32); }
            return arrayify(value);
        case "string":
            return toUtf8Bytes(value);
        case "bytes":
            return arrayify(value);
        case "bool":
            value = (value ? "0x01": "0x00");
            if (isArray) { return zeroPad(value, 32); }
            return arrayify(value);
    }

    let match =  type.match(regexNumber);
    if (match) {
        //let signed = (match[1] === "int")
        let size = parseInt(match[2] || "256")

        if ((match[2] && String(size) !== match[2]) || (size % 8 !== 0) || size === 0 || size > 256) {
            logger.throwArgumentError("invalid number type", "type", type)
        }

        if (isArray) { size = 256; }

        value = BigNumber.from(value).toTwos(size);

        return zeroPad(value, size / 8);
    }

    match = type.match(regexBytes);
    if (match) {
        const size = parseInt(match[1]);

        if (String(size) !== match[1] || size === 0 || size > 32) {
            logger.throwArgumentError("invalid bytes type", "type", type)
        }
        if (arrayify(value).byteLength !== size) {
            logger.throwArgumentError(`invalid value for ${ type }`, "value", value)
        }
        if (isArray) { return arrayify((value + Zeros).substring(0, 66)); }
        return value;
    }

    match = type.match(regexArray);
    if (match && Array.isArray(value)) {
        const baseType = match[1];
        const count = parseInt(match[2] || String(value.length));
        if (count != value.length) {
            logger.throwArgumentError(`invalid array length for ${ type }`, "value", value)
        }
        const result: Array<Uint8Array> = [];
        value.forEach(function(value) {
            result.push(_pack(baseType, value, true));
        });
        return concat(result);
    }

    return logger.throwArgumentError("invalid type", "type", type)
}

// @TODO: Array Enum

export function pack(types: ReadonlyArray<string>, values: ReadonlyArray<any>) {
    if (types.length != values.length) {
        logger.throwArgumentError("wrong number of values; expected ${ types.length }", "values", values)
    }
    const tight: Array<Uint8Array> = [];
    types.forEach(function(type, index) {
        tight.push(_pack(type, values[index]));
    });
    return hexlify(concat(tight));
}

export function solidityKeccak256(types: ReadonlyArray<string>, values: ReadonlyArray<any>) {
    return hashKeccak256(pack(types, values));
}

export function sha256(types: ReadonlyArray<string>, values: ReadonlyArray<any>) {
    return hashSha256(pack(types, values));
}