# Cost Tracking

## Capability
Real-time cost calculation and tracking for LLM API usage across all providers.

## Usage Examples

### Example 1: Calculate Cost
```typescript
import { CostCalculator } from 'otel-genai-semconv/utils';

const calculator = new CostCalculator();

const cost = calculator.calculate({
  provider: 'openai',
  model: 'gpt-4',
  inputTokens: 1000,
  outputTokens: 500,
});

console.log(`Total cost: $${cost.total.toFixed(6)}`);
// Output: Total cost: $0.045000
```

### Example 2: Custom Pricing
```typescript
const calculator = new CostCalculator({
  customPricing: {
    'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
    'claude-opus': { input: 0.015, output: 0.075 },
  },
});
```

## Pricing Data
| Provider | Models Covered | Update Frequency |
|----------|----------------|------------------|
| OpenAI | All models | On pricing change |
| Anthropic | All models | On pricing change |
| Google Vertex AI | All models | On pricing change |
| AWS Bedrock | All model families | On pricing change |

## Cost Attributes in Spans
- `llm.cost.total` — Total cost in USD
- `llm.cost.input` — Input token cost
- `llm.cost.output` — Output token cost
- `llm.cost.currency` — Currency code (default: USD)

## Error Handling
- **Unknown model**: Falls back to default pricing, logs warning
- **Invalid token count**: Returns error with validation message
- **Missing provider**: Returns error with supported providers list

## Security Considerations
- Pricing data is versioned and cached
- Custom pricing overrides are validated
- Cost data never includes sensitive information
- Audit logging for all cost calculations

## Performance
- Cost calculation: <1ms per request
- Pricing data cached in memory
- Batch processing for multiple calculations
- Async updates for pricing data
