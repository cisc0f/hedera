// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

import './oz-contracts/contracts/token/ERC20/IERC20.sol';
import './oz-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol';

contract TokenReceiverERC{

    function name(address token) public view returns(string memory) {
        return IERC20Metadata(token).name();
    }

    function symbol(address token) public view returns(string memory) {
        return IERC20Metadata(token).symbol();
    }

    function decimals(address token) public view returns(uint8) {
        return IERC20Metadata(token).decimals();
    }

    function totalSupply(address token) public view returns(uint256){
        return IERC20(token).totalSupply();
    }

    function balanceOf(address token, address account) public view returns(uint256){
        return IERC20(token).balanceOf(account);
    }

    function transfer(address token, address recipient, uint256 amount) public {
        IERC20(token).transfer(recipient, amount);
    }

    function transferFrom(address token, address sender, address recipient, uint256 amount) public {
        IERC20(token).transferFrom(sender, recipient, amount);
    }

    function delegateTransfer(address token, address sender, uint256 amount) public {
        (bool success, bytes memory result) = address(IERC20(token)).delegatecall(abi.encodeWithSignature("transferFrom(address,address,uint256)", sender, address(this), amount));
    }

    fallback () external{}
}