import React from 'react';
import '../../assets/css/TripCard.css';

interface TripCardProps {
  title: string;
  location: string;
  image: string;
  progress?: number;
  edited?: string;
  members?: { name: string; profilePic: string }[];
}

const TripCard: React.FC<TripCardProps> = ({ title, location, image, progress, edited, members }) => {
  return (
    <div className="trip-card card border-0" style={{ width: '100%', height: '40vh' }}>
      <div className="trip-image-wrapper">
        <img src={image} className="card-img-top" alt={title} />
      </div>
      <div className="card-img-overlay d-flex flex-column justify-content-end text-white">
        <h5 className="card-title fw-bold">{title}</h5>
        <p className="card-text small text-white-50 mt-0">{location}</p>
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
              {members.slice(0, 3).map((src, idx) => (
                <img
                  key={idx}
                  src={src.profilePic}
                  alt="member"
                  className="rounded-circle border border-2 border-white"
                  style={{
                    marginLeft: idx > 0 ? '-6px' : '0',
                    zIndex: members.length - idx,
                    position: 'relative',
                    objectFit: 'cover',
                    width: '10%',
                  }}
                />
              ))}
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