// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title PixelMap
 * @dev Each token ID represents a unique tile on a 100x100 grid.
 * The contract owner (backend server) has the exclusive right to mint/claim tiles for players.
 */
contract PixelMap is ERC721, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    uint256 public constant MAP_DIMENSION = 100;
    uint256 public constant MAX_TILES = MAP_DIMENSION * MAP_DIMENSION;

    // Mapping to check if a specific tile coordinate has been claimed
    mapping(uint256 => bool) private _tileClaimed;

    constructor() ERC721("Pixel War Tile", "PXL") Ownable(msg.sender) {}

    /**
     * @dev Calculates the tile ID from x and y coordinates.
     * @param x The horizontal coordinate (0-99).
     * @param y The vertical coordinate (0-99).
     */
    function getTileId(uint256 x, uint256 y) public pure returns (uint256) {
        require(x < MAP_DIMENSION && y < MAP_DIMENSION, "Coordinates out of bounds");
        return (y * MAP_DIMENSION) + x;
    }

    /**
     * @dev Mints a new tile to a player. For the MVP, this can only be
     * called by the backend server (the contract's owner).
     * @param to The address of the player claiming the tile.
     * @param x The horizontal coordinate of the tile.
     * @param y The vertical coordinate of the tile.
     */
    function claimTile(address to, uint256 x, uint256 y) public onlyOwner {
        uint256 tileId = getTileId(x, y);

        require(!_tileClaimed[tileId], "Tile has already been claimed");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _tileClaimed[tileId] = true;
        _safeMint(to, newTokenId);
        // Note: For this MVP, the tokenId from the counter is NOT the same as the tileId.
        // A more advanced version would link these directly. This is simpler and secure for now.
    }

    /**
     * @dev Returns the total number of tiles that have been claimed.
     */
    function totalTilesClaimed() public view returns (uint256) {
        return _tokenIds.current();
    }
}
