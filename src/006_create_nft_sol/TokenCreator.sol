// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './HederaResponseCodes.sol';
import './IHederaTokenService.sol';
import './HederaTokenService.sol';
import './ExpiryHelper.sol';

contract TokenCreator is ExpiryHelper{

    using Bits for uint;

    function createNonFungible(
            string memory name, 
            string memory symbol, 
            string memory memo, 
            uint32 maxSupply,  
            address treasuryAccount,
            bytes memory adminKey,
            bytes memory supplyKey,
            address autoRenewAccount,
            uint32 autoRenewPeriod
        ) external payable returns (address){

        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.memo = memo;
        token.treasury = address(this);
        token.tokenSupplyType = true; // set supply to FINITE
        token.maxSupply = maxSupply;
        token.tokenKeys = createTokenKeys(adminKey, supplyKey);
        token.treasury = treasuryAccount;
        token.freezeDefault = false;
        token.expiry = getAutoRenewExpiry(autoRenewAccount, autoRenewPeriod); // Contract automatically renew by himself

        (int responseCode, address createdToken) = HederaTokenService.createNonFungibleToken(token);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to create non-fungible token");
        }
        return createdToken;
    }

    function createTokenKeys(
        bytes memory adminKey,
        bytes memory supplyKey
    ) private pure returns (IHederaTokenService.TokenKey[] memory){
        // instantiate the list of keys we'll use for token create
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](2);

        // create TokenKey of type adminKey with value an address passed as function arg
        uint adminKeyType;
        IHederaTokenService.KeyValue memory adminKeyValue;
        // turn on bits corresponding to admin key type
        adminKeyType = adminKeyType.setBit(0);
        // set the value of the key to the adminKey passed as function arg
        adminKeyValue.ed25519 = adminKey;
        keys[0] = IHederaTokenService.TokenKey (adminKeyType, adminKeyValue);

        // create TokenKey of types supplyKey and pauseKey with value an address passed as function arg
        uint supplyPauseKeyType;
        IHederaTokenService.KeyValue memory supplyPauseKeyValue;
        // turn on bits corresponding to supply and pause key types
        supplyPauseKeyType = supplyPauseKeyType.setBit(4);
        supplyPauseKeyType = supplyPauseKeyType.setBit(6);
        // set the value of the key to the supplyKey passed as function arg
        supplyPauseKeyValue.ed25519 = supplyKey;
        keys[1] = IHederaTokenService.TokenKey (supplyPauseKeyType, supplyPauseKeyValue);

        return keys;
    }

}

library Bits {

    uint constant internal ONE = uint(1);

    // Sets the bit at the given 'index' in 'self' to '1'.
    // Returns the modified value.
    function setBit(uint self, uint8 index) internal pure returns (uint) {
        return self | ONE << index;
    }
}