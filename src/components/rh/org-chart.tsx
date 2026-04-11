'use client'
import { useState } from 'react'
import { Pencil } from 'lucide-react'

interface OrgNode {
  id: string
  name: string
  role: string
  department?: string | null
  avatarUrl?: string | null
  managerId: string | null
  children?: OrgNode[]
}

function buildTree(employees: OrgNode[]): OrgNode[] {
  const map = new Map(employees.map(e => [e.id, { ...e, children: [] as OrgNode[] }]))
  const roots: OrgNode[] = []

  map.forEach(emp => {
    if (emp.managerId && map.has(emp.managerId)) {
      map.get(emp.managerId)!.children!.push(emp)
    } else {
      roots.push(emp)
    }
  })
  return roots
}

function OrgNodeCard({
  node,
  level = 0,
  onEdit,
}: {
  node: OrgNode
  level?: number
  onEdit?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={[
          'bg-card border rounded-lg p-3 text-center w-40 shadow-xs relative group',
          hasChildren ? 'cursor-pointer hover:border-primary' : '',
          level === 0 ? 'border-primary border-2' : '',
        ].join(' ')}
      >
        {/* Edit button */}
        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(node.id)
            }}
            className="absolute top-1.5 right-1.5 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-opacity"
            title="Editar hierarquia"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        )}

        <div
          onClick={() => hasChildren && setExpanded(!expanded)}
        >
          {/* Avatar/Initials */}
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold mx-auto mb-2 overflow-hidden">
            {node.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={node.avatarUrl} alt={node.name} className="w-full h-full object-cover" />
            ) : (
              node.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
            )}
          </div>
          <p className="text-xs font-semibold leading-tight line-clamp-2">{node.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{node.role}</p>
          {node.department && (
            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full mt-1 inline-block">
              {node.department}
            </span>
          )}
          {hasChildren && (
            <p className="text-[9px] text-muted-foreground mt-1">
              {expanded ? '\u25B2' : '\u25BC'} {node.children!.length}
            </p>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className="relative mt-4">
          {/* Vertical line down */}
          <div className="absolute left-1/2 top-0 -translate-x-0.5 w-0.5 h-4 bg-border" />
          {/* Horizontal line across children */}
          {node.children!.length > 1 && (
            <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
          )}
          <div className="flex gap-6 pt-4">
            {node.children!.map(child => (
              <div key={child.id} className="relative">
                {node.children!.length > 1 && (
                  <div className="absolute left-1/2 top-0 -translate-x-0.5 w-0.5 h-4 bg-border" />
                )}
                <OrgNodeCard node={child} level={level + 1} onEdit={onEdit} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function OrgChart({
  employees,
  onEditNode,
}: {
  employees: OrgNode[]
  onEditNode?: (id: string) => void
}) {
  const tree = buildTree(employees)

  if (tree.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum colaborador ativo para exibir.</p>
        <p className="text-sm mt-1">Cadastre colaboradores no modulo RH.</p>
      </div>
    )
  }

  return (
    <div className="overflow-auto">
      <div className="flex gap-8 justify-center min-w-max p-8">
        {tree.map(root => (
          <OrgNodeCard key={root.id} node={root} level={0} onEdit={onEditNode} />
        ))}
      </div>
    </div>
  )
}
