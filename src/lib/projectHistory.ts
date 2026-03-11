// Local storage-based project history (no auth required)

export interface ProjectHistoryItem {
  id: string;
  title: string;
  matricula?: string;
  city?: string;
  state?: string;
  owner?: string;
  segmentsCount: number;
  createdAt: string;
  status: 'processed' | 'error';
}

const STORAGE_KEY = 'geomatricula_project_history';

export const projectHistory = {
  getAll(): ProjectHistoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  add(item: ProjectHistoryItem) {
    const items = this.getAll();
    // Replace if same id exists
    const idx = items.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.unshift(item);
    }
    // Keep max 50
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
  },

  remove(id: string) {
    const items = this.getAll().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
