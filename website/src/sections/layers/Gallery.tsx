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
        {GENRES.map((g, i) => {
          const p = photo(g.photo)
          const exif = exifLine(p)
          return (
            <article key={g.genre} className={css.spread} aria-labelledby={`genre-${i}`} data-side={i % 2 ? 'right' : 'left'}>
              <figure className={css.figure}>
                <div className={css.frame}>
                  <Photo id={g.photo} sizes="(min-width: 900px) 62vw, 86vw" />
                </div>
              </figure>
              <div className={css.text}>
                <span className={`${css.index} mono`}>
                  {String(i + 1).padStart(2, '0')} / {String(GENRES.length).padStart(2, '0')}
                </span>
                <h3 id={`genre-${i}`} className={css.genre}>
                  {g.genre}
                </h3>
                <p className={css.recipeName}>Coach recipe · {g.recipeName}</p>
                <p className={`${css.recipe} mono`}>{g.recipe}</p>
                <p className={css.tip}>{g.tip}</p>
                <p className={`${css.credit} mono`}>
                  {p.place}
                  {exif && ` · ${exif}`}
                  <br />
                  <a href={p.page} target="_blank" rel="noopener">
                    Photo: {creditLine(p)}
                  </a>
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
