'use client';

import { useState } from "react";

export default function Home() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAIWriter = async () => {
    console.log("AI Writer button clicked. Starting API call...");
    setLoading(true);
    try {
      // WARNING: For production use, move this API call to a secure backend.
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Make sure to secure your API key. Do NOT expose it in client-side code.
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-2024-08-06", // supported model for Structured Outputs
          messages: [
            {
              role: "system",
              content:
                "You are an AI writer. Create a fictional character. Return the result as a JSON object that strictly follows the provided JSON schema.",
            },
            {
              role: "user",
              content: "Please generate a fictional character with a name and description.",
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "fictional_character", // required schema name
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "The name of the fictional character",
                  },
                  description: {
                    type: "string",
                    description: "A description of the fictional character",
                  },
                },
                additionalProperties: false,
                required: ["name", "description"],
              },
            },
          },
        }),
      });

      console.log("API response received:", response);

      if (!response.ok) {
        console.error("API call failed with status:", response.status);
        throw new Error("API call failed");
      }

      const result = await response.json();
      console.log("Parsed JSON result:", result);

      const message = result.choices[0].message;
      console.log("API message object:", message);

      if (message.refusal) {
        console.error("Refusal received from API:", message.refusal);
        return;
      }

      // Try to get the parsed result from the message.
      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error("Error parsing message content:", e);
          return;
        }
      }
      console.log("Parsed character data:", parsed);

      // Populate the form fields with the received values.
      setName(parsed.name);
      setDescription(parsed.description);
    } catch (error) {
      console.error("Error generating character:", error);
    } finally {
      setLoading(false);
      console.log("API call completed.");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted with data:", { name, description });
    // Further submission logic here...
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Blurred gradient background with negative z-index */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]"></div>
      {/* Main container */}
      <div className="w-full max-w-[500px] bg-zinc-900 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
        {/* AI Writer Button */}
        <button
          onClick={handleAIWriter}
          disabled={loading}
          className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Generating..." : "AI Writer"}
        </button>
        <h1 className="text-white text-4xl font-bold mb-6">
          Create Fictional Character
        </h1>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="mb-4">
            <label htmlFor="name" className="block text-white mb-1">
              Name
            </label>
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
            <label htmlFor="description" className="block text-white mb-1">
              Description
            </label>
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
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
