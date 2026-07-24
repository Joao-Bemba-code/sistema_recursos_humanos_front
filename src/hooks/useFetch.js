"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

export default function useFetch(endpoint, options) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!endpoint) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(endpoint);
      setData(response);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (options && options.skip) return;
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
