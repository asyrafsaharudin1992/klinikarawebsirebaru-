import React from 'react';
import { Star, ExternalLink } from 'lucide-react';

// ============================================================================
// API INTEGRATION INSTRUCTIONS (Google Places API)
// ============================================================================
// To connect this component to live Google Reviews later:
// 
// 1. Get a Google Places API Key from the Google Cloud Console.
// 2. Find your clinic's "Place ID" using the Google Maps Place ID Finder.
// 3. Create a Firebase Cloud Function (recommended for security) or a serverless 
//    API route to fetch reviews:
//    GET https://maps.googleapis.com/maps/api/place/details/json?place_id=YOUR_PLACE_ID&fields=reviews,rating,user_ratings_total&key=YOUR_API_KEY
// 4. Fetch this data in a useEffect hook inside this component.
// 5. Replace the `mockReviews` array below with the fetched `reviews` array.
// 6. Map over the live data (review.author_name, review.profile_photo_url, 
//    review.rating, review.text, etc.).
// ============================================================================

const mockReviews = [
  {
    id: 1,
    author_name: "Sarah Lim",
    profile_photo_url: "https://ui-avatars.com/api/?name=Sarah+Lim&background=random",
    rating: 5,
    text: "Fast service, friendly doctors at Klinik Ara 24 Jam. Highly recommended for late-night emergencies! The staff made sure I was comfortable the entire time.",
    time_description: "2 weeks ago"
  },
  {
    id: 2,
    author_name: "Ahmad Faizal",
    profile_photo_url: "https://ui-avatars.com/api/?name=Ahmad+Faizal&background=random",
    rating: 5,
    text: "The clinic is very clean and the staff are incredibly helpful. Dr. Siti was very patient with my kids during their checkup. Will definitely make this our family clinic.",
    time_description: "1 month ago"
  },
  {
    id: 3,
    author_name: "Jessica Wong",
    profile_photo_url: "https://ui-avatars.com/api/?name=Jessica+Wong&background=random",
    rating: 5,
    text: "Wait time was minimal. The AraMommy package is totally worth it. Great experience overall and the ultrasound was explained very clearly to us.",
    time_description: "2 months ago"
  },
  {
    id: 4,
    author_name: "Rajesh Kumar",
    profile_photo_url: "https://ui-avatars.com/api/?name=Rajesh+Kumar&background=random",
    rating: 5,
    text: "Professional and efficient. Got my AraVax shot here and it was painless. The nurse was very skilled and the registration process was a breeze.",
    time_description: "3 months ago"
  },
  {
    id: 5,
    author_name: "Nurul Huda",
    profile_photo_url: "https://ui-avatars.com/api/?name=Nurul+Huda&background=random",
    rating: 5,
    text: "Best 24-hour clinic in the area. Prices are transparent and the TeamAra membership saves a lot of money in the long run. Highly recommend!",
    time_description: "4 months ago"
  }
];

export default function GoogleReviews() {
  return (
    <div className="mb-12 md:mb-16 pt-8 border-t border-zinc-800/50">
      <div className="px-4 md:px-12 mb-6 flex items-center gap-3">
        <h3 className="text-xl md:text-2xl font-bold text-white">Jom baca maklum balas yang kami dapat</h3>
        {/* Google Logo SVG */}
        <svg viewBox="0 0 24 24" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      </div>

      <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar px-4 md:px-12 gap-4 pb-4">
        {mockReviews.map((review) => (
          <div 
            key={review.id} 
            className="flex-none w-[280px] md:w-[350px] snap-start bg-zinc-900 rounded-xl p-6 border border-zinc-800 flex flex-col"
          >
            {/* Header: Avatar + Name + Time */}
            <div className="flex items-center gap-3 mb-4">
              <img 
                src={review.profile_photo_url} 
                alt={review.author_name} 
                className="w-10 h-10 rounded-full bg-zinc-800"
                referrerPolicy="no-referrer"
              />
              <div>
                <h4 className="font-bold text-sm text-zinc-100">{review.author_name}</h4>
                <p className="text-xs text-zinc-500">{review.time_description}</p>
              </div>
            </div>

            {/* Stars */}
            <div className="flex gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-500 text-yellow-500' : 'fill-zinc-700 text-zinc-700'}`} 
                />
              ))}
            </div>

            {/* Review Text */}
            <p className="text-sm text-zinc-300 line-clamp-4 flex-grow mb-4 leading-relaxed">
              "{review.text}"
            </p>

            {/* Footer Link */}
            <a 
              href="https://maps.google.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-auto w-fit transition-colors"
            >
              Read on Google
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
