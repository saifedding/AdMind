import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ad_archive_id } = body;
    
    if (!ad_archive_id) {
      return NextResponse.json(
        { error: 'ad_archive_id is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/search/get-ad`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ad_archive_id }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to fetch ad' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error in get-ad API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}