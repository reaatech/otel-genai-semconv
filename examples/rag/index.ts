/**
 * RAG (Retrieval-Augmented Generation) example
 * 
 * This example demonstrates how to trace a complete RAG pipeline
 * with document retrieval, context injection, and answer generation.
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OpenAIInstrumentation } from 'otel-genai-semconv/openai';
import { tracer, trace } from '@opentelemetry/api';
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

const DOCUMENT_STORE: Record<string, string> = {
  opentelemetry: 'OpenTelemetry is an open-source observability framework providing APIs, SDKs, and tools for instrumenting, generating, collecting, and exporting telemetry data (traces, metrics, and logs).',
  otel_genai: 'The OpenTelemetry GenAI semantic conventions define standard span attributes and events for instrumenting LLM provider calls, including request/response metadata, token usage, and cost tracking.',
  rag_pattern: 'RAG (Retrieval-Augmented Generation) is a pattern where relevant documents are retrieved from a knowledge base and injected into the LLM prompt as context, improving answer accuracy and reducing hallucinations.',
};

function retrieveDocuments(query: string): { key: string; content: string }[] {
  const keywords = query.toLowerCase().split(/\s+/);
  return Object.entries(DOCUMENT_STORE)
    .map(([key, content]) => {
      const score = keywords.filter(kw => content.toLowerCase().includes(kw)).length;
      return { key, content, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ key, content }) => ({ key, content }));
}

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const userQuery = 'What is OpenTelemetry GenAI semantic conventions?';

  const span = tracer.startSpan('rag_pipeline');

  try {
    const retrievedDocs = retrieveDocuments(userQuery);

    const contextText = retrievedDocs
      .map(doc => `Document: ${doc.key}\n${doc.content}`)
      .join('\n\n');

    const prompt = `Based on the following context, answer the question.\n\nContext:\n${contextText}\n\nQuestion: ${userQuery}`;

    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that answers based on the provided context.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    console.log('Answer:', response.choices[0]?.message?.content);
    console.log('Retrieved documents:', retrievedDocs.map(d => d.key).join(', '));

    span.setAttribute('rag.documents_retrieved', retrievedDocs.length);
    span.setAttribute('rag.document_keys', retrievedDocs.map(d => d.key).join(','));

  } catch (error) {
    span.recordException(error as Error);
    throw error;
  } finally {
    span.end();
  }
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
