import { NextRequest, NextResponse } from 'next/server';
import { getSavedItems, getSavedItemByTitle, insertSavedItem, deleteSavedItem } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/saved — list all saved items
export async function GET() {
  try {
    const items = await getSavedItems();
    return NextResponse.json({ items });
  } catch (err) {
    console.error('Failed to fetch saved items:', err);
    return NextResponse.json({ error: 'Failed to fetch saved items' }, { status: 500 });
  }
}

// POST /api/saved — save an event/venue
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, venue, date, time, price, category, tags, url, map_url, booking_url, image_url, reason, source_task_id } = body;

    if (!title) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    // Check for duplicates by title + venue
    const existing = await getSavedItemByTitle(title, venue || null);
    if (existing) {
      return NextResponse.json({ item: existing, alreadySaved: true });
    }

    const item = await insertSavedItem({
      id: uuidv4(),
      title,
      venue: venue || null,
      date: date || null,
      time: time || null,
      price: price || null,
      category: category || null,
      tags: tags || [],
      url: url || null,
      map_url: map_url || null,
      booking_url: booking_url || null,
      image_url: image_url || null,
      reason: reason || null,
      source_task_id: source_task_id || null,
    });

    return NextResponse.json({ item, alreadySaved: false }, { status: 201 });
  } catch (err) {
    console.error('Failed to save item:', err);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }
}

// DELETE /api/saved — remove a saved item
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const deleted = await deleteSavedItem(id);
    return NextResponse.json({ deleted });
  } catch (err) {
    console.error('Failed to delete saved item:', err);
    return NextResponse.json({ error: 'Failed to delete saved item' }, { status: 500 });
  }
}
