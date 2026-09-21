import NextImage, { type ImageProps } from 'next/image'
import { STATIC_ASSETS_ORIGIN } from '@/lib/config'

/** Local proxy DNS can resolve the CDN to a synthetic address rejected by Next's optimizer. */
export function shouldLoadCdnImageDirectly(
  src: ImageProps['src'],
  mode: string | undefined = process.env.NODE_ENV
): boolean {
  return (
    mode === 'development' &&
    typeof src === 'string' &&
    src.startsWith(`${STATIC_ASSETS_ORIGIN.replace(/\/+$/, '')}/`)
  )
}

export function CdnImage({ unoptimized, ...props }: ImageProps) {
  return <NextImage {...props} unoptimized={unoptimized ?? shouldLoadCdnImageDirectly(props.src)} />
}
