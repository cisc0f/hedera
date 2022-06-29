// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './HederaResponseCodes.sol';
import './HederaTokenService.sol';

contract TokenReceiver is HederaTokenService{
    
    function tokenAssociate(address tokenId) external {
        int response = HederaTokenService.associateToken(address(this), tokenId);

        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Associate Failed");
        }
    }

    function tokenTransfer(address tokenId, address sender, int64 amount) external {
        int response = HederaTokenService.transferToken(tokenId, sender, address(this), amount);
    
        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Transfer Failed");
        }
    }

}