import { JsonLd } from '@/components/json-ld'
import './medflow.css'
import { MedFlowExperience } from './medflow-experience'
import { medFlowMetadata, medFlowStructuredData } from './medflow-metadata'

export const metadata = medFlowMetadata

const MedFlowPage = () => {
  return (
    <main id="top" className="medflow-page">
      <JsonLd data={medFlowStructuredData} />
      <MedFlowExperience />
    </main>
  )
}

export default MedFlowPage
