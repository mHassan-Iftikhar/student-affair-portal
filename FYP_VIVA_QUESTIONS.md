# FYP VIVA Preparation: Exhaustive Questions & Answers

This document contains a comprehensive set of questions and detailed answers for your university Final Year Project (FYP) defense.

---

## 🟢 Category 1: Project Overview & Core Logic

### Q1: What is the main problem your "Student Affair Portal" solves?

**Answer:** Currently, university administrative tasks (lost & found, event management, resource sharing) are fragmented across emails, WhatsApp groups, or physical notice boards. This portal centralizes all these services into a single, secure admin-managed platform, ensuring data integrity and official oversight.

### Q2: Why did you choose a "Portal" architecture instead of a simple website?

**Answer:** A portal implies role-based access control (RBAC) and personalized experiences. Our architecture separates the Admin functionality (managing content) from the Student functionality (consuming content), providing a secure backend for university officials.

---

## 🔵 Category 2: Technology Stack & Modern Web Practices

### Q3: Why did you use Next.js for the frontend?

**Answer:** Next.js offers Server-Side Rendering (SSR) and Client-Side Rendering (CSR) hybrid capabilities. It provides a robust folder-based routing system (App Router) which makes managing complex dashboard routes very efficient.

### Q4: Why MongoDB over a SQL database like MySQL?

**Answer:** Our data (like `Academic Resources` and `Events`) is semi-structured. For example, some resources might have videos (Base64), others just PDFs. MongoDB’s document-based structure allows for a flexible schema without complex migrations.

### Q5: How do you handle form validation?

**Answer:** We use `React Hook Form` combined with `Yup` schemas. This allows for both client-side and server-side validation, ensuring that only clean and correctly formatted data reaches our database.

---

## 🟡 Category 3: Advanced AI & Content Moderation

### Q6: How does the "Content Moderation" system work?

**Answer:** We implemented a multi-layered moderation system:

1. **Rule-Based Check**: A manual profanity filter covering 10+ languages (English, Urdu/Hindi, Spanish, etc.) to catch abuse instantly.
2. **AI Text Analysis**: We use the **Hugging Face Inference API** (Toxic BERT / RoBERTa) to detect hate speech and toxicity with a confidence score.
3. **AI Image Analysis**: We use **Gemini 1.5 Flash** (Google Generative AI) to analyze if an image is appropriate for a university and relevant to the post category.

### Q7: Why did you implement a manual profanity list if you have AI?

**Answer:** AI can sometimes miss context-specific or transliterated abuse (like Urdu words written in English script). The manual list provides a fast, 100% reliable fallback that doesn't depend on network latency or API quotas.

---

## 🔴 Category 4: Storage Strategy & Security

### Q8: What is your strategy for storing files?

**Answer:** We use **Base64 encoding** to store files directly in Firestore. This is an "Atomic Storage" strategy—the metadata and the file are stored in the same document, preventing "ghost" files that often happen when a database record is deleted but a storage bucket file remains.

### Q9: [CHALLENGE QUESTION] Firestore has a 1MB limit. How do you handle 50MB files mentioned in your README?

**Answer:** For the current prototype, the 1MB limit applies to small assets (profile pics, short PDFs). For larger files (up to 50MB), we are integrating **Supabase Storage** (already in our dependencies) to handle chunked uploads, while the metadata remains in Firestore for consistency.

### Q10: How do you secure your API endpoints?

**Answer:** We use **Firebase Admin SDK** on the backend. Every request must carry a Bearer Token (JWT). The backend verifies the token and checks the user's document in MongoDB to ensure the `isAdmin` flag is `true`. Even if someone steals a token, they can't access admin routes unless our database authorizes them.

---

## 🟣 Category 5: Accountability & Monitoring

### Q11: What is the "Activity Log" and why is it important?

**Answer:** Every time an admin creates, updates, or deletes a resource, the `activityLogger` middleware records the action, timestamp, admin email, and IP address. This is critical for enterprise applications to track who made what changes and recover from accidental data loss.

### Q12: How do you generate the Dashboard Analytics?

**Answer:** We use `Chart.js` on the frontend. We fetch aggregate data from MongoDB (e.g., total items, user growth per month) and visualize it using Line and Bar charts to give admins an immediate birds-eye view of portal usage.

---

## 🟠 Category 6: UI/UX & Quality Assurance

### Q13: Why did you use Tailwind CSS?

**Answer:** Tailwind allows for rapid prototyping and ensures consistent spacing and colors. It significantly reduces the size of the final CSS bundle by only including the utility classes we actually use.

### Q14: How did you test your application?

**Answer:**

1. **Unit Testing**: Testing individual utility functions (like Base64 conversion).
2. **Integration Testing**: Testing the end-to-end flow of creating a post and ensuring it shows up on the dashboard.
3. **Manual Moderation Testing**: Purposefully entering bad words to verify the moderation engine blocks them.

### Q15: How do you optimize large file handling for performance?

**Answer:**

1. **Client-Side Compression**: We use canvas-based compression in `base64Utils.ts` to resize high-resolution images and reduce quality before conversion, saving bandwidth.
2. **Thumbnail Generation**: We automatically create small thumbnails for the dashboard to avoid loading full-sized assets until needed.
3. **Data Chunking**: To stay within Firestore's 1MB limit, we implemented logic to split (chunk) large Base64 strings, ensuring we can store larger assets safely.
