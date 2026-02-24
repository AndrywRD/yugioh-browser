import { prisma } from "../src/db/prisma";
import { PersistenceService } from "../src/services/persistenceService";

async function main(): Promise<void> {
  const persistence = new PersistenceService(prisma);
  await persistence.syncCatalogAndNpcSeed();

  const missingNpcCards = persistence.getMissingNpcCards();
  if (missingNpcCards.length > 0) {
    console.warn(`[seed] Cartas de NPC nao encontradas no catalogo (${missingNpcCards.length}):`);
    console.warn(missingNpcCards.join(", "));
  }

  console.log("[seed] Catalogo de cartas e NPCs FM sincronizados com sucesso.");
}

main()
  .catch((error) => {
    console.error("[seed] Falha ao executar seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
