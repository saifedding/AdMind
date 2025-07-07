# Dashboard Components

## AdCard Component

The `AdCard` component is the primary component for displaying Facebook ad data with AI analysis results. It follows the Pylons.ai "Iridium & Photon" design system.

### Features

- **Real Backend Data**: Fetches actual ad data from the backend API
- **High-Score Glow**: Ads with overall_score > 8 get a photon-blue glow effect
- **Media Support**: Displays images and videos with proper fallbacks
- **Responsive Design**: Mobile-first responsive layout
- **Performance Badges**: Shows key metrics like score, impressions, spend, platform
- **Avatar System**: Facebook profile pictures with elegant fallbacks

### Usage

```tsx
import { AdCard } from '@/features/dashboard/components/AdCard';
import { AdWithAnalysis } from '@/types/ad';

// Your ad data from the API
const ad: AdWithAnalysis = {
  // ... ad data
};

function MyComponent() {
  return <AdCard ad={ad} />;
}
```

### Testing

Visit the test page at: `http://localhost:3000/test-adcard`

This page demonstrates:
- Real data fetching from the backend
- Loading states and error handling
- All component features including glow effects
- Responsive design across different screen sizes

### API Configuration

The component uses the API client from `@/lib/api`. Make sure your backend is running at `http://localhost:8000`.

You can configure the API URL by creating a `.env.local` file in the frontend root:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Setup

1. Start the backend server:
```bash
cd backend
python -m uvicorn app.main:app --reload
```

2. The API will be available at: `http://localhost:8000`

3. Check the API docs at: `http://localhost:8000/docs`

### Component Props

```typescript
interface AdCardProps {
  ad: AdWithAnalysis;
}

// AdWithAnalysis extends Ad and includes:
// - competitor: Competitor (required)
// - analysis: AdAnalysis (required)
```

### Design System

The component uses the Iridium & Photon color theme:
- **Primary**: Photon blue (`#00bcd4`) for high-performing elements
- **Secondary**: Iridium grays for content and structure
- **Typography**: Geist Mono for headers, clean sans-serif for content
- **Animations**: Subtle hover effects and glow animations

### File Structure

```
frontend/src/features/dashboard/
├── components/
│   ├── AdCard.tsx          # Main component
│   └── index.ts            # Export file
├── README.md               # This file
```

### Related Files

- `/types/ad.ts` - TypeScript type definitions
- `/lib/api.ts` - API client and types
- `/lib/transformers.ts` - Data transformation utilities
- `/app/test-adcard/page.tsx` - Test page with real data 