import { ImageResponse } from 'next/og';
import { colors } from '@/lib/brand/colors';
import { getDuelInvitePreview } from '@/lib/supabase/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { PRODUCT_NAME } from '@/lib/brand/copy';

export const runtime = 'edge';
export const alt = `${PRODUCT_NAME} duel invite`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function DuelOG({
  params,
}: {
  params: { inviteCode: string };
}) {
  let challenger: string | null = null;
  if (isSupabaseConfigured()) {
    const preview = await getDuelInvitePreview(params.inviteCode);
    challenger =
      preview?.challenger_display_name ||
      (preview?.challenger_username ? `@${preview.challenger_username}` : null);
  }

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
        {/* Gold glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(224,185,106,0.20), transparent 70%)',
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
          Logic Duel
        </div>

        <div
          style={{
            marginTop: 16,
            fontSize: 100,
            fontWeight: 700,
            color: colors.goldGlow,
            letterSpacing: -2,
            textShadow: '0 0 48px rgba(245,213,138,0.4)',
            textAlign: 'center',
          }}
        >
          {challenger
            ? `${challenger} challenged you.`
            : "You've been challenged."}
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 36,
            fontStyle: 'italic',
            color: colors.textMuted,
            fontFamily: 'Georgia, serif',
          }}
        >
          Open Sudoku Evolved to race the same grid in real time.
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
