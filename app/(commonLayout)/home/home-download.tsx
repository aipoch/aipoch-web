'use client'

import { ChevronDown, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  type DownloadKey,
  type DownloadManifest,
  resolveHomepageDownloadHref
} from '@/app/(commonLayout)/open-science/open-science-download-data'
import { platformLogo } from '@/components/platform-logos'
import { waitForBrowserMock } from '@/mocks/ready'
import { fetchOpenScienceDownloadManifest } from '@/service/open-science-download'

type ArchMenuId = 'macos' | 'linux'

type ArchMenu = {
  id: ArchMenuId
  menuElementId: string
  label: string
  icon: 'apple' | 'linux'
  subtitle: string
  options: readonly { key: DownloadKey; title: string; description: string }[]
}

const archMenus: readonly ArchMenu[] = [
  {
    id: 'macos',
    menuElementId: 'home-macos-downloads',
    label: 'macOS',
    icon: 'apple',
    subtitle: 'Apple Silicon / Intel',
    options: [
      { key: 'mac-arm64', title: 'Apple Silicon', description: 'Compatible with M-series chips' },
      { key: 'mac-x64', title: 'Intel', description: 'Intel-based Macs' }
    ]
  },
  {
    id: 'linux',
    menuElementId: 'home-linux-downloads',
    label: 'Linux',
    icon: 'linux',
    subtitle: 'x64 / ARM64',
    options: [
      { key: 'linux-x64-deb', title: 'x64', description: 'For Intel / AMD 64-bit systems' },
      { key: 'linux-arm64-deb', title: 'ARM64', description: 'For ARM 64-bit systems' }
    ]
  }
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
  const [openMenu, setOpenMenu] = useState<ArchMenuId | null>(null)
  const menuRefs = useRef<Record<ArchMenuId, HTMLFieldSetElement | null>>({
    macos: null,
    linux: null
  })
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
    const close = (event: PointerEvent) => {
      const insideMenu = Object.values(menuRefs.current).some((element) =>
        element?.contains(event.target as Node)
      )
      if (!insideMenu) setOpenMenu(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const clearCloseTimer = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }

  return (
    <div
      data-testid="home-platform-downloads"
      className="mt-6 grid max-w-[807px] grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-3"
    >
      <a
        href={resolveHomepageDownloadHref(manifest, 'win-x64')}
        aria-label="Download Windows"
        className="flex h-[80px] flex-row items-center justify-center gap-2 border border-black/10 bg-white px-3 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[#f4f4f1] hover:border-[#9a9890]"
      >
        <span className="flex size-10 shrink-0 items-center justify-center border border-black/10 bg-[#f7f7f5] text-[#111]">
          {platformLogo('windows', 'size-6')}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-sm font-semibold text-[#111]">Windows</b>
          <span className="block whitespace-nowrap text-[10px] text-[#aaa] sm:hidden md:block">
            x64
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[9px] font-medium tracking-[0.03em] text-[#aaa] sm:hidden md:flex">
          DOWNLOAD <Download className="size-3.5 text-[#aaa]" />
        </span>
      </a>
      {archMenus.map((menu) => {
        const open = openMenu === menu.id
        return (
          <fieldset
            className="relative min-w-0 border-0 p-0"
            key={menu.id}
            ref={(element) => {
              menuRefs.current[menu.id] = element
            }}
            onPointerEnter={(event) => {
              if (event.pointerType !== 'touch') {
                clearCloseTimer()
                setOpenMenu(menu.id)
              }
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== 'touch') {
                clearCloseTimer()
                closeTimerRef.current = setTimeout(() => setOpenMenu(null), 120)
              }
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null))
                setOpenMenu(null)
            }}
          >
            <button
              type="button"
              aria-label={`Download ${menu.label}`}
              aria-expanded={open}
              aria-controls={menu.menuElementId}
              onClick={() => {
                clearCloseTimer()
                setOpenMenu(menu.id)
              }}
              className={`flex h-[80px] w-full flex-row items-center justify-center gap-2 border border-black/10 px-3 text-left transition-[background-color,border-color,box-shadow] duration-200 hover:bg-[#f4f4f1] hover:border-[#9a9890] ${open ? 'bg-[#f4f4f1] shadow-[0_12px_28px_rgba(17,17,17,.10)]' : 'bg-white'}`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center border border-black/10 bg-[#f7f7f5] text-[#111]">
                {platformLogo(menu.icon, 'size-6')}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-sm font-semibold text-[#111]">{menu.label}</b>
                <span className="block whitespace-nowrap text-[10px] text-[#aaa] sm:hidden md:block">
                  {menu.subtitle}
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
                id={menu.menuElementId}
                className="absolute inset-x-0 top-[calc(100%+10px)] z-40 w-full border border-black/10 bg-white p-2 text-left shadow-[0_18px_45px_rgba(0,0,0,.14)]"
              >
                {menu.options.map((option) => (
                  <a
                    key={option.key}
                    href={resolveHomepageDownloadHref(manifest, option.key)}
                    onClick={() => setOpenMenu(null)}
                    className="group flex items-center justify-between px-4 py-3 transition hover:bg-[#f2f2ef]"
                  >
                    <span>
                      <b className="block text-base text-[#111]">{option.title}</b>
                      <small className="text-xs text-[#999]">{option.description}</small>
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
      })}
    </div>
  )
}
