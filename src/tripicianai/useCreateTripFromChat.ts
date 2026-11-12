import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppShell } from '../pages/PageLayout/AppShellContext';
import { apiServices } from '../services/APIs/apiServices';
import { matchCountryName } from '../utils/countries';
import { scheduleFeedbackPrompt } from '../utils/feedbackPrompt';
import { extractTripFromChat, type ChatTripExtract } from './tripicianAIService';

/** The trip's name, countries and vibe as read from a chat plan. */
export function tripBasicsFromExtract(extracted: ChatTripExtract, fallbackTitle?: string) {
  const countries = Array.from(new Set(extracted.countries.map(matchCountryName).filter(Boolean))) as string[];
  const name =
    extracted.name?.trim() ||
    fallbackTitle?.trim() ||
    (countries.length > 0 ? `Trip to ${countries[0]}` : 'My Tripician Intelligence Trip');
  return { name, countries, vibe: extracted.vibe ?? null };
}

/**
 * One click from a plan in the chat to a real trip: Tripician Intelligence reads
 * the plan into stops (free), the trip is created, and the planner opens with
 * every stop, place and dish seeded. If that cannot be done, the create form
 * opens with whatever was read.
 *
 * Resolves to null once the planner is open, or to a message to show beside the
 * form it fell back to.
 */
export function useCreateTripFromChat(token?: string | null) {
  const navigate = useNavigate();
  const { openCreateTrip } = useAppShell();

  return useCallback(
    async (planText: string, userPrompt?: string, title?: string): Promise<string | null> => {
      // Held outside the try so the fallback can hand whatever was read out of
      // the chat to the create dialog instead of opening it blank.
      if (!token) return 'Please sign in to make a plan.';
      let salvaged: { name?: string; countries?: string[]; vibe?: string | null } | undefined;
      try {
        const extracted = await extractTripFromChat(planText, userPrompt, token);
        const basics = tripBasicsFromExtract(extracted, title);
        salvaged = basics;

        if (basics.countries.length === 0 && extracted.stops.length === 0) {
          throw new Error('Nothing usable extracted');
        }

        const createResp = await apiServices.createTrip(token, {
          name: basics.name,
          description: '',
          countries: basics.countries,
          startDate: null,
          endDate: null,
          visibility: 0,
          currencyCode: 'USD',
          vibe: basics.vibe,
          invites: [] as string[],
          plannerMode: 'Easy', // every new trip opens in the simple planner
        });
        const createdId: string | undefined =
          createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
        if (!createdId) throw new Error('Trip created but no id returned');

        const tripResp = await apiServices.getTripById(token, createdId);
        scheduleFeedbackPrompt('trip_created');
        navigate(`/tripplanner/${createdId}`, {
          state: {
            tripId: createdId,
            trip: tripResp.data,
            // The chat produces stops and nothing else; the wider seed fields are
            // filled only when a plan is imported from a screenshot.
            planSeed: {
              stops: extracted.stops.map((s) => ({
                name: s.name, nights: s.nights, notes: s.notes, spots: s.spots, foods: s.foods,
              })),
            },
          },
        });
        return null;
      } catch (err) {
        console.error('[TripicianAI] chat-to-trip failed', err);
        openCreateTrip(salvaged);
        return salvaged
          ? "Couldn't build that automatically, so here it is in the form."
          : "Couldn't turn this chat into a trip, starting a fresh one.";
      }
    },
    [token, navigate, openCreateTrip],
  );
}
