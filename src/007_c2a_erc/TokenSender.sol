// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './HederaResponseCodes.sol';
import './IHederaTokenService.sol';
import './HederaTokenService.sol';
import './ExpiryHelper.sol';

import './oz-contracts/contracts/token/ERC20/IERC20.sol';
import './oz-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol';

contract TokenSender is ExpiryHelper {

    // create a fungible Token with no custom fees,
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
        token.expiry = createAutoRenewExpiry(address(this), autoRenewPeriod);

        // call HTS precompiled contract, passing initial supply and decimals
        (int responseCode, address tokenAddress) =
                    HederaTokenService.createFungibleToken(token, initialSupply, decimals);

        if (responseCode != HederaResponseCodes.SUCCESS) {
            revert ();
        }

        createdTokenAddress = tokenAddress;
    }

    // Transfer token from this contract to the recipient
    function transfer(address token, address recipient, uint256 amount) public {
        IERC20(token).transfer(recipient, amount);
    }

    fallback () external{}

}