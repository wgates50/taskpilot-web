import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// DELETE /api/messages/clear — wipe all messages (personal tool, no auth)
export async function DELETE() {
  try {
    const result = await sql`DELETE FROM messages`;
    return NextResponse.json({ ok: true, deleted: result.rowCount });
  } catch (err) {
    console.error('DELETE /api/messages/clear error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
