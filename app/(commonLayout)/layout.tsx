import { Footer } from '@/components/footer'
import { FooterByRoute } from '@/components/footer-by-route'
import { Navbar } from '@/components/navbar'
import { HomeFooter } from './home/home-footer'

type layoutProps = {
  children: React.ReactNode
}

const commonLayout: React.FC<layoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col pt-[var(--nav-h)]">
      <Navbar />
      {children}
      <FooterByRoute home={<HomeFooter />}>
        <Footer />
      </FooterByRoute>
    </div>
  )
}

export default commonLayout
