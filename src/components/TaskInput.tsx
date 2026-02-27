"use client";

import { useState } from "react";
import type { EstimateResponse } from "@/lib/types";

const EXAMPLE_TASKS = [
  "Replace kitchen faucet",
  "Install ceiling fan in bedroom",
  "Fix a leaky pipe under the sink",
  "Paint the living room",
  "My toilet rocks when I sit on it",
  "Install a new light in my garage",
];

interface TaskInputProps {
  onEstimate: (estimate: EstimateResponse, task: string) => void;
}

export function TaskInput({ onEstimate }: TaskInputProps) {
  const [task, setTask] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskDescription: task.trim(),
          zipCode: zipCode || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate estimate");
      }

      onEstimate(data, task.trim());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleExampleClick(example: string) {
    setTask(example);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you need done..."
            className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none"
            rows={3}
            maxLength={500}
          />
        </div>
        <div className="flex gap-3">
          <input
            type="text"
            value={zipCode}
            onChange={(e) =>
              setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            placeholder="ZIP code (optional)"
            className="px-4 py-3 border-2 border-gray-200 rounded-xl w-40 focus:border-blue-500 focus:outline-none transition-colors"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={!task.trim() || isLoading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Getting estimate...
              </span>
            ) : (
              "Get Price Estimate"
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm text-gray-400 mb-2">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TASKS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
