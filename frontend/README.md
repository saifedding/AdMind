# Ad Intelligence Dashboard

A premium React/Next.js dashboard for analyzing Facebook ads with AI-powered insights using the Pylons.ai "Iridium & Photon" design system.

## Features

- **Ad Intelligence**: Real-time ad analysis with AI scoring
- **Performance Insights**: Comprehensive metrics and analytics
- **Competitor Tracking**: Monitor competitor ad strategies
- **Premium UI**: Modern dark-theme design with Iridium & Photon colors
- **Responsive Design**: Optimized for all screen sizes

## Getting Started

### Prerequisites

1. **Backend API**: Make sure the backend is running
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Environment Variables** (Optional):
   Create a `.env.local` file in the frontend root:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Dashboard Structure

### Main Dashboard (`/`)
- Performance overview with key metrics
- Recent activity feed
- Top performing ads preview
- Quick navigation to all features

### Ad Intelligence (`/ads`)
- **Real-time ad cards** with AI analysis scores
- **High-performance indicators** (glow effects for scores > 8)
- **Comprehensive filtering** and search
- **Performance statistics** dashboard
- **Responsive grid layout** (1-4 columns based on screen size)

### Navigation
- **Sidebar navigation** with collapsible design
- **Mobile-responsive** header and menu
- **Active state indicators** for current page
- **Quick access buttons** throughout the interface

## Key Features

### AdCard Component
- **AI Score Display**: Visual indicators for ad performance
- **Media Support**: Images, videos, and carousel content
- **Performance Badges**: Impressions, spend, platform, status
- **Competitor Avatars**: Facebook profile pictures with fallbacks
- **Conditional Styling**: Photon-blue glow for high-performing ads

### Real-time Data
- **Live API Integration**: Fetches real ad data from backend
- **Error Handling**: Graceful fallbacks and retry mechanisms
- **Loading States**: Skeleton animations during data fetch
- **Empty States**: Helpful guidance when no data is available

### Design System
- **Iridium & Photon Colors**: Professional dark theme
- **Typography**: Geist Mono for headers, optimized fonts
- **Animations**: Subtle hover effects and transitions
- **Accessibility**: Focus indicators and screen reader support

## API Integration

The dashboard connects to your backend API at `http://localhost:8000/api/v1/`:

- `GET /ads` - Paginated ads with filtering and sorting
- `GET /ads/top-performing` - High-scoring ads
- `GET /competitors` - Competitor information
- Additional endpoints for search, analytics, and more

## Development

### Project Structure
```
frontend/src/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── ads/page.tsx          # Ad Intelligence page
│   └── layout.tsx            # Root layout
├── components/
│   ├── dashboard/            # Dashboard layout components
│   └── ui/                   # Shadcn UI components
├── features/
│   └── dashboard/
│       └── components/
│           └── AdCard.tsx    # Main ad card component
├── lib/
│   ├── api.ts               # API client
│   ├── transformers.ts      # Data transformation
│   └── utils.ts             # Utilities
└── types/
    └── ad.ts                # TypeScript definitions
```

### Key Technologies
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** with custom design system
- **Shadcn/ui** components
- **Lucide React** icons

## Backend Setup

Make sure your backend is running and accessible:

1. **Start Backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   ```

2. **Verify API**:
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs

3. **Check CORS Settings**:
   The backend should allow `http://localhost:3000` in CORS origins.

## Troubleshooting

### Common Issues

1. **"Connection Error"**: Backend not running
   - Start the backend server
   - Check if API is accessible at http://localhost:8000

2. **"No Ads Found"**: Empty database
   - Run the ad scraper to populate data
   - Check database connectivity

3. **Styling Issues**: CSS not loading
   - Clear browser cache
   - Restart development server

### Environment Variables

```env
# Required for API connection
NEXT_PUBLIC_API_URL=http://localhost:8000

# Optional development settings
NODE_ENV=development
```

## Contributing

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Follow the Iridium & Photon design system
4. Add proper error handling for API calls
5. Test responsive design across screen sizes

## License

This project is part of the Ads Management Platform.
