/**
 * Basic instrumentation example
 * 
 * This example demonstrates how to instrument OpenAI SDK calls
 * with otel-genai-semconv.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenAIInstrumentation } from 'otel-genai-semconv/openai';
import OpenAI from 'openai';

// Initialize OTel SDK
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    new OpenAIInstrumentation({
      trackCosts: true,
      captureRequestHeaders: true,
      captureResponseHeaders: true,
    }),
  ],
});

sdk.start();

// Use OpenAI SDK normally - it's automatically instrumented
async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is OpenTelemetry?' },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  console.log('Response:', response.choices[0]?.message?.content);
}

main().catch(console.error);

process.on('SIGTERM', async () => {
  await sdk.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await sdk.shutdown();
  process.exit(0);
});
