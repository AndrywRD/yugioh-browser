import { describe, expect, it } from "vitest";
import type { GameState, MonsterOnBoard } from "@ruptura-arcana/shared";
import { applyAction } from "../src/engine/reducer";
import { CARD_TEMPLATES } from "../src/data/cardTemplates";

function makeMonster(instanceId: string, templateId: string, ownerId: string, position: "ATTACK" | "DEFENSE"): MonsterOnBoard {
  return {
    instanceId,
    templateId,
    ownerId,
    zone: "MONSTER",
    slot: 0,
    face: "FACE_UP",
    position,
    atkModifier: 0,
    defModifier: 0,
    hasAttackedThisTurn: false,
    positionChangedThisTurn: false
  };
}

function makeState(): GameState {
  return {
    version: 1,
    status: "RUNNING",
    seed: 123,
    firstPlayerId: "p1",
    config: {
      faceDownSurvivorMode: "REVEALED"
    },
    turn: {
      playerId: "p1",
      phase: "MAIN",
      turnNumber: 1
    },
    pendingAttack: null,
    players: [
      {
        id: "p1",
        username: "Player1",
        lp: 8000,
        deck: [],
        hand: ["p1-a", "p1-b", "p1-c"],
        graveyard: [],
        monsterZone: [null, null, null, null, null],
        spellTrapZone: [null, null, null, null, null],
        usedSummonOrFuseThisTurn: false
      },
      {
        id: "p2",
        username: "Player2",
        lp: 8000,
        deck: [],
        hand: [],
        graveyard: [],
        monsterZone: [null, null, null, null, null],
        spellTrapZone: [null, null, null, null, null],
        usedSummonOrFuseThisTurn: false
      }
    ],
    instances: {
      "p1-a": { instanceId: "p1-a", ownerId: "p1", templateId: "fm_001_blue_eyes_white_dragon" },
      "p1-b": { instanceId: "p1-b", ownerId: "p1", templateId: "fm_002_mystical_elf" },
      "p1-c": { instanceId: "p1-c", ownerId: "p1", templateId: "fm_004_baby_dragon" }
    }
  };
}

function templateIdByName(name: string): string {
  const hit = Object.values(CARD_TEMPLATES).find((template) => template.name === name);
  if (!hit) {
    throw new Error(`Template not found for '${name}'`);
  }
  return hit.id;
}

