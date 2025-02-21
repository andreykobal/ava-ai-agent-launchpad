// @/smart-contract/src/AIAgentFactory.sol

// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "openzeppelin-contracts/token/ERC20/ERC20.sol";

/// @notice An ERC20 token deployed for an AI Agent.
/// It mints 1 billion tokens (adjusted by decimals) to the creator.
contract AIAgentToken is ERC20 {
    constructor(address creator, string memory tokenName, string memory tokenSymbol)
        ERC20(tokenName, tokenSymbol)
    {
        // Mint 1 billion tokens to the creator.
        _mint(creator, 1e9 * 10 ** decimals());
    }
}

/// @notice A factory contract to create AI Agents and deploy an ERC20 token for each.
/// It stores on-chain details about each AI agent and provides lookup functions.
contract AIAgentFactory {
    struct AIAgent {
        string name;
        uint256 age;
        string race;
        string profession;
        string bio;
        string firstMessage;
        string image;
        address tokenAddress;
    }

    // An array to store all AI agents.
    AIAgent[] public agents;
    // Mapping from the ERC20 token address to the AI agent data.
    mapping(address => AIAgent) public tokenToAIAgent;

    event AIAgentCreated(
        string name,
        uint256 age,
        string race,
        string profession,
        string bio,
        string firstMessage,
        string image,
        address tokenAddress,
        address creator
    );

    /// @notice Creates a new AI agent, deploys its ERC20 token, and mints 1 billion tokens to msg.sender.
    /// @param _name The AI agent's name (also used as token name).
    /// @param _age The AI agent's age.
    /// @param _race The AI agent's race.
    /// @param _profession The AI agent's profession.
    /// @param _bio A short bio for the AI agent.
    /// @param _firstMessage The AI agent's first message.
    /// @param _image A URI or hash for the AI agent's image.
    /// @return The address of the newly deployed ERC20 token.
    function createAIAgent(
        string memory _name,
        uint256 _age,
        string memory _race,
        string memory _profession,
        string memory _bio,
        string memory _firstMessage,
        string memory _image
    ) public returns (address) {
        // For simplicity, using a default token symbol.
        // In a more advanced implementation, you might derive a unique symbol.
        string memory tokenSymbol = "AIA";

        // Deploy a new AIAgentToken, minting 1e9 tokens to the creator.
        AIAgentToken token = new AIAgentToken(msg.sender, _name, tokenSymbol);

        // Build the AI agent struct with the deployed token's address.
        AIAgent memory newAgent = AIAgent({
            name: _name,
            age: _age,
            race: _race,
            profession: _profession,
            bio: _bio,
            firstMessage: _firstMessage,
            image: _image,
            tokenAddress: address(token)
        });

        // Save the AI agent on-chain.
        agents.push(newAgent);
        tokenToAIAgent[address(token)] = newAgent;

        emit AIAgentCreated(
            _name,
            _age,
            _race,
            _profession,
            _bio,
            _firstMessage,
            _image,
            address(token),
            msg.sender
        );

        return address(token);
    }

    /// @notice Retrieves all AI agents.
    /// @return An array of all AIAgent structs.
    function getAllAIAgents() public view returns (AIAgent[] memory) {
        return agents;
    }

    /// @notice Retrieves an AI agent by its ERC20 token address.
    /// @param _tokenAddress The address of the AI agent's token.
    /// @return The AIAgent struct associated with the token.
    function getAIAgentByToken(address _tokenAddress) public view returns (AIAgent memory) {
        return tokenToAIAgent[_tokenAddress];
    }
}
