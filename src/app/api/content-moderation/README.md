# Content Moderation API

This API route uses Google's Gemini AI to perform two-stage content moderation before content is uploaded to the university system:

1. **Hate Speech Detection**: Checks for hate speech, abusive language, harassment, discrimination, or harmful content (similar to techverse implementation)
2. **University Platform Appropriateness**: Checks if content is authentic, appropriate, and suitable for publishing on a university platform

Content is automatically rejected if hate speech is detected, regardless of other factors.

## Endpoint

`POST /api/content-moderation`

## Request Body

```json
{
  "topic": "lostnfound",  // Required: "lostnfound", "event", "events", "academic", "academic-resources", etc.
  "content": "Found a blue backpack in the library...",  // Required: The content to moderate
  "title": "Lost Backpack",  // Optional: Title of the content
  "imageUrl": "https://..."  // Optional: URL to an image (if applicable)
}
```

## Response

### Success (200)

```json
{
  "isAuthentic": true,
  "confidenceScore": 95,
  "reason": "Content appears authentic and appropriate for university use. The description is clear and relevant to a lost & found item.",
  "flags": [],  // Optional: Array of specific issues if any
  "hateSpeechDetected": false,  // Whether hate speech was detected
  "hateSpeechReason": undefined  // Reason if hate speech was detected
}
```

### Rejected Content (Hate Speech Detected)

```json
{
  "isAuthentic": false,
  "confidenceScore": 0,
  "reason": "Content rejected due to hate speech or abusive language: Contains discriminatory language",
  "flags": ["hate_speech", "abusive_content"],
  "hateSpeechDetected": true,
  "hateSpeechReason": "Contains discriminatory language"
}
```

### Error (400)

```json
{
  "error": "Missing required fields: topic and content are required"
}
```

### Error (500)

```json
{
  "error": "Content moderation service is not configured"
}
```

## Example Usage

### Using fetch:

```typescript
const response = await fetch('/api/content-moderation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    topic: 'lostnfound',
    content: 'Found a blue Nike backpack in the library on the second floor. Contains books and a laptop.',
    title: 'Found Backpack'
  })
});

const result = await response.json();
if (result.isAuthentic) {
  // Content is safe to upload
  console.log('Approved:', result.reason);
} else {
  // Content was flagged
  console.log('Rejected:', result.reason);
  console.log('Flags:', result.flags);
}
```

### Using axios:

```typescript
import api from '@/utils/api';

const result = await api.post('/api/content-moderation', {
  topic: 'event',
  content: 'Join us for the annual tech conference on March 15th...',
  title: 'Tech Conference 2024'
});

if (result.data.isAuthentic) {
  // Proceed with upload
}
```

## Environment Variables

Add to your `.env.local`:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your API key from: https://makersuite.google.com/app/apikey

## Supported Topics

- `lostnfound` / `lost-found` - Lost and found items
- `event` / `events` - University events
- `academic` / `academic-resources` - Academic resources
- Any other topic will use general university content guidelines

## Moderation Process

### Stage 1: Hate Speech Detection
The AI first checks for:
- Hate speech based on race, ethnicity, religion, gender, sexual orientation, disability, or nationality
- Threats or violent language
- Harassment or bullying
- Explicit sexual content
- Personal attacks or insults
- Profanity or offensive language

If hate speech is detected, content is **immediately rejected** with `isAuthentic: false` and `hateSpeechDetected: true`.

### Stage 2: University Platform Appropriateness
If no hate speech is detected, the AI evaluates content based on:

1. **Appropriateness**: No profanity, explicit material, or inappropriate content
2. **Authenticity**: Not spam, scams, or misleading information
3. **Relevance**: Related to university activities and student life
4. **Safety**: No personal attacks, harassment, or bullying
5. **Compliance**: Meets university policies and community standards
6. **Quality**: Clear, coherent, and professional content

## Models Used

The API automatically tries multiple Gemini models in order:
- `gemini-2.0-flash` (primary)
- `gemini-2.5-flash` (fallback)
- `gemini-2.5-pro` (fallback)

This ensures reliability even if specific models are unavailable.
