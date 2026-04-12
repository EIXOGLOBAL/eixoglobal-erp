/**
 * Exemplo de Componente usando tRPC
 * 
 * Este arquivo demonstra como usar tRPC em componentes React
 * com TanStack Query para gerenciamento de estado.
 */

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/react';

/**
 * Exemplo 1: Lista de Projetos com Filtros
 */
export function ProjectsList() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | undefined>();

  // Query - buscar projetos
  const { data, isLoading, error, refetch } = trpc.projects.list.useQuery({
    search,
    status,
    limit: 20,
  });

  // Mutation - criar projeto
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => {
      // Refetch lista após criar
      refetch();
    },
  });

  // Mutation - deletar projeto
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <div>Carregando projetos...</div>;
  }

  if (error) {
    return <div>Erro: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Buscar projetos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-3 py-2"
        />
        
        <select
          value={status || ''}
          onChange={(e) => setStatus(e.target.value as any || undefined)}
          className="border rounded px-3 py-2"
        >
          <option value="">Todos os status</option>
          <option value="PLANNING">Planejamento</option>
          <option value="IN_PROGRESS">Em Andamento</option>
          <option value="COMPLETED">Concluído</option>
        </select>

        <button
          onClick={() => {
            createProject.mutate({
              name: 'Novo Projeto',
              startDate: new Date(),
              status: 'PLANNING',
            });
          }}
          disabled={createProject.isPending}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          {createProject.isPending ? 'Criando...' : 'Criar Projeto'}
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Total: {data?.total} projetos
        {data?.hasMore && ' (há mais resultados)'}
      </div>

      <div className="space-y-2">
        {data?.projects.map((project) => (
          <div key={project.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <h3 className="font-bold">{project.name}</h3>
              <p className="text-sm text-gray-600">
                Status: {project.status} | Início: {project.startDate.toLocaleDateString()}
              </p>
              {project.engineer && (
                <p className="text-sm text-gray-500">
                  Engenheiro: {project.engineer.name}
                </p>
              )}
            </div>
            
            <button
              onClick={() => deleteProject.mutate({ id: project.id })}
              disabled={deleteProject.isPending}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              Deletar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Exemplo 2: Detalhes do Projeto com Atualização
 */
export function ProjectDetails({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();

  // Query - buscar projeto
  const { data: project, isLoading } = trpc.projects.getById.useQuery({
    id: projectId,
  });

  // Mutation - atualizar projeto
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => {
      // Invalida cache para refetch
      utils.projects.getById.invalidate({ id: projectId });
      utils.projects.list.invalidate();
    },
  });

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (!project) {
    return <div>Projeto não encontrado</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{project.name}</h1>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select
            value={project.status}
            onChange={(e) => {
              updateProject.mutate({
                id: projectId,
                status: e.target.value as any,
              });
            }}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="PLANNING">Planejamento</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="ON_HOLD">Pausado</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Localização</label>
          <input
            type="text"
            value={project.location || ''}
            onChange={(e) => {
              updateProject.mutate({
                id: projectId,
                location: e.target.value,
              });
            }}
            className="border rounded px-3 py-2 w-full"
          />
        </div>
      </div>

      {project.client && (
        <div className="border rounded p-4">
          <h3 className="font-bold">Cliente</h3>
          <p>{project.client.name}</p>
          <p className="text-sm text-gray-600">{project.client.email}</p>
        </div>
      )}

      {updateProject.isPending && (
        <div className="text-sm text-blue-600">Salvando...</div>
      )}
    </div>
  );
}

/**
 * Exemplo 3: Dashboard Financeiro
 */
export function FinancialDashboard() {
  const [dateFrom] = useState(new Date(new Date().getFullYear(), 0, 1)); // Início do ano
  const [dateTo] = useState(new Date()); // Hoje

  // Query - estatísticas financeiras
  const { data: stats } = trpc.financial.stats.useQuery({
    dateFrom,
    dateTo,
  });

  // Query - fluxo de caixa
  const { data: cashFlow } = trpc.financial.cashFlow.useQuery({
    dateFrom,
    dateTo,
  });

  // Query - contas bancárias
  const { data: bankAccounts } = trpc.financial.bankAccounts.useQuery();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="border rounded p-4">
            <div className="text-sm text-gray-600">Receitas</div>
            <div className="text-2xl font-bold text-green-600">
              R$ {parseFloat(stats.income).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="text-sm text-gray-600">Despesas</div>
            <div className="text-2xl font-bold text-red-600">
              R$ {parseFloat(stats.expense).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="text-sm text-gray-600">Saldo</div>
            <div className={`text-2xl font-bold ${parseFloat(stats.balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              R$ {parseFloat(stats.balance).toLocaleString('pt-BR')}
            </div>
          </div>

          <div className="border rounded p-4">
            <div className="text-sm text-gray-600">Pendente</div>
            <div className="text-2xl font-bold text-yellow-600">
              R$ {parseFloat(stats.pending).toLocaleString('pt-BR')}
            </div>
          </div>
        </div>
      )}

      {/* Fluxo de Caixa */}
      {cashFlow && (
        <div className="border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Fluxo de Caixa Mensal</h2>
          <div className="space-y-2">
            {cashFlow.map((item) => (
              <div key={item.month} className="flex justify-between items-center">
                <span className="font-medium">{item.month}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">
                    +R$ {item.income.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-red-600">
                    -R$ {item.expense.toLocaleString('pt-BR')}
                  </span>
                  <span className={`font-bold ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {item.balance.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contas Bancárias */}
      {bankAccounts && (
        <div className="border rounded p-4">
          <h2 className="text-xl font-bold mb-4">Contas Bancárias</h2>
          <div className="space-y-2">
            {bankAccounts.map((account) => (
              <div key={account.id} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{account.name}</div>
                  <div className="text-sm text-gray-600">
                    {account.bank} - Ag: {account.agency} / CC: {account.accountNumber}
                  </div>
                </div>
                <div className="text-lg font-bold">
                  R$ {parseFloat(account.balance).toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Exemplo 4: Formulário com Validação
 */
export function CreateUserForm() {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    name: '',
    password: '',
    role: 'USER' as const,
  });

  const createUser = trpc.users.create.useMutation({
    onSuccess: () => {
      // Limpa formulário
      setFormData({
        username: '',
        email: '',
        name: '',
        password: '',
        role: 'USER',
      });

      // Invalida cache de usuários
      utils.users.list.invalidate();

      alert('Usuário criado com sucesso!');
    },
    onError: (error) => {
      alert(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium">Nome de Usuário</label>
        <input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Nome Completo</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Senha</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          minLength={8}
          className="border rounded px-3 py-2 w-full"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Função</label>
        <select
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
          className="border rounded px-3 py-2 w-full"
        >
          <option value="USER">Usuário</option>
          <option value="ENGINEER">Engenheiro</option>
          <option value="MANAGER">Gerente</option>
          <option value="ADMIN">Administrador</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={createUser.isPending}
        className="bg-blue-500 text-white px-4 py-2 rounded w-full disabled:bg-gray-400"
      >
        {createUser.isPending ? 'Criando...' : 'Criar Usuário'}
      </button>

      {createUser.error && (
        <div className="text-red-600 text-sm">
          {createUser.error.message}
        </div>
      )}
    </form>
  );
}

/**
 * Exemplo 5: Optimistic Updates
 */
export function ProjectStatusToggle({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();

  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });

  const updateStatus = trpc.projects.update.useMutation({
    // Atualização otimista
    onMutate: async (newData) => {
      // Cancela queries em andamento
      await utils.projects.getById.cancel({ id: projectId });

      // Snapshot do valor anterior
      const previousData = utils.projects.getById.getData({ id: projectId });

      // Atualiza otimisticamente
      utils.projects.getById.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return { ...old, status: newData.status! };
      });

      return { previousData };
    },
    // Reverte em caso de erro
    onError: (err, newData, context) => {
      utils.projects.getById.setData({ id: projectId }, context?.previousData);
    },
    // Refetch após sucesso ou erro
    onSettled: () => {
      utils.projects.getById.invalidate({ id: projectId });
    },
  });

  if (!project) return null;

  return (
    <button
      onClick={() => {
        const newStatus = project.status === 'IN_PROGRESS' ? 'COMPLETED' : 'IN_PROGRESS';
        updateStatus.mutate({ id: projectId, status: newStatus });
      }}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      {project.status === 'IN_PROGRESS' ? 'Marcar como Concluído' : 'Marcar como Em Andamento'}
    </button>
  );
}
