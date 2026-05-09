import { ImageResponse } from 'next/og';
import { colors } from '@/lib/brand/colors';
import { PRODUCT_NAME } from '@/lib/brand/copy';

export const runtime = 'edge';
export const alt = `${PRODUCT_NAME} Leaderboards`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function LeaderboardOG() {
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
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(94,231,196,0.16), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
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
          Sudoku Evolved
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 160,
            fontWeight: 700,
            color: colors.goldGlow,
            letterSpacing: -3,
            textShadow: '0 0 48px rgba(245,213,138,0.4)',
          }}
        >
          Leaderboards
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 40,
            fontStyle: 'italic',
            color: colors.text,
          }}
        >
          Climb the board. Prove the cleanest solve.
        </div>
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
