import { useCallback, useState } from 'react';

import ReportDialog from '../components/ui/ReportDialog';
import { getFreshToken } from '../services/auth/tokenService';
import { AI_REPORT_REASONS } from './reportAnswer';
import { reportTripicianAIAnswer } from './tripicianAIService';

type Target = { response: string; prompt?: string };

/**
 * "Report" on a TripicianAI answer: opens the report dialog with the AI reasons and
 * sends the answer, plus the question that produced it, to our team. Render
 * `reportDialog` once per surface; call `openReport(answer, question)` from each
 * answer's Report link (`promptFor` finds the question in a chat transcript).
 */
export function useReportAnswer(surface: string) {
  const [target, setTarget] = useState<Target | null>(null);

  const openReport = useCallback((response: string, prompt?: string) => {
    setTarget({ response, prompt });
  }, []);

  const reportDialog = (
    <ReportDialog
      open={target !== null}
      noun="answer"
      reasons={AI_REPORT_REASONS}
      onClose={() => setTarget(null)}
      onSubmit={async (reason, detail) => {
        if (!target) return;
        // A guest has no token; the endpoint accepts anonymous reports.
        const token = await getFreshToken().catch(() => null);
        await reportTripicianAIAnswer(
          { reason, detail, response: target.response, prompt: target.prompt, surface },
          token,
        );
      }}
    />
  );

  return { openReport, reportDialog };
}
