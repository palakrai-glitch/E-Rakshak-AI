import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;
    
    // Ensure we're only reading from data/gis
    if (!filename.endsWith('.geojson')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }
    
    // Path relative to frontend folder: ../data/gis/filename
    const filePath = path.join(process.cwd(), '..', 'data', 'gis', filename);
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading GIS file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
