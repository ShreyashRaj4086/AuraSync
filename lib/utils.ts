export function formatDisplayName(rawName?: string | null): string {
  if (!rawName) return "User";
  let name = rawName.trim();
  if (name.includes("@")) {
    name = name.split("@")[0];
    name = name.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name.trim() || "User";
}

export function getFirstName(rawName?: string | null): string {
  if (!rawName) return "User";
  let name = rawName.trim();
  if (name.includes("@")) {
    name = name.split("@")[0].replace(/[._]/g, " ");
  }
  const firstName = name.split(" ")[0];
  if (!firstName) return "User";
  return firstName.charAt(0).toUpperCase() + firstName.slice(1);
}
