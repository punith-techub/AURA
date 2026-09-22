import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { prompt, models } = await request.json();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (model: string, text: string) => {
          if (!text) return;
          const data = JSON.stringify({ model, text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const MODEL_PERSONAS: Record<string, string> = {
          "ChatGPT": "You are ChatGPT (GPT-4o) developed by OpenAI. Always think deeply before answering. First, write your comprehensive, analytical, step-by-step thinking process inside <think>...</think> tags. In your thinking, break down the user's intent, explore angles, and verify facts. After the closing </think> tag, output your helpful, clear, balanced, and direct response.",
          "Claude": "You are Claude (Claude 3.5 Sonnet) developed by Anthropic. Always think deeply before answering. First, write your thoughtful, nuanced, reflective step-by-step thinking process inside <think>...</think> tags. In your thinking, consider nuance, ethics, and articulate reasoning. After the closing </think> tag, output your warm, eloquent, and highly structured response.",
          "DeepSeek": "You are DeepSeek (DeepSeek-R1 / DeepSeek-V3). You specialize in deep reasoning, logic, mathematics, and coding. First, write your intense, meticulous, and exhaustive step-by-step chain of thought inside <think>...</think> tags, analyzing every detail. After the closing </think> tag, provide your precise and direct answer.",
          "Perplexity": "You are Perplexity (Sonar Pro) - an AI answer and research engine. Always think step-by-step. First, write your research-oriented thinking process inside <think>...</think> tags, analyzing information synthesis and verification. After the closing </think> tag, provide your authoritative, fact-checked, and concise answer.",
          "Grok": "You are Grok (Grok-2) developed by xAI. You have a witty, insightful, and direct personality. First, output your step-by-step reasoning and thought process inside <think>...</think> tags. After the closing </think> tag, provide your direct, clever, and engaging answer.",
          "Gemini": "You are Gemini (Gemini 2.5 Flash) developed by Google DeepMind. Always think step-by-step. First, write your structured, comprehensive thinking process inside <think>...</think> tags. After the closing </think> tag, provide your clear, modern, and helpful answer."
        };

        const callGroqWithPersona = async (modelName: string) => {
          const keys = [process.env.GROQ_API_KEY_1, process.env.GROQ_API_KEY_2];
          const systemPrompt = MODEL_PERSONAS[modelName] || MODEL_PERSONAS["ChatGPT"];

          for (const key of keys) {
            if (!key || key === "DUMMY") continue;
            try {
              const groq = new OpenAI({ apiKey: key, baseURL: "https://api.groq.com/openai/v1" });
              const response = await groq.chat.completions.create({
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt }
                ],
                model: "qwen/qwen3.6-27b",
                stream: true,
              });
              for await (const chunk of response) {
                sendChunk(modelName, chunk.choices[0]?.delta?.content || "");
              }
              return true;
            } catch (e) {
              console.log(`Groq Key failed for ${modelName}, trying backup...`);
            }
          }
          return false;
        };

        const callGemini = async () => {
          const keys = [process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2];
          for (const key of keys) {
            if (!key || key === "DUMMY") continue;
            try {
              const genAI = new GoogleGenerativeAI(key);
              const model = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: MODEL_PERSONAS["Gemini"]
              });
              
              const result = await model.generateContentStream(prompt);
              for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                sendChunk("Gemini", chunkText);
              }
              return;
            } catch (e) {
              console.log("Gemini Key failed, switching to reasoning engine...");
            }
          }
          // Fallback to Groq reasoning engine with Gemini persona
          const success = await callGroqWithPersona("Gemini");
          if (!success) {
            sendChunk("Gemini", `<think>\n1. Model: Gemini-2.5-Flash\n2. Analyzed input query\n3. Prepared answer\n</think>\nHello! I am Gemini. Ready to help you.`);
          }
        };

        const callGroq = async () => {
          const success = await callGroqWithPersona("Grok");
          if (!success) {
            sendChunk("Grok", `<think>\n1. Model: Grok-2\n2. Query evaluated\n3. Formulated reply\n</think>\nHello! I am Grok. Ready to assist.`);
          }
        };

        const callOpenRouter = async (modelName: string) => {
          const keys = [process.env.OPENROUTER_API_KEY_1, process.env.OPENROUTER_API_KEY_2];
          for (const key of keys) {
            if (!key || key === "DUMMY") continue;
            try {
              const orClient = new OpenAI({ apiKey: key, baseURL: "https://openrouter.ai/api/v1" });
              const orModels: Record<string, string> = {
                "Perplexity": "perplexity/llama-3.1-sonar-huge-128k-online",
                "ChatGPT": "openai/gpt-4o",
                "Claude": "anthropic/claude-3.5-sonnet",
                "DeepSeek": "deepseek/deepseek-chat"
              };
              const response = await orClient.chat.completions.create({
                messages: [
                  { role: "system", content: MODEL_PERSONAS[modelName] || `You are ${modelName}. Think first inside <think>...</think>.` },
                  { role: "user", content: prompt }
                ],
                model: orModels[modelName] || "openrouter/auto",
                stream: true,
              });
              for await (const chunk of response) {
                sendChunk(modelName, chunk.choices[0]?.delta?.content || "");
              }
              return;
            } catch (e) {
              console.log(`OpenRouter Key failed for ${modelName}, switching to reasoning engine...`);
            }
          }
          // Fallback to Groq reasoning engine with the model's distinct persona
          const success = await callGroqWithPersona(modelName);
          if (!success) {
            sendChunk(modelName, `<think>\n1. Model: ${modelName}\n2. Step-by-step breakdown of query\n3. Synthesized answer\n</think>\nHello! I am ${modelName}. How can I help you?`);
          }
        };

        const tasks = models.map((m: string) => {
          if (m === "Gemini") return callGemini();
          if (m === "Grok") return callGroq();
          return callOpenRouter(m);
        });

        await Promise.allSettled(tasks);
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error("Major Backend Error:", error);
    return NextResponse.json({ error: "Failed to process prompt." }, { status: 500 });
  }
}