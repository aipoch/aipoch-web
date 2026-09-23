import { CdnImage as Image } from '@/components/cdn-image'
import type { StaticImageFileName } from '@/lib/static-assets'
import { staticImage } from '@/lib/staticAsset'

export function OpenScienceImage({
  asset,
  alt = '',
  className,
  sizes,
  preload = false
}: {
  asset: StaticImageFileName
  alt?: string
  className?: string
  sizes: string
  preload?: boolean
}) {
  return (
    <Image
      {...staticImage(asset)}
      alt={alt}
      sizes={sizes}
      quality={100}
      preload={preload}
      className={className}
    />
  )
}
