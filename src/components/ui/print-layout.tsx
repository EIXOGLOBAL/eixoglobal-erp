'use client'

import { forwardRef } from 'react'
import type { ExportColumn } from '@/lib/export-utils'

interface PrintLayoutProps {
  /** Title displayed in the print header */
  title: string
  /** Array of data objects to render */
  data: Record<string, unknown>[]
  /** Column definitions with key, label, and optional format */
  columns: ExportColumn[]
  /** Company name shown in the header */
  companyName?: string
  /** Optional subtitle below company name */
  companySubtitle?: string
  /** Additional CSS class for the wrapper */
  className?: string
}

/**
 * Print-optimized layout component for rendering data tables.
 * Hidden on screen, visible only when printing. Includes a company header,
 * styled table, and footer with generation timestamp.
 *
 * Usage:
 *   <PrintLayout
 *     title="Relatorio de Vendas"
 *     data={rows}
 *     columns={columns}
 *   />
 *
 * Trigger print with window.print() or a button that calls it.
 */
export const PrintLayout = forwardRef<HTMLDivElement, PrintLayoutProps>(
  function PrintLayout(
    {
      title,
      data,
      columns,
      companyName = 'Eixo Global ERP',
      companySubtitle = '',
      className = '',
    },
    ref
  ) {
    const now = new Date()
    const dateStr = new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(now)

    /** Resolve a cell value for display */
    function resolveCell(
      item: Record<string, unknown>,
      col: ExportColumn
    ): string {
      const raw = item[col.key]
      if (col.format) return col.format(raw)
      if (raw === null || raw === undefined) return ''

      // Date formatting
      if (raw instanceof Date) {
        return new Intl.DateTimeFormat('pt-BR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(raw)
      }
      if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
        const d = new Date(raw)
        if (!isNaN(d.getTime())) {
          return new Intl.DateTimeFormat('pt-BR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(d)
        }
      }

      // Number formatting
      if (typeof raw === 'number') {
        return new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 4,
        }).format(raw)
      }

      return String(raw)
    }

    return (
      <>
        {/* Inject print-only styles */}
        <style>{`
          @media screen {
            .print-layout-container {
              display: none !important;
            }
          }

          @media print {
            /* Hide everything on the page except the print layout */
            body > *:not(.print-layout-wrapper) {
              display: none !important;
            }
            .print-layout-wrapper {
              display: block !important;
            }
            .print-layout-container {
              display: block !important;
            }

            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }

            .print-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              border-bottom: 2px solid #1e40af;
              padding-bottom: 8px;
              margin-bottom: 12px;
            }

            .print-header-left h1 {
              font-size: 16px;
              color: #1e40af;
              margin: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .print-header-left h2 {
              font-size: 13px;
              color: #334155;
              font-weight: 400;
              margin: 2px 0 0 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .print-header-left .subtitle {
              font-size: 11px;
              color: #64748b;
              margin-top: 2px;
            }

            .print-header-right {
              text-align: right;
              font-size: 10px;
              color: #64748b;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .print-table thead th {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              background: #1e40af !important;
              color: #fff !important;
              font-size: 11px;
              font-weight: 600;
              text-align: left;
              white-space: nowrap;
            }

            .print-table tbody td {
              border: 1px solid #e2e8f0;
              padding: 5px 10px;
              font-size: 10px;
            }

            .print-table tbody tr:nth-child(even) {
              background: #f1f5f9 !important;
            }

            .print-table tbody tr:nth-child(odd) {
              background: #fff !important;
            }

            .print-total-rows {
              font-size: 10px;
              color: #64748b;
              margin-top: 8px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }

            .print-footer {
              margin-top: 20px;
              padding-top: 8px;
              border-top: 1px solid #cbd5e1;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
              color: #94a3b8;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
          }
        `}</style>

        <div
          ref={ref}
          className={`print-layout-wrapper ${className}`}
        >
          <div className="print-layout-container">
            {/* Header */}
            <div className="print-header">
              <div className="print-header-left">
                <h1>{companyName}</h1>
                {companySubtitle && (
                  <div className="subtitle">{companySubtitle}</div>
                )}
                <h2>{title}</h2>
              </div>
              <div className="print-header-right">
                Gerado em: {dateStr}
              </div>
            </div>

            {/* Table */}
            <table className="print-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, rowIdx) => (
                  <tr key={rowIdx}>
                    {columns.map((col) => (
                      <td key={col.key}>{resolveCell(item, col)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Row count */}
            <div className="print-total-rows">
              Total de registros: {data.length}
            </div>

            {/* Footer */}
            <div className="print-footer">
              <span>{companyName} - Sistema ERP</span>
              <span>{dateStr}</span>
            </div>
          </div>
        </div>
      </>
    )
  }
)
