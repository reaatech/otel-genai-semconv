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

  const stream = await client.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Tell me a short story about a robot.' },
    ],
    temperature: 0.7,
    max_tokens: 300,
    stream: true,
  });

  let fullResponse = '';
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || '';
    fullResponse += content;
    process.stdout.write(content);
  }

  console.log('\n\n--- Streaming complete ---');
  console.log('Total response length:', fullResponse.length);
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
