// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.6.0 <0.9.0;

contract SimpleContract{

    event SetMessage(address from, string message);

    string message;

    constructor(string memory _message) {
        emit SetMessage(msg.sender, _message);
        message = _message;
    }

    function set_message(string memory _message) public{
        emit SetMessage(msg.sender, _message);
        message = _message;
    }

    function get_message() public view returns (string memory output){
        output = message;
    }
}