export type SavedTemplate = {
  name: string;
  filename: string;
  buffer: ArrayBuffer;
  sheetName: string;
  header: number;
  start: number;
  maps: number[];
  title: string;
  fallback: string;
  allow: boolean;
  clear: string;
  fixed: string;
  headers: string[];
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('listing-studio', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('templates', { keyPath: 'name' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readTemplates(): Promise<SavedTemplate[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction('templates').objectStore('templates').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function writeTemplate(template: SavedTemplate): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore('templates').put(template);
    });
  } finally {
    db.close();
  }
}
