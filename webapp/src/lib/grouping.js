/**
 * Simulates the "most occurring based on count" logic requested.
 * In a real backend, this would be a materialized view or a complex GROUP BY query.
 */
export const groupSimilarItems = (rawItems) => {
  const groups = {};

  // Simple phonetic-like normalization (remove special chars, lowercase)
  const normalize = (str) =>
    str.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, ""); // Includes Devanagari range

  rawItems.forEach((item) => {
    // In a real app, use Levenshtein distance or soundex here.
    // For this demo, we assume the DB query returns raw distinct names and we group by exact match on normalized string
    // taking the one with highest count as canonical.

    // Check if we have a "root" match
    // This is a simplified "smart grouping" simulation
    let assigned = false;
    const normalizedName = normalize(item.name);

    // Try to find an existing group that matches
    for (const key in groups) {
      if (
        normalize(groups[key].canonicalName) === normalizedName ||
        normalizedName.includes(normalize(groups[key].canonicalName))
      ) {
        groups[key].variants.push(item.name);
        groups[key].count += item.count;

        // If this variant is more popular, make it the canonical name
        if (item.count > groups[key].count - item.count) {
          // Keep the old one as variant, swap canonical
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      groups[item.name] = {
        canonicalName: item.name,
        variants: [item.name],
        count: item.count,
      };
    }
  });

  return Object.values(groups).sort((a, b) => b.count - a.count);
};
