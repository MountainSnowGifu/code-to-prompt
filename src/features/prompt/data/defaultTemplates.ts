import type { PromptTemplate } from "../types/prompt";
import defaultTemplates from "./defaultTemplates.json";

function isPromptTemplate(value: unknown): value is PromptTemplate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Record<keyof PromptTemplate, unknown>>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.body === "string"
  );
}

function loadDefaultTemplates(): PromptTemplate[] {
  const parsed: unknown = defaultTemplates;
  if (!Array.isArray(parsed) || !parsed.every(isPromptTemplate)) {
    throw new Error("defaultTemplates.json must contain prompt templates");
  }
  return parsed;
}

export const DEFAULT_TEMPLATES: PromptTemplate[] = loadDefaultTemplates();
