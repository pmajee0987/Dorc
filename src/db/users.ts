import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string, fullName?: string, username?: string, avatarUrl?: string) {
  try {
    const result = await db.insert(users)
      .values({
        uid,
        email,
        fullName,
        username,
        avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          fullName: fullName ?? undefined,
          username: username ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.warn("Database query failed or SQL not connected, returning fallback user object:", error);
    return {
      id: 1,
      uid,
      email,
      fullName: fullName || 'User',
      username: username || uid.substring(0, 8),
      avatarUrl: avatarUrl || null,
      fcmToken: null,
      isPremium: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export async function getUserByUid(uid: string) {
  try {
    const result = await db.select().from(users).where(eq(users.uid, uid));
    return result[0] || null;
  } catch (error) {
    console.warn("Database query failed or SQL not connected:", error);
    return null;
  }
}

