import { API_URL } from './api';

export async function getBadgesFromApi() {
  const res = await fetch(`${API_URL}/badges`);
  return res.json();
}

export async function saveBadgesToApi(badges: string[], level: number) {
  await fetch(`${API_URL}/badges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badges, level }),
  });
}
