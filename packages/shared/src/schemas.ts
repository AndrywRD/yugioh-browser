import { z } from "zod";
import { ACTION_TYPES, POSITIONS } from "./constants";

const usernameSchema = z.string().trim().min(2).max(20);
const loginSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_.-]+$/);
const passwordSchema = z.string().min(6).max(64);

export const authHelloSchema = z.object({
  storedPlayerId: z.string().uuid().optional()
});

export const authRegisterSchema = z.object({
  login: loginSchema,
  password: passwordSchema,
  username: usernameSchema.optional()
});

export const authLoginSchema = z.object({
  login: loginSchema,
  password: passwordSchema
});

export const roomCreateSchema = z.object({
  username: usernameSchema
});

export const roomSoloSchema = z.object({
  username: usernameSchema
});

export const roomJoinSchema = z.object({
  roomCode: z.string().trim().min(4).max(8),
  username: usernameSchema
});

export const roomReadySchema = z.object({
  ready: z.boolean()
});

const deckCardEntrySchema = z.object({
  cardId: z.string().min(1),
  count: z.number().int().min(1).max(99)
});

export const deckSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  cards: z.array(deckCardEntrySchema).max(100),
  updatedAt: z.number().int().nonnegative()
});

export const deckListPayloadSchema = z.object({
  decks: z.array(deckSchema),
  activeDeckId: z.string().min(1).nullable()
});

export const deckSaveSchema = z.object({
  deck: deckSchema
});

export const deckDeleteSchema = z.object({
  deckId: z.string().min(1)
});

export const deckSetActiveSchema = z.object({
  deckId: z.string().min(1)
});

const summonPayloadSchema = z.object({
  handInstanceId: z.string().min(1),
  slot: z.number().int().min(0).max(4),
  position: z.enum(POSITIONS)
});

const summonMonsterPayloadSchema = z.object({
  handInstanceId: z.string().min(1),
  slot: z.number().int().min(0).max(4),
  position: z.literal("ATTACK").optional().default("ATTACK")
});

const setMonsterPayloadSchema = z.object({
  handInstanceId: z.string().min(1),
  slot: z.number().int().min(0).max(4)
});

const setSpellTrapPayloadSchema = z.object({
  handInstanceId: z.string().min(1),
  slot: z.number().int().min(0).max(4)
});

const activateSpellFromHandPayloadSchema = z.object({
  handInstanceId: z.string().min(1),
  targetMonsterSlot: z.number().int().min(0).max(4).optional(),
  targetSpellTrapSlot: z.number().int().min(0).max(4).optional()
});

const activateSetCardPayloadSchema = z.object({
  slot: z.number().int().min(0).max(4),
  targetMonsterSlot: z.number().int().min(0).max(4).optional()
});

const fuseMaterialSchema = z.object({
  source: z.enum(["HAND", "FIELD"]),
  instanceId: z.string().min(1),
  slot: z.number().int().min(0).max(4).optional()
});

const fusePayloadSchema = z.object({
  materials: z.array(fuseMaterialSchema).min(2).max(3),
  order: z.array(z.string().min(1)).min(2).max(3),
  resultSlot: z.number().int().min(0).max(4)
});

const changePositionPayloadSchema = z.object({
  slot: z.number().int().min(0).max(4),
  position: z.enum(POSITIONS)
});

const attackPayloadSchema = z.object({
  attackerSlot: z.number().int().min(0).max(4),
  target: z.union([z.literal("DIRECT"), z.object({ slot: z.number().int().min(0).max(4) })]).optional()
});

const attackDeclarePayloadSchema = z.object({
  attackerSlot: z.number().int().min(0).max(4),
  target: z.union([z.literal("DIRECT"), z.object({ slot: z.number().int().min(0).max(4) })]).optional()
});

const flipSummonPayloadSchema = z.object({
  slot: z.number().int().min(0).max(4)
});

const trapResponsePayloadSchema = z
  .object({
    decision: z.enum(["ACTIVATE", "PASS"]),
    trapSlot: z.number().int().min(0).max(4).optional()
  })
  .superRefine((value, ctx) => {
    if (value.decision === "ACTIVATE" && typeof value.trapSlot !== "number") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trapSlot is required when decision is ACTIVATE"
      });
    }
  });

const endTurnPayloadSchema = z.object({}).default({});

const payloadByTypeSchema = {
  SUMMON: summonPayloadSchema,
  SUMMON_MONSTER: summonMonsterPayloadSchema,
  SET_MONSTER: setMonsterPayloadSchema,
  SET_SPELL_TRAP: setSpellTrapPayloadSchema,
  ACTIVATE_SPELL_FROM_HAND: activateSpellFromHandPayloadSchema,
  ACTIVATE_SET_CARD: activateSetCardPayloadSchema,
  FUSE: fusePayloadSchema,
  CHANGE_POSITION: changePositionPayloadSchema,
  ATTACK: attackPayloadSchema,
  ATTACK_DECLARE: attackDeclarePayloadSchema,
  FLIP_SUMMON: flipSummonPayloadSchema,
  TRAP_RESPONSE: trapResponsePayloadSchema,
  END_TURN: endTurnPayloadSchema
} as const;

export const gameActionSchema = z
  .object({
    actionId: z.string().min(1),
    type: z.enum(ACTION_TYPES),
    payload: z.unknown()
  })
  .superRefine((value, ctx) => {
    const schema = payloadByTypeSchema[value.type];
    const result = schema.safeParse(value.payload);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error.issues.map((issue) => issue.message).join(", ")
      });
    }
  });

export const gameActionPayloadSchemas = payloadByTypeSchema;
