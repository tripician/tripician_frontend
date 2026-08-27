import type { NavigateFunction } from 'react-router-dom';
import { apiServices } from '../services/APIs/apiServices';
import { scheduleFeedbackPrompt } from '../utils/feedbackPrompt';

export type CreateTripPayload = Parameters<typeof apiServices.createTrip>[1];

export interface CreateTripAndOpenOptions {
  token: string;
  payload: CreateTripPayload;
  navigate: NavigateFunction;
  /** Extra route state the planner watches: aiGenerated, planSeed. */
  state?: Record<string, unknown>;
  /** Runs once the trip exists, before navigation. Used to close a dialog. */
  beforeNavigate?: () => void;
}

/** The one path from a create payload to an open planner. Every caller uses it. */
export async function createTripAndOpen({
  token,
  payload,
  navigate,
  state,
  beforeNavigate,
}: CreateTripAndOpenOptions): Promise<string> {
  const createResp = await apiServices.createTrip(token, payload);

  // The backend has returned this as id / Id / tripId depending on the DTO.
  const createdId: string | undefined =
    createResp?.data?.id || createResp?.data?.Id || createResp?.data?.tripId;
  if (!createdId) throw new Error('Trip created but no id returned');

  const tripResp = await apiServices.getTripById(token, createdId);

  beforeNavigate?.();
  scheduleFeedbackPrompt('trip_created');
  navigate(`/tripplanner/${createdId}`, {
    state: { tripId: createdId, trip: tripResp.data, ...(state ?? {}) },
  });

  return createdId;
}
