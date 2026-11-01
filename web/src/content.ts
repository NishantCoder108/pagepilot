import type { Provider } from "./types";

export const PROVIDERS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
};
export const QUESTIONS = [
  "What are the main ideas?",
  "Explain this in simpler terms.",
  "What practical steps does this suggest?",
];
export const SAMPLE = `# The quiet power of focused reading

We have more information within reach than ever before, yet understanding still takes attention. Focused reading means choosing one useful question before opening an article, and giving the source enough time to answer it.

## Start with a question

Instead of collecting links for later, ask what you want to learn now. A specific question helps you notice the passages that matter. For example, a developer learning Rust might ask how Tokio handles many network requests at once.

## Read, then reflect

A summary provides a map of an article, but returning to the original passages helps preserve nuance. Ask a follow-up question, check the evidence, and explain the idea in your own words. This turns passive browsing into active understanding.

## Keep the useful parts close

An automatic local reading history removes the need to organize every page into folders. Save the source and conversation together, export what you need, and delete what no longer helps. The goal is to spend less time managing information and more time learning from it.`;
