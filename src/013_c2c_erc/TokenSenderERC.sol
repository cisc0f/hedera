// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './oz-contracts/contracts/token/ERC20/IERC20.sol';
import './oz-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol';

contract TokenSenderERC{

    function transferFrom(address token, address sender, address recipient, uint256 amount) public {
        IERC20(token).transferFrom(sender, recipient, amount);
    }

    function delegateTransfer(address token, address receiver, uint256 amount) public {
        (bool success, bytes memory result) = address(IERC20(token)).delegatecall(abi.encodeWithSignature("transferFrom(address,address,uint256)", address(this), receiver, amount));
    }

    function approve(address token, address spender, uint256 amount) public {
        IERC20(token).approve(spender, amount);
    }

    fallback () external{}
}