import type { ActionType, GameAction } from "@ruptura-arcana/shared";

export function createAction<T extends ActionType>(
  actionId: string,
  type: T,
  payload: Extract<GameAction, { type: T }>["payload"]
): Extract<GameAction, { type: T }> {
  return {
    actionId,
    type,
    payload
  } as Extract<GameAction, { type: T }>;
}
