# AVA AI AGENT LAUNCHPAD

AVA AI agent launchpad is a modern web application that lets you create, deploy, and interact with a custom AI agent on the blockchain. It leverages OpenAI's chat API to generate AI agent details and image prompts, uses Civitai to generate high-quality images, and deploys a smart contract to mint your AI agent as a token. Once created, you can even chat with your deployed AI agent in real time.

---

## How It Works

1. **Generate AI Agent Details:**  
   The app starts by using the OpenAI API to generate the basic details of your AI agent, such as its name and description.

2. **Create an Image Prompt & Generate an Image:**  
   It then produces a concise image prompt for your AI agent and uses Civitai to generate a matching image.

3. **Finalize & Deploy:**  
   Additional details (like age, race, profession, bio, and a first message) are generated via OpenAI, and a smart contract function is called to deploy the AI agent on the blockchain.

4. **Chat Interface:**  
   After deployment, the app offers a chat interface where you can interact with your AI agent, maintaining a dynamic conversation based on the on-chain data.

---

## Code Snippets

### 1. Smart Contract Interaction

This snippet shows how the app sets up the smart contract ABI and calls the `createAIAgent` function to deploy a new AI agent:

```javascript
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
  // ... additional functions and events ...
];
const FACTORY_ADDRESS = '0x26af2afddf1903F8C8CDc0c1Cc8b7201a20a9209';

// Using Wagmi's useWriteContract to call the smart contract:
const { writeContractAsync: createAgent } = useWriteContract();

const handleCreate = async (e) => {
  e.preventDefault();
  const txHash = await createAgent({
    abi: factoryABI,
    address: FACTORY_ADDRESS,
    functionName: 'createAIAgent',
    args: [name, Number(age), race, profession, bio, firstMessage, generatedImage],
  });
  // Wait for the transaction to be mined and decode the event log...
};
```

### 2. Chat Interaction

Here’s a simplified snippet showing how user messages are sent to the OpenAI chat API and responses are handled to maintain a conversation with the AI agent:

```javascript
const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!chatInput.trim()) return;
  
  // Append user's message to the conversation
  const newUserMessage = { role: 'user', content: chatInput.trim() };
  let updatedMessages = [...messages, newUserMessage];
  setMessages(updatedMessages);
  setChatInput('');
  
  // Call OpenAI's chat API to get the AI agent's response
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
  
  const result = await response.json();
  const message = result.choices[0].message;
  setMessages([...updatedMessages, message]);
};
```

---

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/ava-ai-agent-launchpad.git
   cd ava-ai-agent-launchpad
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**  
   Create a `.env` file with your API keys and RPC URLs (for OpenAI, Civitai, WalletConnect, etc.).

4. **Run the application:**

   ```bash
   npm run dev
   ```

Now, you can generate, deploy, and chat with your very own AI agent!

---

Happy building with ava ai agent launchpad!