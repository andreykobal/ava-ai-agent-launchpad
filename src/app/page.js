// @/src/page.js

'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, useWriteContract, useReadContract } from 'wagmi';
import { http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import { Civitai, Scheduler } from 'civitai';
import { FaPaperPlane, FaHome } from 'react-icons/fa';
import { ImSpinner2 } from 'react-icons/im';
import { decodeEventLog } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';
import { PinataSDK } from 'pinata-web3';
import { createClientUPProvider } from '@lukso/up-provider';





// Add your custom chain configuration:
const sonicBlazeTestnet = {
  id: 57054,
  name: 'Sonic Blaze Testnet',
  network: 'sonic-blaze-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Sonic Blaze Token',
    symbol: 'S',
  },
  rpcUrls: {
    default: 'https://rpc.blaze.soniclabs.com',
  },
  blockExplorers: {
    default: { name: 'SonicScan', url: 'https://testnet.sonicscan.org' },
  },
  testnet: true,
};

const coreBlockchainTestnet = {
  id: 1115,
  name: 'Core Blockchain Testnet',
  network: 'core-blockchain-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'tCORE',
    symbol: 'tCORE',
  },
  rpcUrls: {
    default: 'https://rpc.test.btcs.network',
  },
  blockExplorers: {
    default: { name: 'CoreScan', url: 'https://scan.test.btcs.network' },
  },
  testnet: true,
};

const luksoTestnet = {
  id: 4201,
  name: 'LUKSO Testnet',
  network: 'lukso-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'LYXt',
    symbol: 'LYXt',
  },
  rpcUrls: {
    default: 'https://rpc.testnet.lukso.network',
  },
  blockExplorers: {
    default: { name: 'LUKSO Explorer', url: 'https://explorer.execution.testnet.lukso.network' },
  },
  testnet: true,
};

