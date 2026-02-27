type ScreenKey = "DUEL" | "SHOP" | "FRIENDS" | "RANKING";

export async function loadScreenModule(screen: ScreenKey): Promise<void> {
  if (screen === "DUEL") {
    const module = await import("./screens/duel");
    await module.bootstrapDuelScreen();
    return;
  }
  if (screen === "SHOP") {
    const module = await import("./screens/loja");
    await module.bootstrapShopScreen();
    return;
  }
  if (screen === "FRIENDS") {
    const module = await import("./screens/amigos");
    await module.bootstrapFriendsScreen();
    return;
  }
  const module = await import("./screens/ranking");
  await module.bootstrapRankingScreen();
}

