'use client';

import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  ConnectButton,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { Civitai, Scheduler } from 'civitai';
import { FaPaperPlane } from 'react-icons/fa';

// Configure your app using the RainbowKit docs:
// Set up the configuration with only the baseSepolia chain and a custom HTTP transport.
const config = getDefaultConfig({
  appName: 'My RainbowKit App',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, // Obtain a projectId from WalletConnect Cloud
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
  ssr: true, // Set to true if your dApp uses server side rendering (SSR)
});

// Create the React Query client.
const queryClient = new QueryClient();

function Home() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 3 additional fields
  const [age, setAge] = useState('');
  const [race, setRace] = useState('');
  const [profession, setProfession] = useState('');
  const [bio, setBio] = useState('');
  const [firstMessage, setFirstMessage] = useState('');

  // Chat state for step 4
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // Create a Civitai client instance.
  const civitai = new Civitai({
    auth: process.env.NEXT_PUBLIC_CIVITAI_API_TOKEN,
  });

  // Step 1: Generate fictional character
  const handleAIWriter = async () => {
    console.log(
      'Step 1: Character AI Writer clicked. Starting API call for character...'
    );
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
          messages: [
            {
              role: 'system',
              content:
                'You are an AI writer. Create a fictional character. Return the result as a JSON object that strictly follows the provided JSON schema.',
            },
            {
              role: 'user',
              content:
                'Please generate a fictional character with a name and description.',
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
                  name: {
                    type: 'string',
                    description: 'The name of the fictional character',
                  },
                  description: {
                    type: 'string',
                    description: 'A description of the fictional character',
                  },
                },
                additionalProperties: false,
                required: ['name', 'description'],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        console.error(
          'Step 1: Character API call failed with status:',
          response.status
        );
        throw new Error('API call failed for character generation');
      }

      const result = await response.json();
      const message = result.choices[0].message;

      if (message.refusal) {
        console.error('Step 1: Refusal received from character API:', message.refusal);
        return;
      }

      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error('Step 1: Error parsing character message content:', e);
          return;
        }
      }

      setName(parsed.name);
      setDescription(parsed.description);
    } catch (error) {
      console.error('Step 1: Error generating character:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate image prompt for the character
  const handleAIImagePrompt = async () => {
    console.log(
      'Step 2: Image Prompt AI Writer clicked. Starting API call for image prompt...'
    );
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
          messages: [
            {
              role: 'system',
              content:
                'You are an AI writer. Generate an image prompt for a fictional character. The image prompt should be a concise, descriptive sentence suitable for image generation.',
            },
            {
              role: 'user',
              content: `Generate an image prompt of simple 1-2 word comma-separated phrases for a fictional character, starting with gender (1girl or 1boy) with the name "${name}" and description "${description}".`,
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
                  imagePrompt: {
                    type: 'string',
                    description:
                      'A descriptive image prompt for generating an image of the fictional character',
                  },
                },
                additionalProperties: false,
                required: ['imagePrompt'],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        console.error(
          'Step 2: Image prompt API call failed with status:',
          response.status
        );
        throw new Error('API call failed for image prompt generation');
      }

      const result = await response.json();
      const message = result.choices[0].message;

      if (message.refusal) {
        console.error('Step 2: Refusal received from image prompt API:', message.refusal);
        return;
      }

      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error('Step 2: Error parsing image prompt message content:', e);
          return;
        }
      }

      setImagePrompt(parsed.imagePrompt);
    } catch (error) {
      console.error('Step 2: Error generating image prompt:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Generate image using Civitai
  const handleGenerateImage = async () => {
    console.log(
      'Step 2: Generate Image button clicked. Starting image generation with Civitai...'
    );
    setLoading(true);
    try {
      const input = {
        model: 'urn:air:sdxl:checkpoint:civitai:827184@1410435',
        params: {
          prompt: 'masterpiece,best quality,amazing quality, cowboy shot, ' + imagePrompt,
          negativePrompt: 'bad quality,worst quality,worst detail,sketch,censor,',
          scheduler: Scheduler.EULER_A,
          steps: 20,
          cfgScale: 7,
          width: 832,
          height: 1216,
          clipSkip: 2,
        },
      };

      const response = await civitai.image.fromText(input, true);

      // Grab the top-level job and then the nested job with the actual image
      const topJob = response.jobs?.[0];
      if (!topJob?.result?.jobs) {
        console.error('Step 2: No nested jobs array found in the result.');
        return;
      }

      const nestedJob = topJob.result.jobs.find(
        (j) => j.result?.available && j.result?.blobUrl
      );

      if (nestedJob) {
        setGeneratedImage(nestedJob.result.blobUrl);
      } else {
        console.error('Step 2: Image generation job did not return a valid image.');
      }
    } catch (error) {
      console.error('Step 2: Error generating image with Civitai:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleNextStep2 = (e) => {
    e.preventDefault();
    setStep(3);
  };

  // Step 3: Generate additional character details.
  const handleAIWriterStep3 = async () => {
    console.log(
      'Step 3: AI Writer button clicked. Starting API call for additional character details...'
    );
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
          messages: [
            {
              role: 'system',
              content:
                'You are an AI writer. Using the provided character details, generate additional character information.',
            },
            {
              role: 'user',
              content: `Generate additional details for a fictional character with the following details:
Name: "${name}"
Description: "${description}"
Image Prompt: "${imagePrompt}"
Return the result as a JSON object following this schema:
{
  "age": string,
  "race": string,
  "profession": string,
  "bio": string,
  "firstMessage": string
}`,
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
                  age: { type: 'string', description: "Character's age" },
                  race: { type: 'string', description: "Character's race" },
                  profession: { type: 'string', description: "Character's profession" },
                  bio: { type: 'string', description: "Character's biography" },
                  firstMessage: { type: 'string', description: "Character's first message" },
                },
                additionalProperties: false,
                required: ['age', 'race', 'profession', 'bio', 'firstMessage'],
              },
            },
          },
        }),
      });

      if (!response.ok) {
        console.error('Step 3: API call failed with status:', response.status);
        throw new Error('API call failed for additional character details');
      }

      const result = await response.json();
      const message = result.choices[0].message;

      if (message.refusal) {
        console.error('Step 3: Refusal received from API:', message.refusal);
        return;
      }

      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error('Step 3: Error parsing additional details message content:', e);
          return;
        }
      }

      setAge(parsed.age);
      setRace(parsed.race);
      setProfession(parsed.profession);
      setBio(parsed.bio);
      setFirstMessage(parsed.firstMessage);
    } catch (error) {
      console.error('Step 3: Error generating additional character details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    setStep(4);
  };

  // Initialize the chat context on step 4.
  useEffect(() => {
    if (step === 4) {
      const systemMessage = {
        role: 'system',
        content: `Continue roleplaying as a fictional character with the following details:
Name: ${name}
Description: ${description}
Age: ${age}
Race: ${race}
Profession: ${profession}
Bio: ${bio}
Image Prompt: ${imagePrompt}`,
      };
      const characterFirstMessage = {
        role: 'assistant',
        content: firstMessage,
      };
      setMessages([systemMessage, characterFirstMessage]);
    }
  }, [step]);

  // Auto-scroll chat container on message update.
  useEffect(() => {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // Handle sending chat messages.
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
        console.error('Step 4: Chat API call failed with status:', response.status);
        throw new Error('API call failed for chat');
      }
      const result = await response.json();
      const message = result.choices[0].message;
      let newMessages = [...updatedMessages, message];
      if (newMessages.length > 50) {
        newMessages = newMessages.slice(newMessages.length - 50);
      }
      setMessages(newMessages);
    } catch (error) {
      console.error('Step 4: Error during chat API call:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Blurred gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]" />
      {step !== 4 && (
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
              <form onSubmit={handleNext} className="w-full">
                <div className="mb-4">
                  <label htmlFor="name" className="block text-white mb-1">Name</label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter character description"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
                    className="w-full p-2 rounded bg-zinc-800 text-white border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter image prompt"
                  />
                </div>
                <button
                  type="submit"
                  className="mb-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
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
                    type="text"
                    id="age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
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
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Create
                </button>
              </form>
            </>
          )}
        </div>
      )}
      {step === 4 && (
        <div
          style={{ backgroundImage: `url(${generatedImage})` }}
          className="w-full max-w-[500px] h-screen bg-cover bg-center mx-auto relative flex flex-col"
        >
          <header className="flex items-center p-4 bg-black bg-opacity-50">
            <img
              src={generatedImage}
              alt="Avatar"
              className="w-10 h-10 rounded-full mr-4"
            />
            <h1 className="text-white text-xl font-bold">{name}</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4" id="chat-container">
            {messages
              .filter((msg) => msg.role !== 'system')
              .map((msg, idx) => (
                <div
                  key={idx}
                  className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
                >
                  <span
                    className={`inline-block text-sm max-w-[80%] p-2 rounded-xl bg-opacity-80 backdrop-blur-xl ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-white'
                      }`}
                  >
                    {msg.content}
                  </span>
                </div>
              ))}
          </div>
          <div className="p-4 bg-black bg-opacity-50">
            <form onSubmit={handleSendMessage} className="flex">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 text-black p-2 rounded-l"
                placeholder="Type your message..."
              />
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

// Main App: Wrap with providers and include a fixed ConnectButton in the top right corner.
export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <div className="relative min-h-screen">
            {/* Connect button fixed in the top-right corner */}
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
