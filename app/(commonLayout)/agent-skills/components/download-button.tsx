'use client'

import { Download } from 'lucide-react'
import { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AIPOCH_GITHUB_URL } from '@/lib/config'
import { fetchGithubDownloadUrl } from '@/service/skills'

interface DownloadButtonProps {
  skillPath: string
}

export function DownloadButton({ skillPath }: DownloadButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false)

  const redirectToGithub = useCallback(() => {
    window.open(AIPOCH_GITHUB_URL, '_blank', 'noopener,noreferrer')
  }, [])

  const handleDownload = useCallback(async () => {
    setIsRedirecting(true)
    try {
      await fetchGithubDownloadUrl(skillPath)
    } finally {
      redirectToGithub()
      setIsRedirecting(false)
    }
  }, [redirectToGithub, skillPath])

  return (
    <Button
      onClick={handleDownload}
      disabled={isRedirecting}
      className="h-12 rounded-none bg-[#111] px-3 text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:opacity-50"
    >
      <Download className="h-4 w-4 mr-2" />
      Download Skills
    </Button>
  )
}
