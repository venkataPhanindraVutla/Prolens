import Deferred from './components/Deferred'
import { LocationProvider } from './lib/location'
import Download from './sections/Download'
import EveryPhone from './sections/EveryPhone'
import Footer from './sections/Footer'
import Hero from './sections/Hero'
import AppTour from './sections/layers/AppTour'
import BeforeAfter from './sections/layers/BeforeAfter'
import Gallery from './sections/layers/Gallery'
import Parallax from './sections/layers/Parallax'
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
        <Parallax />
        <Story />
        <Deferred minHeight="160svh">
          <BeforeAfter />
        </Deferred>
        <Deferred minHeight="600svh">
          <Gallery />
        </Deferred>
        <Deferred minHeight="140svh">
          <AppTour />
        </Deferred>
        <Deferred minHeight="140svh">
          <EveryPhone />
        </Deferred>
        <Deferred minHeight="300svh">
          <Toolkit />
        </Deferred>
        <OpenSource />
        <Download />
      </main>
      <Footer />
    </LocationProvider>
  )
}
