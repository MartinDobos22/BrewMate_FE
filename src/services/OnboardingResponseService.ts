import type { PostgrestError } from '@supabase/supabase-js';
import type { PersonalizationResult } from '../components/personalization/PersonalizationOnboarding';
import { supabaseClient } from './supabaseClient';
import type { OnboardingAnalysis } from './personalization/onboardingAnalysis';

export interface OnboardingResponseRecord {
  id: number;
  user_id: string;
  answers: PersonalizationResult['answers'];
  analyzed_profile: OnboardingAnalysis['profile'] | null;
  created_at: string;
}

export class OnboardingResponseService {
  constructor(private readonly client = supabaseClient) {}

  public async saveResponse(
    userId: string,
    answers: PersonalizationResult['answers'],
    analysis: OnboardingAnalysis | null,
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const payload = {
      user_id: userId,
      answers,
      analyzed_profile: analysis?.profile ?? null,
    };

    const { error } = await this.client.from('user_onboarding_responses').insert(payload);

    if (error) {
      throw this.wrapError('saveResponse', error);
    }
  }

  public async loadLatest(userId: string): Promise<OnboardingResponseRecord | null> {
    if (!this.client) {
      return null;
    }

    const { data, error } = await this.client
      .from('user_onboarding_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw this.wrapError('loadLatest', error);
    }

    return (data as OnboardingResponseRecord | null) ?? null;
  }

  private wrapError(context: string, error: PostgrestError): Error {
    return new Error(`OnboardingResponseService:${context} failed: ${error.message}`);
  }
}
