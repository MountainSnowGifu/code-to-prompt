import { useState } from "react";
import { DEFAULT_TEMPLATES } from "../data/defaultTemplates";
import type { PromptTemplate } from "../types/prompt";

const STORAGE_KEY = "code-to-prompt:templates";

function isPromptTemplate(value: unknown): value is PromptTemplate {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Record<keyof PromptTemplate, unknown>>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.body === "string"
  );
}

function loadTemplates(): PromptTemplate[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed) && parsed.every(isPromptTemplate)) {
        return parsed;
      }
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
  return DEFAULT_TEMPLATES;
}

function saveTemplates(templates: PromptTemplate[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {}
}

export function usePromptTemplates() {
  const [templates, setTemplates] = useState<PromptTemplate[]>(loadTemplates);

  function update(next: PromptTemplate[]) {
    setTemplates(next);
    saveTemplates(next);
  }

  function addTemplate(data?: { title: string; body: string }) {
    const newTemplate: PromptTemplate = {
      id: crypto.randomUUID(),
      title: data?.title ?? "New template",
      body: data?.body ?? "",
    };
    update([newTemplate, ...templates]);
    return newTemplate.id;
  }

  function updateTemplate(id: string, patch: Partial<Omit<PromptTemplate, "id">>) {
    update(templates.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTemplate(id: string) {
    update(templates.filter((t) => t.id !== id));
  }

  function resetToDefault() {
    update(DEFAULT_TEMPLATES);
  }

  return { templates, addTemplate, updateTemplate, deleteTemplate, resetToDefault };
}