describe("engine reducer", () => {
  it("applies fallback card when two-material fusion fails", () => {
    const state = makeState();

    const result = applyAction(
      state,
      {
        actionId: "a1",
        type: "FUSE",
        payload: {
          materials: [
            { source: "HAND", instanceId: "p1-a" },
            { source: "HAND", instanceId: "p1-b" }
          ],
          order: ["p1-a", "p1-b"],
          resultSlot: 0
        }
      },
      "p1"
    );

    const fused = result.nextState.players[0].monsterZone[0];
    expect(fused?.templateId).toBe("fm_024_skull_servant");
    expect(result.events.some((event) => event.type === "FUSION_FAILED")).toBe(true);
  });

  it("resolves three-material chain fusion with FM table", () => {
    const state = makeState();
    state.players[0].hand = ["p1-a", "p1-b", "p1-c"];
    state.instances["p1-a"].templateId = "fm_002_mystical_elf";
    state.instances["p1-b"].templateId = "fm_008_mushroom_man";
    state.instances["p1-c"].templateId = "fm_004_baby_dragon";

    const result = applyAction(
      state,
      {
        actionId: "a2",
        type: "FUSE",
        payload: {
          materials: [
            { source: "HAND", instanceId: "p1-a" },
            { source: "HAND", instanceId: "p1-b" },
            { source: "HAND", instanceId: "p1-c" }
          ],
          order: ["p1-a", "p1-b", "p1-c"],
          resultSlot: 1
        }
      },
      "p1"
    );

    const fused = result.nextState.players[0].monsterZone[1];
    expect(fused?.templateId).toBe("fm_571_b_dragon_jungle_king");
    expect(result.events.some((event) => event.type === "FUSION_RESOLVED")).toBe(true);
  });

  it("resolves attack against defense monster without LP damage when atk is higher", () => {
    const state = makeState();
    state.players[0].monsterZone[0] = makeMonster("m1", "fm_082_red_eyes_b_dragon", "p1", "ATTACK");
    state.players[0].monsterZone[0]!.slot = 0;
    state.players[1].monsterZone[0] = makeMonster("m2", "fm_074_giant_soldier_of_stone", "p2", "DEFENSE");
    state.players[1].monsterZone[0]!.slot = 0;
    state.turn.turnNumber = 2;

    state.instances.m1 = { instanceId: "m1", ownerId: "p1", templateId: "fm_082_red_eyes_b_dragon" };
    state.instances.m2 = { instanceId: "m2", ownerId: "p2", templateId: "fm_074_giant_soldier_of_stone" };

    const result = applyAction(
      state,
      {
        actionId: "a3",
        type: "ATTACK",
        payload: {
          attackerSlot: 0,
          target: { slot: 0 }
        }
      },
      "p1"
    );

    expect(result.nextState.players[1].monsterZone[0]).toBeNull();
    expect(result.nextState.players[1].lp).toBe(8000);
    expect(result.events.some((event) => event.type === "BATTLE_RESOLVED")).toBe(true);
    expect(CARD_TEMPLATES.fm_082_red_eyes_b_dragon.atk ?? 0).toBeGreaterThan(CARD_TEMPLATES.fm_074_giant_soldier_of_stone.def ?? 0);
  });

  it("blocks ATTACK on turn 1", () => {
    const state = makeState();
    state.players[0].monsterZone[0] = makeMonster("m1", "fm_082_red_eyes_b_dragon", "p1", "ATTACK");
    state.players[0].monsterZone[0]!.slot = 0;
    state.instances.m1 = { instanceId: "m1", ownerId: "p1", templateId: "fm_082_red_eyes_b_dragon" };

    expect(() =>
      applyAction(
        state,
        {
          actionId: "a4",
          type: "ATTACK",
          payload: {
            attackerSlot: 0,
            target: "DIRECT"
          }
        },
        "p1"
      )
    ).toThrow("Nao e possivel atacar no primeiro turno");
  });

  it("sets monster face-down in defense", () => {
    const state = makeState();

    const result = applyAction(
      state,
      {
        actionId: "a5",
        type: "SET_MONSTER",
        payload: {
          handInstanceId: "p1-a",
          slot: 2
        }
      },
      "p1"
    );

    const setMonster = result.nextState.players[0].monsterZone[2];
    expect(setMonster).not.toBeNull();
    expect(setMonster?.position).toBe("DEFENSE");
    expect(setMonster?.face).toBe("FACE_DOWN");
    expect(result.nextState.players[0].hand.includes("p1-a")).toBe(false);
    expect(result.events.some((event) => event.type === "MONSTER_SET")).toBe(true);
  });

  it("activates spell from hand and applies LP effect", () => {
    const state = makeState();
    const sparksId = templateIdByName("Sparks");
    state.players[0].hand = ["p1-sparks"];
    state.instances["p1-sparks"] = { instanceId: "p1-sparks", ownerId: "p1", templateId: sparksId };

    const result = applyAction(
      state,
      {
        actionId: "a6",
        type: "ACTIVATE_SPELL_FROM_HAND",
        payload: {
          handInstanceId: "p1-sparks"
        }
      },
      "p1"
    );

    expect(result.nextState.players[1].lp).toBe(7800);
    expect(result.nextState.players[0].graveyard.includes("p1-sparks")).toBe(true);
    expect(result.events.some((event) => event.type === "SPELL_ACTIVATED")).toBe(true);
  });

  it("activates equip from hand as continuous spell and buffs selected target", () => {
    const state = makeState();
    const equipId = templateIdByName("Legendary Sword");
    state.players[0].hand = ["p1-equip"];
    state.instances["p1-equip"] = { instanceId: "p1-equip", ownerId: "p1", templateId: equipId };
    state.instances.m1 = { instanceId: "m1", ownerId: "p1", templateId: "fm_002_mystical_elf" };
    state.players[0].monsterZone[0] = makeMonster("m1", "fm_002_mystical_elf", "p1", "ATTACK");
    state.players[0].monsterZone[0]!.slot = 0;
    state.turn.turnNumber = 3;

    const result = applyAction(
      state,
      {
        actionId: "a6-equip",
        type: "ACTIVATE_SPELL_FROM_HAND",
        payload: {
          handInstanceId: "p1-equip",
          targetMonsterSlot: 0
        }
      },
      "p1"
    );

    const equipped = result.nextState.players[0].spellTrapZone.find((card) => card?.instanceId === "p1-equip");
    const monster = result.nextState.players[0].monsterZone[0];
    expect(equipped?.face).toBe("FACE_UP");
    expect(equipped?.continuous).toBe(true);
    expect(equipped?.equipTargetInstanceId).toBe("m1");
    expect(monster?.atkModifier).toBeGreaterThanOrEqual(200);
    expect(monster?.defModifier).toBeGreaterThanOrEqual(200);
    expect(result.nextState.players[0].hand.includes("p1-equip")).toBe(false);
  });

  it("allows set trap and activation on opponent turn", () => {
    const state = makeState();
    const trapTemplateId = templateIdByName("Widespread Ruin");
    state.players[0].hand = ["p1-trap"];
    state.instances["p1-trap"] = { instanceId: "p1-trap", ownerId: "p1", templateId: trapTemplateId };

    const setResult = applyAction(
      state,
      {
        actionId: "a7",
        type: "SET_SPELL_TRAP",
        payload: {
          handInstanceId: "p1-trap",
          slot: 1
        }
      },
      "p1"
    );

    expect(setResult.nextState.players[0].spellTrapZone[1]?.face).toBe("FACE_DOWN");
    expect(setResult.events.some((event) => event.type === "SPELL_TRAP_SET")).toBe(true);

    setResult.nextState.turn.playerId = "p2";
    setResult.nextState.turn.turnNumber = 2;
    setResult.nextState.turn.phase = "MAIN";

    const activateResult = applyAction(
      setResult.nextState,
      {
        actionId: "a8",
        type: "ACTIVATE_SET_CARD",
        payload: {
          slot: 1
        }
      },
      "p1"
    );

    expect(activateResult.nextState.players[0].spellTrapZone[1]).toBeNull();
    expect(activateResult.nextState.players[0].graveyard.includes("p1-trap")).toBe(true);
    expect(activateResult.events.some((event) => event.type === "TRAP_ACTIVATED")).toBe(true);
  });
});
