'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { CdnImage as Image } from '@/components/cdn-image'
import { Navbar } from '@/components/navbar'
import { AIPOCH_GITHUB_URL } from '@/lib/config'
import { staticAsset } from '@/lib/staticAsset'

type NotFoundContentProps = {
  showNavbar?: boolean
}

export function NotFoundContent({ showNavbar = false }: NotFoundContentProps) {
  return (
    <div className={showNavbar ? 'min-h-screen bg-[#e8e8e8]' : 'flex flex-1 flex-col bg-[#e8e8e8]'}>
      {showNavbar && <Navbar />}
      <main
        className={`flex items-center justify-center bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[60px_60px] px-4 py-12 lg:px-8 ${showNavbar ? 'min-h-[calc(100vh-77px)]' : 'flex-1'}`}
      >
        <div className="mx-auto flex w-full max-w-7xl justify-center">
          <div className="flex w-full max-w-3xl flex-col items-center text-center">
            <Image
              src={staticAsset('not-found-transparent-53227173.svg')}
              alt="404 not found"
              width={640}
              height={640}
              priority
              className="h-auto w-full max-w-[640px]"
            />

            <Link
              href={AIPOCH_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="-mt-[40px] inline-flex items-center gap-2 bg-black px-8 py-3 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-black/80"
            >
              <span>Visit AIPOCH</span>
              <Image
                src={staticAsset('githab-image-d03941b9.webp')}
                alt="GitHub"
                width={16}
                height={16}
                className="h-4 w-4 rounded-full"
              />
              <span>Github</span>
              <ArrowRight strokeWidth={3} className="h-4 w-4 text-white" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
