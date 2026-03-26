import React from 'react';
import { Star, ExternalLink, Quote } from 'lucide-react';
import { GoogleReview } from '../types';

interface GoogleReviewsProps {
  reviews: GoogleReview[];
  subheading?: string;
}

export default function GoogleReviews({ reviews, subheading }: GoogleReviewsProps) {
  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50">
      <div className="px-4 md:px-12 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl md:text-2xl font-bold text-white">Jom baca maklum balas yang kami dapat</h3>
          {/* Google Logo SVG */}
          <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
        </div>
        <p className="text-gray-400 text-sm mt-1 mb-4">
          {subheading || "Apa kata pesakit kami..."}
        </p>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 md:px-12 gap-4 pb-4">
        {reviews.map((review) => (
          <div 
            key={review.id} 
            className="flex-none w-[280px] md:w-[350px] snap-start bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 flex flex-col relative overflow-hidden shadow-lg hover:border-zinc-700 transition-colors"
          >
            {/* Background Watermark */}
            <Quote className="absolute top-4 right-4 w-24 h-24 text-zinc-800/30 -rotate-12 pointer-events-none" strokeWidth={1} />

            {/* Header: Avatar + Name + Branch */}
            <div className="flex items-center gap-4 mb-4 relative z-10">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-800 text-zinc-300 font-medium">
                {review.reviewerName.charAt(0)}
              </div>
              <div>
                <h4 className="text-white font-semibold text-base">{review.reviewerName}</h4>
                <p className="text-xs font-bold text-zinc-500 tracking-wider uppercase mt-0.5">{review.branchName}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-1 mb-5 relative z-10">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className="w-4 h-4 fill-yellow-400 text-yellow-400" 
                />
              ))}
            </div>

            {/* Review Text */}
            <p className="text-zinc-300 font-sans text-base leading-relaxed relative z-10 flex-grow">
              "{review.reviewText}"
            </p>

            {/* Footer Link */}
            <a 
              href={review.reviewUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-auto mt-6 pt-4 border-t border-zinc-800/50 relative z-10 inline-flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              Lihat di Google
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
