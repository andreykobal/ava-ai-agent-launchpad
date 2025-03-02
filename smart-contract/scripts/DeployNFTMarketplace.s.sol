// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/NFTMarketplace.sol";

contract DeployNFTMarketplace is Script {
    function run() external {
        vm.startBroadcast();
        NFTMarketplace marketplace = new NFTMarketplace();
        vm.stopBroadcast();
    }
}
