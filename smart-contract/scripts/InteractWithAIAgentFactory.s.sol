// @/smart-contract/scripts/InteractWithAIAgentFactory.s.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Script.sol";
import "../src/AIAgentFactory.sol";

contract InteractWithAIAgentFactory is Script {
    // Replace with your already deployed factory contract address.
    address constant FACTORY_ADDRESS = 0xbC6a338DcF849d389de5e9e38c14673310DD5B75;

    function run() external {
        vm.startBroadcast();

        // Use the deployed factory instance.
        AIAgentFactory factory = AIAgentFactory(FACTORY_ADDRESS);
        console.log("Interacting with AIAgentFactory at:", FACTORY_ADDRESS);

        // // Create an AI agent with the provided parameters.
        address tokenAddr = factory.createAIAgent(
            "AI Bot",                    // name
            25,                          // age
            "Cyborg",                    // race
            "Software Engineer",         // profession
            "An AI that writes code",    // bio
            "Hello, world!",             // firstMessage
            "https://myethernity.mypinata.cloud/ipfs/bafkreibp5zztxbpfvkhfd4r7ntf57sgr3ieqx7fj3oigz2n3em4u75xv5q?pinataGatewayToken=_F-lMKYPVKRdRfyrP7Lyv_mUDjQGEm-bFc_BLdb3VtFdifoZp7Mruw5je8WgLMoR"  // image
        );
        // console.log("AI Agent Token deployed at:", tokenAddr);

        // Retrieve and log all AI agents.
        AIAgentFactory.AIAgent[] memory agents = factory.getAllAIAgents();
        console.log("Total agents created:", agents.length);
        for (uint i = 0; i < agents.length; i++) {
            console.log("====================================");
            console.log("Agent", i);
            console.log("Name:", agents[i].name);
            console.log("Age:", agents[i].age);
            console.log("Race:", agents[i].race);
            console.log("Profession:", agents[i].profession);
            console.log("Bio:", agents[i].bio);
            console.log("First Message:", agents[i].firstMessage);
            console.log("Image:", agents[i].image);
            console.log("Token Address:", agents[i].tokenAddress);
            console.log("====================================");
        }

        vm.stopBroadcast();
    }
}
