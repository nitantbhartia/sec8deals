import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod/v4";
import type { NormalizationResult, CanonicalTask } from "./types";
import { getAllCanonicalTasks } from "./pricing";

const client = new Anthropic();

const NormalizationSchema = z.object({
  task_id: z.string(),
  task_label: z.string(),
  primary_trade: z.string(),
  problem_type: z.string(),
  scope: z.object({
    units: z.number().default(1),
    severity: z.enum(["minor", "moderate", "major"]).default("minor"),
    access_difficulty: z.enum(["standard", "difficult", "very_difficult"]).default("standard"),
    materials_needed: z.array(z.string()).default([]),
    diagnostic_required: z.boolean().default(false),
    permit_required: z.boolean().default(false),
  }),
  location_requirements: z.object({
    state_license_likely: z.boolean().default(false),
    city_permit_likely: z.boolean().default(false),
  }),
  clarifications_needed: z
    .array(
      z.object({
        field: z.string(),
        question: z.string(),
        default: z.union([z.string(), z.number(), z.boolean()]),
      })
    )
    .default([]),
  normalization_confidence: z.number().min(0).max(1),
  reasoning_summary: z.string(),
});

function buildTaskCatalogContext(tasks: CanonicalTask[]): string {
  return tasks
    .map(
      (t) =>
        `- task_id: "${t.task_id}" | name: "${t.task_name}" | trade: "${t.primary_trade}" | aliases: ${JSON.stringify(t.search_aliases.slice(0, 5))}`
    )
    .join("\n");
}

function buildSystemPrompt(tasks: CanonicalTask[]): string {
  const catalog = buildTaskCatalogContext(tasks);

  return `You are a home services task normalizer. Your ONLY job is to map a homeowner's plain-English description to one of our canonical task IDs. You do NOT generate prices.

## Canonical Task Catalog
${catalog}

## Rules
1. You MUST map to an existing task_id from the catalog above.
2. If no task matches, use task_id "unknown_task".
3. Handle vague, emotional, misspelled descriptions gracefully.
4. Capture ambiguity through clarifications_needed, not by guessing.
5. normalization_confidence should reflect how certain you are about the mapping:
   - 0.9+ = very clear match
   - 0.7-0.89 = probable match, minor ambiguity
   - 0.5-0.69 = could be multiple tasks
   - below 0.5 = unclear, use "unknown_task"
6. Respond with valid JSON ONLY matching the exact schema. No other text.
7. Do NOT fabricate task_ids that aren't in the catalog.

## Common Interpretations
- "the thing that controls hot/cold water" → plumbing_valve_replacement
- "toilet rocks/wobbles" → plumbing_toilet_reset
- "water around toilet base" → plumbing_wax_ring_replace
- "outlet doesn't work" → electrical_diagnose_outlet
- "hole in the wall" → handyman_drywall_patch

## Output Schema
{
  "task_id": "string (from catalog)",
  "task_label": "Human-readable task name",
  "primary_trade": "string",
  "problem_type": "repair|replacement|installation|diagnostic|maintenance|service",
  "scope": {
    "units": 1,
    "severity": "minor|moderate|major",
    "access_difficulty": "standard|difficult|very_difficult",
    "materials_needed": [],
    "diagnostic_required": false,
    "permit_required": false
  },
  "location_requirements": {
    "state_license_likely": false,
    "city_permit_likely": false
  },
  "clarifications_needed": [],
  "normalization_confidence": 0.0,
  "reasoning_summary": "Brief explanation"
}`;
}

export async function normalizeTask(
  userText: string,
  zipCode?: string
): Promise<NormalizationResult> {
  const tasks = getAllCanonicalTasks();
  const systemPrompt = buildSystemPrompt(tasks);

  const locationContext = zipCode ? ` (ZIP code: ${zipCode})` : "";

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Normalize this homeowner task description into structured JSON:\n\n"${userText}"${locationContext}\n\nRespond with JSON only.`,
      },
    ],
  });

  const textContent = message.content[0];
  if (textContent.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON found in normalization response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const result = NormalizationSchema.parse(parsed);

  // Validate that the task_id exists (unless it's unknown_task)
  if (result.task_id !== "unknown_task") {
    const validTask = tasks.find((t) => t.task_id === result.task_id);
    if (!validTask) {
      // LLM hallucinated a task_id — mark as unknown
      return {
        ...result,
        task_id: "unknown_task",
        normalization_confidence: Math.min(result.normalization_confidence, 0.3),
        reasoning_summary: `Original mapping "${result.task_id}" not found in catalog. Marked as unknown.`,
      };
    }
  }

  return result;
}
