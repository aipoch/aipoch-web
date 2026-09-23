'use client'

import { ChevronDown, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  type DownloadKey,
  type DownloadManifest,
  getHomepageRecommendedDownloadKey,
  resolveHomepageDownloadHref
} from '@/app/(commonLayout)/open-science/open-science-download-data'
import { platformLogo } from '@/components/platform-logos'
import { waitForBrowserMock } from '@/mocks/ready'
import { fetchOpenScienceDownloadManifest } from '@/service/open-science-download'

type Platform = { label: string; key: DownloadKey; icon: 'apple' | 'windows' | 'linux' }

const platforms: Platform[] = [
  { label: 'Windows', key: 'win-x64', icon: 'windows' },
  { label: 'macOS', key: 'mac-arm64', icon: 'apple' },
  { label: 'Linux', key: 'linux-x64-deb', icon: 'linux' }
]

let homepageManifestPromise: Promise<DownloadManifest> | null = null

const loadHomepageManifest = () => {
  if (!homepageManifestPromise) {
    homepageManifestPromise = waitForBrowserMock()
      .then(() => fetchOpenScienceDownloadManifest())
      .catch((error) => {
        homepageManifestPromise = null
        throw error
      })
  }
  return homepageManifestPromise
}

export const HomeDownload = () => {
  const [manifest, setManifest] = useState<DownloadManifest | null>(null)
  const [open, setOpen] = useState(false)
  const [macArch, setMacArch] = useState<DownloadKey>('mac-arm64')
  const menuRef = useRef<HTMLFieldSetElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    void loadHomepageManifest()
      .then((nextManifest) => {
        if (active) setManifest(nextManifest)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [])

  useEffect(
    () => () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    },
    []
  )

  useEffect(() => {
    const key = getHomepageRecommendedDownloadKey(navigator.userAgent)
    setMacArch(key === 'mac-x64' ? 'mac-x64' : 'mac-arm64')
  }, [])

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div
      data-testid="home-platform-downloads"
      className="mt-6 grid max-w-[807px] grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-3"
    >
      {platforms.map((platform) => {
        const isMac = platform.key === 'mac-arm64'
        const href = resolveHomepageDownloadHref(manifest, isMac ? macArch : platform.key)
        if (isMac) {
          return (
            <fieldset
              className="relative min-w-0 border-0 p-0"
              key={platform.label}
              ref={menuRef}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
                  closeTimerRef.current = null
                  setOpen(true)
                }
              }}
              onPointerLeave={(event) => {
                if (event.pointerType !== 'touch') {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
                  closeTimerRef.current = setTimeout(() => setOpen(false), 120)
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                  setOpen(false)
              }}
            >
              <button
                type="button"
                aria-label="Download macOS"
                aria-expanded={open}
                aria-controls="home-macos-downloads"
                onClick={() => {
                  if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
                  closeTimerRef.current = null
                  setOpen(true)
                }}
                className={`flex h-[80px] w-full flex-row items-center justify-center gap-2 border border-black/10 px-3 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[#f4f4f1] hover:border-[#9a9890]  ${open ? 'bg-[#f4f4f1] shadow-[0_12px_28px_rgba(17,17,17,.10)]' : 'bg-white'}`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center border border-black/10 bg-[#f7f7f5] text-[#111]">
                  {platformLogo(platform.icon, 'size-6')}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-sm font-semibold text-[#111]">{platform.label}</b>
                  <span className="block whitespace-nowrap text-[10px] text-[#aaa] sm:hidden md:block">
                    Apple Silicon / Intel
                  </span>
                </span>
                <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.03em] text-[#aaa] sm:hidden md:flex">
                  DOWNLOAD
                  <ChevronDown
                    className={`size-3.5 text-[#777] transition ${open ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
              {open ? (
                <div
                  id="home-macos-downloads"
                  className="absolute inset-x-0 top-[calc(100%+10px)] z-40 w-full border border-black/10 bg-white p-2 text-left shadow-[0_18px_45px_rgba(0,0,0,.14)]"
                >
                  {(['mac-arm64', 'mac-x64'] as const).map((key) => (
                    <a
                      key={key}
                      href={resolveHomepageDownloadHref(manifest, key)}
                      onClick={() => {
                        setMacArch(key)
                        setOpen(false)
                      }}
                      className="group flex items-center justify-between px-4 py-3 transition hover:bg-[#f2f2ef]"
                    >
                      <span>
                        <b className="block text-base text-[#111]">
                          {key === 'mac-arm64' ? 'Apple Silicon' : 'Intel'}
                        </b>
                        <small className="text-xs text-[#999]">
                          {key === 'mac-arm64'
                            ? 'Compatible with M-series chips'
                            : 'Intel-based Macs'}
                        </small>
                      </span>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f2f2ef] text-[#111] transition group-hover:bg-[#111] group-hover:text-white">
                        <Download className="size-4" />
                      </span>
                    </a>
                  ))}
                </div>
              ) : null}
            </fieldset>
          )
        }
        return (
          <a
            key={platform.label}
            href={href}
            aria-label={`Download ${platform.label}`}
            className="flex h-[80px] flex-row items-center justify-center gap-2 border border-black/10 bg-white px-3 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[#f4f4f1] hover:border-[#9a9890] "
          >
            <span className="flex size-10 shrink-0 items-center justify-center border border-black/10 bg-[#f7f7f5] text-[#111]">
              {platformLogo(platform.icon, 'size-6')}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-sm font-semibold text-[#111]">{platform.label}</b>
              <span className="block whitespace-nowrap text-[10px] text-[#aaa] sm:hidden md:block">
                x64
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.03em] text-[#aaa] sm:hidden md:flex">
              DOWNLOAD <Download className="size-3.5 text-[#aaa]" />
            </span>
          </a>
        )
      })}
    </div>
  )
}
