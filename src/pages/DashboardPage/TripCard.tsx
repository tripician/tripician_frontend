import React from 'react';
import '../../assets/css/TripCard.css';

interface TripCardProps {
  title: string;
  image: string;
  progress?: number;
  edited?: string;
  members?: { name: string; profilePic: string; id?: string }[];
  countries?: string[]; // optional list of countries
  onClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ title, image, progress, edited, members, countries, onClick }) => {
  const fallbackProfile = import.meta.env.VITE_NO_PROFILE_PIC_URL || '';
  const countryDisplay = React.useMemo(()=> {
    if(!countries || countries.length===0) return null;
    // Deduplicate & simple title-case formatting (first letter upper only)
    const normalize = (c:string) => c ? c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() : c;
    const unique = countries.filter((c,i,arr)=> c && arr.indexOf(c)===i).map(normalize);
    if(unique.length===1) return { list: [unique[0]], extra: 0 };
    const firstTwo = unique.slice(0,2);
    const extra = unique.length - 2;
    return { list: firstTwo, extra };
  }, [countries]);
  return (
    <div
      className="trip-card card border-0"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e)=> { if(onClick && (e.key==='Enter' || e.key===' ')){ e.preventDefault(); onClick(); } }}
      style={{ width: '100%', marginBottom: '3vh', aspectRatio: '4 / 5', cursor: onClick ? 'pointer' : 'default' }}>
      <div className="trip-image-wrapper">
        <img src={image} className="card-img-top" alt={title} />
      </div>
      <div className="card-img-overlay d-flex flex-column justify-content-end text-white">
        <h5 className="card-title fw-bold">{title}</h5>
        {countryDisplay && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', marginBottom:'4px' }} aria-label="Trip countries">
            {countryDisplay.list.map((c,idx)=> (
              <span key={idx} style={{
                background:'rgba(255,255,255,0.18)',
                color:'#fff',
                padding:'2px 8px',
                borderRadius:'10px',
                fontSize:'11px',
                fontWeight:500,
                letterSpacing:'.3px',
                backdropFilter:'blur(2px)'
              }}>{c}</span>
            ))}
            {countryDisplay.extra>0 && (
              <span style={{
                background:'rgba(255,255,255,0.10)',
                color:'#fff',
                padding:'2px 8px',
                borderRadius:'10px',
                fontSize:'11px',
                fontWeight:600
              }}>+{countryDisplay.extra}</span>
            )}
          </div>
        )}
        {progress !== undefined && (
          <div className="progress mb-2" style={{ height: '2px' }}>
            <div
              className="progress-bar bg-primary"
              role="progressbar"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        )}
        <div className="d-flex align-items-center justify-content-between mt-1">
          {members && (
            <div className="d-flex align-items-center gap-2 w-100">
              {members.slice(0, 3).map((m, idx) => {
                const src = (m.profilePic && m.profilePic.trim().length > 0) ? m.profilePic : fallbackProfile;
                return (
                  <img
                    key={idx}
                    src={src}
                    alt={m.name || 'Member'}
                    title={m.name || 'Member'}
                    onError={(e)=> { if(fallbackProfile && e.currentTarget.src !== fallbackProfile){ e.currentTarget.src = fallbackProfile; } }}
                    className="rounded-circle border border-2 border-white"
                    style={{
                      marginLeft: idx > 0 ? '-6px' : '0',
                      zIndex: members.length - idx,
                      position: 'relative',
                      objectFit: 'cover',
                      width: '10%',
                    }}
                  />
                );
              })}
              {members.length > 3 && (
                <div
                  className="rounded-circle bg-secondary border border-2 border-white d-flex align-items-center justify-content-center text-white small fw-bold"
                  style={{
                    width: '24px',
                    height: '24px',
                    marginLeft: '-6px',
                    zIndex: 0,
                    position: 'relative',
                    fontSize: '10px'
                  }}
                >
                  +{members.length - 3}
                </div>
              )}
            </div>
          )}          
        </div>
        {edited && (
          <p className="card-text small text-white-50 mt-2">
            Edited {edited}
          </p>
        )}
      </div>
    </div>
  );
};

export default TripCard;