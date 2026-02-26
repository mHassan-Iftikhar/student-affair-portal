
# Frequently Asked Questions (FAQ) – Office Admin Portal (Final Year Project)

---

## 1. Why did you choose Next.js for this project?
**Answer:** Next.js provides server-side rendering, static site generation, and API routes out of the box, which improves performance, SEO, and developer productivity. Its file-based routing and React integration make it ideal for scalable, maintainable web applications.

**Relevant code:**
```tsx
// Example: File-based routing in Next.js (src/app/(protected)/dashboard/page.tsx)
export default function DashboardPage() {
	// ...component code
}
```


## 1. Why did you choose Next.js for this project?
**Answer:** Next.js provides server-side rendering, static site generation, and API routes out of the box, which improves performance, SEO, and developer productivity. Its file-based routing and React integration make it ideal for scalable, maintainable web applications.


## 2. How is data stored and managed in the project?
**Answer:** Data is stored in Firebase Firestore, a NoSQL cloud database. The project uses Firestore collections for users, notifications, audit logs, events, academic resources, and lost & found items. Real-time updates are enabled using Firestore's snapshot listeners.

**Relevant code:**
```ts
// src/utils/firestore.ts
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";

export const getDocuments = async (collectionName: string) => {
	const collectionRef = collection(db, collectionName);
	const querySnapshot = await getDocs(collectionRef);
	return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};
```



## 3. How does authentication work?
**Answer:** Authentication is handled using Firebase Authentication. Users log in with their credentials, and their session is managed securely. Auth context is used in the frontend to provide user state across the app.

**Relevant code:**
```tsx
// src/context/AuthContext.tsx
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebase";

const login = async (email: string, password: string) => {
	await signInWithEmailAndPassword(auth, email, password);
};
```



## 4. How are files (like PDFs or images) uploaded and stored?
**Answer:** Files are uploaded as Base64-encoded strings and stored either directly in Firestore documents or in Firebase Storage, depending on the use case. Download links or previews are generated for users as needed.

**Relevant code:**
```ts
// src/utils/firestore.ts
export const addDocumentWithBase64 = async (
	collectionName: string,
	data: DocumentData,
	base64Files?: { [key: string]: Base64Data },
): Promise<string> => {
	// ...existing code...
};
```



## 5. What is the purpose of the Audit Log?
**Answer:** The Audit Log tracks all significant administrative actions (create, update, delete, login, logout, export, etc.) for accountability and security. Each log entry records the admin's email, action, resource, and timestamp.

**Relevant code:**
```ts
// src/utils/auditLogger.ts
export const logAction = async (params: LogActionParams): Promise<string | null> => {
	// ...existing code...
};
```



## 6. How are notifications sent and managed?
**Answer:** Admins can send notifications to all users or specific users. Notifications are stored in Firestore and delivered in real-time using Firestore subscriptions. Each notification includes metadata like sender, priority, and optional attachments.

**Relevant code:**
```ts
// src/utils/firestore.ts
export const addNotification = async (
	data: NotificationEntry,
): Promise<string> => {
	// ...existing code...
};
```



## 7. How is user access controlled?
**Answer:** User roles and permissions are managed via Firestore and Firebase Authentication. Only authorized users (admins) can access protected routes and perform sensitive actions.

**Relevant code:**
```tsx
// src/context/AuthContext.tsx
const AuthContext = createContext<AuthContextType | null>(null);
export const useAuth = () => useContext(AuthContext);
```



## 8. Why use Firebase for backend services?
**Answer:** Firebase offers scalable, real-time database and authentication services with minimal setup. It eliminates the need for custom backend infrastructure, speeding up development and reducing maintenance.

**Relevant code:**
```ts
// src/config/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```



## 9. How is search implemented across the portal?
**Answer:** Search bars are implemented on all major pages (Academic Resources, Lost & Found, Users, Events, Audit Log, Notifications). Filtering is performed client-side on fetched data, allowing users to quickly find relevant records.

**Relevant code:**
```tsx
// Example: src/app/(protected)/log/page.tsx
const filteredRows = rows.filter((row) => {
	const term = searchTerm.toLowerCase();
	return (
		row.adminEmail.toLowerCase().includes(term) ||
		row.action.toLowerCase().includes(term)
		// ...other fields
	);
});
```



## 10. How is security ensured in the application?
**Answer:** Security is enforced through Firebase Authentication, Firestore security rules, and server-side validation. Sensitive actions are logged, and user input is validated to prevent unauthorized access or data corruption.

**Relevant code:**
```js
// server/middleware/auth.js
export const authenticateToken = async (req, res, next) => {
	// ...existing code...
};
```



## 11. How are real-time updates handled?
**Answer:** Firestore's onSnapshot listeners are used to subscribe to changes in collections (e.g., notifications, audit logs), ensuring the UI updates instantly when data changes.

**Relevant code:**
```ts
// src/utils/firestore.ts
export const subscribeToNotifications = (
	callback: (notifications: DocumentData[]) => void,
	limitCount: number = 50,
): Unsubscribe => {
	// ...existing code...
};
```



## 12. How is the UI built and styled?
**Answer:** The UI is built with React components and styled using Tailwind CSS for rapid, consistent, and responsive design.

**Relevant code:**
```tsx
// Example: src/app/(protected)/dashboard/page.tsx
<div className="bg-white rounded-xl shadow-sm border border-gray-100">
	{/* ... */}
</div>
```



## 13. How are errors and exceptions handled?
**Answer:** Errors are caught and displayed to users via toast notifications. Backend errors are logged in the console and, where appropriate, in the audit log for review.

**Relevant code:**
```tsx
// Example: src/app/(protected)/users/page.tsx
try {
	// ...fetch logic
} catch (error) {
	toast.error('Failed to load users');
}
```



## 14. How is the project structured?
**Answer:** The project follows a modular structure with separate folders for components, pages, utils, context, and server-side code. This improves maintainability and scalability.

**Relevant code:**
```txt
// Example folder structure
src/
	app/
	components/
	context/
	types/
	utils/
server/
```



## 15. What are the main features of the portal?
**Answer:**
- User authentication and management
- Real-time notifications
- Audit logging
- Academic resource sharing
- Lost & found management
- Event management
- Search and filtering on all major pages

---

## 16. How do you ensure scalability and maintainability?
**Answer:** The project uses modular code, reusable components, and follows best practices for both frontend and backend. Firebase and Next.js both scale easily with increased usage.

## 17. How do you handle user privacy and data protection?
**Answer:** User data is protected using Firebase Authentication, Firestore security rules, and HTTPS. Sensitive actions are logged, and only authorized users can access protected data.

## 18. How do you test your application?
**Answer:** The application is tested manually for all major features. Error boundaries and toast notifications help catch and display errors. (Automated tests can be added for further robustness.)

## 19. What challenges did you face and how did you solve them?
**Answer:** Challenges included integrating real-time updates, handling file uploads, and ensuring secure authentication. These were solved using Firebase's real-time listeners, Base64 utilities, and robust auth context.

## 20. How would you deploy this project?
**Answer:** The frontend can be deployed on Vercel or Netlify, and the backend (if needed) on platforms like Heroku or Railway. Firebase services are cloud-hosted and require only configuration.

---

*For more technical details, see the README.md and UTILS_OVERVIEW.md files in the project.*

---

*For more technical details, see the README.md and UTILS_OVERVIEW.md files in the project.*
