import { ImageResponse } from 'next/og';
import { PRODUCT_NAME, TAGLINE } from '@/lib/brand/copy';
import { colors } from '@/lib/brand/colors';

export const runtime = 'edge';
export const alt = `${PRODUCT_NAME} — ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(180deg, ${colors.bgTop}, ${colors.bg} 50%, ${colors.bgBottom})`,
          fontFamily: 'Georgia, serif',
          color: colors.text,
          position: 'relative',
        }}
      >
        {/* Soft orbs */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: -120,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(123,167,242,0.18), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -160,
            right: -120,
            width: 460,
            height: 460,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(94,231,196,0.18), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 540,
            height: 540,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(224,185,106,0.20), transparent 70%)',
            filter: 'blur(40px)',
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 28,
            letterSpacing: 12,
            color: colors.textMuted,
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            fontWeight: 600,
          }}
        >
          Sudoku
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 220,
            lineHeight: 1,
            fontWeight: 700,
            color: colors.goldGlow,
            letterSpacing: -4,
            textShadow: '0 0 48px rgba(245,213,138,0.4)',
            marginTop: 12,
          }}
        >
          Evolved
        </div>

        {/* Tagline */}
        <div
          style={{
            marginTop: 36,
            fontSize: 44,
            fontStyle: 'italic',
            color: colors.text,
            fontFamily: 'Georgia, serif',
          }}
        >
          {TAGLINE}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            fontSize: 24,
            letterSpacing: 6,
            color: colors.textDim,
            textTransform: 'uppercase',
            fontFamily: 'sans-serif',
            fontWeight: 600,
          }}
        >
          sudokuevolved.com
        </div>
      </div>
    ),
    { ...size },
  );
}
