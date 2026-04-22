/** Public GitHub repo — README anchors for docs / footer links. */
export const REPO_README = 'https://github.com/breezyx28/eskat-seating-tool';

export const README_ANCHORS = {
  overview: `${REPO_README}#overview`,
  featureHighlights: `${REPO_README}#feature-highlights`,
  /** GitHub slug for heading `## Live Demo — Landing Page` (em dash → `--`). */
  liveDemo: `${REPO_README}#live-demo--landing-page`,
  playgroundGuide: `${REPO_README}#playground-guide`,
  coreConcepts: `${REPO_README}#core-concepts`,
  templates: `${REPO_README}#templates`,
  exportedComponent: `${REPO_README}#exported-component`,
  keyboardShortcuts: `${REPO_README}#keyboard-shortcuts`,
  quickStart: `${REPO_README}#quick-start`,
  roadmap: `${REPO_README}#roadmap`,
  contributing: `${REPO_README}#contributing`,
  license: `${REPO_README}#license`,
} as const;
