import { describe, expect, it } from "vitest";
import type { GameState, MonsterOnBoard, SpellTrapOnBoard } from "@ruptura-arcana/shared";
import { applyAction } from "../src/engine/reducer";
import { CARD_TEMPLATES } from "../src/data/cardTemplates";

function makeMonster(
  instanceId: string,
  templateId: string,
  ownerId: string,
  slot: number,
  position: "ATTACK" | "DEFENSE",
  face: "FACE_UP" | "FACE_DOWN" = "FACE_UP"
): MonsterOnBoard {
  return {
    instanceId,
    templateId,
    ownerId,
    zone: "MONSTER",
    slot,
    face,
    position,
    atkModifier: 0,
    defModifier: 0,
    hasAttackedThisTurn: false,
    positionChangedThisTurn: false
  };
}

function makeTrap(instanceId: string, templateId: string, ownerId: string, slot: number): SpellTrapOnBoard {
  return {
    instanceId,
    templateId,
    ownerId,
    zone: "SPELL_TRAP",
    slot,
    kind: "TRAP",
    face: "FACE_DOWN",
    setThisTurn: false
  };
}

function templateIdByName(name: string): string {
  const hit = Object.values(CARD_TEMPLATES).find((template) => template.name === name);
  if (!hit) throw new Error(`Template not found for '${name}'`);
  return hit.id;
}

function makeState(): GameState {
  return {
    version: 1,
    status: "RUNNING",
    seed: 456,
    firstPlayerId: "p1",
    config: {
      faceDownSurvivorMode: "REVEALED"
    },
    turn: {
      playerId: "p1",
      phase: "MAIN",
      turnNumber: 2
    },
    pendingAttack: null,
    players: [
      {
        id: "p1",
        username: "P1",
        lp: 8000,
        deck: [],
        hand: [],
        graveyard: [],
        monsterZone: [null, null, null, null, null],
        spellTrapZone: [null, null, null, null, null],
        usedSummonOrFuseThisTurn: false
      },
      {
        id: "p2",
        username: "P2",
        lp: 8000,
        deck: [],
        hand: [],
        graveyard: [],
        monsterZone: [null, null, null, null, null],
        spellTrapZone: [null, null, null, null, null],
        usedSummonOrFuseThisTurn: false
      }
    ],
    instances: {}
  };
}

describe("flip/trap attack flow", () => {
  it("flip summon reveals set monster and moves to ATTACK", () => {
    const state = makeState();
    const templateId = templateIdByName("Mystical Elf");
    state.instances.m1 = { instanceId: "m1", ownerId: "p1", templateId };
    state.players[0].monsterZone[0] = makeMonster("m1", templateId, "p1", 0, "DEFENSE", "FACE_DOWN");

    const result = applyAction(
      state,
      {
        actionId: "flip-1",
        type: "FLIP_SUMMON",
        payload: { slot: 0 }
      },
      "p1"
    );

    const flipped = result.nextState.players[0].monsterZone[0];
    expect(flipped?.face).toBe("FACE_UP");
    expect(flipped?.position).toBe("ATTACK");
    expect(flipped?.positionChangedThisTurn).toBe(true);
    expect(result.events.some((event) => event.type === "MONSTER_FLIP_SUMMONED")).toBe(true);
  });

  it("reveals defender on attack and keeps it face-up when surviving", () => {
    const state = makeState();
    const attackerTemplateId = templateIdByName("Mystical Elf");
    const defenderTemplateId = templateIdByName("Giant Soldier of Stone");
    state.instances.a1 = { instanceId: "a1", ownerId: "p1", templateId: attackerTemplateId };
    state.instances.d1 = { instanceId: "d1", ownerId: "p2", templateId: defenderTemplateId };
    state.players[0].monsterZone[0] = makeMonster("a1", attackerTemplateId, "p1", 0, "ATTACK", "FACE_UP");
    state.players[1].monsterZone[0] = makeMonster("d1", defenderTemplateId, "p2", 0, "DEFENSE", "FACE_DOWN");

    const declared = applyAction(
      state,
      {
        actionId: "atk-1",
        type: "ATTACK_DECLARE",
        payload: { attackerSlot: 0, target: { slot: 0 } }
      },
      "p1"
    );
    expect(declared.nextState.pendingAttack).toBeNull();
    expect(declared.nextState.players[1].monsterZone[0]?.face).toBe("FACE_UP");
    expect(declared.nextState.players[1].monsterZone[0]?.position).toBe("DEFENSE");
  });

  it("activates trap response and cancels attack", () => {
    const state = makeState();
    const attackerTemplateId = templateIdByName("Red-eyes B. Dragon");
    const defenderTemplateId = templateIdByName("Mystical Elf");
    const trapTemplateId = templateIdByName("Widespread Ruin");

    state.instances.a1 = { instanceId: "a1", ownerId: "p1", templateId: attackerTemplateId };
    state.instances.d1 = { instanceId: "d1", ownerId: "p2", templateId: defenderTemplateId };
    state.instances.t1 = { instanceId: "t1", ownerId: "p2", templateId: trapTemplateId };
    state.players[0].monsterZone[0] = makeMonster("a1", attackerTemplateId, "p1", 0, "ATTACK", "FACE_UP");
    state.players[1].monsterZone[0] = makeMonster("d1", defenderTemplateId, "p2", 0, "DEFENSE", "FACE_DOWN");
    state.players[1].spellTrapZone[0] = makeTrap("t1", trapTemplateId, "p2", 0);

    const declared = applyAction(
      state,
      {
        actionId: "trap-1",
        type: "ATTACK_DECLARE",
        payload: { attackerSlot: 0, target: { slot: 0 } }
      },
      "p1"
    );

    const trapResponse = applyAction(
      declared.nextState,
      {
        actionId: "trap-2",
        type: "TRAP_RESPONSE",
        payload: { decision: "ACTIVATE", trapSlot: 0 }
      },
      "p2"
    );

    expect(trapResponse.nextState.pendingAttack).toBeNull();
    expect(trapResponse.nextState.players[0].monsterZone[0]).toBeNull();
    expect(trapResponse.nextState.players[1].spellTrapZone[0]).toBeNull();
    expect(trapResponse.nextState.players[1].graveyard.includes("t1")).toBe(true);
    expect(trapResponse.events.some((event) => event.type === "TRAP_ACTIVATED")).toBe(true);
    expect(trapResponse.events.some((event) => event.type === "ATTACK_NEGATED")).toBe(true);
  });
});
