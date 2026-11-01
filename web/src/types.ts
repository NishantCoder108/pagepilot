export type Provider = "openai" | "anthropic" | "gemini";
export type Status = "streaming" | "complete" | "incomplete";
export interface Passage {
  id: string;
  heading: string | null;
  text: string;
}
export interface Document {
  id: string;
  title: string;
  source_url: string | null;
  extracted_at: number;
  passages: Passage[];
}
export interface Conversation {
  id: string;
  document_id: string;
}
export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: string[];
  provider?: Provider;
  model?: string;
  created_at: number;
  status: Status;
}
export interface Summary {
  document_id: string;
  content: string;
  citations: string[];
  provider: Provider;
  model: string;
  created_at: number;
  status: Status;
}
export interface Workspace {
  document: Document;
  conversation: Conversation;
  messages: Message[];
  summary?: Summary;
}
export interface Model {
  provider: Provider;
  id: string;
  label: string;
  input_budget: number;
  output_tokens: number;
}
export interface GenerationRequest {
  mode: "summary" | "chat";
  provider: Provider;
  model: string;
  document: Document;
  history: { role: "user" | "assistant"; content: string }[];
  question?: string;
  passage_ids?: string[];
}
export type StreamEvent =
  | { type: "progress"; message: string }
  | { type: "delta"; text: string }
  | { type: "complete"; citations: string[] };
