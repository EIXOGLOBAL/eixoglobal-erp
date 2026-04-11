"use client"

import * as React from "react"
import {
  ZoomInIcon,
  ZoomOutIcon,
  MaximizeIcon,
  MinimizeIcon,
  DownloadIcon,
  PrinterIcon,
  RefreshCwIcon,
  FileWarningIcon,
  Loader2Icon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PdfViewerProps {
  src: string
  title?: string
  height?: number | string
  className?: string
  onError?: () => void
}

type RenderMethod = "iframe" | "object" | "embed"

const ZOOM_STEP = 10
const ZOOM_MIN = 50
const ZOOM_MAX = 200
const DEFAULT_HEIGHT = 600

export function PdfViewer({
  src,
  title = "Documento PDF",
  height = DEFAULT_HEIGHT,
  className,
  onError,
}: PdfViewerProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const [renderMethod, setRenderMethod] = React.useState<RenderMethod>("iframe")
  const [zoom, setZoom] = React.useState(100)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  const pdfUrl = React.useMemo(() => {
    if (src.startsWith("data:")) return src
    // Append #toolbar=1 to hint the browser to show its built-in PDF toolbar
    return src.includes("#") ? src : `${src}#toolbar=1`
  }, [src])

  const handleLoad = React.useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = React.useCallback(() => {
    if (renderMethod === "iframe") {
      setRenderMethod("object")
      setIsLoading(true)
      return
    }
    if (renderMethod === "object") {
      setRenderMethod("embed")
      setIsLoading(true)
      return
    }
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }, [renderMethod, onError])

  const handleRetry = React.useCallback(() => {
    setRenderMethod("iframe")
    setIsLoading(true)
    setHasError(false)
  }, [])

  const handleZoomIn = React.useCallback(() => {
    setZoom((prev) => Math.min(prev + ZOOM_STEP, ZOOM_MAX))
  }, [])

  const handleZoomOut = React.useCallback(() => {
    setZoom((prev) => Math.max(prev - ZOOM_STEP, ZOOM_MIN))
  }, [])

  const handleFullscreen = React.useCallback(async () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } catch {
        // Fullscreen not supported, ignore
      }
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  const handleDownload = React.useCallback(() => {
    const link = document.createElement("a")
    link.href = src
    link.download = title.endsWith(".pdf") ? title : `${title}.pdf`
    link.click()
  }, [src, title])

  const handlePrint = React.useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.print()
        return
      } catch {
        // Cross-origin, fallback to opening in new tab
      }
    }
    const printWindow = window.open(src, "_blank")
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.print()
      })
    }
  }, [src])

  // Listen for fullscreen changes (e.g. user presses Escape)
  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  // Timeout: if still loading after 10s, mark as error to try fallback
  React.useEffect(() => {
    if (!isLoading) return
    const timer = setTimeout(() => {
      if (isLoading) handleError()
    }, 10000)
    return () => clearTimeout(timer)
  }, [isLoading, renderMethod, handleError])

  const computedHeight =
    typeof height === "number" ? `${height}px` : height

  const renderPdfElement = () => {
    const style: React.CSSProperties = {
      width: `${zoom}%`,
      height: isFullscreen ? "calc(100vh - 48px)" : computedHeight,
      minHeight: "300px",
      transformOrigin: "top left",
    }

    switch (renderMethod) {
      case "iframe":
        return (
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            title={title}
            style={style}
            className="border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        )
      case "object":
        return (
          <object
            data={pdfUrl}
            type="application/pdf"
            title={title}
            style={style}
            onLoad={handleLoad}
            onError={handleError}
          >
            <p className="p-4 text-muted-foreground text-sm">
              Seu navegador nao suporta visualizacao de PDF embutida.
            </p>
          </object>
        )
      case "embed":
        return (
          <embed
            src={pdfUrl}
            type="application/pdf"
            title={title}
            style={style}
            onLoad={handleLoad}
            onError={handleError}
          />
        )
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex flex-col rounded-lg border bg-background overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-1.5">
        <div className="flex items-center gap-1 min-w-0">
          <span className="truncate text-sm font-medium text-foreground">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Zoom Controls */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleZoomOut}
            disabled={zoom <= ZOOM_MIN}
            title="Diminuir zoom"
          >
            <ZoomOutIcon />
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground tabular-nums">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleZoomIn}
            disabled={zoom >= ZOOM_MAX}
            title="Aumentar zoom"
          >
            <ZoomInIcon />
          </Button>

          <div className="mx-1 h-4 w-px bg-border" />

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleFullscreen}
            title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
          >
            {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
          </Button>

          {/* Print */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handlePrint}
            title="Imprimir"
          >
            <PrinterIcon />
          </Button>

          {/* Download */}
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={handleDownload}
            title="Baixar PDF"
          >
            <DownloadIcon />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="relative flex-1 overflow-auto bg-muted/30">
        {/* Loading State */}
        {isLoading && !hasError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/80">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Carregando documento...
            </p>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div
            className="flex flex-col items-center justify-center gap-4 p-8"
            style={{ minHeight: computedHeight }}
          >
            <FileWarningIcon className="size-12 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-base font-medium text-muted-foreground">
                Erro ao carregar documento
              </p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Nao foi possivel exibir o PDF no navegador.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCwIcon />
                Tentar novamente
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <DownloadIcon />
                Baixar PDF
              </Button>
            </div>
          </div>
        )}

        {/* PDF Render */}
        {!hasError && (
          <div className="flex justify-center">
            {renderPdfElement()}
          </div>
        )}
      </div>
    </div>
  )
}
