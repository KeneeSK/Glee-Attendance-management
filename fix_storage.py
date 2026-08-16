import re

with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

# Make sure imports are added at the very top.
firebase_imports = """
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

async function syncToFirestore(collectionName: string, data: any) {
  try {
    await setDoc(doc(db, 'loungeData', collectionName), { data });
  } catch (err) {
    console.warn('Firestore sync warning:', err);
  }
}
"""

if "import { db }" not in content:
    content = firebase_imports + "\n" + content

# Rewrite fetchServerDatabase to just be a one-time init if needed,
# or we can keep it as is since App.tsx expects it to be async returning boolean.
fetch_db_code = """
export async function fetchServerDatabase(): Promise<boolean> {
  try {
    const collections = [
      { id: 'admins', key: KEYS.ADMINS },
      { id: 'tables', key: KEYS.TABLES },
      { id: 'staff', key: KEYS.STAFF },
      { id: 'attendance', key: KEYS.ATTENDANCE },
      { id: 'ldLogs', key: KEYS.LD_LOGS },
    ];
    let fetched = false;
    for (const c of collections) {
      const snapshot = await getDoc(doc(db, 'loungeData', c.id));
      if (snapshot.exists()) {
        const data = snapshot.data().data;
        if (Array.isArray(data)) {
          localStorage.setItem(c.key, JSON.stringify(data));
          fetched = true;
        }
      }
    }
    return fetched;
  } catch (err) {
    console.warn('Could not fetch server database:', err);
  }
  return false;
}

export function subscribeToServerDatabase(onUpdate: () => void): () => void {
  const collections = [
    { id: 'admins', key: KEYS.ADMINS },
    { id: 'tables', key: KEYS.TABLES },
    { id: 'staff', key: KEYS.STAFF },
    { id: 'attendance', key: KEYS.ATTENDANCE },
    { id: 'ldLogs', key: KEYS.LD_LOGS },
  ];

  const unsubscribes = collections.map(c => {
    return onSnapshot(doc(db, 'loungeData', c.id), (snapshot) => {
      // Ignore if this is triggered by our own local write to prevent UI cursor jumping
      if (snapshot.metadata.hasPendingWrites) return;
      if (snapshot.exists()) {
        const data = snapshot.data().data;
        if (Array.isArray(data)) {
          localStorage.setItem(c.key, JSON.stringify(data));
          onUpdate();
        }
      }
    });
  });

  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}
"""

content = re.sub(r'export async function fetchServerDatabase.*?return false;\n}', fetch_db_code, content, flags=re.DOTALL)

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)

