import { CARD_TEMPLATES } from "../data/cardTemplates";

export interface FusionDiscoveryCandidate {
  key: string;
  materialsCount: 2 | 3;
  materialTags: string[];
}

export interface FusionDiscoveryResolved extends FusionDiscoveryCandidate {
  resultCardId: string;
  resultName: string;
}

export function normalizeFusionDiscoveryTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag ?? "").trim().toUpperCase())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right));
}

export function buildFusionDiscoveryKey(materialsCount: number, materialTags: string[]): string {
  const normalizedCount = Math.min(3, Math.max(2, Math.floor(materialsCount)));
  const normalizedTags = normalizeFusionDiscoveryTags(materialTags);
  return `v1|m=${normalizedCount}|tags=${normalizedTags.join("+")}`;
}

export function buildFusionDiscoveryCandidateFromTemplateIds(templateIds: string[]): FusionDiscoveryCandidate | null {
  if (templateIds.length < 2 || templateIds.length > 3) return null;

  const gatheredTags: string[] = [];
  for (const templateId of templateIds) {
    const template = CARD_TEMPLATES[templateId];
    if (!template) continue;
    gatheredTags.push(...template.tags);
  }

  const materialTags = normalizeFusionDiscoveryTags(gatheredTags);
  if (materialTags.length === 0) return null;
  const materialsCount = templateIds.length as 2 | 3;
  return {
    key: buildFusionDiscoveryKey(materialsCount, materialTags),
    materialsCount,
    materialTags
  };
}

export function buildFusionDiscoveryResolvedFromTemplateIds(
  materialTemplateIds: string[],
  resultCardId: string
): FusionDiscoveryResolved | null {
  const candidate = buildFusionDiscoveryCandidateFromTemplateIds(materialTemplateIds);
  if (!candidate) return null;
  const resultTemplate = CARD_TEMPLATES[resultCardId];
  return {
    ...candidate,
    resultCardId,
    resultName: resultTemplate?.name ?? resultCardId
  };
}