// ---------------------------------------------------------------------
// Helper function: Upload image from a given URL to Pinata
// ---------------------------------------------------------------------
async function uploadImageToPinata(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], "generated-image.png", { type: blob.type });
    const pinata = new PinataSDK({
      pinataJwt: process.env.NEXT_PUBLIC_PINATA_JWT,
      pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL,
    });
    const uploadResponse = await pinata.upload.file(file);
    console.debug('uploadImageToPinata: Upload response', uploadResponse);
    const pinataGatewayToken = process.env.NEXT_PUBLIC_PINATA_GATEWAY_TOKEN;
    const pinataUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${uploadResponse.IpfsHash}?pinataGatewayToken=${pinataGatewayToken}`;
    return pinataUrl;
  } catch (error) {
    console.error('Error uploading image to Pinata:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------
// Factory ABI and address (for interacting with your smart contract)
// ---------------------------------------------------------------------
const factoryABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "uint256", "name": "_age", "type": "uint256" },
      { "internalType": "string", "name": "_race", "type": "string" },
      { "internalType": "string", "name": "_profession", "type": "string" },
      { "internalType": "string", "name": "_bio", "type": "string" },
      { "internalType": "string", "name": "_firstMessage", "type": "string" },
      { "internalType": "string", "name": "_image", "type": "string" }
    ],
    "name": "createAIAgent",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllAIAgents",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "uint256", "name": "age", "type": "uint256" },
          { "internalType": "string", "name": "race", "type": "string" },
          { "internalType": "string", "name": "profession", "type": "string" },
          { "internalType": "string", "name": "bio", "type": "string" },
          { "internalType": "string", "name": "firstMessage", "type": "string" },
          { "internalType": "string", "name": "image", "type": "string" },
          { "internalType": "address", "name": "tokenAddress", "type": "address" }
        ],
        "internalType": "struct AIAgentFactory.AIAgent[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_tokenAddress", "type": "address" }
    ],
    "name": "getAIAgentByToken",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "name", "type": "string" },
          { "internalType": "uint256", "name": "age", "type": "uint256" },
          { "internalType": "string", "name": "race", "type": "string" },
          { "internalType": "string", "name": "profession", "type": "string" },
          { "internalType": "string", "name": "bio", "type": "string" },
          { "internalType": "string", "name": "firstMessage", "type": "string" },
          { "internalType": "string", "name": "image", "type": "string" },
          { "internalType": "address", "name": "tokenAddress", "type": "address" }
        ],
        "internalType": "struct AIAgentFactory.AIAgent",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "age", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "race", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "profession", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "bio", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "firstMessage", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "image", "type": "string" },
      { "indexed": false, "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "indexed": false, "internalType": "address", "name": "creator", "type": "address" }
    ],
    "name": "AIAgentCreated",
    "type": "event"
  }
];
const FACTORY_ADDRESS = '0xB13624E8cC4Fb4Cd860c6D6c6F767776Ea497946';

// ---------------------------------------------------------------------
// RainbowKit & Query Client configuration
// ---------------------------------------------------------------------
const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [sonicBlazeTestnet, coreBlockchainTestnet, luksoTestnet],
  transports: {
    [sonicBlazeTestnet.id]: http('https://rpc.blaze.soniclabs.com'),
    [coreBlockchainTestnet.id]: http('https://rpc.test.btcs.network'),
    [luksoTestnet.id]: http('https://rpc.testnet.lukso.network'),
  },
  ssr: true,
});

const queryClient = new QueryClient();

// Create an instance of Civitai.
const civitai = new Civitai({
  auth: process.env.NEXT_PUBLIC_CIVITAI_API_TOKEN,
});

function Home() {
  // -------------------------------------------------------------------
  // State declarations for character creation, chat flow, and refresh
  // -------------------------------------------------------------------
  const [step, setStep] = useState(0);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [selectedTokenAddress, setSelectedTokenAddress] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [age, setAge] = useState('');
  const [race, setRace] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenAddress, setTokenAddress] = useState('');
  const [createWithAI, setCreateWithAI] = useState(true);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [downloading, setDownloading] = useState(false);


  // // UNIVERSAL PROFILE
  // // Track connected accounts
  // const [provider, setProvider] = useState(null);
  // const [accounts, setAccounts] = useState([]);
  // const [contextAccounts, setContextAccounts] = useState([]);
  // const [profileConnected, setProfileConnected] = useState(false);

  // const updateConnected = useCallback(
  //   (_accounts, _contextAccounts) => {
  //     setProfileConnected(_accounts.length > 0 && _contextAccounts.length > 0);
  //   },
  //   []
  // );

  // // Create provider on client side
  // useEffect(() => {
  //   if (typeof window !== 'undefined') {
  //     setProvider(createClientUPProvider());
  //   }
  // }, []);

  // useEffect(() => {
  //   // Only run if provider is available
  //   if (!provider) return;

  //   async function init() {
  //     try {
  //       const _accounts = provider.accounts;
  //       setAccounts(_accounts);

  //       const _contextAccounts = provider.contextAccounts;
  //       updateConnected(_accounts, _contextAccounts);
  //     } catch (error) {
  //       console.error('Failed to initialize provider:', error);
  //     }
  //   }

  //   const accountsChanged = (_accounts) => {
  //     setAccounts(_accounts);
  //     updateConnected(_accounts, contextAccounts);
  //   };

  //   const contextAccountsChanged = (_accounts) => {
  //     setContextAccounts(_accounts);
  //     updateConnected(accounts, _accounts);
  //   };

  //   init();

  //   // Set up event listeners
  //   provider.on('accountsChanged', accountsChanged);
  //   provider.on('contextAccountsChanged', contextAccountsChanged);

  //   // Cleanup listeners on unmount
  //   return () => {
  //     provider.removeListener('accountsChanged', accountsChanged);
  //     provider.removeListener('contextAccountsChanged', contextAccountsChanged);
  //   };
  // }, [provider, accounts[0], contextAccounts[0], updateConnected]);


  // -------------------------------------------------------------------
  // Fetch existing AI agents from the contract with a dynamic scopeKey
  // -------------------------------------------------------------------
  const { data: allAgents } = useReadContract({
    abi: factoryABI,
    address: FACTORY_ADDRESS,
    functionName: 'getAllAIAgents',
    enabled: true,
    scopeKey: `agents-${refreshCounter}`,
  });

  // -------------------------------------------------------------------
  // Step 1: Generate basic character details using OpenAI
  // -------------------------------------------------------------------
  const handleAIWriter = async () => {
    setLoading(true);
    console.debug('handleAIWriter: Start');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI writer. Create a fictional character. Return the result as a JSON object that strictly follows the provided JSON schema.',
            },
            {
              role: 'user',
              content: 'Please generate a fictional character with a name and description.',
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'fictional_character',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                },
                additionalProperties: false,
                required: ['name', 'description'],
              },
            },
          },
        }),
      });
      const result = await response.json();
      const message = result.choices[0].message;
      let parsed = message.parsed;
      if (!parsed && message.content) {
        parsed = JSON.parse(message.content);
      }
      console.debug('handleAIWriter: Parsed character', parsed);
      setName(parsed.name);
      setDescription(parsed.description);
    } catch (error) {
      console.error('Error generating character:', error);
    } finally {
      setLoading(false);
      console.debug('handleAIWriter: End');
    }
  };

  // -------------------------------------------------------------------
  // Step 2: Generate an image prompt via OpenAI
  // -------------------------------------------------------------------
  const handleAIImagePrompt = async () => {
    setLoading(true);
    console.debug('handleAIImagePrompt: Start');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content:
                'You are an AI writer. Generate an image prompt for a fictional character. The image prompt should be concise and descriptive. start with 1girl or 1boy to identify gender, then proceed with prompt of simple word phrases, comma separated',
            },
            {
              role: 'user',
              content: `Generate an image prompt for character with name "${name}" and description "${description}".`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'image_prompt',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  imagePrompt: { type: 'string' },
                },
                additionalProperties: false,
                required: ['imagePrompt'],
              },
            },
          },
        }),
      });
      const result = await response.json();
      const message = result.choices[0].message;
      let parsed = message.parsed;
      if (!parsed && message.content) {
        parsed = JSON.parse(message.content);
      }
      console.debug('handleAIImagePrompt: Parsed image prompt', parsed);
      setImagePrompt(parsed.imagePrompt);
    } catch (error) {
      console.error('Error generating image prompt:', error);
    } finally {
      setLoading(false);
      console.debug('handleAIImagePrompt: End');
    }
  };

  // -------------------------------------------------------------------
  // Step 2 (continued): Generate image via Civitai and upload to Pinata
  // -------------------------------------------------------------------
  const handleGenerateImage = async () => {
    setLoading(true);
    console.debug('handleGenerateImage: Start');
    try {
      const input = {
        model: 'urn:air:sdxl:checkpoint:civitai:827184@1410435',
        params: {
          prompt: 'masterpiece,best quality, cowboy shot, ' + imagePrompt,
          negativePrompt: 'bad quality,worst quality,worst detail, sketch, censor',
          scheduler: Scheduler.EULER_A,
          steps: 20,
          cfgScale: 7,
          width: 832,
          height: 1216,
          clipSkip: 2,
        },
      };
      const response = await civitai.image.fromText(input, true);
      console.debug('handleGenerateImage: Response from Civitai', response);
      const topJob = response.jobs?.[0];
      if (!topJob?.result?.jobs) {
        console.error('No nested jobs found.');
        return;
      }
      const nestedJob = topJob.result.jobs.find(
        (j) => j.result?.available && j.result?.blobUrl
      );
      if (nestedJob) {
        console.debug('handleGenerateImage: Generated image URL', nestedJob.result.blobUrl);
        const pinataUrl = await uploadImageToPinata(nestedJob.result.blobUrl);
        console.debug('handleGenerateImage: Pinata URL', pinataUrl);
        setGeneratedImage(pinataUrl);
      } else {
        console.error('Image generation failed.');
      }
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setLoading(false);
      console.debug('handleGenerateImage: End');
    }
  };

  // -------------------------------------------------------------------
  // Step 3: Generate additional character details using OpenAI
  // -------------------------------------------------------------------
  const handleAIWriterStep3 = async () => {
    setLoading(true);
    console.debug('handleAIWriterStep3: Start');
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content: 'Using the provided details, generate additional character information.',
            },
            {
              role: 'user',
              content: `Generate additional details for character:
