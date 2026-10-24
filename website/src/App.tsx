import { LocationProvider } from './lib/location'
import Download from './sections/Download'
import Hero from './sections/Hero'
import OpenSource from './sections/OpenSource'
import ProofStrip from './sections/ProofStrip'
import Story from './sections/story/Story'

export default function App() {
  return (
    <LocationProvider>
      <Hero />
      <main>
        <ProofStrip />
        <Story />
        <OpenSource />
        <Download />
      </main>
    </LocationProvider>
  )
}
