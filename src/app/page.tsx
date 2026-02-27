"use client";

import { useState, useRef } from "react";
import { TaskInput } from "@/components/TaskInput";
import { EstimateResult } from "@/components/EstimateResult";
import type { EstimateResponse } from "@/lib/types";

export default function HomePage() {
  const [estimate, setEstimate] = useState<EstimateResponse | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  function handleEstimate(data: EstimateResponse, task: string) {
    setEstimate(data);
    setTaskDescription(task);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="px-4 pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight text-gray-900">
            Know what it{" "}
            <span className="text-blue-600">should</span> cost.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-500 max-w-xl mx-auto">
            Get instant, AI-powered price estimates for any home service task.
            No sign-up required.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mt-10">
          <TaskInput onEstimate={handleEstimate} />
        </div>

        {/* Trust Signals */}
        <div className="max-w-lg mx-auto mt-12 flex justify-center gap-8 text-sm text-gray-400">
          <span>No sign-up required</span>
          <span className="hidden sm:inline">|</span>
          <span>Powered by AI</span>
          <span className="hidden sm:inline">|</span>
          <span>100% free</span>
        </div>
      </section>

      {/* Estimate Result */}
      {estimate && (
        <section ref={resultRef} className="px-4 pb-16">
          <div className="max-w-2xl mx-auto">
            <EstimateResult
              estimate={estimate}
              taskDescription={taskDescription}
            />
          </div>
        </section>
      )}

      {/* How It Works */}
      {!estimate && (
        <section className="px-4 py-16 bg-gray-50">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Describe Your Task
                </h3>
                <p className="text-sm text-gray-500">
                  Tell us what you need done in plain English. No need to know
                  the technical terms.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Get Your Estimate
                </h3>
                <p className="text-sm text-gray-500">
                  Our AI identifies the right trade, estimates the cost, and
                  tells you what to watch out for.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Find a Pro
                </h3>
                <p className="text-sm text-gray-500">
                  Connect with vetted contractors on Thumbtack or Angi, armed
                  with fair pricing knowledge.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Popular Tasks */}
      {!estimate && (
        <section className="px-4 py-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-10">
              Popular Estimates
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { task: "Faucet Replacement", range: "$150 - $450", trade: "Plumber" },
                { task: "Ceiling Fan Install", range: "$150 - $500", trade: "Electrician" },
                { task: "AC Repair", range: "$150 - $700", trade: "HVAC Tech" },
                { task: "Room Painting", range: "$300 - $1,000", trade: "Painter" },
                { task: "Toilet Repair", range: "$100 - $350", trade: "Plumber" },
                { task: "Roof Leak Repair", range: "$300 - $1,200", trade: "Roofer" },
              ].map((item) => (
                <div
                  key={item.task}
                  className="p-4 border border-gray-100 rounded-xl hover:border-blue-200 transition-colors"
                >
                  <p className="font-medium text-gray-900">{item.task}</p>
                  <p className="text-sm text-blue-600 font-semibold mt-1">
                    {item.range}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{item.trade}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
