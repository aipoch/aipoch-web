import { HomeMedia } from '../home-media'
import type { HomeSpotlightMediaItem } from '../home-spotlight-content'
import { homeSection } from '../home-styles'

export const HomeTourSection = ({ media }: { media: HomeSpotlightMediaItem[] }) => (
  <section id="product-tour" className={`${homeSection} px-4 sm:px-10`}>
    <HomeMedia media={media} />
  </section>
)