Name: "${name}"
Description: "${description}"
Image Prompt: "${imagePrompt}"
Return a JSON with properties: age, race, profession, bio, firstMessage.`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'character_details',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  age: { type: 'number' },
                  race: { type: 'string' },
                  profession: { type: 'string' },
                  bio: { type: 'string' },
                  firstMessage: { type: 'string' },
                },
                additionalProperties: false,
                required: ['age', 'race', 'profession', 'bio', 'firstMessage'],
              },
            },
          },
        }),
      });
      const result = await response.json();
      const message = result.choices[0].message;
      let parsed = message.parsed;
      if (!parsed && message.content) {
        parsed = JSON.parse(message.content);
      }
      console.debug('handleAIWriterStep3: Parsed additional details', parsed);
      setAge(parsed.age);
      setRace(parsed.race);
      setProfession(parsed.profession);
      setBio(parsed.bio);
      setFirstMessage(parsed.firstMessage);
    } catch (error) {
      console.error('Error generating additional details:', error);
    } finally {
      setLoading(false);
      console.debug('handleAIWriterStep3: End');
    }
  };

  // -------------------------------------------------------------------
  // Download Character File: Generate a complete character file using token metadata.
  // This function calls OpenAI with a detailed schema prompt that includes all available fields.
  // It then removes markdown code fences (if any) before downloading the file.
  // -------------------------------------------------------------------
  const handleDownloadCharacterFile = async () => {
    if (!agentData) {
      console.error("No token metadata available to generate character file.");
      return;
    }
    setDownloading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: [
            {
              role: 'system',
              content:
                `You are an AI writer that generates complete character files for AI agents for managing automated twitter (X) accounts.
