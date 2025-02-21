'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider, useWriteContract, useReadContract } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Civitai, Scheduler } from 'civitai';
import { FaPaperPlane } from 'react-icons/fa';
import { decodeEventLog } from 'viem';
import { waitForTransactionReceipt } from '@wagmi/core';

// --- Factory ABI and address ---
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
const FACTORY_ADDRESS = '0x26af2afddf1903F8C8CDc0c1Cc8b7201a20a9209';

// --- RainbowKit & Query Client configuration ---
const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
  ssr: true,
});
const queryClient = new QueryClient();

// Create an instance of Civitai.
const civitai = new Civitai({
  auth: process.env.NEXT_PUBLIC_CIVITAI_API_TOKEN,
});

function Home() {
  // Step 0: Home screen state
  const [step, setStep] = useState(0);
  // State for selecting an existing agent.
  const [selectedTokenAddress, setSelectedTokenAddress] = useState('');

  // States for new agent creation (steps 1-3)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  // Age now is intended as a number (or empty if not set)
  const [age, setAge] = useState('');
  const [race, setRace] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // New agent's token address (from new agent creation)
  const [tokenAddress, setTokenAddress] = useState('');

  // New state: whether to auto-create using AI
  const [createWithAI, setCreateWithAI] = useState(true);

  // Chat state (step 4)
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // --- Fetch existing AI agents ---
  const { data: allAgents } = useReadContract({
    abi: factoryABI,
    address: FACTORY_ADDRESS,
    functionName: 'getAllAIAgents',
    enabled: true,
  });

  // --- Functions for launching a new agent (steps 1-3) ---
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
                'You are an AI writer. Generate an image prompt for a fictional character. The image prompt should be concise and descriptive.',
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

  // Use the instance "civitai" (not Civitai) for image generation.
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
        setGeneratedImage(nestedJob.result.blobUrl);
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

  // Auto-trigger AI functions when "Create with AI" is enabled.
  useEffect(() => {
    if (createWithAI && step === 2) {
      if (!imagePrompt) {
        handleAIImagePrompt();
      } else if (imagePrompt && !generatedImage) {
        // Auto-generate image once prompt is available.
        handleGenerateImage();
      }
    }
  }, [step, createWithAI, imagePrompt, generatedImage]);

  useEffect(() => {
    if (createWithAI && step === 3 && (!age || !race || !profession || !bio || !firstMessage)) {
      handleAIWriterStep3();
    }
  }, [step, createWithAI, age, race, profession, bio, firstMessage]);

  // Process flow for launching a new agent (steps 1-3):
  const handleNext = (e) => {
    e.preventDefault();
    setStep(2); // advance from step 1 to 2
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    setStep(3); // advance from step 2 to 3
  };

  // Write contract and wait for receipt.
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
        chainId: baseSepolia.id,
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

  // --- STEP 4: Chat ---
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

  // --- UI RENDERING ---
  if (step === 0) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]" />
        <div className="w-full container bg-zinc-900 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
          <button
            onClick={() => setStep(1)}
            disabled={loading}
            className="w-full self-center mb-6 px-6 py-3 bg-violet-600 text-white rounded hover:bg-violet-700 disabled:opacity-50"
          >
            Launch AI Agent
          </button>
          <h1 className="text-white text-3xl font-bold mb-4">Existing AI Agents</h1>
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
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]" />
      {step < 4 ? (
        <div className="w-full max-w-[500px] bg-zinc-900 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
          {step === 1 && (
            <>
              <button
                onClick={handleAIWriter}
                disabled={loading}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'AI Writer'}
              </button>
              <h1 className="text-white text-4xl font-bold mb-6">Create Fictional Character</h1>
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
                <button
                  type="submit"
                  disabled={!name || !description}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Next
                </button>
              </form>
            </>
          )}
          {step === 2 && (
            <>
              <button
                onClick={handleAIImagePrompt}
                disabled={loading}
                className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'AI Writer'}
              </button>
              <h1 className="text-white text-4xl font-bold mb-6">Generate Image Prompt</h1>
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
                  type="submit"
                  disabled={!generatedImage}
                  className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Next
                </button>
              </form>
              <button
                onClick={handleGenerateImage}
                disabled={loading}
                className="mb-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {loading ? 'Generating Image...' : 'Generate Image'}
              </button>
              {generatedImage && (
                <div className="mt-4">
                  <h2 className="text-white text-xl mb-2">Generated Image:</h2>
                  <img src={generatedImage} alt="Generated" className="w-full rounded" />
                </div>
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="text-white text-4xl font-bold mb-6">Finalize Character Details</h1>
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
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  Create
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div style={{ backgroundImage: `url(${agentData?.image || generatedImage})` }} className="w-full max-w-[500px] h-screen bg-cover bg-center mx-auto relative flex flex-col">
          <header className="flex items-center p-4 bg-black bg-opacity-50">
            <img src={agentData?.image || generatedImage} alt="Avatar" className="w-10 h-10 rounded-full object-cover object-top mr-4" />
            <div>
              <h1 className="text-white text-xl font-bold">{agentData?.name || name}</h1>
              {agentData?.tokenAddress && (
                <p className="text-xs text-yellow-500 font-bold">Token: {agentData.tokenAddress}</p>
              )}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4" id="chat-container">
            {messages.filter((msg) => msg.role !== 'system').map((msg, idx) => (
              <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block text-sm max-w-[80%] p-2 rounded-xl bg-opacity-80 backdrop-blur-xl ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-white'}`}>
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
