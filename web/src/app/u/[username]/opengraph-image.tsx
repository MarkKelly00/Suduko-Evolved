import { ImageResponse } from 'next/og';
import { colors } from '@/lib/brand/colors';
import { getPublicProfileByUsername } from '@/lib/supabase/queries';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { PRODUCT_NAME } from '@/lib/brand/copy';

export const runtime = 'edge';
export const alt = `${PRODUCT_NAME} profile`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function ProfileOG({
  params,
}: {
  params: { username: string };
}) {
  let displayName = `@${params.username}`;
  let crowns = 0;
  let streak = 0;
  let levels = 0;
  if (isSupabaseConfigured()) {
    const profile = await getPublicProfileByUsername(params.username);
    if (profile) {
      displayName = profile.display_name || `@${profile.username}`;
      crowns = profile.crowns_total;
      streak = profile.streak;
      levels = profile.levels_cleared;
    }
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
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 720,
            height: 720,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(224,185,106,0.18), transparent 70%)',
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
            fontSize: 120,
            fontWeight: 700,
            color: colors.text,
            letterSpacing: -2,
            textAlign: 'center',
          }}
        >
          {displayName}
        </div>

        <div
          style={{
            marginTop: 50,
            display: 'flex',
            gap: 60,
            fontSize: 32,
            color: colors.textMuted,
          }}
        >
          <Stat label="Crowns" value={`♛ ${crowns}`} />
          <Stat label="Streak" value={`${streak}d`} />
          <Stat label="Levels" value={String(levels)} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: colors.goldGlow,
          fontFamily: 'Georgia, serif',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 18,
          letterSpacing: 4,
          color: colors.textDim,
          textTransform: 'uppercase',
          fontFamily: 'sans-serif',
        }}
      >
        {label}
      </div>
    </div>
  );
}
