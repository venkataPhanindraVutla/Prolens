import { motion, useScroll, useTransform } from 'motion/react'
import { useMedia, useReducedMotion } from '../../lib/motion'
import { useRef } from 'react'
import Photo from '../../components/Photo'
import SectionHeading from '../../components/SectionHeading'
import { creditLine, exifLine, photo } from '../../lib/photos'
import css from './Gallery.module.css'

/** Each genre with the recipe the app's Coach tab gives for it (core/model/Recipes.kt) and the tools that help. */
export const GENRES: { genre: string; photo: string; recipeName: string; recipe: string; tip: string }[] = [
  { genre: 'Landscape', photo: 'library', recipeName: 'Landscape', recipe: '16–35 mm · f/8–f/11 · Tripod, any', tip: 'Find golden hour in the Light tab, turn the level on, and put the horizon on a third.' },
  { genre: 'Street', photo: 'street', recipeName: 'Street', recipe: '28–35 mm · f/8 · 1/500 s', tip: 'Zone-focus at f/8 and keep 1/500 for faces that move. The level keeps doorways upright.' },
  { genre: 'Portrait', photo: 'portrait', recipeName: 'Headshot', recipe: '85–135 mm · f/1.8–f/2.8 · 1/200 s+', tip: 'Phi grid with the eye on the top line; focus peaking confirms the eyelashes are sharp.' },
  { genre: 'Night sky', photo: 'astro', recipeName: 'Astro and Milky Way', recipe: '14–24 mm · f/1.4–f/2.8 · NPF rule (≈10–20 s)', tip: 'The NPF calculator gives the longest exposure before stars trail; Night mode handles the foreground.' },
  { genre: 'Wildlife', photo: 'fox', recipeName: 'Wildlife and birds', recipe: '400–600 mm · Wide open · 1/2000 s+', tip: 'Fast shutter from the recipe, and the golden spiral for where the animal looks.' },
  { genre: 'Architecture', photo: 'interior', recipeName: 'Architecture', recipe: '16–24 mm · f/8 · Tripod', tip: 'One-point perspective grid down the centre and a dead-level phone for straight verticals.' },
  { genre: 'Macro', photo: 'macro', recipeName: 'Macro', recipe: '90–105 mm macro · f/8–f/16 · 1/200 s + flash', tip: 'Macro mode picks the closest-focusing lens; stack focus when one frame can’t hold it all.' },
]

type Genre = (typeof GENRES)[number]

/**
 * One spread, built as layers in depth: the photo tilts as it passes, the genre word floats in front of it,
 * and the recipe drifts at its own speed, so the page opens up like a magazine held in the hand.
 */
function Spread({ g, i }: { g: Genre; i: number }) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const side = i % 2 ? -1 : 1
  // On a phone the cards sit side by side in a swipe row, so the tilt is a hint, not a turn.
  const amp = useMedia('(max-width: 900px)') ? 0.3 : 1
  const photoRotateY = useTransform(p, [0, 1], [side * 14 * amp, side * -14 * amp])
  const photoRotateX = useTransform(p, [0, 1], [8 * amp, -8 * amp])
  const photoScale = useTransform(p, [0, 0.35, 0.65, 1], [0.86, 1, 1, 0.94])
  const photoY = useTransform(p, [0, 1], [40 * amp, -40 * amp])
  const wordY = useTransform(p, [0, 1], [36 * amp, -36 * amp])
  const textY = useTransform(p, [0, 1], [60 * amp, -60 * amp])
  const photoInner = useTransform(p, [0, 1], ['-6%', '6%'])
  const ph = photo(g.photo)
  const exif = exifLine(ph)

  return (
    <article ref={ref} className={css.spread} aria-labelledby={`genre-${i}`} data-side={i % 2 ? 'right' : 'left'}>
      <motion.figure data-3d className={css.figure} style={reduced ? undefined : { rotateY: photoRotateY, rotateX: photoRotateX, scale: photoScale, y: photoY }}>
        <div className={css.frame}>
          <motion.div className={css.inner} style={reduced ? undefined : { y: photoInner }}>
            <Photo id={g.photo} sizes="(min-width: 900px) 62vw, 86vw" />
          </motion.div>
          <span className={css.sheen} aria-hidden="true" />
        </div>
      </motion.figure>
      <motion.div data-3d className={css.text} style={reduced ? undefined : { y: textY }}>
        <span className={`${css.index} mono`}>
          {String(i + 1).padStart(2, '0')} / {String(GENRES.length).padStart(2, '0')}
        </span>
        <motion.h3 data-3d id={`genre-${i}`} className={css.genre} style={reduced ? undefined : { y: wordY }}>
          {g.genre}
        </motion.h3>
        <p className={css.recipeName}>Coach recipe · {g.recipeName}</p>
        <p className={`${css.recipe} mono`}>{g.recipe}</p>
        <p className={css.tip}>{g.tip}</p>
        <p className={`${css.credit} mono`}>
          {ph.place}
          {exif && ` · ${exif}`}
          <br />
          <a href={ph.page} target="_blank" rel="noopener">
            Photo: {creditLine(ph)}
          </a>
        </p>
      </motion.div>
    </article>
  )
}

export default function Gallery() {
  return (
    <section className={css.gallery} aria-labelledby="gallery-title">
      <div className={`section ${css.head}`}>
        <SectionHeading id="gallery-title" className="display">
          Every genre has <span className="pink">a recipe</span>.
        </SectionHeading>
        <p className="lede">
          The Coach tab carries settings for fifteen kinds of shot. Here are seven, with the Prolens tools that get you
          there. Swipe on a phone.
        </p>
      </div>
      <div className={css.track}>
        {GENRES.map((g, i) => (
          <Spread key={g.genre} g={g} i={i} />
        ))}
      </div>
    </section>
  )
}
