import { PredictionContext, PredictionResult } from '../../types/Personalization';

export interface RecommendationTelemetry {
  recordGenerated: (userId: string, context: PredictionContext, prediction: PredictionResult) => void;
  recordCacheHit: (userId: string, context: PredictionContext) => void;
  recordTravelMode: () => void;
}

export class DefaultRecommendationTelemetry implements RecommendationTelemetry {
  private readonly listeners: Array<(event: RecommendationTelemetryEvent) => void> = [];

  public addListener(listener: (event: RecommendationTelemetryEvent) => void): void {
    this.listeners.push(listener);
  }

  public recordGenerated(userId: string, context: PredictionContext, prediction: PredictionResult): void {
    this.emit({ type: 'generated', userId, context, prediction });
  }

  public recordCacheHit(userId: string, context: PredictionContext): void {
    this.emit({ type: 'cache-hit', userId, context });
  }

  public recordTravelMode(): void {
    this.emit({ type: 'travel-mode' });
  }

  private emit(event: RecommendationTelemetryEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

export type RecommendationTelemetryEvent =
  | { type: 'generated'; userId: string; context: PredictionContext; prediction: PredictionResult }
  | { type: 'cache-hit'; userId: string; context: PredictionContext }
  | { type: 'travel-mode' };
