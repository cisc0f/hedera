// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract TokenSender is HederaTokenService {

    function tokenAssociate(address tokenId, address contractId) external {
        int response = HederaTokenService.associateToken(contractId, tokenId);

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