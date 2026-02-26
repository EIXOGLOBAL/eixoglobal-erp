'use client'

export function PrintButton() {
    return (
        <button
            className="no-print-btn"
            onClick={() => window.print()}
        >
            Imprimir
        </button>
    )
}
