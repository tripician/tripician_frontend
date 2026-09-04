import React from 'react';
import { apiServices } from '../services/APIs/apiServices';
import { useAuthToken } from '../hooks/useAuth0Token';

export interface VerificationState {
  verified: boolean;
  status: string;
  gateEnabled: boolean;
}

/**
 * Whether the signed-in traveller has cleared the identity gate.
 *
 * `blocked` is the only thing callers should branch on: it is false both when
 * the person is verified and when the gate is switched off entirely, so a UI
 * built on it does not sprout verification prompts in an install that has no
 * provider configured.
 */
export function useVerification() {
  const { token } = useAuthToken();
  const [state, setState] = React.useState<VerificationState | null>(null);
  const [starting, setStarting] = React.useState(false);

  React.useEffect(() => {
    if (!token) { setState(null); return; }
    let active = true;
    void apiServices.getVerificationState(token)
      .then((resp) => { if (active) setState(resp.data); })
      .catch(() => { if (active) setState(null); });
    return () => { active = false; };
  }, [token]);

  const start = React.useCallback(async () => {
    if (!token || starting) return;
    setStarting(true);
    try {
      const resp = await apiServices.startVerification(token);
      if (resp.data?.url) window.location.href = resp.data.url;
    } catch {
      setStarting(false);
    }
  }, [token, starting]);

  return {
    state,
    starting,
    blocked: Boolean(state?.gateEnabled && !state.verified),
    start,
  };
}
