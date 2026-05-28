export function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (typeof error === 'object' && error !== null) {
    const maybeResponse = error as {
      response?: { data?: { error?: string } };
      message?: string;
    };
    if (maybeResponse.response?.data?.error) return maybeResponse.response.data.error;
    if (maybeResponse.message) return maybeResponse.message;
  }
  return fallback;
}
