import React from 'react';
import '../../assets/css/TripCard.css';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarHalfRoundedIcon from '@mui/icons-material/StarHalfRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';

interface TripCardProps {
  title: string;
  image: string;
  progress?: number;
  edited?: string;
  members?: { name: string; profilePic: string; id?: string }[];
  countries?: string[];
  rating?: number;
  likes?: number;
  owner?: string;
  onClick?: () => void;
  onShare?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}

const TripCard: React.FC<TripCardProps> = ({
  title, image, progress, edited, countries, rating, likes, owner, onClick, onShare, onDelete
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

  const stars = React.useMemo<('full' | 'half' | 'empty')[] | null>(() => {
    if (rating === undefined) return null;
    const r = Math.min(5, Math.max(0, rating));
    const full = Math.floor(r);
    const half = (r - full) >= 0.25 && (r - full) < 0.75;
    const result: ('full' | 'half' | 'empty')[] = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) result.push('full');
      else if (i === full && half) result.push('half');
      else result.push('empty');
    }
    return result;
  }, [rating]);

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
    <div
      className="trip-card"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onClick(); } }}
    >
      {/* Full-bleed image + gradient overlay */}
      <div className="tc-image-wrap">
        <img src={image} alt={title} className="tc-image" />
        <div className="tc-overlay" />
        <div className="tc-blur-layer" />
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

        {/* 2. Description — countries as subtitle */}
        {countryDisplay && (
          <p className="tc-description">
            {countryDisplay.list.join(', ')}
            {countryDisplay.extra > 0 && `, +${countryDisplay.extra} more`}
          </p>
        )}

        {/* 3. Rating row */}
        <div className="tc-rating-row">
          {stars && (
            <div className="tc-stars-wrap">
              <span className="tc-rating-value">{(rating as number).toFixed(1)}</span>
              <div className="tc-stars">
                {stars.map((type, i) =>
                  type === 'full'
                    ? <StarRoundedIcon key={i} style={{ fontSize: 13, color: '#FBBF24' }} />
                    : type === 'half'
                    ? <StarHalfRoundedIcon key={i} style={{ fontSize: 13, color: '#FBBF24' }} />
                    : <StarBorderRoundedIcon key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }} />
                )}
              </div>
            </div>
          )}
          {countryDisplay && (
            <span className="tc-badge-info">
              {countryDisplay.total} {countryDisplay.total === 1 ? 'Country' : 'Countries'}
            </span>
          )}
          {edited && !stars && !countryDisplay && (
            <span className="tc-badge-info">{edited}</span>
          )}
        </div>

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
        <button className="tc-open-btn" onClick={onClick} tabIndex={-1}>
          Explore
        </button>

        {/* Progress bar (in-progress trips only) */}
        {pct > 0 && !isComplete && (
          <div className="tc-progress-wrap">
            <div className="tc-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TripCard;
