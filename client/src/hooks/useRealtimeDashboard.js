import { useEffect, useRef } from "react";
import { subscribeToDashboardUpdates } from "../utils/socket";

/*
 * Re-runs `refetch` the moment the server reports a dashboard-relevant
 * mutation. Refetching from the API — rather than patching local state
 * from socket payloads — keeps every dashboard accurate; the socket just
 * makes it instant. If the socket is unavailable the page behaves as before.
 */
export const useRealtimeDashboard = (refetch) => {
  const refetchRef = useRef(refetch);

  useEffect(() => {
    refetchRef.current = refetch;
  }, [refetch]);

  useEffect(
    () =>
      subscribeToDashboardUpdates(() => {
        if (refetchRef.current) refetchRef.current();
      }),
    [],
  );
};
