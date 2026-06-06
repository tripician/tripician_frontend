import React from 'react';
import '../../assets/css/TripCard.css';
import { motion } from 'framer-motion';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

// Deterministic avatar colour from name/id — cycles through a warm palette
const AVATAR_COLORS = [
  'linear-gradient(135deg,#FF385C,#D91A50)',
  'linear-gradient(135deg,#0EA5E9,#0369A1)',
  'linear-gradient(135deg,#10B981,#047857)',
  'linear-gradient(135deg,#F59E0B,#B45309)',
  'linear-gradient(135deg,#8B5CF6,#6D28D9)',
  'linear-gradient(135deg,#EC4899,#BE185D)',
  'linear-gradient(135deg,#14B8A6,#0F766E)',
  'linear-gradient(135deg,#F97316,#C2410C)',
];
const avatarColor = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const MemberAvatar: React.FC<{ member: { id?: string; name: string; profilePic: string }; zIndex: number }> = ({ member, zIndex }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const initial = member.name?.charAt(0).toUpperCase() || '?';
  const color = avatarColor(member.id || member.name || initial);
  const showImg = !imgFailed && !!member.profilePic;
  return (
    <div
      className="tc-member-avatar"
      style={{ zIndex, background: showImg ? undefined : color }}
      title={member.name}
    >
      {showImg ? (
        <img
          src={member.profilePic}
          alt={member.name}
          className="tc-member-avatar-img"
          onError={() => setImgFailed(true)}
        />
      ) : initial}
    </div>
  );
};

interface TripCardProps {
  title: string;
  image?: string;
  description?: string;
  progress?: number;
  edited?: string;
  members?: { name: string; profilePic: string; id?: string }[];
  countries?: string[];
  likes?: number;
  owner?: string;
  onClick?: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const TripCard: React.FC<TripCardProps> = ({
  title, image, description, progress, edited, members, countries, likes, owner, onClick, onShare, onDelete
}) => {
  const countryDisplay = React.useMemo(() => {
    if (!countries || countries.length === 0) return null;
    const normalize = (c: string) => c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : c;
    const isReal = (c: string) => {
      if (!c || c.length > 30) return false;
      if (/[0-9]/.test(c)) return false;
      if (c.length > 15 && !/\s/.test(c)) return false;
      return true;
    };
    const unique = countries.filter((c, i, arr) => c && arr.indexOf(c) === i && isReal(c)).map(normalize);
    if (unique.length === 0) return null;
    return { list: unique.slice(0, 3), extra: Math.max(0, unique.length - 3), total: unique.length };
  }, [countries]);

  const pct = typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0;
  const isComplete = pct >= 100;
  const radius = 11;
  const circ = 2 * Math.PI * radius;
  const dash = (pct / 100) * circ;

  const [liked, setLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(likes ?? 0);
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiked(prev => !prev);
    setLikeCount(prev => liked ? prev - 1 : prev + 1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      whileHover={{ y: -6, transition: { type: 'spring', stiffness: 300, damping: 18 } }}
    >
    <div
      className="trip-card"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      {/* Full-bleed image + gradient overlay */}
      <div className="tc-image-wrap">
        {image ? (
          <img src={image} alt={title} className="tc-image" />
        ) : (
          <div className="tc-image-placeholder" />
        )}
        <div className="tc-overlay" />
      </div>

      {/* Progress ring — top left */}
      {!isComplete && pct > 0 && (
        <div className="tc-ring-wrap" title={`${pct}% planned`}>
          <svg width="32" height="32" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" />
            <circle cx="16" cy="16" r={radius} fill="none"
              stroke="#FF385C" strokeWidth="2.5"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              transform="rotate(-90 16 16)" />
          </svg>
          <span className="tc-ring-label">{pct}<span style={{ fontSize: '0.32rem' }}>%</span></span>
        </div>
      )}

      {/* Action buttons — top right, revealed on hover (delete only) */}
      <div className="tc-actions">
        {onDelete && (
          <button className="tc-action-btn tc-action-delete"
            onClick={(e) => { e.stopPropagation(); onDelete(e); }}
            aria-label="Delete trip">
            <DeleteRoundedIcon style={{ fontSize: 30 }} />
          </button>
        )}
      </div>

      {/* ── Blurred bottom panel ── */}
      <div className="tc-body">

        {/* 1. Title + share */}
        <div className="tc-title-row">
          <h3 className="tc-title">{title}</h3>
          {onShare && (
            <button className="tc-action-btn tc-action-share tc-share-inline"
              onClick={(e) => { e.stopPropagation(); onShare(e); }}
              aria-label="Share trip">
              <ShareRoundedIcon style={{ fontSize: 20 }} />
            </button>
          )}
        </div>

        {/* 2. Countries */}
        {countryDisplay && (
          <p className="tc-description" style={{ opacity: 0.75, marginBottom: description ? 2 : undefined }}>
            {countryDisplay.list.join(', ')}{countryDisplay.extra > 0 ? `, +${countryDisplay.extra} more` : ''}
          </p>
        )}

        {/* 2b. Description */}
        {description && (
          <p className="tc-description">{description}</p>
        )}

        {/* 2b. Member avatars (max 5) + last-edited badge */}
        {((members && members.length > 0) || edited) && (
          <div className="tc-members-row">
            <div className="tc-members-avatars">
              {members && members.slice(0, 5).map((m, i) => (
                <MemberAvatar key={m.id ?? i} member={m} zIndex={5 - i} />
              ))}
              {members && members.length > 5 && (
                <div className="tc-member-avatar tc-member-avatar--more" style={{ zIndex: 0 }}>
                  +{members.length - 5}
                </div>
              )}
            </div>
            {edited && <span className="tc-badge-info">{edited}</span>}
          </div>
        )}

        {/* 4. Owner + likes row */}
        {(owner || likes !== undefined) && (
          <div className="tc-meta-row">
            {owner && (
              <div className="tc-owner">
                <div className="tc-owner-avatar">{owner.charAt(0).toUpperCase()}</div>
                <span className="tc-owner-name">{owner}</span>
              </div>
            )}
            {likes !== undefined && (
              <button
                className={`tc-likes-btn${liked ? ' tc-likes-btn--liked' : ''}`}
                onClick={handleLike}
                aria-label={liked ? 'Unlike trip' : 'Like trip'}
              >
                {liked
                  ? <FavoriteRoundedIcon style={{ fontSize: 18, color: '#FF385C' }} />
                  : <FavoriteBorderRoundedIcon style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)' }} />
                }
                <span className="tc-likes-count">{likeCount}</span>
              </button>
            )}
          </div>
        )}

        {/* 5. Explore button */}
        <div className="tc-open-btn-wrap">
          <button className="tc-open-btn" onClick={onClick} tabIndex={-1}>
            Explore
          </button>
        </div>

        {/* Progress bar (in-progress trips only) */}
        {pct > 0 && !isComplete && (
          <div className="tc-progress-wrap">
            <div className="tc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
    </motion.div>
  );
};

export default TripCard;
