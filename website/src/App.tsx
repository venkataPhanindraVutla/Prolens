import { LocationProvider } from './lib/location'
import Download from './sections/Download'
import EveryPhone from './sections/EveryPhone'
import Hero from './sections/Hero'
import OpenSource from './sections/OpenSource'
import ProofStrip from './sections/ProofStrip'
import Story from './sections/story/Story'
import Toolkit from './sections/toolkit/Toolkit'

export default function App() {
  return (
    <LocationProvider>
      <Hero />
      <main>
        <ProofStrip />
        <Story />
        <EveryPhone />
        <Toolkit />
        <OpenSource />
        <Download />
      </main>
    </LocationProvider>
  )
}
