/**
 * Marks that the user has completed at least one practice session.
 * Used to control when the light "Welcome tips" card should appear.
 */
export function markUserHasPracticed() {
  if (typeof window !== "undefined") {
    localStorage.setItem("golf-practice-os-has-practiced", "true");
  }
}
