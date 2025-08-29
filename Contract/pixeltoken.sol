// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PixelToken
 * @dev The official ERC20 token for the Pixel Wars game ($PIXEL).
 * The contract owner (the backend/dev team) has the ability to mint new tokens.
 */
contract PixelToken is ERC20, Ownable {
    constructor() ERC20("Pixel Token", "PIXEL") Ownable(msg.sender) {
        // Mint an initial supply of 1 billion tokens to the contract deployer (owner)
        // This supply will be used for the ecosystem, rewards, treasury, etc.
        _mint(msg.sender, 1000000000 * (10 ** decimals()));
    }

    /**
     * @dev Creates new tokens and assigns them to an account.
     * Can only be called by the owner.
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
