/**
 * Chunk aggregation for streaming responses
 */

/**
 * Aggregated streaming response
 */
export interface AggregatedResponse {
  /** Complete text content */
  content: string;
  /** Tool calls if present */
  toolCalls: ToolCall[];
  /** Finish reason */
  finishReason: string | null;
  /** Model from response */
  model: string | null;
  /** Total input tokens */
  inputTokens: number;
  /** Total output tokens */
  outputTokens: number;
  /** Whether response was truncated due to error */
  truncated: boolean;
}

/**
 * Tool call data
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

/**
 * Aggregator for streaming chunks
 */
export class ChunkAggregator {
  private contentParts: string[] = [];
  private toolCalls: Map<string, ToolCall> = new Map();
  private finishReason: string | null = null;
  private model: string | null = null;
  private inputTokens: number = 0;
  private outputTokens: number = 0;
  private truncated: boolean = false;

  /**
   * Add a text chunk
   */
  addText(text: string): void {
    this.contentParts.push(text);
  }

  /**
   * Add a tool call chunk
   */
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

  /**
   * Set finish reason
   */
  setFinishReason(reason: string): void {
    this.finishReason = reason;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.model = model;
  }

  /**
   * Set token counts
   */
  setTokenUsage(input: number, output: number): void {
    this.inputTokens = input;
    this.outputTokens = output;
  }

  /**
   * Mark as truncated
   */
  setTruncated(): void {
    this.truncated = true;
  }

  /**
   * Build the aggregated response
   */
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

  /**
   * Reset the aggregator
   */
  reset(): void {
    this.contentParts = [];
    this.toolCalls = new Map();
    this.finishReason = null;
    this.model = null;
    this.inputTokens = 0;
    this.outputTokens = 0;
    this.truncated = false;
  }

  /**
   * Get current content (partial)
   */
  getCurrentContent(): string {
    return this.contentParts.join('');
  }

  /**
   * Get current tool calls (partial)
   */
  getCurrentToolCalls(): ToolCall[] {
    return Array.from(this.toolCalls.values());
  }
}

/**
 * Create a new chunk aggregator
 */
export function createChunkAggregator(): ChunkAggregator {
  return new ChunkAggregator();
}