A character file is a JSON-formatted configuration that defines an AI agent persona.
Return a valid JSON object strictly following the schema provided. Do not include any extra text.`,
            },
            {
              role: 'user',
              content:
                `Generate a detailed character file using the following token metadata:

Name: "${agentData.name}"
Age: ${agentData.age}
Race: "${agentData.race}"
Profession: "${agentData.profession}"
Bio: "${agentData.bio}"
First Message: "${agentData.firstMessage}"
Image: "${agentData.image}"
Token Address: "${agentData.tokenAddress}"

Return a JSON object strictly following this schema:

{
  "name": "character_name",
  "modelProvider": "openai",
  "clients": ["discord", "direct"],
  "plugins": [],
  "settings": {
    "ragKnowledge": false,
    "secrets": {},
    "voice": {},
    "model": "",
    "modelConfig": {
      "temperature": 0.7,
      "maxInputTokens": 4096,
      "maxOutputTokens": 1024,
      "frequency_penalty": 0.0,
      "presence_penalty": 0.0
    },
    "imageSettings": {
      "steps": 20,
      "width": 1024,
      "height": 1024,
      "cfgScale": 7.5,
      "negativePrompt": "string"
    }
  },
  "bio": [],
  "lore": [],
  "username": "",
  "system": "",
  "knowledge": [],
  "messageExamples": [],
  "postExamples": [],
  "topics": [],
  "adjectives": [],
  "style": {
    "all": [],
    "chat": [],
    "post": []
  }
}

