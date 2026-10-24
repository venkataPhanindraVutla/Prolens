import Download from './sections/Download'
import Hero from './sections/Hero'
import OpenSource from './sections/OpenSource'
import ProofStrip from './sections/ProofStrip'

export default function App() {
  return (
    <>
      <Hero />
      <main>
        <ProofStrip />
        <OpenSource />
        <Download />
      </main>
    </>
  )
}
