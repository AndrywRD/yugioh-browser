"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CARD_INDEX, buildFusionDiscoveryCandidateFromTemplateIds } from "@ruptura-arcana/game";
import type { CardClientView, DeckListPayload, FuseMaterial, GameEvent, GamePromptPayload, GameStateForClient, RoomState } from "@ruptura-arcana/shared";
import { BoardStage, type SlotBadge, type SlotMarker } from "../../components/board/BoardStage";
import { CardPreview } from "../../components/card/CardPreview";
import { HandFan } from "../../components/hand/HandFan";
import { ActionTray } from "../../components/hud/ActionTray";
import { EndTurnButton } from "../../components/hud/EndTurnButton";
import { EndScreen } from "../../components/hud/EndScreen";
import { HudLayer } from "../../components/hud/HudLayer";
import { HintBanner } from "../../components/hud/HintBanner";
import { LpHudImage } from "../../components/hud/LpHudImage";
import { LogTicker } from "../../components/hud/LogTicker";
import { PveDropsModal } from "../../components/hud/PveDropsModal";
import { CardMenu, type CardMenuItem } from "../../components/ui/CardMenu";
import { ContextMenuPortal } from "../../components/ui/ContextMenuPortal";
import { HintsBar } from "../../components/ui/HintsBar";
import type { AnchorRect } from "../../lib/anchors";
import {
  buildHint,
  canChangeMonsterPosition,
  canDirectAttack,
  canFlipSummon,
  canMonsterAttack,
  canUseSummonOrFusion,
  getEmptyOwnSlots,
  getEmptyOwnSpellTrapSlots,
  getFusionResultAllowedSlots,
  getSelectableEnemySlots,
  idleInteraction,
  isFlowState,
  isYourTurn,
  toggleFusionMaterial,
  type BoardSide,
  type BoardZone,
  type InteractionState
} from "../../lib/interaction";
import { SfxManager } from "../../lib/sfx";
import { socket } from "../../lib/socket";
import { DamageNumber } from "../../components/vfx/DamageNumber";
import {
  ensureDeckCollection,
  getDeckById,
  loadDeckCollection,
  saveDeckCollection,
  setDeckActive,
  validateDeckForUi,
  type DeckCollection
} from "../../lib/decks";
import { fetchFusionLog, getStoredPublicId, type FusionDiscoveryEntry } from "../../lib/api";

function actionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function marker(side: BoardSide, zone: BoardZone, slotIndex: number): SlotMarker {
  return { side, zone, slotIndex };
}

type SlotFxEffect = "attack" | "hit" | "summon" | "fusion" | "destroy";

interface SlotFx extends SlotMarker {
  effect: SlotFxEffect;
}

interface FloatingDamage {
  id: string;
  value: number;
  type: "damage" | "heal";
  side: "YOU" | "OPP";
}

type DuelOutcome = "VICTORY" | "DEFEAT";

interface PreviewCardData {
  name: string;
  atk: number;
  def: number;
  position?: "ATTACK" | "DEFENSE";
  effectDescription?: string;
  imagePath?: string;
}

interface PveResultPayload {
  npcId: string;
  didWin: boolean;
  rewardGold: number;
  rewardCards: Array<{ cardId: string; count: number }>;
}

interface MatchPromptState {
  promptType: "TRAP_RESPONSE_REQUIRED";
  data: {
    attackerSlot?: number;
    target?: "DIRECT" | { slot: number };
    availableTrapSlots?: number[];
    defenderMayRespond?: boolean;
  };
}

