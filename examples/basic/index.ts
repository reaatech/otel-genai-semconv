import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OpenAIInstrumentation } from '@reaatech/otel-genai-semconv-openai';
import OpenAI from 'openai';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

async function main() {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  new OpenAIInstrumentation({
    trackCosts: true,
    captureRequestHeaders: true,
    captureResponseHeaders: true,
  }).instrument(client);

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
