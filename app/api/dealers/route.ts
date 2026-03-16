import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - List all dealers with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const all = searchParams.get('all') === 'true';

    // If requesting all dealers (for Shopify dealer locator)
    if (all) {
      const dealers = await prisma.dealer.findMany({
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({
        success: true,
        dealers,
        count: dealers.length,
      });
    }

    // Build search filter
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { city: { contains: search, mode: 'insensitive' as const } },
            { postalCode: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    // Get total count
    const total = await prisma.dealer.count({ where });

    // Get paginated dealers
    const dealers = await prisma.dealer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({
      success: true,
      dealers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching dealers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dealers' },
      { status: 500 }
    );
  }
}

// POST - Create new dealer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Bulk import
    if (body.dealers && Array.isArray(body.dealers)) {
      if (body.mode === 'replace') {
        await prisma.dealer.deleteMany({});
      }

      const created = await prisma.dealer.createMany({
        data: body.dealers.map((d: any) => ({
          name: d.name || '',
          street: d.street || '',
          houseNumber: d.houseNumber || '',
          postalCode: d.postalCode || '',
          city: d.city || '',
          country: d.country || 'Netherlands',
          email: d.email || null,
          phone: d.phone || '',
          website: d.website || null,
        })),
      });

      return NextResponse.json({
        success: true,
        message: `${body.mode === 'replace' ? 'Replaced with' : 'Added'} ${created.count} dealers`,
        count: created.count,
      });
    }

    // Single dealer create
    const dealer = await prisma.dealer.create({
      data: {
        name: body.name,
        street: body.street,
        houseNumber: body.houseNumber,
        postalCode: body.postalCode,
        city: body.city,
        country: body.country || 'Netherlands',
        email: body.email || null,
        phone: body.phone,
        website: body.website || null,
      },
    });

    return NextResponse.json({ success: true, dealer }, { status: 201 });
  } catch (error) {
    console.error('Error creating dealer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create dealer', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PUT - Update existing dealer
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Dealer ID is required' },
        { status: 400 }
      );
    }

    const dealer = await prisma.dealer.update({
      where: { id: body.id },
      data: {
        name: body.name,
        street: body.street,
        houseNumber: body.houseNumber,
        postalCode: body.postalCode,
        city: body.city,
        country: body.country || 'Netherlands',
        email: body.email || null,
        phone: body.phone,
        website: body.website || null,
      },
    });

    return NextResponse.json({ success: true, dealer });
  } catch (error) {
    console.error('Error updating dealer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update dealer' },
      { status: 500 }
    );
  }
}

// DELETE - Remove dealer
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Dealer ID is required' },
        { status: 400 }
      );
    }

    await prisma.dealer.delete({
      where: { id: body.id },
    });

    return NextResponse.json({ success: true, message: 'Dealer deleted' });
  } catch (error) {
    console.error('Error deleting dealer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete dealer' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 200 });
}
