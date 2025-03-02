// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "openzeppelin-contracts/utils/Counters.sol";
import "openzeppelin-contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "openzeppelin-contracts/access/Ownable.sol";

contract NFTMarketplace is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // uint256 public constant MAX_SUPPLY = 150;

    // Mapping to store reserved token URIs to prevent duplication
    // mapping(string => bool) private _reservedURIs;

    // Variable to store the contract URI
    string private _contractURI;

    // List of additional owners
    address[] private _additionalOwners;

    // Mapping to check if an address is an owner
    mapping(address => bool) private _isOwner;

    constructor() ERC721("AvaGenesisAINFT", "AVA") {
        // Set the contract URI during contract deployment
        _contractURI = "https://gateway.pinata.cloud/ipfs/QmZKmLJ3btdZFmsGgh33Q21JXYwMACyHYscUfLthDuaNJF";
        // Add the deployer as the initial owner
        _isOwner[msg.sender] = true;
        _additionalOwners.push(msg.sender);
    }

    modifier onlyOwners() {
        require(_isOwner[msg.sender], "Caller is not an owner");
        _;
    }

    function addOwner(address newOwner) public onlyOwner {
        require(!_isOwner[newOwner], "Address is already an owner");
        _isOwner[newOwner] = true;
        _additionalOwners.push(newOwner);
    }

    function removeOwner(address owner) public onlyOwner {
        require(_isOwner[owner], "Address is not an owner");
        require(owner != msg.sender, "Owner cannot remove themselves");
        _isOwner[owner] = false;

        // Remove owner from the _additionalOwners array
        for (uint i = 0; i < _additionalOwners.length; i++) {
            if (_additionalOwners[i] == owner) {
                _additionalOwners[i] = _additionalOwners[_additionalOwners.length - 1];
                _additionalOwners.pop();
                break;
            }
        }
    }

    function getOwners() public view returns (address[] memory) {
        return _additionalOwners;
    }

    function getCurrentToken() public view returns (uint256) {
        return _tokenIds.current();
    }

    function createToken(string memory tokenURI) public returns (uint) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        return newTokenId;
    }

    function getOwnedNFTsByWallet(address wallet) public view returns (uint256[] memory, string[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint itemCount = 0;
        uint currentIndex = 0;

        // First pass to count the owned tokens
        for (uint i = 1; i <= totalItemCount; i++) {
            if (_exists(i) && ownerOf(i) == wallet) {
                itemCount += 1;
            }
        }

        uint256[] memory ownedTokenIds = new uint256[](itemCount);
        string[] memory ownedTokenURIs = new string[](itemCount);

        // Second pass to populate the arrays
        for (uint i = 1; i <= totalItemCount; i++) {
            if (_exists(i) && ownerOf(i) == wallet) {
                ownedTokenIds[currentIndex] = i;
                ownedTokenURIs[currentIndex] = tokenURI(i);
                currentIndex += 1;
            }
        }

        return (ownedTokenIds, ownedTokenURIs);
    }

    // Function to get all NFTs
    function getAllNFTs() public view returns (uint256[] memory, string[] memory) {
        uint totalItemCount = _tokenIds.current();
        uint256[] memory allTokenIds = new uint256[](totalItemCount);
        string[] memory allTokenURIs = new string[](totalItemCount);

        for (uint i = 1; i <= totalItemCount; i++) {
            if (_exists(i)) {
                allTokenIds[i - 1] = i;
                allTokenURIs[i - 1] = tokenURI(i);
            }
        }

        return (allTokenIds, allTokenURIs);
    }

    // Function to get the contract URI
    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    // Function to burn a token by its ID
    function burnToken(uint256 tokenId) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is not owner nor approved");
        _burn(tokenId);
    }

    // Function to get tokenURL by id
    function tokenURL(uint256 tokenId) public view returns (string memory) {
        return tokenURI(tokenId);
    }

    // Function to transfer an NFT by its ID to a wallet address
    function transferNFT(uint256 tokenId, address to) public {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "Caller is not owner nor approved");
        _transfer(ownerOf(tokenId), to, tokenId);
    }

    // Function to withdraw funds (only the owner can call this)
    function withdraw() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
