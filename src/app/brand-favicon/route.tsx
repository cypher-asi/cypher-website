import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';
import { getCompanyConfig } from '@/lib/companies/resolve';
import type { AccentColor } from '@/lib/companies/types';

const SIZE = { width: 32, height: 32 };

const ACCENT_HEX: Record<AccentColor, string> = {
  cyan: '#01f4cb',
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  rose: '#f43f5e',
};

export function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('company') ?? req.headers.get('x-company');
  const company = getCompanyConfig(key);
  const accent = ACCENT_HEX[company.accent];
  const initial = company.wordmark.charAt(0).toUpperCase() || 'C';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          borderRadius: 6,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          <span
            style={{
              color: accent,
              fontSize: 20,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            /
          </span>
          <span
            style={{
              color: '#fff',
              fontSize: 22,
              fontFamily: 'monospace',
              fontWeight: 700,
              marginLeft: -2,
            }}
          >
            {initial}
          </span>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
