// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './HederaResponseCodes.sol';
import './IHederaTokenService.sol';
import './HederaTokenService.sol';
import './ExpiryHelper.sol';

contract TokenSender is ExpiryHelper{

    // Create fungible token, this contract as treasury
    function createFungible(
        string memory name,
        string memory symbol,
        uint initialSupply,
        uint decimals,
        uint32 autoRenewPeriod
    ) external payable returns (address createdTokenAddress) {

        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.treasury = address(this);

        // create the expiry schedule for the token using ExpiryHelper
        token.expiry = getAutoRenewExpiry(address(this), autoRenewPeriod);

        // call HTS precompiled contract, passing initial supply and decimals
        (int responseCode, address tokenAddress) =
                    HederaTokenService.createFungibleToken(token, initialSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        createdTokenAddress = tokenAddress;
    }
    
    function tokenAssociate(address tokenId, address accountId) external {
        int response = HederaTokenService.associateToken(accountId, tokenId);

        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Associate Failed");
        }
    }

    function tokenTransfer(address tokenId, address receiver, int64 amount) external {
        int response = HederaTokenService.transferToken(tokenId, address(this), receiver, amount);
    
        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Transfer Failed");
        }
    }

}