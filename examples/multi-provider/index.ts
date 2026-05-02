import Anthropic from '@anthropic-ai/sdk';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { AnthropicInstrumentation } from '@reaatech/otel-genai-semconv-anthropic';
import { OpenAIInstrumentation } from '@reaatech/otel-genai-semconv-openai';
import OpenAI from 'openai';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
});

sdk.start();

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  new OpenAIInstrumentation({
    trackCosts: true,
    captureRequestHeaders: true,
  }).instrument(openai);

  new AnthropicInstrumentation({
    trackCosts: true,
    captureRequestHeaders: true,
  }).instrument(anthropic);

  const prompt = 'What are the benefits of OpenTelemetry?';

  console.log('=== OpenAI Response ===');
  const openaiResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 200,
  });
  console.log(openaiResponse.choices[0]?.message?.content);
  console.log('Tokens:', openaiResponse.usage);

  console.log('\n=== Anthropic Response ===');
  const anthropicResponse = await anthropic.messages.create({
    model: 'claude-opus-20240229',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  });
  console.log(anthropicResponse.content[0]?.text);
  console.log('Tokens:', anthropicResponse.usage);
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
