import React from 'react';

interface VeoVideoPlayerProps {
    src: string;
    className?: string;
    poster?: string;
}

export function VeoVideoPlayer({ src, className, poster }: VeoVideoPlayerProps) {
    return (
        <div className={`relative rounded-lg overflow-hidden bg-black ${className}`}>
            <video
                src={src}
                controls
                className="w-full h-full object-contain"
                poster={poster}
                preload="metadata"
            />
        </div>
    );
}
