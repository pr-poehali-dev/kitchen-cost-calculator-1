import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import type { AuthUser } from './useAuth';
import { adminUrl, authHeaders, type UserRow, type Modal } from './adminTypes';
import AdminUserTable from './AdminUserTable';
import {
  ModalOverlay,
  CreateUserForm,
  ChangePasswordForm,
  DeleteConfirm,
  ProfileModal,
} from './AdminUserModals';

interface Props {
  currentUser: AuthUser;
  token: string;
  inline?: boolean;
  onClose?: () => void;
}

export default function AdminPanel({ currentUser, token }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(adminUrl(), { headers: authHeaders(token) });
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const update = async (id: number, fields: Record<string, string>) => {
    setSaving(id);
    await fetch(adminUrl(), {
      method: 'PUT',
      headers: authHeaders(token),
      body: JSON.stringify({ id, ...fields }),
    });
    setSaving(null);
    fetchUsers();
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <Icon name="Users" size={16} className="text-gold" />
          <span className="font-semibold">Пользователи</span>
          <span className="text-xs text-[hsl(var(--text-muted))] bg-[hsl(220,12%,16%)] px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>
        <button
          onClick={() => setModal({ type: 'create' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-[hsl(220,16%,8%)] rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <Icon name="UserPlus" size={13} />
          Добавить
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <AdminUserTable
          users={users}
          loading={loading}
          saving={saving}
          currentUser={currentUser}
          onAdd={() => setModal({ type: 'create' })}
          onUpdate={update}
          onModal={setModal}
        />
      </div>

      {/* Модальные окна */}
      {modal && modal.type !== 'profile' && (
        <ModalOverlay onClose={() => setModal(null)}>
          {modal.type === 'create' && (
            <CreateUserForm
              token={token}
              onDone={() => { setModal(null); fetchUsers(); }}
              onCancel={() => setModal(null)}
            />
          )}
          {modal.type === 'password' && (
            <ChangePasswordForm
              user={modal.user}
              token={token}
              onDone={() => setModal(null)}
              onCancel={() => setModal(null)}
            />
          )}
          {modal.type === 'delete' && (
            <DeleteConfirm
              user={modal.user}
              token={token}
              onDone={() => { setModal(null); fetchUsers(); }}
              onCancel={() => setModal(null)}
            />
          )}
        </ModalOverlay>
      )}

      {/* Профиль менеджера */}
      {modal?.type === 'profile' && (
        <ProfileModal
          user={modal.user}
          token={token}
          onSave={() => { setModal(null); fetchUsers(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