Fill in all fields using the token metadata and add creative details where appropriate.`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      const result = await response.json();
      const message = result.choices[0].message;

      // Helper: Remove markdown code fences if present by stripping first and last lines.
      const parseJSONFromResponse = (content) => {
        let raw = content.trim();
        if (raw.startsWith("```")) {
          const lines = raw.split("\n");
          // Remove first line if it starts with ```
          if (lines[0].startsWith("```")) {
            lines.shift();
          }
          // Remove last line if it ends with ```
          if (lines[lines.length - 1].startsWith("```")) {
            lines.pop();
          }
          raw = lines.join("\n");
        }
        return JSON.parse(raw);
      };

      let characterFile;
      try {
        if (message.parsed) {
          characterFile = message.parsed;
        } else {
          characterFile = parseJSONFromResponse(message.content);
        }
      } catch (e) {
        console.error('Error parsing generated character file:', e);
      }
      // Custom replacer to handle BigInt serialization.
      const jsonReplacer = (key, value) =>
        typeof value === 'bigint' ? value.toString() : value;
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(characterFile, jsonReplacer, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute('href', dataStr);
      dlAnchorElem.setAttribute('download', 'eliza_character_file.json');
      dlAnchorElem.click();
    } catch (error) {
      console.error('Error generating character file:', error);
    } finally {
      setDownloading(false);
    }
  };

  // Auto-trigger AI functions based on step and state
  useEffect(() => {
    if (createWithAI && step === 2) {
      if (!imagePrompt) {
        handleAIImagePrompt();
      } else if (imagePrompt && !generatedImage) {
        handleGenerateImage();
      }
    }
  }, [step, createWithAI, imagePrompt, generatedImage]);

  useEffect(() => {
    if (createWithAI && step === 3 && (!age || !race || !profession || !bio || !firstMessage)) {
      handleAIWriterStep3();
    }
  }, [step, createWithAI, age, race, profession, bio, firstMessage]);

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    setStep(3);
  };

  // -------------------------------------------------------------------
  // Create the agent by writing to the contract and decoding logs
  // -------------------------------------------------------------------
  const { writeContractAsync: createAgent } = useWriteContract();
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.debug('handleCreate: Start');
    try {
      const txHash = await createAgent({
        abi: factoryABI,
        address: FACTORY_ADDRESS,
        functionName: 'createAIAgent',
        args: [name, Number(age), race, profession, bio, firstMessage, generatedImage],
      });
      console.debug('handleCreate: Transaction hash:', txHash);
      const receipt = await waitForTransactionReceipt(config, {
        chainId: sonicBlazeTestnet.id,
        hash: txHash,
        pollingInterval: 1000,
      });
      console.debug('handleCreate: Transaction receipt:', receipt);
      let deployedTokenAddress = '';
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: factoryABI,
            data: log.data,
            topics: log.topics,
          });
          console.debug('handleCreate: Decoded log:', decoded);
          if (decoded.eventName === 'AIAgentCreated') {
            deployedTokenAddress = decoded.args.tokenAddress;
            break;
          }
        } catch (err) {
          console.debug('handleCreate: Log could not be decoded, skipping.', err);
        }
      }
      if (!deployedTokenAddress) {
        throw new Error('Token address not found in transaction logs');
      }
      console.debug('handleCreate: Deployed token address:', deployedTokenAddress);
      setTokenAddress(deployedTokenAddress);
      setStep(4);
    } catch (error) {
      console.error('Error creating AI agent:', error);
    } finally {
      setLoading(false);
      console.debug('handleCreate: End');
    }
  };

  // -------------------------------------------------------------------
  // STEP 4: Chat – Fetch agent details and initialize the conversation
  // -------------------------------------------------------------------
  const { data: agentData } = useReadContract({
    abi: factoryABI,
    address: FACTORY_ADDRESS,
    functionName: 'getAIAgentByToken',
    args: selectedTokenAddress ? [selectedTokenAddress] : tokenAddress ? [tokenAddress] : undefined,
    enabled: Boolean(selectedTokenAddress || tokenAddress),
  });

  useEffect(() => {
    if (step === 4 && agentData) {
      const systemMessage = {
        role: 'system',
        content: `Continue roleplaying as a fictional character:
Name: ${agentData.name}
Age: ${agentData.age}
Race: ${agentData.race}
Profession: ${agentData.profession}
Bio: ${agentData.bio}
Image Prompt: ${imagePrompt}`,
      };
      const characterFirstMessage = {
        role: 'assistant',
        content: agentData.firstMessage,
      };
      setMessages([systemMessage, characterFirstMessage]);
    }
  }, [step, agentData, imagePrompt]);

  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newUserMessage = { role: 'user', content: chatInput.trim() };
    let updatedMessages = [...messages, newUserMessage];
    if (updatedMessages.length > 50) {
      updatedMessages = updatedMessages.slice(updatedMessages.length - 50);
    }
    setMessages(updatedMessages);
    setChatInput('');
    setLoading(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-2024-08-06',
          messages: updatedMessages,
        }),
      });
      if (!response.ok) {
        throw new Error('Chat API call failed');
      }
      const result = await response.json();
      const message = result.choices[0].message;
      let newMessages = [...updatedMessages, message];
      if (newMessages.length > 50) {
        newMessages = newMessages.slice(newMessages.length - 50);
      }
      setMessages(newMessages);
    } catch (error) {
      console.error('Error during chat:', error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------
  // UI Rendering for different steps (character creation, agent list, chat)
  // -------------------------------------------------------------------
  if (step === 0) {
    return (
      <>
        {/* Fixed Home Button always displayed at the top left */}
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => {
              setStep(0);
              setRefreshCounter((prev) => prev + 1);
            }}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            <FaHome className="text-xl" />
            <span>Home</span>
          </button>
        </div>
        <div className="relative min-h-screen flex flex-col items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]" />
          <div className="w-full container bg-zinc-900 mt-16 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full self-center mb-6 px-6 py-3 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
            >
              Launch AI Agent
            </button>
            <h1 className="text-white text-3xl font-bold mb-4">All AI Agents</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {(allAgents || []).map((agent, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setSelectedTokenAddress(agent.tokenAddress);
                    setStep(4);
                  }}
                  className="bg-zinc-800 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <div className="flex">
                    <img
                      src={agent.image}
                      alt={agent.name}
                      className="w-24 h-24 rounded-lg mr-4 object-cover object-top"
                    />
                    <div>
                      <h2 className="text-white text-xl font-bold">{agent.name}</h2>
                      {agent.tokenAddress && (
                        <p className="text-xs text-yellow-500 font-bold">
                          Token: {agent.tokenAddress.substring(0, 6)}...{agent.tokenAddress.substring(agent.tokenAddress.length - 4)}
                        </p>
                      )}
                      <p className="text-sm text-gray-300">
                        {agent.profession} | {agent.race}
                      </p>
                      <p className="text-sm text-gray-400">
                        {agent.bio.length > 50 ? agent.bio.substring(0, 50) + '...' : agent.bio}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Fixed Home Button always displayed at the top left */}
      <div className="fixed top-4 left-4 z-50">
        <button
          onClick={() => {
            setStep(0);
            setRefreshCounter((prev) => prev + 1);
          }}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
        >
          <FaHome className="text-xl" />
          <span>Home</span>
        </button>
      </div>
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]" />
        {step < 4 ? (
          <div className="w-full max-w-[500px] bg-zinc-900 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
            {step === 1 && (
              <>
                <h1 className="text-white text-4xl font-bold mb-6">Create AI Agent</h1>
                <button
                  onClick={handleAIWriter}
                  disabled={loading}
                  className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'AI Writer'}
                </button>
                <form onSubmit={handleNext} className="w-full">
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-white mb-1">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter character name"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="description" className="block text-white mb-1">Description</label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter character description"
                    />
                  </div>
                  <div className="mb-4">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={createWithAI}
                        onChange={(e) => setCreateWithAI(e.target.checked)}
                        className="form-checkbox"
                      />
                      <span className="ml-2 text-white">Create with AI</span>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={!name || !description}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </form>
              </>
            )}
            {step === 2 && (
              <>
                <h1 className="text-white text-4xl font-bold mb-2">Generate Image</h1>
                {generatedImage && (
                  <div className="mt-4">
                    <h2 className="text-white text-xl mb-2">Generated Image:</h2>
                    <img src={generatedImage} alt="Generated" className="w-full rounded" />
                  </div>
                )}
                <button
                  onClick={handleAIImagePrompt}
                  disabled={loading}
                  className="mb-4 mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'AI Writer'}
                </button>
                <form onSubmit={handleNextStep2} className="w-full">
                  <div className="mb-4">
                    <label htmlFor="imagePrompt" className="block text-white mb-1">Image Prompt</label>
                    <textarea
                      id="imagePrompt"
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      rows={4}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter image prompt"
                    />
                  </div>
                  <button
                    onClick={handleGenerateImage}
                    disabled={loading}
                    className="w-full mb-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                  >
                    {loading ? 'Generating Image...' : 'Generate Image'}
                  </button>
                  <button
                    type="submit"
                    disabled={!generatedImage}
                    className="w-full mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </form>
              </>
            )}
            {step === 3 && (
              <>
                <h1 className="text-white text-4xl font-bold mb-6">Finalize AI Agent</h1>
                {generatedImage && (
                  <div className="mb-4">
                    <h2 className="text-white text-xl mb-2">Generated Image:</h2>
                    <img src={generatedImage} alt="Generated" className="w-full rounded" />
                  </div>
                )}
                <button
                  onClick={handleAIWriterStep3}
                  disabled={loading}
                  className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'AI Writer'}
                </button>
                <form onSubmit={handleCreate} className="w-full">
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-white mb-1">Name</label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      readOnly
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="age" className="block text-white mb-1">Age</label>
                    <input
                      type="number"
                      id="age"
                      value={age}
                      onChange={(e) =>
                        setAge(e.target.value ? Number(e.target.value) : '')
                      }
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter age"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="race" className="block text-white mb-1">Race</label>
                    <input
                      type="text"
                      id="race"
                      value={race}
                      onChange={(e) => setRace(e.target.value)}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter race"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="profession" className="block text-white mb-1">Profession</label>
                    <input
                      type="text"
                      id="profession"
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter profession"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="bio" className="block text-white mb-1">Bio</label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={4}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter bio"
                    />
                  </div>
                  <div className="mb-4">
                    <label htmlFor="firstMessage" className="block text-white mb-1">First Message</label>
                    <textarea
                      id="firstMessage"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      rows={4}
                      className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600"
                      placeholder="Enter first message"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!age || !race || !profession || !bio || !firstMessage}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    Create
                  </button>
                </form>
              </>
            )}
          </div>
        ) : (
          <div style={{ backgroundImage: `url(${agentData?.image || generatedImage})` }} className="w-full max-w-[500px] h-screen bg-cover bg-center mx-auto relative flex flex-col">
            <header className="flex flex-col p-4 bg-black bg-opacity-50">
              <div className="flex items-center w-full">
                <img src={agentData?.image || generatedImage} alt="Avatar" className="w-10 h-10 rounded-full object-cover object-top mr-4" />
                <div>
                  <h1 className="text-white text-xl font-bold">{agentData?.name || name}</h1>
                  {agentData?.tokenAddress && (
                    <p className="text-xs text-yellow-500 font-bold">Token: {agentData.tokenAddress}</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDownloadCharacterFile}
                disabled={downloading}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center"
              >
                {downloading ? <ImSpinner2 className="animate-spin h-5 w-5 text-white" /> : 'Download Eliza Character File'}
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4" id="chat-container">
              {messages.filter((msg) => msg.role !== 'system').map((msg, idx) => (
                <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <span className={`inline-block max-w-[80%] p-2 rounded-xl bg-opacity-80 backdrop-blur-xl ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-white'}`}>
                    {msg.content}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 bg-black bg-opacity-50">
              <form onSubmit={handleSendMessage} className="flex">
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 text-black p-2 rounded-l" placeholder="Type your message..." />
                <button type="submit" className="p-4 bg-violet-500 rounded-r">
                  <FaPaperPlane className="text-white text-xl" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="relative min-h-screen">
            <div className="fixed top-4 right-4 z-50">
              <ConnectButton />
            </div>
            <Home />
          </div>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
