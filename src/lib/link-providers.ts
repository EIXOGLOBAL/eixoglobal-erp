export type LinkProvider =
  | "google-drive"
  | "dropbox"
  | "onedrive"
  | "sharepoint"
  | "s3"
  | "generic"

const PROVIDER_PATTERNS: { provider: LinkProvider; patterns: RegExp[] }[] = [
  {
    provider: "google-drive",
    patterns: [
      /drive\.google\.com/i,
      /docs\.google\.com/i,
      /sheets\.google\.com/i,
      /slides\.google\.com/i,
    ],
  },
  {
    provider: "dropbox",
    patterns: [
      /dropbox\.com/i,
      /dl\.dropboxusercontent\.com/i,
    ],
  },
  {
    provider: "onedrive",
    patterns: [
      /onedrive\.live\.com/i,
      /1drv\.ms/i,
    ],
  },
  {
    provider: "sharepoint",
    patterns: [
      /sharepoint\.com/i,
      /\.sharepoint\./i,
    ],
  },
  {
    provider: "s3",
    patterns: [
      /s3[.-][\w-]+\.amazonaws\.com/i,
      /[\w-]+\.s3\.amazonaws\.com/i,
      /s3\.amazonaws\.com/i,
    ],
  },
]

export function detectProvider(url: string): LinkProvider {
  for (const { provider, patterns } of PROVIDER_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(url))) {
      return provider
    }
  }
  return "generic"
}

/**
 * Returns the lucide-react icon name for a given provider.
 * The component maps these to actual icons at render time.
 */
export function getProviderIcon(
  provider: LinkProvider
): "FileText" | "Cloud" | "HardDrive" | "Globe" | "Database" | "Link" {
  const icons: Record<
    LinkProvider,
    "FileText" | "Cloud" | "HardDrive" | "Globe" | "Database" | "Link"
  > = {
    "google-drive": "HardDrive",
    dropbox: "Cloud",
    onedrive: "Cloud",
    sharepoint: "Globe",
    s3: "Database",
    generic: "Link",
  }
  return icons[provider]
}

export function getProviderLabel(provider: LinkProvider): string {
  const labels: Record<LinkProvider, string> = {
    "google-drive": "Google Drive",
    dropbox: "Dropbox",
    onedrive: "OneDrive",
    sharepoint: "SharePoint",
    s3: "Amazon S3",
    generic: "Link Externo",
  }
  return labels[provider]
}

export function getProviderColor(provider: LinkProvider): string {
  const colors: Record<LinkProvider, string> = {
    "google-drive": "text-green-600",
    dropbox: "text-blue-600",
    onedrive: "text-sky-600",
    sharepoint: "text-purple-600",
    s3: "text-orange-600",
    generic: "text-muted-foreground",
  }
  return colors[provider]
}

export interface UrlValidationResult {
  valid: boolean
  provider: LinkProvider
  error?: string
}

export function validateExternalUrl(url: string): UrlValidationResult {
  const trimmed = url.trim()

  if (!trimmed) {
    return { valid: false, provider: "generic", error: "URL é obrigatória" }
  }

  if (!trimmed.startsWith("https://")) {
    return {
      valid: false,
      provider: "generic",
      error: "URL deve começar com https://",
    }
  }

  try {
    new URL(trimmed)
  } catch {
    return { valid: false, provider: "generic", error: "URL inválida" }
  }

  const provider = detectProvider(trimmed)
  return { valid: true, provider }
}
