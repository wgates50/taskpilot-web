import { NextRequest, NextResponse } from 'next/server';
import { getSavedItems, insertSavedItem } from '@/lib/db';

export async function GET() {
  try {
    const items = await getSavedItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error('GET /api/saved error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }
    const item = await insertSavedItem({
      id: body.id,
      title: body.title,
      venue: body.venue ?? null,
      date: body.date ?? null,
      time: body.time ?? null,
      price: body.price ?? null,
      category: body.category ?? null,
      tags: body.tags ?? [],
      url: body.url ?? null,
      map_url: body.map_url ?? null,
      booking_url: body.booking_url ?? null,
      image_url: body.image_url ?? null,
      reason: body.reason ?? null,
      source_task_id: body.source_task_id ?? null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    console.error('POST /api/saved error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
