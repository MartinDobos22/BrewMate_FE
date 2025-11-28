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

/**
 * Služba pre ukladanie a načítanie onboardingových odpovedí používateľa zo Supabase.
 */
export class OnboardingResponseService {
  /**
   * @param {import('@supabase/supabase-js').SupabaseClient | null} [client=supabaseClient] - Supabase klient; môže byť null v offline režime.
   */
  constructor(private readonly client = supabaseClient) {}

  /**
   * Uloží odpoveď z onboardingového dotazníka vrátane profilovej analýzy.
   *
   * @param {string} userId - Identifikátor používateľa.
   * @param {PersonalizationResult['answers']} answers - Vyplnené odpovede z onboardingového formulára.
   * @param {OnboardingAnalysis | null} analysis - Výsledná analýza profilu alebo null, ak ešte nie je k dispozícii.
   * @returns {Promise<void>} Promise indikujúci dokončenie zápisu.
   * @throws {Error} Ak Supabase vráti chybu pri vkladaní, je zabalená a vyhodená.
   */
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

  /**
   * Načíta najnovšiu uloženú onboardingovú odpoveď daného používateľa.
   *
   * @param {string} userId - Identifikátor používateľa, pre ktorého sa načítava záznam.
   * @returns {Promise<OnboardingResponseRecord | null>} Najnovší záznam alebo null, ak neexistuje alebo klient chýba.
   * @throws {Error} Ak Supabase vráti chybu inú než "no rows", je zabalená do Error a vyhodená.
   */
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

  /**
   * Zabalí PostgrestError do bežného Error s kontextom.
   *
   * @param {string} context - Názov operácie, v ktorej chyba vznikla.
   * @param {PostgrestError} error - Pôvodná Supabase chyba.
   * @returns {Error} Nová Error s popisom kontextu.
   */
  private wrapError(context: string, error: PostgrestError): Error {
    return new Error(`OnboardingResponseService:${context} failed: ${error.message}`);
  }
}
