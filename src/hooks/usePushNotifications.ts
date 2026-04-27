import { useEffect, useRef } from 'react';

interface Client {
  id: string;
  last_name: string;
  first_name: string;
  middle_name: string;
  reminder_date: string;
  reminder_note: string;
}

function clientName(c: Client) {
  return [c.last_name, c.first_name, c.middle_name].filter(Boolean).join(' ') || 'Клиент';
}

export function usePushNotifications(clients: Client[]) {
  const notifiedRef = useRef<Set<string>>(new Set());
  const permissionRef = useRef<NotificationPermission | null>(null);

  // Запрашиваем разрешение один раз при монтировании
  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        permissionRef.current = p;
      });
    } else {
      permissionRef.current = Notification.permission;
    }
  }, []);

  // Проверяем напоминания раз в минуту
  useEffect(() => {
    if (!clients.length) return;

    const check = () => {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const today = new Date().toISOString().slice(0, 10);

      clients.forEach(c => {
        if (!c.reminder_date || c.reminder_date !== today) return;
        const key = `${c.id}-${c.reminder_date}`;
        if (notifiedRef.current.has(key)) return;

        notifiedRef.current.add(key);
        const n = new Notification(`Напоминание: ${clientName(c)}`, {
          body: c.reminder_note || 'Запланирован контакт с клиентом сегодня',
          icon: '/favicon.ico',
          tag: key,
          requireInteraction: false,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
      });
    };

    check(); // Сразу при загрузке клиентов
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, [clients]);
}
