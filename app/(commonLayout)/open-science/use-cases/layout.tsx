import type { ReactNode } from 'react'
import { UseCaseNavigation } from './_components/use-case-navigation'

// Keep return provenance local to the gallery, overview, and replay routes.
const UseCasesLayout = ({ children }: { children: ReactNode }) => {
  return <UseCaseNavigation>{children}</UseCaseNavigation>
}

export default UseCasesLayout
