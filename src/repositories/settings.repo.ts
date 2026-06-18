import { type DbClient } from '../db/client';
import { prisma } from '../db/client';

export class SettingsRepository {
  static async get(key: string, client?: DbClient): Promise<string | null> {
    const db = client || prisma;
    const row = await db.setting.findUnique({ where: { key } });
    return row ? row.value : null;
  }

  static async getMany(keys: string[], client?: DbClient): Promise<Record<string, string>> {
    const db = client || prisma;
    const rows = await db.setting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  static async getAll(client?: DbClient): Promise<Record<string, string>> {
    const db = client || prisma;
    const rows = await db.setting.findMany();
    const map: Record<string, string> = {};
    for (const row of rows) {
      map[row.key] = row.value;
    }
    return map;
  }

  static async set(key: string, value: string, client?: DbClient): Promise<void> {
    const db = client || prisma;
    await db.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  static async setMany(entries: Record<string, string>, client?: DbClient): Promise<void> {
    const db = client || prisma;
    await Promise.all(
      Object.entries(entries).map(([key, value]) =>
        db.setting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );
  }
}
