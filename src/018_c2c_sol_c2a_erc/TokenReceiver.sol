// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract TokenReceiver is HederaTokenService {

    function tokenAssociate(address tokenId) external {
        int response = HederaTokenService.associateToken(address(this), tokenId);

        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Associate Failed");
        }
    }

}