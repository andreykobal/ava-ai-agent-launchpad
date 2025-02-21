// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Script.sol";
import "../src/MyERC20.sol";

contract DeployERC20 is Script {
    function run() external {
        // This command will print out the private key used for deployment.
        // Make sure you have your PRIVATE_KEY and RPC_URL set up correctly.
        vm.startBroadcast();

        // Deploy the MyERC20 contract.
        MyERC20 token = new MyERC20();

        vm.stopBroadcast();

        // Optionally, you can log the deployed contract address.
        console.log("MyERC20 deployed at:", address(token));
    }
}
