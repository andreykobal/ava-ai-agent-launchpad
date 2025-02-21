// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Script.sol";
import "../src/AIAgentFactory.sol";

contract DeployAndTestAIAgent is Script {
    function run() external {
        // Start broadcasting transactions.
        vm.startBroadcast();

        // Deploy the AIAgentFactory.
        AIAgentFactory factory = new AIAgentFactory();
        console.log("AIAgentFactory deployed at:", address(factory));

        // Create an AI agent.
        // Provide the parameters: name, age, race, profession, bio, firstMessage, image.
        address tokenAddr = factory.createAIAgent(
            "AI Bot",               // name
            25,                     // age
            "Cyborg",               // race
            "Software Engineer",    // profession
            "An AI that writes code",  // bio
            "Hello, world!",        // firstMessage
            "https://example.com/image.png"  // image
        );
        console.log("AI Agent Token deployed at:", tokenAddr);

        // Retrieve all AI agents.
        AIAgentFactory.AIAgent[] memory agents = factory.getAllAIAgents();
        console.log("Total agents created:", agents.length);

        // Loop over each agent and log its details.
        for (uint i = 0; i < agents.length; i++) {
            console.log("Agent", i);
            console.log("Name:", agents[i].name);
            console.log("Age:", agents[i].age);
            console.log("Race:", agents[i].race);
            console.log("Profession:", agents[i].profession);
            console.log("Bio:", agents[i].bio);
            console.log("First Message:", agents[i].firstMessage);
            console.log("Image:", agents[i].image);
            console.log("Token Address:", agents[i].tokenAddress);
        }

        vm.stopBroadcast();
    }
}
