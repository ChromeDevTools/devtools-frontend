// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Makes requests to the Gemini API. Assumes process.env.GEMINI_API_KEY is available.
 * Note: the reason we do not use any Google Gemini SDK here is to save on the
 * node module install & committing it to the repo. Our API usage of Gemini is
 * lightweight so it doesn't feel worth it vs just wrapping the XHR requests
 * ourselves.
 */

// Define interfaces for better type safety
interface Part {
  text: string;
}

interface Content {
  parts: Part[];
}

interface GenerateContentRequestBody {
  contents: Content[];
  generationConfig?: {
    responseMimeType: string,
    responseSchema: object,
  };
}

interface CandidatePart {
  text: string;
}

interface CandidateContent {
  parts: CandidatePart[];
  role: string;
}

interface Candidate {
  content: CandidateContent;
  finishReason: string;
  index: number;
}

interface GenerateContentResponse {
  candidates: Candidate[];
}

/**
 * Helper function to construct the request body for the Gemini generateContent API.
 *
 * @param promptText The text prompt for the Gemini model.
 * @param jsonSchema An optional JSON schema to define the expected response structure.
 * @returns The constructed GenerateContentRequestBody object.
 */
function buildGeminiRequestBody(promptText: string, jsonSchema?: object): GenerateContentRequestBody {
  const requestBody: GenerateContentRequestBody = {
    contents: [
      {
        parts: [
          {
            text: promptText,
          },
        ],
      },
    ],
  };

  if (jsonSchema) {
    requestBody.generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: jsonSchema,
    };
  }

  return requestBody;
}

/**
 * Makes a request to the Gemini API's generateContent endpoint.
 *
 * @param promptText The text prompt to send to the Gemini model.
 * @param modelName The name of the Gemini model to use (e.g., 'gemini-pro', 'gemini-1.5-flash').
 * @returns A Promise that resolves to the generated text, or an error string.
 */
export async function generateGeminiContent(
    promptText: string, modelName = 'gemini-2.5-flash', jsonSchema?: object): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Please provide your API key.');
  }

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

  const requestBody = buildGeminiRequestBody(promptText, jsonSchema);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data: GenerateContentResponse = await response.json();

    // Safely access the generated content
    return (
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'No content generated or content not in expected format.');
  } catch (error) {
    console.error('Error generating content:', error);
    return `Error: Could not generate content. Details: ${error instanceof Error ? error.message : String(error)}`;
  }
}
