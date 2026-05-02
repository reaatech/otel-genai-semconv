export interface AggregatedResponse {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  truncated: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export class ChunkAggregator {
  private contentParts: string[] = [];
  private toolCalls: Map<string, ToolCall> = new Map();
  private finishReason: string | null = null;
  private model: string | null = null;
  private inputTokens = 0;
  private outputTokens = 0;
  private truncated = false;

  addText(text: string): void {
    this.contentParts.push(text);
  }

  addToolCallChunk(data: { id?: string; name?: string; arguments?: string }): void {
    if (data.id) {
      const existing = this.toolCalls.get(data.id);
      if (existing) {
        if (data.arguments) {
          existing.arguments += data.arguments;
        }
      } else {
        this.toolCalls.set(data.id, {
          id: data.id,
          name: data.name ?? '',
          arguments: data.arguments ?? '',
        });
      }
    } else {
      const lastId = Array.from(this.toolCalls.keys()).pop();
      if (lastId !== undefined) {
        const existing = this.toolCalls.get(lastId);
        if (existing && data.arguments) {
          existing.arguments += data.arguments;
        }
      }
    }
  }

  setFinishReason(reason: string): void {
    this.finishReason = reason;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setTokenUsage(input: number, output: number): void {
    this.inputTokens = input;
    this.outputTokens = output;
  }

  setTruncated(): void {
    this.truncated = true;
  }

  build(): AggregatedResponse {
    return {
      content: this.contentParts.join(''),
      toolCalls: Array.from(this.toolCalls.values()),
      finishReason: this.finishReason,
      model: this.model,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      truncated: this.truncated,
    };
  }

  reset(): void {
    this.contentParts = [];
    this.toolCalls = new Map();
    this.finishReason = null;
    this.model = null;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.truncated = false;
  }

  getCurrentContent(): string {
    return this.contentParts.join('');
  }

  getCurrentToolCalls(): ToolCall[] {
    return Array.from(this.toolCalls.values());
  }
}

export function createChunkAggregator(): ChunkAggregator {
  return new ChunkAggregator();
}
