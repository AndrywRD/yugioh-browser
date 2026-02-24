import type { CardTemplate } from "@ruptura-arcana/shared";
import { CARD_TEMPLATES } from "../data/cardTemplates";
import { FM_FUSION_PAIRS } from "../data/fmFusions.generated";

interface MaterialSummary {
  template: CardTemplate;
  instanceId: string;
}

const TWO_MATERIAL_FALLBACK_TEMPLATE_ID = "fm_024_skull_servant";
const THREE_MATERIAL_FALLBACK_TEMPLATE_ID = "fm_147_monster_egg";

const FUSION_RESULT_BY_PAIR = new Map<string, string>(
  FM_FUSION_PAIRS.map((pair) => [`${pair.leftNumber}:${pair.rightNumber}`, pair.resultTemplateId])
);

export interface FusionChainStep {
  left: string;
  right: string;
  result?: string;
  failed: boolean;
}

export interface FusionResolution {
  resultTemplateId: string;
  failed: boolean;
  fallbackType?: "FALLBACK_WEAK" | "FALLBACK_LOCKED";
  chain: FusionChainStep[];
}

function buildFusionPairKey(leftCatalogNumber: number, rightCatalogNumber: number): string {
  const left = Math.min(leftCatalogNumber, rightCatalogNumber);
  const right = Math.max(leftCatalogNumber, rightCatalogNumber);
  return `${left}:${right}`;
}

function resolveTwoMaterials(
  left: MaterialSummary,
  right: MaterialSummary
): { resultTemplate?: CardTemplate; failed: boolean } {
  const leftCatalogNumber = left.template.catalogNumber;
  const rightCatalogNumber = right.template.catalogNumber;
  if (typeof leftCatalogNumber !== "number" || typeof rightCatalogNumber !== "number") {
    return { failed: true };
  }

  const pairKey = buildFusionPairKey(leftCatalogNumber, rightCatalogNumber);
  const resultTemplateId = FUSION_RESULT_BY_PAIR.get(pairKey);
  if (!resultTemplateId) {
    return { failed: true };
  }

  const template = CARD_TEMPLATES[resultTemplateId];
  if (!template || template.kind !== "MONSTER") {
    return { failed: true };
  }
  return {
    failed: false,
    resultTemplate: template
  };
}

export function resolveFusionFromOrderedMaterials(orderedMaterials: MaterialSummary[], _seed: number): FusionResolution {
  if (orderedMaterials.length < 2 || orderedMaterials.length > 3) {
    throw new Error("Fusion must contain 2 or 3 materials");
  }

  const chain: FusionChainStep[] = [];

  if (orderedMaterials.length === 2) {
    const [first, second] = orderedMaterials;
    const result = resolveTwoMaterials(first, second);

    if (result.failed || !result.resultTemplate) {
      chain.push({ left: first.instanceId, right: second.instanceId, failed: true });
      return {
        resultTemplateId: TWO_MATERIAL_FALLBACK_TEMPLATE_ID,
        failed: true,
        fallbackType: "FALLBACK_WEAK",
        chain
      };
    }

    chain.push({
      left: first.instanceId,
      right: second.instanceId,
      result: result.resultTemplate.id,
      failed: false
    });
    return {
      resultTemplateId: result.resultTemplate.id,
      failed: false,
      chain
    };
  }

  const [first, second, third] = orderedMaterials;
  const stepOne = resolveTwoMaterials(first, second);
  if (stepOne.failed || !stepOne.resultTemplate) {
    chain.push({ left: first.instanceId, right: second.instanceId, failed: true });
    return {
      resultTemplateId: THREE_MATERIAL_FALLBACK_TEMPLATE_ID,
      failed: true,
      fallbackType: "FALLBACK_LOCKED",
      chain
    };
  }

  chain.push({
    left: first.instanceId,
    right: second.instanceId,
    result: stepOne.resultTemplate.id,
    failed: false
  });

  const syntheticIntermediate: MaterialSummary = {
    instanceId: stepOne.resultTemplate.id,
    template: stepOne.resultTemplate
  };
  const stepTwo = resolveTwoMaterials(syntheticIntermediate, third);
  if (stepTwo.failed || !stepTwo.resultTemplate) {
    chain.push({ left: stepOne.resultTemplate.id, right: third.instanceId, failed: true });
    return {
      resultTemplateId: THREE_MATERIAL_FALLBACK_TEMPLATE_ID,
      failed: true,
      fallbackType: "FALLBACK_LOCKED",
      chain
    };
  }

  chain.push({
    left: stepOne.resultTemplate.id,
    right: third.instanceId,
    result: stepTwo.resultTemplate.id,
    failed: false
  });

  return {
    resultTemplateId: stepTwo.resultTemplate.id,
    failed: false,
    chain
  };
}

export function buildMaterialSummary(instanceId: string, templateId: string): MaterialSummary {
  const template = CARD_TEMPLATES[templateId];
  if (!template) throw new Error(`Template not found: ${templateId}`);
  return {
    instanceId,
    template
  };
}
