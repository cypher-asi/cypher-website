import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
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
              color: '#888',
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
            C
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
