/** The user's local calendar date (YYYY-MM-DD): the AI limit resets at their midnight. */
export function localDay(timeZone: string, at = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at)
  } catch {
    return at.toISOString().slice(0, 10)
  }
}