function uniqueMarkers(markers: SlotMarker[]): SlotMarker[] {
  const seen = new Set<string>();
  const result: SlotMarker[] = [];

  for (const item of markers) {
    const key = `${item.side}:${item.zone}:${item.slotIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function withTimestamp(message: string): string {
  const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  return `${time} | ${message}`;
}

function upsertSlotFx(current: SlotFx[], entry: SlotFx): SlotFx[] {
  const filtered = current.filter((item) => !(item.side === entry.side && item.zone === entry.zone && item.slotIndex === entry.slotIndex));
  return [...filtered, entry];
}

function upsertFusionDiscovery(current: FusionDiscoveryEntry[], incoming: FusionDiscoveryEntry): FusionDiscoveryEntry[] {
  const index = current.findIndex((entry) => entry.key === incoming.key);
  if (index < 0) {
    return [incoming, ...current].sort((left, right) => right.discoveredAt - left.discoveredAt);
  }

  const merged: FusionDiscoveryEntry = {
    ...current[index],
    ...incoming,
    times: Math.max(current[index].times ?? 1, incoming.times ?? 1)
  };
  const next = [...current];
  next[index] = merged;
  return next.sort((left, right) => right.discoveredAt - left.discoveredAt);
}

function resolveMaterialTemplateIdsForInteraction(snapshot: GameStateForClient, materials: FuseMaterial[]): string[] {
  const templateIds: string[] = [];
  for (const material of materials) {
    if (material.source === "HAND") {
      const handCard = snapshot.you.hand?.find((card) => card.instanceId === material.instanceId);
      if (handCard?.templateId) templateIds.push(handCard.templateId);
      continue;
    }

    const boardMonster = snapshot.you.monsterZone.find((monster) => monster?.instanceId === material.instanceId);
    if (boardMonster?.templateId) templateIds.push(boardMonster.templateId);
  }
  return templateIds;
}

function resolveDuelOutcome(snapshot: GameStateForClient | null, playerId: string | null): DuelOutcome | null {
  if (!snapshot || !playerId) return null;

  if (snapshot.winnerId) {
    return snapshot.winnerId === playerId ? "VICTORY" : "DEFEAT";
  }

  const shouldFallbackByLp = snapshot.status === "FINISHED" || snapshot.you.lp <= 0 || snapshot.opponent.lp <= 0;
  if (!shouldFallbackByLp) return null;

  if (snapshot.you.lp <= 0 && snapshot.opponent.lp > 0) return "DEFEAT";
  if (snapshot.opponent.lp <= 0 && snapshot.you.lp > 0) return "VICTORY";

  return snapshot.you.lp > snapshot.opponent.lp ? "VICTORY" : "DEFEAT";
}

function eventToText(event: GameEvent, playerId: string | null): string {
  const actor = event.playerId ? (event.playerId === playerId ? "Voce" : "Oponente") : "Sistema";
  const payload = (event.payload ?? {}) as Record<string, unknown>;

  if (event.type === "MONSTER_SUMMONED") {
    return `${actor} invocou no Slot ${(Number(payload.slot) ?? 0) + 1}.`;
  }
  if (event.type === "MONSTER_FLIP_SUMMONED") {
    return `${actor} fez Flip Summon no Slot ${(Number(payload.slot) ?? 0) + 1}.`;
  }
  if (event.type === "FUSION_RESOLVED") {
    const resultName = typeof payload.resultName === "string" ? payload.resultName : "resultado desconhecido";
    return `${actor} concluiu uma fusao e invocou ${resultName}.`;
  }
  if (event.type === "FUSION_FAILED") {
    return `${actor} tentou fusao e gerou um resultado instavel.`;
  }
  if (event.type === "MONSTER_REVEALED") {
    const revealedName = typeof payload.name === "string" ? payload.name : "monstro";
    const slot = typeof payload.slot === "number" ? payload.slot + 1 : "?";
    return `${actor} revelou ${revealedName} no Slot ${slot}.`;
  }
  if (event.type === "MONSTER_REHIDDEN") {
    return `${actor} re-ocultou o defensor no Slot ${(Number(payload.slot) ?? 0) + 1}.`;
  }
  if (event.type === "POSITION_CHANGED") {
    return `${actor} mudou posicao no Slot ${(Number(payload.slot) ?? 0) + 1}.`;
  }
  if (event.type === "ATTACK_DECLARED") {
    return `${actor} declarou ataque com o Slot ${(Number(payload.attackerSlot) ?? 0) + 1}.`;
  }
  if (event.type === "ATTACK_WAITING_RESPONSE") {
    return "Janela de resposta aberta: defensor pode ativar armadilha.";
  }
  if (event.type === "ATTACK_NEGATED") {
    return "Ataque negado/cancelado por resposta.";
  }
  if (event.type === "BATTLE_RESOLVED") {
    if (payload.mode === "DIRECT") {
      return `${actor} causou ataque direto (${Number(payload.damage) || 0} de dano).`;
    }
    const slot = typeof payload.defenderSlot === "number" ? payload.defenderSlot + 1 : "?";
    return `${actor} resolveu batalha contra o Slot ${slot}.`;
  }
  if (event.type === "LP_CHANGED") {
    const lp = Number(payload.lp) || 0;
    const delta = Number(payload.delta) || 0;
    return `${actor} LP: ${lp} (${delta}).`;
  }
  if (event.type === "TURN_CHANGED") {
    return `Turno ${Number(payload.turnNumber) || "?"}: ${actor}.`;
  }
  if (event.type === "GAME_FINISHED") {
    return "Partida encerrada.";
  }

  return `${event.type}`;
}

function isEquipEffectKey(effectKey?: string): boolean {
  return effectKey === "EQUIP_CONTINUOUS" || effectKey === "EQUIP_BUFF_500";
}

const LAST_ROOM_CODE_STORAGE_KEY = "ruptura_arcana_last_room_code";
const LOBBY_NOTICES_STORAGE_KEY = "ruptura_arcana_lobby_notices";

function appendLobbyNotices(notices: Array<{ text: string; tone?: "info" | "success" | "warning" }>): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(LOBBY_NOTICES_STORAGE_KEY);
    const current = raw ? ((JSON.parse(raw) as Array<{ text: string; tone?: "info" | "success" | "warning" }>) ?? []) : [];
    const merged = [...notices, ...current].slice(0, 6);
    window.localStorage.setItem(LOBBY_NOTICES_STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage failures
  }
}

export default function HomePage() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [username, setUsername] = useState("Jogador");
  const [joinCode, setJoinCode] = useState("");
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [snapshot, setSnapshot] = useState<GameStateForClient | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [roomError, setRoomError] = useState("");
  const [gameError, setGameError] = useState("");
  const [deckSyncError, setDeckSyncError] = useState("");
  const [deckCollection, setDeckCollection] = useState<DeckCollection>(() => ensureDeckCollection(null));

  const [interaction, setInteraction] = useState<InteractionState>(idleInteraction());
  const [selectedCard, setSelectedCard] = useState<{
    source: "HAND" | "FIELD" | "OPP_FIELD" | "FIELD_SPELL_TRAP" | "OPP_SPELL_TRAP";
    instanceId: string;
    name: string;
    atk: number;
    def: number;
    position?: "ATTACK" | "DEFENSE";
    effectDescription?: string;
    imagePath?: string;
  } | null>(null);
  const [attackEffectSlot, setAttackEffectSlot] = useState<SlotMarker | null>(null);
  const [hitEffectSlot, setHitEffectSlot] = useState<SlotMarker | null>(null);
  const [slotFx, setSlotFx] = useState<SlotFx[]>([]);
  const [floatingDamages, setFloatingDamages] = useState<FloatingDamage[]>([]);
  const [tickerLines, setTickerLines] = useState<string[]>([]);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [fusionLog, setFusionLog] = useState<FusionDiscoveryEntry[]>([]);
  const [showFusionLogModal, setShowFusionLogModal] = useState(false);
  const [fusionLogSearch, setFusionLogSearch] = useState("");
  const [previewCard, setPreviewCard] = useState<PreviewCardData | null>(null);
  const [endState, setEndState] = useState<DuelOutcome | null>(null);
  const [endScreenDismissed, setEndScreenDismissed] = useState(false);
  const [pveResultModal, setPveResultModal] = useState<PveResultPayload | null>(null);
  const [menuAnchorRect, setMenuAnchorRect] = useState<AnchorRect | null>(null);
  const [attackHoverSlot, setAttackHoverSlot] = useState<SlotMarker | null>(null);
  const [roomCodeFromQuery, setRoomCodeFromQuery] = useState("");
  const [usernameFromQuery, setUsernameFromQuery] = useState("");
  const [autoCreateFromQuery, setAutoCreateFromQuery] = useState(false);
  const [matchPrompt, setMatchPrompt] = useState<MatchPromptState | null>(null);
  const [waitingAttackResolution, setWaitingAttackResolution] = useState(false);
  const pendingFusionSlotRef = useRef<number | null>(null);
  const endSfxPlayedRef = useRef<DuelOutcome | null>(null);
  const autoJoinAttemptedRef = useRef(false);
  const sfx = useMemo(() => new SfxManager(0.32), []);

  const meInRoom = useMemo(
    () => roomState?.players.find((player) => player.playerId === playerId) ?? null,
    [playerId, roomState?.players]
  );
  const activeDeck = useMemo(() => getDeckById(deckCollection, deckCollection.activeDeckId), [deckCollection]);
  const activeDeckValidation = useMemo(() => (activeDeck ? validateDeckForUi(activeDeck) : null), [activeDeck]);
  const isActiveDeckValid = Boolean(activeDeckValidation?.ok);

  const handCards = snapshot?.you.hand ?? [];
  const playerMonsters = snapshot?.you.monsterZone ?? [];
  const enemyMonsters = snapshot?.opponent.monsterZone ?? [];
  const playerSpellTraps = snapshot?.you.spellTrapZone ?? [];
  const enemySpellTraps = snapshot?.opponent.spellTrapZone ?? [];

  const fusionMaterials = useMemo(() => {
    if (interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot") {
      return interaction.materials;
    }
    return [] as FuseMaterial[];
  }, [interaction]);

  const fusionLogByKey = useMemo(() => {
    return new Map(fusionLog.map((entry) => [entry.key, entry]));
  }, [fusionLog]);

  const knownFusionPreview = useMemo(() => {
    if (!snapshot) return null;
    if (!(interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot")) return null;
    if (interaction.materials.length < 2) return null;

    const templateIds = resolveMaterialTemplateIdsForInteraction(snapshot, interaction.materials);
    const candidate = buildFusionDiscoveryCandidateFromTemplateIds(templateIds);
    if (!candidate) return null;
    return fusionLogByKey.get(candidate.key) ?? null;
  }, [fusionLogByKey, interaction, snapshot]);

  const filteredFusionLog = useMemo(() => {
    const query = fusionLogSearch.trim().toLowerCase();
    if (!query) return fusionLog;
    return fusionLog.filter((entry) => {
      const name = (CARD_INDEX[entry.resultCardId]?.name ?? entry.resultName).toLowerCase();
      if (name.includes(query)) return true;
      return entry.materialTags.some((tag) => tag.toLowerCase().includes(query));
    });
  }, [fusionLog, fusionLogSearch]);

  const isMyTurn = snapshot ? isYourTurn(snapshot) : false;
  const summonOrFusionAvailable = snapshot ? canUseSummonOrFusion(snapshot) : false;
  const activePrompt = matchPrompt;
  const waitingForPrompt = Boolean(activePrompt);
  const inputLockedByCombat = waitingForPrompt || waitingAttackResolution;

  const selectedHandIds = useMemo(() => {
    if (interaction.kind === "summon_selectSlot") return [interaction.handInstanceId];
    if (interaction.kind === "setMonster_selectSlot") return [interaction.handInstanceId];
    if (interaction.kind === "setSpellTrap_selectSlot") return [interaction.handInstanceId];
    if (interaction.kind === "equipFromHand_selectTarget") return [interaction.handInstanceId];
    if (interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot") {
      return interaction.materials.filter((material) => material.source === "HAND").map((material) => material.instanceId);
    }
    if (interaction.kind === "cardMenuOpen" && interaction.source.kind === "HAND") {
      return [interaction.source.instanceId];
    }
    return [] as string[];
  }, [interaction]);

  const highlightedHandIds = useMemo(() => {
    if (!snapshot) return [] as string[];
    if (interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot") {
      return handCards.map((card) => card.instanceId);
    }
    if (interaction.kind === "summon_selectSlot") {
      return handCards.map((card) => card.instanceId);
    }
    return [] as string[];
  }, [handCards, interaction.kind, snapshot]);

  const handBadgeById = useMemo(() => {
    const badges: Record<string, string> = {};
    fusionMaterials.forEach((material, index) => {
      if (material.source === "HAND") {
        badges[material.instanceId] = String(index + 1);
      }
    });
    return badges;
  }, [fusionMaterials]);

  const slotBadges = useMemo(() => {
    const badges: SlotBadge[] = [];
    fusionMaterials.forEach((material, index) => {
      if (material.source === "FIELD" && typeof material.slot === "number") {
        badges.push({
          side: "PLAYER",
          zone: "MONSTER",
          slotIndex: material.slot,
          label: String(index + 1)
        });
      }
    });
    return badges;
  }, [fusionMaterials]);

  const selectedBoardSlots = useMemo(() => {
    const selected: SlotMarker[] = [];

    if (interaction.kind === "cardMenuOpen" && interaction.source.kind === "FIELD") {
      selected.push(marker("PLAYER", interaction.source.zone, interaction.source.slotIndex));
    }

    if (interaction.kind === "attack_chooseTarget") {
      selected.push(marker("PLAYER", "MONSTER", interaction.attackerSlot));
    }

    for (const material of fusionMaterials) {
      if (material.source === "FIELD" && typeof material.slot === "number") {
        selected.push(marker("PLAYER", "MONSTER", material.slot));
      }
    }

    return uniqueMarkers(selected);
  }, [fusionMaterials, interaction]);

  const targetBoardSlots = useMemo(() => {
    if (!snapshot) return [] as SlotMarker[];
    if (interaction.kind === "attack_chooseTarget" && attackHoverSlot?.side === "ENEMY" && attackHoverSlot.zone === "MONSTER") {
      return [attackHoverSlot];
    }
    return [] as SlotMarker[];
  }, [attackHoverSlot, interaction, snapshot]);

  const highlightedBoardSlots = useMemo(() => {
    if (!snapshot) return [] as SlotMarker[];

    if (interaction.kind === "summon_selectSlot") {
      return getEmptyOwnSlots(snapshot).map((slotIndex) => marker("PLAYER", "MONSTER", slotIndex));
    }

    if (interaction.kind === "setMonster_selectSlot") {
      return getEmptyOwnSlots(snapshot).map((slotIndex) => marker("PLAYER", "MONSTER", slotIndex));
    }

    if (interaction.kind === "setSpellTrap_selectSlot") {
      return getEmptyOwnSpellTrapSlots(snapshot).map((slotIndex) => marker("PLAYER", "SPELL_TRAP", slotIndex));
    }

    if (interaction.kind === "equipFromHand_selectTarget" || interaction.kind === "equipSet_selectTarget") {
      return snapshot.you.monsterZone
        .flatMap((monster, slotIndex) => (monster && monster.face === "FACE_UP" ? [marker("PLAYER", "MONSTER", slotIndex)] : []));
    }

    if (interaction.kind === "fusion_selectMaterials") {
      return snapshot.you.monsterZone
        .flatMap((monster, slotIndex) => (monster ? [marker("PLAYER", "MONSTER", slotIndex)] : []));
    }

    if (interaction.kind === "fusion_chooseResultSlot") {
      return getFusionResultAllowedSlots(snapshot, interaction.materials).map((slotIndex) => marker("PLAYER", "MONSTER", slotIndex));
    }

    if (interaction.kind === "attack_chooseTarget") {
      return getSelectableEnemySlots(snapshot).map((slotIndex) => marker("ENEMY", "MONSTER", slotIndex));
    }

    return [] as SlotMarker[];
  }, [interaction, snapshot]);

  const menuItems = useMemo(() => {
    if (!snapshot || interaction.kind !== "cardMenuOpen") return [] as CardMenuItem[];
    const source = interaction.source;

    if (source.kind === "HAND") {
      if (source.cardKind === "MONSTER") {
        const canSummon = summonOrFusionAvailable && getEmptyOwnSlots(snapshot).length > 0;
        const canSetMonster = summonOrFusionAvailable && getEmptyOwnSlots(snapshot).length > 0;
        const canAddToFusion = summonOrFusionAvailable;

        return [
          {
            key: "summon",
            label: "Summon",
            disabled: !canSummon,
            onSelect: () => {
              sfx.play("ui_confirm");
              setInteraction({ kind: "summon_selectSlot", handInstanceId: source.instanceId });
            }
          },
          {
            key: "set",
            label: "Set DEF",
            disabled: !canSetMonster,
            onSelect: () => {
              sfx.play("ui_confirm");
              setInteraction({ kind: "setMonster_selectSlot", handInstanceId: source.instanceId });
            }
          },
          {
            key: "fusion",
            label: "Add to Fusion",
            disabled: !canAddToFusion,
            onSelect: () => {
              sfx.play("ui_confirm");
              setInteraction({
                kind: "fusion_selectMaterials",
                materials: [{ source: "HAND", instanceId: source.instanceId }]
              });
            }
          },
          {
            key: "cancel",
            label: "Cancel",
            onSelect: () => {
              sfx.play("ui_cancel");
              setInteraction(idleInteraction());
            }
          }
        ];
      }

      if (source.cardKind === "SPELL") {
        const handCard = snapshot.you.hand?.find((card) => card.instanceId === source.instanceId);
        const spellIsEquip = isEquipEffectKey(handCard?.effectKey);
        const equipTargets = snapshot.you.monsterZone.flatMap((monster, slotIndex) => (monster && monster.face === "FACE_UP" ? [slotIndex] : []));
        const canActivateBase = isYourTurn(snapshot) && snapshot.turn.phase === "MAIN";
        const canActivate = spellIsEquip
          ? canActivateBase && equipTargets.length > 0 && getEmptyOwnSpellTrapSlots(snapshot).length > 0
          : canActivateBase;
        const canSet = isYourTurn(snapshot) && snapshot.turn.phase === "MAIN" && getEmptyOwnSpellTrapSlots(snapshot).length > 0;
        return [
          {
            key: "activate",
            label: spellIsEquip ? "Equipar" : "Activate",
            disabled: !canActivate,
            onSelect: () => {
              sfx.play("ui_confirm");
              if (spellIsEquip) {
                setInteraction({ kind: "equipFromHand_selectTarget", handInstanceId: source.instanceId });
              } else {
                sendAction("ACTIVATE_SPELL_FROM_HAND", { handInstanceId: source.instanceId });
                setInteraction(idleInteraction());
              }
            }
          },
          {
            key: "set",
            label: "Set",
            disabled: !canSet,
            onSelect: () => {
              sfx.play("ui_confirm");
              setInteraction({ kind: "setSpellTrap_selectSlot", handInstanceId: source.instanceId });
            }
          },
          {
            key: "cancel",
            label: "Cancel",
            onSelect: () => {
              sfx.play("ui_cancel");
              setInteraction(idleInteraction());
            }
          }
        ];
      }

      const canSetTrap = isYourTurn(snapshot) && snapshot.turn.phase === "MAIN" && getEmptyOwnSpellTrapSlots(snapshot).length > 0;
      return [
        {
          key: "set",
          label: "Set Trap",
          disabled: !canSetTrap,
          onSelect: () => {
            sfx.play("ui_confirm");
            setInteraction({ kind: "setSpellTrap_selectSlot", handInstanceId: source.instanceId });
          }
        },
        {
          key: "cancel",
          label: "Cancel",
          onSelect: () => {
            sfx.play("ui_cancel");
            setInteraction(idleInteraction());
          }
        }
      ];
    }

    if (source.zone === "SPELL_TRAP") {
      const setCard = snapshot.you.spellTrapZone[source.slotIndex];
      if (!setCard) return [] as CardMenuItem[];
      const spellIsEquip = setCard.kind === "SPELL" && isEquipEffectKey(setCard.effectKey);
      const hasEquipTarget = snapshot.you.monsterZone.some((monster) => Boolean(monster && monster.face === "FACE_UP"));
      const isSetCard = setCard.face === "FACE_DOWN";
      const canActivate =
        (setCard.kind === "SPELL" && isSetCard && isYourTurn(snapshot) && snapshot.turn.phase === "MAIN" && (!spellIsEquip || hasEquipTarget)) ||
        (setCard.kind === "TRAP" && isSetCard && !isYourTurn(snapshot));
      return [
        {
          key: "activate",
          label: spellIsEquip ? "Equipar" : "Activate",
          disabled: !canActivate,
          onSelect: () => {
            sfx.play("ui_confirm");
            if (spellIsEquip) {
              setInteraction({ kind: "equipSet_selectTarget", slotIndex: source.slotIndex });
            } else {
              sendAction("ACTIVATE_SET_CARD", { slot: source.slotIndex });
              setInteraction(idleInteraction());
            }
          }
        },
        {
          key: "cancel",
          label: "Cancel",
          onSelect: () => {
            sfx.play("ui_cancel");
            setInteraction(idleInteraction());
          }
        }
      ];
    }

    const monster = snapshot.you.monsterZone[source.slotIndex];
    if (!monster) return [] as CardMenuItem[];
    const canAttack = canMonsterAttack(snapshot, monster);
    const canChange = canChangeMonsterPosition(snapshot, monster);
    const canFlip = canFlipSummon(snapshot, monster);
    const canAddToFusion = summonOrFusionAvailable;

    if (monster.face === "FACE_DOWN") {
      return [
        {
          key: "flip",
          label: "Flip Summon",
          disabled: !canFlip,
          onSelect: () => {
            sfx.play("ui_confirm");
            sendAction("FLIP_SUMMON", { slot: source.slotIndex });
            setInteraction(idleInteraction());
          }
        },
        {
          key: "fusion",
          label: "Add to Fusion",
          disabled: !canAddToFusion,
          onSelect: () => {
            sfx.play("ui_confirm");
            setInteraction({
              kind: "fusion_selectMaterials",
              materials: [{ source: "FIELD", instanceId: monster.instanceId, slot: source.slotIndex }]
            });
          }
        },
        {
          key: "cancel",
          label: "Cancel",
          onSelect: () => {
            sfx.play("ui_cancel");
            setInteraction(idleInteraction());
          }
        }
      ];
    }

    return [
      {
        key: "attack",
        label: "Attack",
        disabled: !canAttack,
        onSelect: () => {
          sfx.play("ui_confirm");
          setInteraction({ kind: "attack_chooseTarget", attackerSlot: source.slotIndex });
        }
      },
      {
        key: "position",
        label: "Change Position",
        disabled: !canChange,
        onSelect: () => {
          sfx.play("ui_confirm");
          setInteraction({ kind: "position_choose", slotIndex: source.slotIndex });
        }
      },
      {
        key: "fusion",
        label: "Add to Fusion",
        disabled: !canAddToFusion,
        onSelect: () => {
          sfx.play("ui_confirm");
          setInteraction({
            kind: "fusion_selectMaterials",
            materials: [{ source: "FIELD", instanceId: monster.instanceId, slot: source.slotIndex }]
          });
        }
      },
      {
        key: "cancel",
        label: "Cancel",
        onSelect: () => {
          sfx.play("ui_cancel");
          setInteraction(idleInteraction());
        }
      }
    ];
  }, [interaction, snapshot, sfx, summonOrFusionAvailable]);

  const directAttackAvailable = snapshot && interaction.kind === "attack_chooseTarget" ? canDirectAttack(snapshot) : false;

  const hint = snapshot ? buildHint(interaction, snapshot) : "";
  const showMatch = Boolean(snapshot) && (roomState?.status === "RUNNING" || roomState?.status === "FINISHED");
  const inLobby = roomState && roomState.status === "LOBBY";
  const duelOutcome = useMemo(() => resolveDuelOutcome(snapshot, playerId), [snapshot, playerId]);
  const previewSelection =
    previewCard ??
    (selectedCard
      ? {
          name: selectedCard.name,
          atk: selectedCard.atk,
          def: selectedCard.def,
          position: selectedCard.position,
          effectDescription: selectedCard.effectDescription,
          imagePath: selectedCard.imagePath
        }
      : null);

  useEffect(() => {
    if (interaction.kind !== "cardMenuOpen") {
      setMenuAnchorRect(null);
    }
  }, [interaction.kind]);

  useEffect(() => {
    if (interaction.kind !== "attack_chooseTarget") {
      setAttackHoverSlot(null);
    }
  }, [interaction.kind]);

  useEffect(() => {
    persistDeckCollection(loadDeckCollection());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRoomCodeFromQuery(params.get("roomCode")?.trim().toUpperCase() ?? "");
    setUsernameFromQuery(params.get("username")?.trim() ?? "");
    const autoCreateValue = params.get("autoCreate")?.trim().toLowerCase() ?? "";
    setAutoCreateFromQuery(autoCreateValue === "1" || autoCreateValue === "true" || autoCreateValue === "yes");
  }, []);

  useEffect(() => {
    if (!usernameFromQuery) return;
    setUsername((current) => (current === "Jogador" ? usernameFromQuery : current));
  }, [usernameFromQuery]);

  useEffect(() => {
    autoJoinAttemptedRef.current = false;
  }, [autoCreateFromQuery, roomCodeFromQuery]);

  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, [sfx]);

  useEffect(() => {
    if (!duelOutcome) {
      setEndState(null);
      setEndScreenDismissed(false);
      endSfxPlayedRef.current = null;
      return;
    }

    setEndState((current) => current ?? duelOutcome);
  }, [duelOutcome]);

  useEffect(() => {
    if (!endState || endScreenDismissed) return;
    if (endSfxPlayedRef.current === endState) return;

    sfx.play(endState === "VICTORY" ? "victory" : "defeat");
    endSfxPlayedRef.current = endState;
  }, [endScreenDismissed, endState, sfx]);

  useEffect(() => {
    const storedPlayerId = getStoredPublicId();
    if (!storedPlayerId) {
      setRoomError("Sessao nao encontrada. Faca login no lobby.");
      return;
    }
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      socket.emit("auth:hello", { storedPlayerId });
    };

    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("auth:session", (payload: { playerId: string }) => {
      setPlayerId(payload.playerId);
      socket.emit("deck:list", {});

      if (roomCodeFromQuery && !autoJoinAttemptedRef.current) {
        autoJoinAttemptedRef.current = true;
        setJoinCode(roomCodeFromQuery);
        socket.emit("room:join", {
          roomCode: roomCodeFromQuery,
          username: usernameFromQuery || username
        });
      } else if (autoCreateFromQuery && !autoJoinAttemptedRef.current) {
        autoJoinAttemptedRef.current = true;
        socket.emit("room:create", {
          username: usernameFromQuery || username
        });
      }
    });
    socket.on("deck:list", (payload: DeckListPayload) => {
      const remoteCollection = ensureDeckCollection({
        decks: payload.decks,
        activeDeckId: payload.activeDeckId
      });
      setDeckCollection(remoteCollection);
      saveDeckCollection(remoteCollection);
      setDeckSyncError("");
    });
    socket.on("deck:error", (payload: { message: string }) => {
      setDeckSyncError(payload.message);
    });
    socket.on("room:state", (payload: RoomState) => {
      setRoomState(payload);
      setRoomError("");
      if (typeof window !== "undefined" && payload.roomCode) {
        window.localStorage.setItem(LAST_ROOM_CODE_STORAGE_KEY, payload.roomCode);
      }
    });
    socket.on("room:error", (payload: { message: string }) => {
      setRoomError(payload.message);
    });
    socket.on("game:snapshot", (payload: { state: GameStateForClient }) => {
      setSnapshot(payload.state);
      const pending = payload.state.pendingPrompt;
      if (!pending) {
        setMatchPrompt(null);
      } else {
        setMatchPrompt({
          promptType: pending.type,
          data: {
            attackerSlot: pending.attackerSlot,
            target: pending.target,
            availableTrapSlots: pending.availableTrapSlots
          }
        });
      }
      setGameError("");
    });
    socket.on("game:prompt", (payload: GamePromptPayload) => {
      setMatchPrompt({
        promptType: payload.promptType,
        data: payload.data ?? {}
      });
    });
    socket.on("game:events", (payload: { events: GameEvent[] }) => {
      const translated = payload.events.map((event) => eventToText(event, playerId));
      setLogs((prev) => [...translated.map((line) => withTimestamp(line)), ...prev].slice(0, 100));
      setTickerLines((prev) => [...translated, ...prev].slice(0, 8));

      for (const event of payload.events) {
        if (event.type === "ATTACK_WAITING_RESPONSE") {
          if (event.playerId && playerId && event.playerId !== playerId) {
            setWaitingAttackResolution(true);
          }
          continue;
        }

        if (event.type === "ATTACK_NEGATED") {
          setWaitingAttackResolution(false);
          sfx.play("ui_cancel");
          continue;
        }

        if (
          (event.type === "MONSTER_SUMMONED" || event.type === "MONSTER_FLIP_SUMMONED") &&
          typeof (event.payload as { slot?: number } | undefined)?.slot === "number" &&
          event.playerId &&
          playerId
        ) {
          const slot = (event.payload as { slot: number }).slot;
          const side: BoardSide = event.playerId === playerId ? "PLAYER" : "ENEMY";
          setSlotFx((current) => upsertSlotFx(current, { side, zone: "MONSTER", slotIndex: slot, effect: "summon" }));
          window.setTimeout(() => {
            setSlotFx((current) =>
              current.filter((item) => !(item.side === side && item.zone === "MONSTER" && item.slotIndex === slot && item.effect === "summon"))
            );
          }, 260);
          sfx.play("summon");
          continue;
        }

        if (event.type === "FUSION_RESOLVED" || event.type === "FUSION_FAILED") {
          const maybeSlot = (event.payload as { resultSlot?: number } | undefined)?.resultSlot;
          const fallbackSlot = event.playerId && playerId && event.playerId === playerId ? pendingFusionSlotRef.current : null;
          const fusionSlot = typeof maybeSlot === "number" ? maybeSlot : fallbackSlot;
          if (typeof fusionSlot === "number" && event.playerId && playerId) {
            const side: BoardSide = event.playerId === playerId ? "PLAYER" : "ENEMY";
            setSlotFx((current) => upsertSlotFx(current, { side, zone: "MONSTER", slotIndex: fusionSlot, effect: "fusion" }));
            window.setTimeout(() => {
              setSlotFx((current) =>
                current.filter((item) => !(item.side === side && item.zone === "MONSTER" && item.slotIndex === fusionSlot && item.effect === "fusion"))
              );
            }, 340);
          }

          if (event.type === "FUSION_RESOLVED" && event.playerId && playerId && event.playerId === playerId) {
            const payload = (event.payload ?? {}) as {
              discoveryKey?: unknown;
              materialsCount?: unknown;
              materialTags?: unknown;
              materialTemplateIds?: unknown;
              resultTemplateId?: unknown;
              resultName?: unknown;
            };
            if (typeof payload.discoveryKey === "string" && payload.discoveryKey.trim().length > 0) {
              const materialTags = Array.isArray(payload.materialTags)
                ? payload.materialTags.map((tag) => String(tag ?? "").trim()).filter(Boolean)
                : [];
              const materialCardIds = Array.isArray(payload.materialTemplateIds)
                ? payload.materialTemplateIds.map((cardId) => String(cardId ?? "").trim()).filter(Boolean)
                : [];
              const entry: FusionDiscoveryEntry = {
                key: payload.discoveryKey,
                materialsCount: payload.materialsCount === 3 ? 3 : 2,
                materialTags,
                materialCardIds,
                resultCardId: typeof payload.resultTemplateId === "string" ? payload.resultTemplateId : "unknown_result",
                resultName: typeof payload.resultName === "string" ? payload.resultName : "Resultado desconhecido",
                discoveredAt: Date.now(),
                times: 1
              };
              setFusionLog((current) => upsertFusionDiscovery(current, entry));
            }
          }

          pendingFusionSlotRef.current = null;
          sfx.play("fusion");
          continue;
        }

        if (event.type === "MONSTER_REVEALED") {
          const revealPayload = event.payload as { slot?: number; ownerPlayerId?: string } | undefined;
          if (typeof revealPayload?.slot === "number" && revealPayload.ownerPlayerId && playerId) {
            const side: BoardSide = revealPayload.ownerPlayerId === playerId ? "PLAYER" : "ENEMY";
            setHitEffectSlot(marker(side, "MONSTER", revealPayload.slot));
            window.setTimeout(() => setHitEffectSlot(null), 220);
          }
          continue;
        }

        if (event.type === "ATTACK_DECLARED") {
          const declared = event.payload as { attackerSlot?: number; target?: "DIRECT" | { slot?: number } } | undefined;
          if (typeof declared?.attackerSlot === "number" && event.playerId && playerId) {
            const side: BoardSide = event.playerId === playerId ? "PLAYER" : "ENEMY";
            setAttackEffectSlot(marker(side, "MONSTER", declared.attackerSlot));
            window.setTimeout(() => setAttackEffectSlot(null), 280);
          }
          if (declared?.target === "DIRECT") {
            sfx.play("attack_direct");
          }
          continue;
        }

        if (event.type === "BATTLE_RESOLVED") {
          setWaitingAttackResolution(false);
          const battle = event.payload as
            | { attackerSlot?: number; defenderSlot?: number; mode?: "DIRECT"; damage?: number; destroyed?: Array<{ playerId: string; slot: number }> }
            | undefined;

          if (typeof battle?.attackerSlot === "number" && event.playerId && playerId) {
            const side: BoardSide = event.playerId === playerId ? "PLAYER" : "ENEMY";
            setAttackEffectSlot(marker(side, "MONSTER", battle.attackerSlot));
            window.setTimeout(() => setAttackEffectSlot(null), 320);
          }

          if (typeof battle?.defenderSlot === "number" && event.playerId && playerId) {
            const side: BoardSide = event.playerId === playerId ? "ENEMY" : "PLAYER";
            setHitEffectSlot(marker(side, "MONSTER", battle.defenderSlot));
            window.setTimeout(() => setHitEffectSlot(null), 320);
          }

          if (Array.isArray(battle?.destroyed) && playerId) {
            for (const destroyed of battle.destroyed) {
              const side: BoardSide = destroyed.playerId === playerId ? "PLAYER" : "ENEMY";
              setSlotFx((current) => upsertSlotFx(current, { side, zone: "MONSTER", slotIndex: destroyed.slot, effect: "destroy" }));
              window.setTimeout(() => {
                setSlotFx((current) =>
                  current.filter((item) => !(item.side === side && item.zone === "MONSTER" && item.slotIndex === destroyed.slot && item.effect === "destroy"))
                );
              }, 360);
            }
          }

          sfx.play(battle?.mode === "DIRECT" ? "attack_direct" : "attack_hit");
          continue;
        }

        if (event.type === "LP_CHANGED") {
          const lp = event.payload as { delta?: number } | undefined;
          const delta = Number(lp?.delta ?? 0);
          if (!delta) continue;

          const side: "YOU" | "OPP" = event.playerId && event.playerId === playerId ? "YOU" : "OPP";
          const item: FloatingDamage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            value: Math.abs(delta),
            type: delta < 0 ? "damage" : "heal",
            side
          };
          setFloatingDamages((current) => [...current, item].slice(-8));
          window.setTimeout(() => {
            setFloatingDamages((current) => current.filter((entry) => entry.id !== item.id));
          }, 680);
          continue;
        }

        if (event.type === "TURN_CHANGED") {
          setWaitingAttackResolution(false);
          sfx.play("end_turn");
          continue;
        }
      }
    });
    socket.on("game:error", (payload: { message: string }) => {
      setGameError(payload.message);
    });
    socket.on("pve:result", (payload: PveResultPayload) => {
      setPveResultModal(payload);
      const summary = payload.didWin
        ? `Vitoria PVE! +${payload.rewardGold} gold | Drops: ${
            payload.rewardCards
              .map((drop) => `${CARD_INDEX[drop.cardId]?.name ?? drop.cardId} x${drop.count}`)
              .join(", ") || "nenhum"
          }.`
        : "Derrota no duelo PVE.";
      setLogs((prev) => [withTimestamp(summary), ...prev].slice(0, 100));
      setTickerLines((prev) => [summary, ...prev].slice(0, 8));

      if (payload.didWin) {
        const dropPreview =
          payload.rewardCards
            .slice(0, 2)
            .map((drop) => `${CARD_INDEX[drop.cardId]?.name ?? drop.cardId} x${drop.count}`)
            .join(", ") || "Sem drops";
        appendLobbyNotices([
          { text: `+${payload.rewardGold} gold recebido no duelo PVE.`, tone: "success" },
          { text: `Drops: ${dropPreview}`, tone: "info" }
        ]);
      }
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [playerId]);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    const loadFusionLog = async () => {
      try {
        const rows = await fetchFusionLog(playerId);
        if (!cancelled) {
          setFusionLog(rows);
        }
      } catch (error) {
        if (!cancelled) {
          setGameError(error instanceof Error ? error.message : "Falha ao carregar fusion log.");
        }
      }
    };

    void loadFusionLog();
    return () => {
      cancelled = true;
    };
  }, [playerId]);

  useEffect(() => {
    if (!snapshot) return;
    if (!isYourTurn(snapshot)) {
      setInteraction(idleInteraction());
    }
  }, [snapshot?.turn.playerId, snapshot?.version]);

  useEffect(() => {
    if (!activePrompt) return;
    setInteraction(idleInteraction());
    setMenuAnchorRect(null);
  }, [activePrompt]);

  useEffect(() => {
    if (!playerId || !activeDeck) return;
    socket.emit("deck:save", { deck: activeDeck });
    socket.emit("deck:setActive", { deckId: activeDeck.id });
  }, [playerId, activeDeck?.id, activeDeck?.updatedAt]);

  useEffect(() => {
    if (!snapshot || !selectedCard) return;

    if (selectedCard.source === "HAND") {
      const handCard = snapshot.you.hand?.find((card) => card.instanceId === selectedCard.instanceId);
      if (!handCard) {
        setSelectedCard(null);
        return;
      }
      setSelectedCard({
        source: "HAND",
        instanceId: handCard.instanceId,
        name: handCard.name,
        atk: handCard.atk,
        def: handCard.def,
        effectDescription: handCard.effectDescription,
        imagePath: handCard.imagePath
      });
      return;
    }

    if (selectedCard.source === "FIELD") {
      const fieldCard = snapshot.you.monsterZone.find((monster) => monster?.instanceId === selectedCard.instanceId);
      if (!fieldCard) {
        setSelectedCard(null);
        return;
      }
      setSelectedCard({
        source: "FIELD",
        instanceId: fieldCard.instanceId,
        name: fieldCard.name,
        atk: fieldCard.atk,
        def: fieldCard.def,
        position: fieldCard.position,
        effectDescription: fieldCard.effectDescription,
        imagePath: fieldCard.imagePath
      });
      return;
    }

    if (selectedCard.source === "FIELD_SPELL_TRAP") {
      const spellTrapCard = snapshot.you.spellTrapZone.find((card) => card?.instanceId === selectedCard.instanceId);
      if (!spellTrapCard) {
        setSelectedCard(null);
        return;
      }
      setSelectedCard({
        source: "FIELD_SPELL_TRAP",
        instanceId: spellTrapCard.instanceId,
        name: spellTrapCard.name,
        atk: spellTrapCard.atk,
        def: spellTrapCard.def,
        effectDescription: spellTrapCard.effectDescription,
        imagePath: spellTrapCard.imagePath
      });
      return;
    }

    if (selectedCard.source === "OPP_SPELL_TRAP") {
      const spellTrapCard = snapshot.opponent.spellTrapZone.find((card) => card?.instanceId === selectedCard.instanceId);
      if (!spellTrapCard) {
        setSelectedCard(null);
        return;
      }
      setSelectedCard({
        source: "OPP_SPELL_TRAP",
        instanceId: spellTrapCard.instanceId,
        name: spellTrapCard.name,
        atk: spellTrapCard.atk,
        def: spellTrapCard.def,
        effectDescription: spellTrapCard.effectDescription,
        imagePath: spellTrapCard.imagePath
      });
      return;
    }

    const opponentCard = snapshot.opponent.monsterZone.find((monster) => monster?.instanceId === selectedCard.instanceId);
    if (!opponentCard) {
      setSelectedCard(null);
      return;
    }
    setSelectedCard({
      source: "OPP_FIELD",
      instanceId: opponentCard.instanceId,
      name: opponentCard.name,
      atk: opponentCard.atk,
      def: opponentCard.def,
      position: opponentCard.position,
      effectDescription: opponentCard.effectDescription,
      imagePath: opponentCard.imagePath
    });
  }, [snapshot?.version, snapshot, selectedCard?.instanceId, selectedCard?.source]);

  const createRoom = () => {
    sfx.play("ui_click");
    setRoomError("");
    if (activeDeck) {
      socket.emit("deck:save", { deck: activeDeck });
      socket.emit("deck:setActive", { deckId: activeDeck.id });
    }
    socket.emit("room:create", { username });
  };

  const playSolo = () => {
    sfx.play("ui_click");
    setRoomError("");
    if (!syncActiveDeckToServer()) return;
    socket.emit("room:solo", { username });
  };

  const joinRoom = () => {
    sfx.play("ui_click");
    setRoomError("");
    if (activeDeck) {
      socket.emit("deck:save", { deck: activeDeck });
      socket.emit("deck:setActive", { deckId: activeDeck.id });
    }
    socket.emit("room:join", { roomCode: joinCode.trim().toUpperCase(), username });
  };

  const leaveRoom = () => {
    sfx.play("ui_cancel");
    socket.emit("room:leave", {});
    setRoomState(null);
    setSnapshot(null);
    setInteraction(idleInteraction());
    setSelectedCard(null);
    setPreviewCard(null);
    setSlotFx([]);
    setFloatingDamages([]);
    setTickerLines([]);
    setShowLogPanel(false);
    setShowFusionLogModal(false);
    setFusionLogSearch("");
    setMenuAnchorRect(null);
    setAttackHoverSlot(null);
    setEndState(null);
    setEndScreenDismissed(false);
    endSfxPlayedRef.current = null;
    pendingFusionSlotRef.current = null;
    setMatchPrompt(null);
    setWaitingAttackResolution(false);
  };

  const goBackToLobby = () => {
    if (showMatch) {
      const shouldLeave = window.confirm("Sair da partida atual e voltar ao Lobby?");
      if (!shouldLeave) return;
    }
    if (roomState) {
      leaveRoom();
    }
    router.push("/");
  };

  const returnToHome = () => {
    if (roomState) {
      leaveRoom();
    }
    router.push("/");
  };

  const toggleReady = () => {
    if (!meInRoom) return;
    sfx.play("ui_click");
    if (!meInRoom.ready && !syncActiveDeckToServer()) return;
    socket.emit("room:ready", { ready: !meInRoom.ready });
  };

  const startRoom = () => {
    sfx.play("ui_confirm");
    if (!syncActiveDeckToServer()) return;
    socket.emit("room:start", {});
  };

  const sendAction = (type: string, payload: unknown) => {
    socket.emit("game:action", {
      actionId: actionId(),
      type,
      payload
    });
  };

  const submitSummon = (handInstanceId: string, slot: number) => {
    sendAction("SUMMON_MONSTER", {
      handInstanceId,
      slot,
      position: "ATTACK"
    });
    setInteraction(idleInteraction());
  };

  const submitSetMonster = (handInstanceId: string, slot: number) => {
    sendAction("SET_MONSTER", {
      handInstanceId,
      slot
    });
    setInteraction(idleInteraction());
  };

  const submitSetSpellTrap = (handInstanceId: string, slot: number) => {
    sendAction("SET_SPELL_TRAP", {
      handInstanceId,
      slot
    });
    setInteraction(idleInteraction());
  };

  const submitActivateSpellFromHand = (handInstanceId: string, targetMonsterSlot?: number) => {
    sendAction("ACTIVATE_SPELL_FROM_HAND", {
      handInstanceId,
      targetMonsterSlot
    });
    setInteraction(idleInteraction());
  };

  const submitActivateSetCard = (slot: number, targetMonsterSlot?: number) => {
    sendAction("ACTIVATE_SET_CARD", {
      slot,
      targetMonsterSlot
    });
    setInteraction(idleInteraction());
  };

  const submitFusion = (materials: FuseMaterial[], resultSlot: number) => {
    if (materials.length < 2 || materials.length > 3) return;
    pendingFusionSlotRef.current = resultSlot;

    sendAction("FUSE", {
      materials,
      order: materials.map((material) => material.instanceId),
      resultSlot
    });
    setInteraction(idleInteraction());
  };

  const submitAttack = (attackerSlot: number, target: { slot: number } | "DIRECT") => {
    sendAction("ATTACK_DECLARE", {
      attackerSlot,
      target
    });
    setInteraction(idleInteraction());
  };

  const submitTrapResponsePass = () => {
    sendAction("TRAP_RESPONSE", {
      decision: "PASS"
    });
    setMatchPrompt(null);
  };

  const submitTrapResponseActivate = (trapSlot: number) => {
    sendAction("TRAP_RESPONSE", {
      decision: "ACTIVATE",
      trapSlot
    });
    setMatchPrompt(null);
  };

  const submitEndTurn = () => {
    sfx.play("ui_confirm");
    sendAction("END_TURN", {});
    setInteraction(idleInteraction());
  };

  const submitChangePosition = (slot: number, position: "ATTACK" | "DEFENSE") => {
    sendAction("CHANGE_POSITION", {
      slot,
      position
    });
    setInteraction(idleInteraction());
  };

  const persistDeckCollection = (next: DeckCollection) => {
    const normalized = ensureDeckCollection(next);
    setDeckCollection(normalized);
    saveDeckCollection(normalized);
  };

  const syncActiveDeckToServer = (): boolean => {
    if (!activeDeck) {
      setRoomError("Selecione um deck ativo no Deck Builder.");
      return false;
    }
    const validation = validateDeckForUi(activeDeck);
    if (!validation.ok) {
      setRoomError(`Deck invalido: ${validation.errors[0] ?? "corrija o deck antes de continuar."}`);
      return false;
    }
    socket.emit("deck:save", { deck: activeDeck });
    socket.emit("deck:setActive", { deckId: activeDeck.id });
    return true;
  };

  const onHandCardClick = (card: CardClientView, handIndex: number, anchorRect: AnchorRect) => {
    if (!snapshot) return;
    if (inputLockedByCombat) return;
    sfx.play("ui_click");

    setSelectedCard({
      source: "HAND",
      instanceId: card.instanceId,
      name: card.name,
      atk: card.atk,
      def: card.def,
      effectDescription: card.effectDescription,
      imagePath: card.imagePath
    });

    if (interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot") {
      const next = toggleFusionMaterial(interaction.materials, {
        source: "HAND",
        instanceId: card.instanceId
      });
      setInteraction({ kind: "fusion_selectMaterials", materials: next });
      return;
    }

    if (interaction.kind === "summon_selectSlot") {
      setInteraction({ kind: "summon_selectSlot", handInstanceId: card.instanceId });
      return;
    }

    if (interaction.kind === "setMonster_selectSlot") {
      setInteraction({ kind: "setMonster_selectSlot", handInstanceId: card.instanceId });
      return;
    }

    if (interaction.kind === "setSpellTrap_selectSlot") {
      setInteraction({ kind: "setSpellTrap_selectSlot", handInstanceId: card.instanceId });
      return;
    }

    if (!isYourTurn(snapshot)) return;

    sfx.play("ui_open_menu");
    setMenuAnchorRect(anchorRect);
    setInteraction({
      kind: "cardMenuOpen",
      source: { kind: "HAND", instanceId: card.instanceId, handIndex, cardKind: card.kind }
    });
  };

  const onBoardSlotClick = (slotIndex: number, side: BoardSide, zone: BoardZone, anchorRect: AnchorRect) => {
    if (!snapshot) return;
    if (inputLockedByCombat) return;
    sfx.play("ui_click");

    if (side === "PLAYER" && zone === "MONSTER") {
      const ownMonster = snapshot.you.monsterZone[slotIndex];
      if (ownMonster) {
        setSelectedCard({
          source: "FIELD",
          instanceId: ownMonster.instanceId,
          name: ownMonster.name,
          atk: ownMonster.atk,
          def: ownMonster.def,
          position: ownMonster.position,
          effectDescription: ownMonster.effectDescription,
          imagePath: ownMonster.imagePath
        });
      }
    } else if (side === "PLAYER" && zone === "SPELL_TRAP") {
      const ownSetCard = snapshot.you.spellTrapZone[slotIndex];
      if (ownSetCard) {
        setSelectedCard({
          source: "FIELD_SPELL_TRAP",
          instanceId: ownSetCard.instanceId,
          name: ownSetCard.name,
          atk: ownSetCard.atk,
          def: ownSetCard.def,
          effectDescription: ownSetCard.effectDescription,
          imagePath: ownSetCard.imagePath
        });
      }
    } else if (side === "ENEMY" && zone === "MONSTER") {
      const enemyMonster = snapshot.opponent.monsterZone[slotIndex];
      if (enemyMonster) {
        setSelectedCard({
          source: "OPP_FIELD",
          instanceId: enemyMonster.instanceId,
          name: enemyMonster.name,
          atk: enemyMonster.atk,
          def: enemyMonster.def,
          position: enemyMonster.position,
          effectDescription: enemyMonster.effectDescription,
          imagePath: enemyMonster.imagePath
        });
      }
    } else if (side === "ENEMY" && zone === "SPELL_TRAP") {
      const enemySetCard = snapshot.opponent.spellTrapZone[slotIndex];
      if (enemySetCard) {
        setSelectedCard({
          source: "OPP_SPELL_TRAP",
          instanceId: enemySetCard.instanceId,
          name: enemySetCard.name,
          atk: enemySetCard.atk,
          def: enemySetCard.def,
          effectDescription: enemySetCard.effectDescription,
          imagePath: enemySetCard.imagePath
        });
      }
    }

    if (interaction.kind === "summon_selectSlot") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      if (snapshot.you.monsterZone[slotIndex]) return;
      submitSummon(interaction.handInstanceId, slotIndex);
      return;
    }

    if (interaction.kind === "setMonster_selectSlot") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      if (snapshot.you.monsterZone[slotIndex]) return;
      submitSetMonster(interaction.handInstanceId, slotIndex);
      return;
    }

    if (interaction.kind === "setSpellTrap_selectSlot") {
      if (side !== "PLAYER" || zone !== "SPELL_TRAP") return;
      if (snapshot.you.spellTrapZone[slotIndex]) return;
      submitSetSpellTrap(interaction.handInstanceId, slotIndex);
      return;
    }

    if (interaction.kind === "equipFromHand_selectTarget") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      const target = snapshot.you.monsterZone[slotIndex];
      if (!target || target.face !== "FACE_UP") return;
      submitActivateSpellFromHand(interaction.handInstanceId, slotIndex);
      return;
    }

    if (interaction.kind === "equipSet_selectTarget") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      const target = snapshot.you.monsterZone[slotIndex];
      if (!target || target.face !== "FACE_UP") return;
      submitActivateSetCard(interaction.slotIndex, slotIndex);
      return;
    }

    if (interaction.kind === "fusion_selectMaterials") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      const monster = snapshot.you.monsterZone[slotIndex];
      if (!monster) return;
      const next = toggleFusionMaterial(interaction.materials, {
        source: "FIELD",
        instanceId: monster.instanceId,
        slot: slotIndex
      });
      setInteraction({ kind: "fusion_selectMaterials", materials: next });
      return;
    }

    if (interaction.kind === "fusion_chooseResultSlot") {
      if (side !== "PLAYER" || zone !== "MONSTER") return;
      const allowedSlots = getFusionResultAllowedSlots(snapshot, interaction.materials);
      if (!allowedSlots.includes(slotIndex)) return;
      submitFusion(interaction.materials, slotIndex);
      return;
    }

    if (interaction.kind === "attack_chooseTarget") {
      if (zone !== "MONSTER") return;
      if (side === "PLAYER") {
        const nextAttacker = snapshot.you.monsterZone[slotIndex];
        if (canMonsterAttack(snapshot, nextAttacker)) {
          setInteraction({ kind: "attack_chooseTarget", attackerSlot: slotIndex });
          setAttackHoverSlot(null);
        }
        return;
      }

      const enemy = snapshot.opponent.monsterZone[slotIndex];
      if (!enemy) return;
      submitAttack(interaction.attackerSlot, { slot: slotIndex });
      return;
    }

    if (interaction.kind === "position_choose") {
      return;
    }

    if (side !== "PLAYER") {
      return;
    }

    if (zone === "MONSTER") {
      const monster = snapshot.you.monsterZone[slotIndex];
      if (!monster || !isYourTurn(snapshot)) {
        setInteraction(idleInteraction());
        return;
      }

      sfx.play("ui_open_menu");
      setInteraction({
        kind: "cardMenuOpen",
        source: { kind: "FIELD", zone: "MONSTER", slotIndex }
      });
      setMenuAnchorRect(anchorRect);
      return;
    }

    const setCard = snapshot.you.spellTrapZone[slotIndex];
    if (!setCard) {
      setInteraction(idleInteraction());
      return;
    }

    sfx.play("ui_open_menu");
    setInteraction({
      kind: "cardMenuOpen",
      source: { kind: "FIELD", zone: "SPELL_TRAP", slotIndex }
    });
    setMenuAnchorRect(anchorRect);
  };

  const canConcludeFusion = interaction.kind === "fusion_selectMaterials" && interaction.materials.length >= 2;
  const showActionTray =
    interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot" || interaction.kind === "position_choose";
  const actionTrayClassName =
    interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot"
      ? "left-1/2 top-[22%] -translate-x-1/2 max-[980px]:top-[18%]"
      : "bottom-[86px] left-1/2 -translate-x-1/2";
  const showHintBanner = !isMyTurn || isFlowState(interaction) || Boolean(gameError) || inputLockedByCombat;
  const hintBannerText =
    gameError || (waitingForPrompt ? "Responder combate pendente..." : waitingAttackResolution ? "Aguardando resposta do oponente..." : hint);
  const targetingMode =
    interaction.kind === "attack_chooseTarget"
      ? "ATTACK"
      : interaction.kind === "fusion_selectMaterials" || interaction.kind === "fusion_chooseResultSlot"
        ? "FUSION"
        : null;

  const positionStateMonster =
    snapshot && interaction.kind === "position_choose" ? snapshot.you.monsterZone[interaction.slotIndex] : null;

  return (
    <main className="fm-screen fm-noise-overlay mx-auto flex h-screen min-h-screen w-full max-w-none flex-col gap-3 overflow-hidden p-4">
      <header className="fm-panel shrink-0 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="fm-title text-xl font-bold">Ruptura Arcana</h1>
            <p className="fm-subtitle text-xs">
              Socket: {connected ? "conectado" : "desconectado"} {playerId ? `| PlayerId: ${playerId}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={goBackToLobby}
            className="fm-button rounded-lg px-3 py-2 text-xs font-semibold"
          >
            Voltar ao Lobby
          </button>
        </div>
      </header>

      {!roomState && (
        <section className="fm-panel grid gap-3 p-4">
          <h2 className="fm-title text-lg font-semibold">Home</h2>
          <input
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
          />
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              value={deckCollection.activeDeckId ?? ""}
              onChange={(event) => {
                const next = setDeckActive(deckCollection, event.target.value);
                persistDeckCollection(next);
                socket.emit("deck:setActive", { deckId: event.target.value });
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
            >
              {deckCollection.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center font-semibold text-cyan-100">
              Deck Builder
            </Link>
          </div>
          <p className={`text-xs ${isActiveDeckValid ? "text-emerald-300" : "text-rose-300"}`}>
            Deck ativo: {activeDeck?.name ?? "--"} | {activeDeckValidation?.total ?? 0}/40
            {!isActiveDeckValid && activeDeckValidation?.errors[0] ? ` | ${activeDeckValidation.errors[0]}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="fm-button rounded-lg px-3 py-2 font-semibold" onClick={createRoom}>
              Criar Sala
            </button>
            <button
              className="fm-button rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              onClick={playSolo}
              disabled={!isActiveDeckValid}
              title={!isActiveDeckValid ? "Deck invalido" : undefined}
            >
              Jogar Solo
            </button>
            <input
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="Codigo da sala"
            />
            <button className="fm-button rounded-lg px-3 py-2 font-semibold" onClick={joinRoom}>
              Entrar
            </button>
          </div>
          {deckSyncError && <p className="text-sm text-amber-300">{deckSyncError}</p>}
          {roomError && <p className="text-sm text-rose-300">{roomError}</p>}
        </section>
      )}

      {inLobby && roomState && (
        <section className="fm-panel grid gap-3 p-4">
          <h2 className="fm-title text-lg font-semibold">Lobby - Sala {roomState.roomCode}</h2>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <select
              value={deckCollection.activeDeckId ?? ""}
              onChange={(event) => {
                const next = setDeckActive(deckCollection, event.target.value);
                persistDeckCollection(next);
                socket.emit("deck:setActive", { deckId: event.target.value });
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              {deckCollection.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold text-cyan-100">
              Editar Decks
            </Link>
          </div>
          <p className={`text-xs ${isActiveDeckValid ? "text-emerald-300" : "text-rose-300"}`}>
            Deck ativo: {activeDeck?.name ?? "--"} | {activeDeckValidation?.total ?? 0}/40
            {!isActiveDeckValid && activeDeckValidation?.errors[0] ? ` | ${activeDeckValidation.errors[0]}` : ""}
          </p>
          <ul className="grid gap-1 text-sm">
            {roomState.players.map((player) => (
              <li key={player.playerId} className="rounded bg-slate-800/90 p-2">
                {player.username} [{player.type}] {player.playerId === roomState.hostId ? "(Host)" : ""} | ready: {player.ready ? "sim" : "nao"} |{" "}
                {player.online ? "online" : "offline"}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
             <button
               className="fm-button rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
               onClick={toggleReady}
               disabled={!meInRoom?.ready && !isActiveDeckValid}
               title={!meInRoom?.ready && !isActiveDeckValid ? "Deck invalido" : undefined}
            >
              {meInRoom?.ready ? "Desmarcar ready" : "Marcar ready"}
            </button>
            {roomState.hostId === playerId && (
               <button
                 className="fm-button rounded-lg px-3 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                 onClick={startRoom}
                 disabled={!isActiveDeckValid}
                 title={!isActiveDeckValid ? "Deck invalido" : undefined}
              >
                Iniciar partida
              </button>
            )}
            <button className="fm-button rounded-lg px-3 py-2 font-semibold" onClick={leaveRoom}>
              Sair
            </button>
          </div>
          {deckSyncError && <p className="text-sm text-amber-300">{deckSyncError}</p>}
          {roomError && <p className="text-sm text-rose-300">{roomError}</p>}
        </section>
      )}

      {showMatch && snapshot && (
        <section
          className={`grid min-h-0 flex-1 gap-3 overflow-visible ${showLogPanel ? "lg:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"}`}
        >
          <div className="fm-panel fm-frame relative flex min-h-0 flex-col gap-2 overflow-visible p-3">
            <HintsBar
              yourTurn={isMyTurn}
              phase={snapshot.turn.phase}
              turnNumber={snapshot.turn.turnNumber}
              mainActionUsed={snapshot.you.usedSummonOrFuseThisTurn}
              waitingPrompt={inputLockedByCombat}
            />

            <div className="absolute right-3 top-3 z-tooltip flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setShowLogPanel((current) => !current)}
                className="fm-button rounded-md px-2 py-1 text-[11px] font-semibold"
              >
                {showLogPanel ? "Fechar Log" : "Abrir Log"}
              </button>
              <button
                type="button"
                onClick={() => setShowFusionLogModal(true)}
                className="fm-button rounded-md px-2 py-1 text-[11px] font-semibold"
              >
                Fusion Log
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-visible">
              <LogTicker lines={tickerLines} className="top-4" />
              <div className="relative z-board h-full">
                <BoardStage
                  playerMonsters={playerMonsters}
                  enemyMonsters={enemyMonsters}
                  playerSpellTraps={playerSpellTraps}
                  enemySpellTraps={enemySpellTraps}
                  zoneCounts={{
                    DECK_YOU: snapshot.you.deckCount,
                    GRAVE_YOU: snapshot.you.graveyard.length,
                    DECK_OPP: snapshot.opponent.deckCount,
                    GRAVE_OPP: snapshot.opponent.graveyard.length
                  }}
                  zoneCards={{
                    GRAVE_YOU: snapshot.you.graveyard,
                    GRAVE_OPP: snapshot.opponent.graveyard
                  }}
                  selectedSlots={selectedBoardSlots}
                  targetSlots={targetBoardSlots}
                  highlightedSlots={highlightedBoardSlots}
                  slotBadges={slotBadges}
                  slotEffects={slotFx}
                  targetingMode={targetingMode}
                  attackEffectSlot={attackEffectSlot}
                  hitEffectSlot={hitEffectSlot}
                  onHoverSlot={(slotIndex, side, zone, hoverRect) => {
                    if (!snapshot || interaction.kind !== "attack_chooseTarget" || side !== "ENEMY" || zone !== "MONSTER") {
                      if (interaction.kind !== "attack_chooseTarget") setAttackHoverSlot(null);
                      return;
                    }

                    if (!hoverRect) {
                      setAttackHoverSlot(null);
                      return;
                    }

                    if (!snapshot.opponent.monsterZone[slotIndex]) {
                      setAttackHoverSlot(null);
                      return;
                    }

                    setAttackHoverSlot({ side, zone: "MONSTER", slotIndex });
                  }}
                  onHoverMonster={(card, _anchorRect) => {
                    if (!card) {
                      setPreviewCard(null);
                      return;
                    }
                    setPreviewCard({
                      name: card.name,
                      atk: card.atk,
                      def: card.def,
                      position: card.position,
                      effectDescription: card.effectDescription,
                      imagePath: card.imagePath
                    });
                  }}
                  onClickSlot={onBoardSlotClick}
                />
              </div>
              <HudLayer>
                <LpHudImage youLp={snapshot.you.lp} opponentLp={snapshot.opponent.lp} opponentHandCount={snapshot.opponent.handCount} className="top-2 right-2" />
                <HintBanner text={hintBannerText} visible={showHintBanner} />
                <EndTurnButton
                  enabled={isMyTurn}
                  onEndTurn={submitEndTurn}
                  className="left-[82%] top-[67%] -translate-x-1/2 -translate-y-1/2 max-[980px]:left-[79%] max-[980px]:top-[64%]"
                />

                <ActionTray visible={showActionTray} className={actionTrayClassName}>
                      {isFlowState(interaction) && (
                        <button
                          type="button"
                          onClick={() => {
                            sfx.play("ui_cancel");
                            setInteraction(idleInteraction());
                          }}
                          className="flex items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-700 px-3 py-1.5 text-xs font-semibold"
                        >
                          <img src="/icons/icon_cancel.png" alt="" aria-hidden className="h-3.5 w-3.5" />
                          Cancelar
                        </button>
                      )}

                      {interaction.kind === "fusion_selectMaterials" && (
                        <>
                          <span className="rounded bg-amber-900/50 px-2 py-1 text-amber-100">
                            Materiais: {interaction.materials.map((material, index) => `${index + 1}`).join(" ") || "-"}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              sfx.play("ui_confirm");
                              setInteraction({ kind: "fusion_chooseResultSlot", materials: interaction.materials });
                            }}
                            disabled={!canConcludeFusion}
                            className="flex items-center gap-1.5 rounded-lg border border-amber-300/50 bg-amber-700/80 px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                          >
                            <img src="/icons/icon_confirm.png" alt="" aria-hidden className="h-3.5 w-3.5" />
                            Concluir Fusao
                          </button>
                          {interaction.materials.length >= 2 && (
                            knownFusionPreview ? (
                              <span className="rounded border border-emerald-300/50 bg-emerald-900/35 px-2 py-1 text-[11px] text-emerald-100">
                                Resultado conhecido: {knownFusionPreview.resultName}
                              </span>
                            ) : (
                              <span className="rounded border border-slate-500/60 bg-slate-800/70 px-2 py-1 text-[11px] text-slate-200">
                                Resultado desconhecido
                              </span>
                            )
                          )}
                        </>
                      )}

                      {interaction.kind === "fusion_chooseResultSlot" && (
                        <div className="flex flex-col gap-1">
                          <span className="rounded bg-amber-900/50 px-2 py-1 text-amber-100">Escolha o slot de resultado no board.</span>
                          {knownFusionPreview ? (
                            <span className="rounded border border-emerald-300/50 bg-emerald-900/35 px-2 py-1 text-[11px] text-emerald-100">
                              Resultado conhecido: {knownFusionPreview.resultName}
                            </span>
                          ) : (
                            <span className="rounded border border-slate-500/60 bg-slate-800/70 px-2 py-1 text-[11px] text-slate-200">
                              Resultado desconhecido
                            </span>
                          )}
                        </div>
                      )}

                      {interaction.kind === "position_choose" && positionStateMonster && (
                        <>
                          <span className="rounded bg-slate-800 px-2 py-1">Mudar posicao Slot {interaction.slotIndex + 1}</span>
                          <button
                            type="button"
                            onClick={() => submitChangePosition(interaction.slotIndex, "ATTACK")}
                            disabled={positionStateMonster.position === "ATTACK"}
                            className="flex items-center gap-1.5 rounded-lg border border-rose-300/50 bg-rose-700/80 px-3 py-1.5 font-semibold disabled:opacity-45"
                          >
                            <img src="/icons/icon_sword.png" alt="" aria-hidden className="h-3.5 w-3.5" />
                            ATK
                          </button>
                          <button
                            type="button"
                            onClick={() => submitChangePosition(interaction.slotIndex, "DEFENSE")}
                            disabled={positionStateMonster.position === "DEFENSE"}
                            className="flex items-center gap-1.5 rounded-lg border border-sky-300/50 bg-sky-700/80 px-3 py-1.5 font-semibold disabled:opacity-45"
                          >
                            <img src="/icons/icon_shield.png" alt="" aria-hidden className="h-3.5 w-3.5" />
                            DEF
                          </button>
                          <span className="rounded bg-slate-800 px-2 py-1 text-[11px]">Atual: {positionStateMonster.position}</span>
                        </>
                      )}
                </ActionTray>
              </HudLayer>

              {floatingDamages.map((item) => (
                <DamageNumber key={item.id} value={item.value} type={item.type} side={item.side} />
              ))}

              <CardPreview card={previewSelection} dimmed={Boolean(targetingMode)} />

              <div className="pointer-events-none absolute inset-x-0 bottom-[18px] z-hand mx-auto w-full max-w-[1320px] overflow-visible px-3">
                <div className="mx-auto h-[210px] w-full max-w-[1040px] overflow-visible">
                  <HandFan
                    cards={handCards}
                    selectedIds={selectedHandIds}
                    highlightedIds={highlightedHandIds}
                    badgeById={handBadgeById}
                    onCardClick={onHandCardClick}
                    onCardHover={(card) => {
                      if (!card) {
                        setPreviewCard(null);
                        return;
                      }
                      setPreviewCard({
                        name: card.name,
                        atk: card.atk,
                        def: card.def,
                        position: "ATTACK",
                        effectDescription: card.effectDescription,
                        imagePath: card.imagePath
                      });
                    }}
                  />
                </div>
              </div>

              {interaction.kind === "attack_chooseTarget" && directAttackAvailable && (
                <button
                  type="button"
                  onClick={() => submitAttack(interaction.attackerSlot, "DIRECT")}
                  className="absolute left-1/2 top-1/2 z-tooltip flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border border-rose-300/60 bg-rose-700/85 px-4 py-2 text-sm font-semibold text-rose-100 shadow"
                >
                  <img src="/icons/icon_sword.png" alt="" aria-hidden className="h-4 w-4" />
                  Ataque Direto
                </button>
              )}
            </div>

            {interaction.kind === "cardMenuOpen" && menuItems.length > 0 && menuAnchorRect && (
              <ContextMenuPortal>
                <CardMenu anchorRect={menuAnchorRect} items={menuItems} />
              </ContextMenuPortal>
            )}

            <EndScreen
              visible={Boolean(endState) && !endScreenDismissed && !pveResultModal}
              won={endState === "VICTORY"}
              onLeave={returnToHome}
              onDismiss={() => setEndScreenDismissed(true)}
            />

            <PveDropsModal
              visible={Boolean(pveResultModal)}
              didWin={Boolean(pveResultModal?.didWin)}
              npcId={pveResultModal?.npcId ?? ""}
              rewardGold={pveResultModal?.rewardGold ?? 0}
              rewardCards={pveResultModal?.rewardCards ?? []}
              onLeave={returnToHome}
              onClose={() => setPveResultModal(null)}
            />

            {activePrompt && (
              <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/45 p-4">
                <div className="fm-panel w-full max-w-md p-4">
                  <h3 className="fm-title text-sm font-semibold">Resposta de Armadilha</h3>
                  <p className="mt-1 text-xs text-slate-200">Ativar uma armadilha setada antes da resolucao do ataque?</p>

                  <div className="mt-3 space-y-2">
                    {(activePrompt.data.availableTrapSlots ?? []).length === 0 ? (
                      <p className="rounded border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-300">
                        Nenhuma armadilha disponivel. Passe para continuar o combate.
                      </p>
                    ) : (
                      (activePrompt.data.availableTrapSlots ?? []).map((slot) => {
                        const trap = snapshot?.you.spellTrapZone[slot];
                        return (
                          <button
                            key={`prompt-trap-${slot}`}
                            type="button"
                            onClick={() => submitTrapResponseActivate(slot)}
                            className="fm-button flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold"
                          >
                            <span>Ativar Slot {slot + 1}</span>
                            <span className="text-[10px] text-cyan-100">{trap?.name ?? "Trap Setada"}</span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={submitTrapResponsePass} className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                      Passar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {showFusionLogModal && (
            <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4" onClick={() => setShowFusionLogModal(false)}>
              <div
                className="fm-panel fm-frame w-full max-w-[960px] p-4"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="fm-title text-base font-semibold">Fusion Log</h3>
                    <p className="fm-subtitle text-xs">Fusoes descobertas: {fusionLog.length}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFusionLogModal(false)}
                    className="fm-button rounded-md px-2 py-1 text-xs font-semibold"
                  >
                    Fechar
                  </button>
                </div>

                <input
                  value={fusionLogSearch}
                  onChange={(event) => setFusionLogSearch(event.target.value)}
                  placeholder="Buscar por resultado ou tag..."
                  className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                />

                <div className="fm-scroll max-h-[58vh] overflow-y-auto pr-1">
                  {filteredFusionLog.length === 0 ? (
                    <p className="rounded border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">Nenhuma fusao encontrada.</p>
                  ) : (
                    <ul className="grid gap-2 md:grid-cols-2">
                      {filteredFusionLog.map((entry) => {
                        const resultCard = CARD_INDEX[entry.resultCardId];
                        const resultTags = resultCard?.tags ?? [];
                        const resultAtk = resultCard?.atk ?? 0;
                        const resultDef = resultCard?.def ?? 0;
                        const materialNames =
                          entry.materialCardIds.length > 0
                            ? entry.materialCardIds.map((cardId) => CARD_INDEX[cardId]?.name ?? cardId)
                            : [];

                        return (
                          <li key={entry.key} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                            <div className="flex items-start gap-3">
                              <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-900">
                                {resultCard?.imagePath ? (
                                  <img src={resultCard.imagePath} alt={entry.resultName} className="h-full w-full object-cover" loading="lazy" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-fuchsia-100">{entry.resultName}</p>
                                <p className="text-[11px] text-slate-400">{entry.resultCardId}</p>
                                <p className="mt-1 text-xs text-amber-200">
                                  ATK/DEF: {resultAtk}/{resultDef}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-300">
                                  Tags carta: {resultTags.length > 0 ? resultTags.join(" - ") : "--"}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-300">
                                  Tags materiais: {entry.materialTags.length > 0 ? entry.materialTags.join(" - ") : "--"}
                                </p>
                                <p className="text-[11px] text-amber-200">
                                  Materiais: {entry.materialsCount} - Descoberta(s): {entry.times}
                                </p>
                                {materialNames.length > 0 ? (
                                  <p className="mt-1 text-[11px] text-slate-200">Usadas: {materialNames.join(" + ")}</p>
                                ) : (
                                  <p className="mt-1 text-[11px] text-slate-300">{entry.materialTags.join(" - ")}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {showLogPanel && (
            <aside className="fm-panel flex min-h-0 w-full max-w-[320px] flex-col gap-2 overflow-hidden p-3">
            <h3 className="text-sm font-semibold text-slate-100">Estado rapido</h3>
            <p className="text-xs text-slate-300">Room: {roomState?.roomCode}</p>
            <p className="text-xs text-slate-300">Seu cemiterio: {snapshot.you.graveyard.length}</p>
            <p className="text-xs text-slate-300">Cemiterio inimigo: {snapshot.opponent.graveyard.length}</p>
            {snapshot.winnerId && <p className="rounded bg-emerald-900/50 p-2 text-sm text-emerald-200">Vencedor: {snapshot.winnerId}</p>}

            <div className="mt-1 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Log</h3>
              <button className="fm-button rounded px-2 py-1 text-xs" onClick={() => setLogs([])}>
                Limpar
              </button>
            </div>
            <div className="fm-scroll max-h-[40vh] min-h-0 flex-1 overflow-auto rounded bg-slate-950/80 p-2 text-xs text-slate-200">
              {logs.length === 0 && <p className="text-slate-500">Sem eventos.</p>}
              {logs.map((line, index) => (
                <p key={`${line}-${index}`} className="border-b border-slate-800 py-1">
                  {line}
                </p>
              ))}
            </div>
            <button className="fm-button rounded-lg px-3 py-2 text-sm font-semibold" onClick={leaveRoom}>
              Sair da partida
            </button>
            </aside>
          )}
        </section>
      )}
    </main>
  );
}


