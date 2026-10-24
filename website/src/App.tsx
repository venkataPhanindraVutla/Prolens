import { lazy, Suspense } from 'react'
import Deferred from './components/Deferred'
import MotionDirector from './components/MotionDirector'
import { LocationProvider } from './lib/location'
import Download from './sections/Download'
import EveryPhone from './sections/EveryPhone'
import Footer from './sections/Footer'
import Hero from './sections/Hero'
import BeforeAfter from './sections/layers/BeforeAfter'
import Parallax from './sections/layers/Parallax'
import OpenSource from './sections/OpenSource'
import ProofStrip from './sections/ProofStrip'
import Story from './sections/story/Story'
import Toolkit from './sections/toolkit/Toolkit'

// The 3D sections bring the Motion library with them; they load only when scrolled near.
const Gallery = lazy(() => import('./sections/layers/Gallery'))
const AppTour = lazy(() => import('./sections/layers/AppTour'))

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
          <Suspense fallback={<div style={{ minHeight: '600svh' }} />}>
            <Gallery />
          </Suspense>
        </Deferred>
        <Deferred minHeight="300svh">
          <Suspense fallback={<div style={{ minHeight: '300svh' }} />}>
            <AppTour />
          </Suspense>
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
      <MotionDirector />
    </LocationProvider>
  )
}
