import type { Section, VenueData } from '@/types';

/**
 * Recursively walks every section in the tree, including nested children.
 */
export function walkSections(
  sections: Section[],
  visit: (section: Section, parent: Section | null, depth: number) => void,
  parent: Section | null = null,
  depth = 0
): void {
  for (const s of sections) {
    visit(s, parent, depth);
    if (s.children && s.children.length) walkSections(s.children, visit, s, depth + 1);
  }
}

export function findSectionById(venue: VenueData, id: string): Section | null {
  let found: Section | null = null;
  walkSections(venue.sections, (s) => {
    if (s.id === id) found = s;
  });
  return found;
}

export function findSectionAndParent(
  venue: VenueData,
  id: string
): { section: Section; parent: Section | null } | null {
  let match: { section: Section; parent: Section | null } | null = null;
  walkSections(venue.sections, (s, parent) => {
    if (s.id === id) match = { section: s, parent };
  });
  return match;
}

/**
 * Returns all sections visible at the current drill level, i.e. the children of
 * the deepest drill node, or the root sections when drillPath is empty.
 */
export function getVisibleSections(
  venue: VenueData,
  drillPath: string[]
): Section[] {
  if (!drillPath.length) return venue.sections;
  const deepest = drillPath[drillPath.length - 1];
  const found = findSectionById(venue, deepest);
  return found?.children ?? [];
}

/**
 * Returns the chain of sections from the root down to the deepest drill node.
 * Invalid / stale entries are silently dropped so the UI stays consistent.
 */
export function resolveDrillChain(venue: VenueData, drillPath: string[]): Section[] {
  const chain: Section[] = [];
  let pool: Section[] = venue.sections;
  for (const id of drillPath) {
    const found = pool.find((s) => s.id === id);
    if (!found) break;
    chain.push(found);
    pool = found.children ?? [];
  }
  return chain;
}

/**
 * Recursively updates the section with the given id by running the updater on
 * a clone. Mutates the provided array in place. Returns true if a matching
 * section was found and updated.
 */
export function updateInTree(
  sections: Section[],
  id: string,
  updater: (section: Section) => Section
): boolean {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === id) {
      sections[i] = updater(sections[i]);
      return true;
    }
    if (sections[i].children && sections[i].children!.length) {
      const clonedChildren = [...sections[i].children!];
      if (updateInTree(clonedChildren, id, updater)) {
        sections[i] = { ...sections[i], children: clonedChildren };
        return true;
      }
    }
  }
  return false;
}

/**
 * Removes a section (at any depth) by id. Returns true if removed.
 */
export function removeFromTree(sections: Section[], id: string): boolean {
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].id === id) {
      sections.splice(i, 1);
      return true;
    }
    if (sections[i].children && sections[i].children!.length) {
      if (removeFromTree(sections[i].children!, id)) return true;
    }
  }
  return false;
}

export function isContainer(section: Section): boolean {
  return !!section.children && section.children.length > 0;
}

export function isLeaf(section: Section): boolean {
  return !isContainer(section);
}

/**
 * Flat list of EVERY section (top-level + nested). Useful for lookup maps.
 */
export function flattenSections(sections: Section[]): Section[] {
  const out: Section[] = [];
  walkSections(sections, (s) => out.push(s));
  return out;
}
