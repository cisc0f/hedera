// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './HederaResponseCodes.sol';
import './IHederaTokenService.sol';
import './HederaTokenService.sol';
import './ExpiryHelper.sol';

contract TokenCreator is ExpiryHelper{

    function createNonFungible(
            string memory name, 
            string memory symbol, 
            string memory memo, 
            uint32 maxSupply,
            uint32 autoRenewPeriod
        ) external payable returns (address){

        // Instantiate the list of keys we'll use for token create
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
        // use the helper methods in KeyHelper to create basic key
        keys[0] = createSingleKey(HederaTokenService.SUPPLY_KEY_TYPE, KeyHelper.CONTRACT_ID_KEY, address(this));

        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.memo = memo;
        token.treasury = address(this);
        token.tokenSupplyType = true; // set supply to FINITE
        token.tokenKeys = keys;
        token.maxSupply = maxSupply;
        token.freezeDefault = false;
        token.expiry = createAutoRenewExpiry(address(this), autoRenewPeriod); // Contract automatically renew by himself

        (int responseCode, address createdToken) = HederaTokenService.createNonFungibleToken(token);

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to create non-fungible token");
        }
        return createdToken;
    }

}