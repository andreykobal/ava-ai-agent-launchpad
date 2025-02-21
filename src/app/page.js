'use client';

import { useState } from "react";
import { Civitai, Scheduler } from "civitai";

export default function Home() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [loading, setLoading] = useState(false);

  // Create a Civitai client instance
  const civitai = new Civitai({
    auth: process.env.NEXT_PUBLIC_CIVITAI_API_TOKEN,
  });

  // Step 1: Generate fictional character
  const handleAIWriter = async () => {
    console.log("Character AI Writer button clicked. Starting API call for character...");
    setLoading(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Remember: secure your API key in production.
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-2024-08-06",
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
              name: "fictional_character",
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

      console.log("Character API response received:", response);

      if (!response.ok) {
        console.error("Character API call failed with status:", response.status);
        throw new Error("API call failed for character generation");
      }

      const result = await response.json();
      console.log("Parsed character JSON result:", result);

      const message = result.choices[0].message;
      console.log("Character API message object:", message);

      if (message.refusal) {
        console.error("Refusal received from character API:", message.refusal);
        return;
      }

      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error("Error parsing character message content:", e);
          return;
        }
      }
      console.log("Parsed character data:", parsed);

      setName(parsed.name);
      setDescription(parsed.description);
    } catch (error) {
      console.error("Error generating character:", error);
    } finally {
      setLoading(false);
      console.log("Character API call completed.");
    }
  };

  // Step 2: Generate image prompt for the character
  const handleAIImagePrompt = async () => {
    console.log("Image Prompt AI Writer button clicked. Starting API call for image prompt...");
    setLoading(true);
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "system",
              content:
                "You are an AI writer. Generate an image prompt for a fictional character. The image prompt should be a concise, descriptive sentence suitable for image generation.",
            },
            {
              role: "user",
              content: `Generate an image prompt of simple 1-2 word comma-separated phrases for a fictional character, starting with gender (1girl or 1boy) with the name "${name}" and description "${description}".`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "image_prompt",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  imagePrompt: {
                    type: "string",
                    description:
                      "A descriptive image prompt for generating an image of the fictional character",
                  },
                },
                additionalProperties: false,
                required: ["imagePrompt"],
              },
            },
          },
        }),
      });

      console.log("Image prompt API response received:", response);

      if (!response.ok) {
        console.error("Image prompt API call failed with status:", response.status);
        throw new Error("API call failed for image prompt generation");
      }

      const result = await response.json();
      console.log("Parsed image prompt JSON result:", result);

      const message = result.choices[0].message;
      console.log("Image prompt API message object:", message);

      if (message.refusal) {
        console.error("Refusal received from image prompt API:", message.refusal);
        return;
      }

      let parsed = message.parsed;
      if (!parsed && message.content) {
        try {
          parsed = JSON.parse(message.content);
        } catch (e) {
          console.error("Error parsing image prompt message content:", e);
          return;
        }
      }
      console.log("Parsed image prompt data:", parsed);

      setImagePrompt(parsed.imagePrompt);
    } catch (error) {
      console.error("Error generating image prompt:", error);
    } finally {
      setLoading(false);
      console.log("Image prompt API call completed.");
    }
  };

  // Step 2: Generate image using Civitai
  const handleGenerateImage = async () => {
    console.log("Generate Image button clicked. Starting image generation with Civitai...");
    setLoading(true);
    try {
      const input = {
        model: "urn:air:sdxl:checkpoint:civitai:827184@1410435",
        params: {
          prompt: "masterpiece,best quality,amazing quality, cowboy shot, " + imagePrompt,
          negativePrompt: "bad quality,worst quality,worst detail,sketch,censor,",
          scheduler: Scheduler.EULER_A,
          steps: 20,
          cfgScale: 7,
          width: 832,
          height: 1216,
          clipSkip: 2,
        },
      };

      console.log("Civitai input:", input);
      // Run the generation with long polling
      const response = await civitai.image.fromText(input, true);
      console.log("Civitai image generation response:", response);

      // Grab the top-level job
      const topJob = response.jobs?.[0];
      if (!topJob?.result?.jobs) {
        console.error("No nested jobs array found in the result.");
        return;
      }

      // Within that top-level job, find the nested job that has the actual image
      const nestedJob = topJob.result.jobs.find(
        (j) => j.result?.available && j.result?.blobUrl
      );

      if (nestedJob) {
        setGeneratedImage(nestedJob.result.blobUrl);
        console.log("Generated image URL:", nestedJob.result.blobUrl);
      } else {
        console.error("Image generation job did not return a valid image.");
      }
    } catch (error) {
      console.error("Error generating image with Civitai:", error);
    } finally {
      setLoading(false);
      console.log("Civitai image generation completed.");
    }
  };


  const handleNext = (e) => {
    e.preventDefault();
    console.log("Moving to step 2 with character data:", { name, description });
    setStep(2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Final submission data:", { name, description, imagePrompt, generatedImage });
    // Further submission logic here...
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Blurred gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 filter blur-3xl z-[-1]"></div>
      {/* Main container */}
      <div className="w-full max-w-[500px] bg-zinc-900 bg-opacity-50 mx-auto relative z-10 flex flex-col p-6">
        {step === 1 && (
          <>
            {/* AI Writer Button for Character Generation */}
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
            <form onSubmit={handleNext} className="w-full">
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
                Next
              </button>
            </form>
          </>
        )}
        {step === 2 && (
          <>
            {/* AI Writer Button for Image Prompt Generation */}
            <button
              onClick={handleAIImagePrompt}
              disabled={loading}
              className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Generating..." : "AI Writer"}
            </button>
            <h1 className="text-white text-4xl font-bold mb-6">
              Generate Image Prompt
            </h1>
            <form onSubmit={handleSubmit} className="w-full">
              <div className="mb-4">
                <label htmlFor="imagePrompt" className="block text-white mb-1">
                  Image Prompt
                </label>
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
                Submit
              </button>
            </form>
            {/* New button to generate image using Civitai */}
            <button
              onClick={handleGenerateImage}
              disabled={loading}
              className="mb-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading ? "Generating Image..." : "Generate Image"}
            </button>
            {generatedImage && (
              <div className="mt-4">
                <h2 className="text-white text-xl mb-2">Generated Image:</h2>
                <img src={generatedImage} alt="Generated" className="w-full rounded" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
