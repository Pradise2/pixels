// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PowerUps
 * @dev Manages all in-game items (NFTs) like shields and attack boosts using the ERC1155 standard.
 * The GameLogic contract will be given approval to mint/burn these items on behalf of players.
 */
contract PowerUps is ERC1155, Ownable {
    // A mapping from the item ID to its metadata URI (for images, descriptions, etc.)
    mapping(uint256 => string) private _uris;

    // Define constants for our item IDs for easy reference
    uint256 public constant SHIELD = 1;
    uint256 public constant ATTACK_BOOST = 2;
    uint256 public constant REPAIR_KIT = 3;

    /**
     * @dev The constructor sets the base URI for the token metadata.
     * For example, it could point to an API like "https://pixel-wars.vercel.app/api/items/{id}"
     */
    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    /**
     * @dev Sets the metadata URI for a specific item ID. Only the owner can do this.
     * This allows us to define what each item looks like.
     */
    function setURI(uint256 id, string memory newURI) public onlyOwner {
        _uris[id] = newURI;
    }

    /**
     * @dev Overrides the default URI function to return a specific URI per token ID.
     */
    function uri(uint256 id) public view override returns (string memory) {
        return _uris[id];
    }
    
    /**
     * @dev Mints new power-up items to a player's account.
     * In the final game, this should only be callable by the GameLogic contract or the owner.
     * @param to The player's address.
     * @param id The ID of the item to mint (e.g., SHIELD).
     * @param amount The number of items to mint.
     */
    function mint(address to, uint256 id, uint256 amount) public onlyOwner {
        _mint(to, id, amount, "");
    }

    /**
     * @dev Burns (consumes) a power-up item from a player's account.
     * This will be called by the GameLogic contract when a player uses an item.
     * @param from The player's address.
     * @param id The ID of the item to burn.
     * @param amount The number of items to burn.
     */
    function burn(address from, uint256 id, uint256 amount) public {
        // For the real game, we would add `onlyGameLogic` modifier here.
        // For now, we'll leave it open for testing.
        _burn(from, id, amount);
    }
}
