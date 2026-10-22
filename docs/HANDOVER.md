# Manuscript — agent handover

Updated: 2026-10-22. Read together with `TODO.md`, `docs/GAME_VISION.md`, and `AGENTS.md`.

## 2026-10-22 (night, last) Claude session: a coherent traveller, castles out of the sky, an easier third book (read first)

- **User direction (2026-10-22):** the game is for younger players; Book III must be "a step up from Book II, not a cliff", never needing "immaculate precision". A coherent, loveable traveller is "prio number 1: all else sits downstream". No castles hanging in the sky.
- **The traveller** (committed): the mis-cut arms, the dragon tail's stray wing and the single wing are re-cut by `scripts/repair_character_parts.py`; a hare's pair of paws is added to the tailor's sleeves; the hood's lining is cut away and the hood is worn over the face. The puppet draws every part at its painted scale and pins it at measured joints (see `docs/ART_PIPELINE.md`). Its walk is a march suited to parts painted facing out of the page (each foot lifts in turn, arms swing together); jumps and cheers keep their arms-up joy. Verified by eye in `scripts/harness/puppets.html` (every head on every tunic, every sleeve, leg and adornment), on the tailor's page with the ready-made travellers, and in Folio I; `npm test`, `npm run build` and `test:tale` pass.
- **Castles in the sky** (committed, b727529): the distant castles of Folios I to VII stand behind the hills; Folio XI's is gone.
- **Book III eased**: Folio XIII's crate lands from the margin at 150 across, nearly its largest (`TrayItem.width`), so its timber face is tall and the climb works with the crate hung anywhere from about 280 to 360 (it was a band of about 26). The keep keeps its height: a held, running leap rises about 170, not 150, and a lower keep let the crate alone reach the battlements (the level check caught it); Folio XIV needs one crate, not a two-crate stair: a parapet before a taller louvre, reached from one crate set down or hung anywhere before it, is the vantage for a level shot, and the tower moved right to leave room. Mapped with the solver and played in the browser with rough drops and steered leaps. `scripts/check-levels.mjs` and `scripts/check-chapter.mjs` are rewritten for both, placing pieces roughly as a player does; Folios XV to XVII are still to be reviewed for over-tight tolerance, and Folio XVIII is shelved until then.

## 2026-10-22 (night, later) Claude session: the Postern

- **Folio XVII, *The Postern*** (`folio17`; tray: two trusses of hay, springy; quiver: one arrow; par 3; sky dusk, moat at 640).
  - **The scene.** The traveller starts high on a bluff (top at 300, its edge at 270). Below, a moat runs to the curtain wall at 1100. The postern is an arch on the wall with its sill at 400 and an oak door within (the goal). Its little drawbridge (a plank 72 long, hinged at the sill) is drawn up on a rope that runs from a cleat inside the arch, over a pulley on its crown, and down to the bridge's top, with the knot over the bridge.
  - **The play.** Cut the rope from the bluff and the bridge comes down, still far out of reach. A leap from the bluff onto hay hung low in the moat throws the traveller far, but not far enough; a second truss, hung where the first throw comes down, throws them on to the bridge.
  - **How it was shaped.** The first plan (a crate as perch and vantage, one truss as springboard) failed under the solver, and the reasons are worth keeping:
    - Hay landed on softly (a fall under 40) is simply a platform, so one truss, or one crate, hung far enough out kept bridging the moat on its own.
    - A bounce never rises above the leap that began it, so a crate (at most one leap above the road) gives the bounce little height to trade for distance.
    - What hay does well is carry height across distance (as in the Gorge), so the folio became a chain of two throws from a high start.
    - The largest truss (1.6 times) laid level with the bluff became a causeway: a running leap from its end reached the bridge. Shortening the bridge from 92 to 72 did not close it. It is kept as an expert's way (one truss, under par, needing the size, the height and the place all at once) and logged, not asserted.
  - **Proved** (`test:levels`):
    - closed bare and with the rope cut alone;
    - closed to one truss, short of its largest, anywhere (72 placements at two sizes) with the rope cut, and to two trusses with the rope uncut (12 pairs): a parallel search;
    - open three ways (both low at 500 and 860; the first higher at 580 and 520 with the second at 940; both low, nearer the bluff, at 420 and 780);
    - the letters: B on the bluff bare; O and R only by the throws.
    - A sweep of 48 pairs while shaping it opened 38: the chain is forgiving once understood.
  - **Played** (`test:chapter`): the Gorge's end card turns to it; both trusses are set at 500 and 860, top 600; the rope is cut from the bluff, and one leap from its edge, steered on, is thrown twice and lands on the bridge (the check asserts both throws). A scratch run of the same took B and O but not R, which asks for a better second throw.
  - **Letters** continue the motto: B, O, R.
- **Briefs keep to the foot of the page.** The Postern's first brief ran to five lines where the foot holds four, and its last words fell below the page. It is shortened (198 characters), and two guards keep any brief from outgrowing the foot again:
  - a unit test caps every brief at 230 characters, a rough measure;
  - the chapter check sets every folio's brief in the page's own hand, at the brief's real width, and counts its lines. All are four or fewer; ten run to exactly four, so there is little room to spare.
- **Checks run before pushing**: the whole suite passed on the Postern as first written: `npm test`, `npm run build`, `test:chapter`, `test:tale`, `test:levels`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser`. After the brief was shortened and its guards added, `npm test` (235 passing), `npm run build` and `test:chapter` (which measured every brief) passed again.
- **Next**: Folio XVIII, the book's last (provisionally *The Crag*; XVI has a crag, so perhaps renamed).

## 2026-10-22 (evening, last) Claude session: what drops falls to the ground

A quality-of-life change to the scriptorium, long on the list.

- **"Drops" lands** (`landDrops` in `src/tale/stage/world.ts`).
  - **What happens.** In play, each picture set to drop when a target is struck falls straight down until its painted foot meets the first ground beneath it. What the same target works falls with it, so it is not ground; other pieces stand where they are. With nothing beneath, it falls into the stream (its foot a little under the water) or off the foot of the page.
  - **How.** When play begins (`played` in `FolioStage`), "Drops" is turned into an explicit pose, as a level's works are. The book keeps "Drops", so a folio rebuilt beneath a piece still lands it right, and older books are unchanged. The strike, the field laid after it, and the drawing all use `played`.
  - **The fall's time** follows the drop: √(2d/g) with the traveller's own gravity (3300 a second squared), at least 0.22 s (`fallTime`, set on the piece as its transition's duration). A stone falling 400 takes about 0.49 s, close to the 0.55 s every drop used to take. With reduced motion the stylesheet's 0.2 s wins (`!important`).
  - **The ghost at rest** for a selected dropping piece shows where it will land. It is worked out 140 ms after the pieces lie still (laying the ground while a piece is dragged would be slow), and it is hidden while it is out of date.
- **Checked**: a scratch run hung a crate 260 up over the first folio's meadow and set it to drop when a butt is struck: the ghost lay on the meadow, and the struck crate fell there in 0.40 s. `test:scriptorium` now does the same, then undoes it.
- **Checks run before pushing**: `npm test` (234), `npm run build`, `test:scriptorium`, `test:chapter` (the Hanging Stone's drop, now timed by its height, still crushes the wolf), `test:tale`, `test:play` and `test:browser` pass. `test:scriptorium` failed once on my own assertion: set down by hand, the crate had sunk 9 into the turf, and the landing (rightly) finds the turf's top. `test:levels` and `test:solidity` were not re-run; their harness pages import none of what changed.

## 2026-10-22 (evening, later) Claude session: springy pieces, and the Gorge

A new verb for the third book, chosen over a two-leaf bascule bridge (on paper that design kept collapsing into the Belfry's single-vantage puzzle): something springy to fall on. The user's north star asks for Mario's joy as well as precision; a bounce is both.

- **Springy pieces** (`springiness`, `springSettle`, `springMin` in `TUNING`; `stepBody` in `src/engine/controller.ts`).
  - **The rule.** A traveller who falls onto something springy is thrown back up by 86% of the height fallen. Falls shorter than 40 are plain landings, so walking onto hay or hopping on it does nothing. Each further bounce before touching other ground gives back half, so they settle in a few bounces unless they steer off. A jump from it is a plain jump.
  - **Why it matters, and its limit.** A bounce never beats a leap from the same place in height (it returns less than was fallen). What it does is carry height across distance: a leap from high up onto hay hung low throws the traveller far.
  - **Bookkeeping.** `Body.peak` is the highest the feet have been since last on ground (it follows a climber up a ladder), and `Body.sprung` counts the bounces since. The fall height is `y - peak`.
  - **Where the spring is.** The field keeps `springs` (a set of owners) and `ids` (owner → piece id), set by `rasterizeField` from `Collider.spring` and `Collider.id`. `springAt` reads one cell. Under the feet the whole footprint is scanned (`springUnder`): a painted top is uneven, and the first version, which sampled three points, missed the hay's straw top in play although the harness found bounces.
  - **Feedback.** A `bounce` world event (the height fallen and the piece). The session plays `boing` (a jaw harp's twang over a thump of straw), throws `straw` particles, stretches the traveller, and above a fall of 170 turns them head over heels (`FLIP`, 0.62 s). The stage squashes the piece itself (`bounceRef` in `FolioStage`, by `data-piece` and WAAPI on `scale`). With reduced motion the piece does not squash.
  - **The role.** `GameRole` gains `spring`, labelled *Springy* ("throws back up a traveller who falls on it"). It is a chip in the scriptorium's role row, collides as ground with the spring flag in the stage (`stage/world.ts`), the tale's level fields (`levelWorld.ts`) and the old desk (`engine/fromPage.ts`), and saved files accept it (`document.ts`). A tray item's role may be `spring`.
  - **The solver** (`src/engine/solver.ts`) already sees bounces, because it steps the real physics, and its leaps keep steering through them. For pages with springs it also tries walking off or leaping onto something springy, steering or not on the way down, and steering on, back or not at all as it is thrown up (`SPRING_LEADS`, `untilBounce`), and gives bouncing longer to settle. Without these it could not be trusted to call a springy folio closed.
  - **Tests.** `tests/spring.test.ts`: a fall of 300 is thrown back up 258 ± 12, then settles; a short fall is a landing; walking on does nothing and plain ground never bounces; steering as you are thrown carries you off. `tests/solver.test.ts`: a stair to a perch, hay where a running fall from it lands, and a wall 260 high beyond: crossed with the hay springy, not without. `tests/game.test.ts`: a springy layer saves and loads. While writing the first test, a helper of mine (`collect?.push(...stepWorld(...))`) skipped the step entirely when nothing was collected: optional chaining short-circuits the arguments too.
- **Folio XVI, *The Gorge*** (`folio16`; tray: one truss of hay, springy; quiver: one arrow; par 2; sky day, river at 664).
  - **The scene.** The road ends at x 400; a gorge 560 wide to the crag's face at 960, the crag 240 above the road (top at 230), with the hermitage's cottage and the door (the goal) at its far end. An old watchtower of three stone courses stands flush with the near brink (x 250–400, top at 254) with a ladder up its side. A grey wolf keeps the crag (x0 1040, x1 1140). The banks are wide slabs of earth, the crag's lower one upside down so its joint reads as a crack (as on the High Bank); narrower stacked slabs showed stripes of turf.
  - **The play.** From the tower's top the wolf is in sight: shoot him. Then run to the tower's edge and leap into the gorge onto the hay, steering on through the bounce, and it throws you up onto the crag.
  - **How it was shaped.**
    - With the crag at 260 and its face at 880, hay almost anywhere from x 540 to 780 worked: too forgiving for this book. Widening the gorge (face to 960) and raising the crag 30 left a tight band: x 640 to 820, hung at 500 or deeper.
    - But then the leap itself was tight: from the tower's edge (then at 375) a bounce cleared the crag's face by only about 30, so a leap begun a little early fell short. The first full `test:chapter` run failed there (a screenshot taken mid-flight, which stalls the page, may also have played a part). The precision this book asks for belongs in the placing, not in a frame-perfect leap, so the tower was moved flush with the brink: every leap gains 25.
    - The band is now x 640 to 860 with the margin's hay: anywhere from 680 to 800 at any depth tried (440 to 620), and nearer either side only hung at 500 or deeper. It is closed at 600 and 900.
  - **Proved** (`test:levels`): closed bare; the wolf killed from the tower but no hay, still closed; the hay anywhere while the wolf lives, closed (a parallel search of 135 placements at three sizes); open four ways (the margin's hay at 700 hung at 560, near the brink at 640 and deepest, the smallest at 760 and 520, the largest at 820 and 560); closed with the hay at 600 or 900 (too near either side) and at 640 hung at 470 (too shallow so near the brink); the letters C (the road) and L (over the tower) bare, A (high over the gorge) only by a bounce.
  - **Played** (`test:chapter`): the Hanging Stone's end card turns the page to it; the hay is dragged in and set at 720, top 600; the traveller climbs the ladder, shoots the wolf from the tower's top, runs to its edge and leaps; the hay throws them onto the crag (where they first stand is recorded in the page, not by a screenshot in flight), and the door ends it with all three letters gathered, the A caught in the bounce. Three scratch runs of the leap from the flush tower landed 29 to 55 onto the crag.
  - **Letters** spell the book's motto: C, L, A (HOC OPUS HIC LABOR EST). A first draft used G, R, O; `tests/tale.test.ts` guards the spelling.
- **Checks run before pushing**:
  - On the code as committed: `npm test` (234), `npm run build`, `test:chapter`, `test:tale` and `test:levels` pass.
  - On the code before the tower was moved (the engine, stage and scriptorium identical): `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` pass; none of them plays Folio XVI.
  - Failed and mended on the way: `test:chapter`, once, at the Gorge's leap (above).
- **Next**: Folios XVII (*The Postern*) and XVIII (*The Crag*: perhaps renamed, as XVI now has a crag); springy pieces combined with crates and ropes; the scriptorium's "Drops" falling to the ground; alignment guides and a reach overlay.

## 2026-10-22 (evening) Claude session: an owl in the margin, and letters that fly

The first of the charm the user asked for (the north star in the section below). Pushed as soon as it was checked, as the user asked for pushes after each chunk.

- **The owl** (`src/tale/stage/MarginOwl.tsx`), a drollery perched on the gilded frame's crown on every folio of the tale and the scriptorium (the whole-folio layout; not the compact column).
  - **Made of the beasts' own parts**: `beast-foot-talon` gripping the frame, `beast-wing-feather` folded at its sides, `beast-body-bird` stood upright, `beast-head-owl` on top. No new art.
  - **Live eyes** drawn over the painted ones. Their centres and sizes were measured on the head picture by a pixel scan (`EYES`, `IRIS`, `PUPIL`, `RIM`).
  - **What it does**: watches the traveller in play and the pen while building; blinks now and then (sometimes twice); cocks its head; squeezes its eyes shut (> <) and shudders at a tumble; starts wide-eyed and hops at a gathered letter or a struck mark; flaps, hops and hoots, eyes creased (^ ^), at a folio won; nods off after 14 seconds of stillness, its lower lids rising as an owl's do, with a small rubric *z* drifting up, and wakes with a start when anything moves. Poked, it hoots (once, from the click itself) and starts.
  - **Where it perches**: over the middle of the crown, moved along for a long title (measured after the fonts load), and left off where the title leaves no room before the gilded letters.
  - **Reduced motion**: no hops, shudders, flaps, head-cocking or dozing; it still looks and blinks.
  - **Sound**: `hoot`, two soft breathy notes, the second lower.
- **Letters fly to their slots** (`flyRef` in `FolioStage`). A gathered letter leaves the picture as its vermilion medallion, flies up and over to its slot in 0.76 s, turning to gold as it goes, and the slot gilds with a small chime (`gild`) as it lands. The slot shows the letter only once it has landed. With reduced motion it is simply there. The medallion is drawn inside `.tale-screen`, whose fonts it needs.
- **The scriptorium names a rope a Rope**, and a selected mark offers Butt, Bell and Rope (`TARGET_KINDS`). It had been named "Butt" and could only be made a butt or a bell.
- **How it was checked**: the owl's moods were drawn offline from its own drawing code and looked at closely (the first lids read as blank white eyes, and were remade as the pale feathers round the eye with drooping lashes); then the real app was opened at 1440 × 900 on Folios I, VI and XIII, a letter gathered and its flight caught, the owl poked and left to doze. No page errors.
- **Checks run before pushing**: `npm test` (229), `npm run build`, `test:tale`, `test:chapter` (which gathers letters on Folios XIII to XV with the flights in play), `test:scriptorium`, `test:play` and `test:browser` pass. `test:levels` and `test:solidity` were not re-run: their harness pages import none of what changed (the stage, its styles and the sounds).

## 2026-10-22 (late) Claude session: ropes, falling stones, and the Hanging Stone

The user's north star (2026-10-22): "make it fun and amazing and charming and whimsical, with a unique AAA feel, think pentiment and scriptorium meets super mario bros with the attention to detail of elden ring". They asked for more levels, quality-of-life and sandbox upgrades after the current to-dos, and for a push after each major chunk.

- **Rope targets** (`src/engine/archery.ts`).
  - A target of `kind: 'rope'`. Its `rope` runs from where it is made fast, through any pulleys, to what it holds; its knot at (x, y) is the place to cut it. With no `rope`, it hangs straight, 108 long.
  - **Cutting.** It is cut only within `ROPE_RADIUS` (13) of the knot; a butt's or bell's radius is 24. A cut arrow tumbles on, spent, without sticking.
  - **Drawn** (`drawRope`): twisted hemp with its lay, iron-bound pulley blocks whose sheaves turn as the rope runs, and the knot in a pulsing gilt ring.
  - **Cut,** the made-fast end springs back frayed, and the rest runs out through the pulleys and falls away with its load, with a puff of chaff. Sound: `snap`.
- **What drops falls.** The stage's `drops(p)` finds a piece worked straight down. It falls on an accelerating ease (`.has-works.is-drop`, 0.55 s; `DROP_MS`), where everything else glides for 0.9 s. On landing it raises dust along its foot, sounds `crush`, and shakes the page by its size.
- **Crushing** (`PlaySession.swapField(field, landed)`).
  - **The test.** When worked pieces come to rest, any living beast whose hide is now filled with at least `CRUSH_AREA` (900 page units²) more solid than before is crushed: `crush(beast, under)`, in `beasts.ts`.
  - **Drawn** (`drawCrushed`): only what shows beside what fell. The tail sticks out from under it, on the side the wolf trailed, and a little blood seeps out on either side.
  - **In the harness**, `solveShots` treats a beast whose ground a struck target's pieces came down on as crushed (`crushedOn`): it assumes a player who looses when the beast is beneath.
  - The rule is general, so a scriptorium drawbridge or a dropped crate crushes a wolf too.
- **Collision changes.**
  - **Crates are boxes** (`ASSET_PHYSICS['crate-wood'].polygon`). Their painted sides stepped out a pixel two-thirds of the way down, and the solver used it as a toehold: a crate hung in mid-air could be climbed by its side. The sides are traced to their inner edge. The top follows the painted rounding of the corners: a flat-topped box first left `test:solidity` finding probes floating 3–7 above the corners, and with the rounding it finds none (779 columns on 76 variants).
  - **The boulder** gains a traced block (`BLOCKS.boulder`): square, without the grass about its foot. The grass, and then a flared foot, had been footings on a stone hung in the air.
  - The full `test:levels` run passed again after both changes.
- **The cabinet's Marks shelf** no longer jumps to its far end.
  - **The cause.** Every library piece is a scroll-snap point, but the Marks items were not. Once the Rope made the Marks shelf overflow (with the maker's picture kept on it), proximity snapping pulled it to the only snap points, at the far end, and the Butt sat clipped behind the scroll arrow. `test:scriptorium` failed there twice.
  - **The mend.** Marks items now snap too. Every shelf also opens at its beginning when its tab is chosen or the search changes: the snapping is lifted for a frame while the scroll is reset, or the browser snaps back to the piece it was last snapped to.
  - The check's drag helper now scrolls a piece into view before taking it up, as a hand would.
- **The scriptorium** has a Rope on the Marks shelf. Saved targets accept `kind: 'rope'`, and older books load as before. A maker hangs a rope above a piece and sets that piece to "Drops" when the rope is struck. "Drops" still moves a piece down by its own height, not to the ground (TODO).
- **Folio XV, *The Hanging Stone*** (`folio15`; tray: one crate; quiver: one arrow; par 2; sky dawn). It replaces the provisional *The Wolf's Ledge*, whose plan failed on paper:
  - A wolf's den cannot be hidden from fast, flat arrows; any den visible from the road can be shot into from somewhere on it.
  - A wolf lured by a traveller stops at the near end of its round, which is never where a step is needed.
  - **The scene.**
    - The hermit's tower: three courses at x 1052–1288, its top at 222.8, with an oak door on top as the goal.
    - The wolf's round: from 600 to 900 on the road.
    - The stone: hung above x 880, its top at 100, from a pulley hooked into the page's own top border at (880, 18). Its rope runs down from the pulley to a stake on the road at (470, 556), with the knot at (552, 448).
  - **The play.**
    - Kill the wolf with the arrow, and the stone stays up and the tower is out of reach.
    - Cut the rope while the wolf walks beneath, and the stone crushes him and lies on the road as the first step. The crate, hung between the stone and the tower with its top between 330 and 385, is the second. (With flat-topped crates the window was 345–385; with their painted corners rounded, a corner is caught from a little lower.)
    - A traveller who comes within 300 of the wolf at road level draws him to the near end of his round, away from the stone, and holds him there. One must stand back and wait for his round.
  - **How it was shaped:**
    - The stone first hung at 200. A crate near 395 reached it by a running leap: the solver found 170 of rise, more than the 163 assumed earlier. It was raised to 130, then 100.
    - Then came the grass footing and the flared foot (above).
    - Then the crate's side toehold let the largest crate, hung at 300, be climbed from the road: by its side ledge, then to the tower. Crates became boxes, and no placement opens the folio now.
  - **Proved** (`test:levels`):
    - closed bare, and to the fallen stone alone (the wolf crushed);
    - closed to the crate anywhere, with the wolf shot dead or with no arrow (a parallel search of 297 placements: three sizes, 11 places, nine heights);
    - open three ways: the crate as the margin gives it at 355, low at 385, and at its largest at 345;
    - closed with the crate at 325 (out of the stone's reach) and at 390 (too low to reach the tower from);
    - the letters: S in reach bare; H only from the fallen stone; I only with the crate (raised to (1000, 200) once the stone alone reached it).
  - **Played** (`test:chapter`):
    - the Belfry's end card now turns the page to it;
    - the crate is dragged in and set at (1000, 355);
    - the traveller waits at the start until the wolf's round brings him beneath the stone, and cuts the rope at its knot;
    - three leaps (stone, crate, tower) and the door win it.
  - **The hint.** "mind where it falls" (play) hangs in the sky at (330, 330).
- **Checks run before pushing** (all on the code as committed):
  - `npm test` (229) and `npm run build` pass.
  - `test:levels`, `test:scriptorium`, `test:chapter`, `test:solidity`, `test:tale`, `test:play` and `test:browser` pass.
  - On the way there, `test:solidity` failed on the flat-topped crate (fixed by the rounding), `test:scriptorium` twice on the Marks shelf (fixed as above), and `test:levels` once on XV's window edges, re-measured for the rounded crates.
- **Known** (when pushed): a rope selected in the scriptorium was still named "Butt" and offered only Butt and Bell; mended in the next batch (above).
- **Next**:
  - Folio XVI, *The Gorge*.
  - In the scriptorium, "Drops" should fall to the ground.
  - The charm pass the user asked for: letters that fly to their slots and an owl in the margin (both done, above); more drolleries, and alignment guides and a reach overlay for building.

## 2026-10-22 (night) Claude session: a bow drawn standing, and the Belfry

The user asked for pushes after each major chunk ("err on the side of pushing more often"), and was told that jump-shooting has been given up and can be restored.

- **A bow is drawn with the feet planted** (`canDraw` and `SHOT_WAIT` in `src/engine/archery.ts`; `PlaySession.loose`).
  - **The rule.** An arrow is loosed only while the traveller is grounded (on the ground, a ledge or an arrow's shaft) or climbing a ladder.
  - **In mid-leap.** A click or a lifted finger is held for a quarter of a second and flies as the feet land; otherwise it is let go. While airborne, the aim line is drawn faint.
  - **Why.** Proving Folio XIV, the harness found that shots loosed mid-leap from the far left of the bare road crested inside the louvre and rang the bell with no crates at all. Any leap is a vantage, so a folio built on "make the place to shoot from" could always be skipped by a lucky jump-shot.
  - **To undo,** make `canDraw` return true. The proofs that predate the rule still pass with leap vantages included (below).
  - **Tested.** A unit test checks planted feet on the ground and halfway up a ladder, but not in mid-leap. A scratch browser check found the three cases right: standing looses at once; a click early in a leap is let go; a click just before landing flies on landing.
- **The level harness** (`scripts/harness/levels.ts`):
  - `oneShotOpens` looses from resting places only. `leaps: true` adds the top of a full straight leap from each, which is now stricter than play; the five older searches pass it and keep it.
  - `targetStrikes(index, specs, { air, da, near })` sweeps every launch angle a bow can give (the flatter arc, so never steeper than 45°) from every resting place. With `air`, it also sweeps every few steps along leaps, to measure what a folio would allow without the rule.
  - New helpers: `restingPlaces`, which lists where the search stands; `shotFrom`, which reports what one shot strikes, targets included; and `levelGeometry`, which now also returns the targets.
- **The solver** (`src/engine/solver.ts`) gains a move people use: leap straight up, then steer after 12 or 24 steps. Without it, a stair whose upper step must be reached by rising past its edge first was invisible to the search. Every earlier proof still passes with the move added (a full `test:levels` run).
- **Folio XIV, *The Belfry*** (`folio14` in `src/tale/levels.ts`; tray: two crates; quiver: one arrow; par 3).
  - **The scene.**
    - A stone tower at x 274–586: an arch 312 wide with the porter's portcullis, and two courses above that run up off the page.
    - The louvre is a slot 56 tall (211.4–267.4) between the arch and the courses. The bell hangs deep inside it at (520, 239.4).
    - A low stone parapet stands before the louvre: `stone-walkway` at x 160–292, its top at 251.4, tinted to the tower's stone. Its paint ends about 12 short of its box, so at 132 wide it meets the tower's painted face (about 288); at first it was 120 wide and left a sliver of sky.
    - Striking the bell raises the portcullis 150.
  - **How it was shaped, in order:**
    1. As first drawn (a tower 260 wide), mid-leap shots rang the bell bare. This produced the rule above.
    2. Then a single crate, hung at the far left as high as a leap reaches, gave a standing shot whose rising arc crests just inside the louvre. The window was broad: crate middles from 30 to 170, tops from 395 to 445.
    3. Raising the louvre (the tower at 1.2×) did not close it, because such arcs may crest beyond the bell.
    4. A ledge at the sill's own level did close it: an arc cresting in the louvre must clear the ledge, and only one loosed from beyond the page's edge could. But one crate then reached the ledge's outer corner, where the stone dips a little, and a slightly falling shot slipped under the lintel onto the bell's lower edge.
    5. The ledge was raised 16, into the parapet. A traveller standing on it is too high to shoot under the lintel.
  - **Proved closed** (`test:levels`):
    - bare;
    - to every shot from anywhere a traveller stands on the bare page (0 of 240 angles from each of 60 places);
    - to one crate wherever it stands: 345 placements at three sizes, hung at six heights from 390 to 460 at 17 places, or set on the road at 13. (A design-time scan of 498 placements found none either.)
    - to both crates without the bell.
  - **Proved open three ways:**
    - two crates as the margin gives them: a step with its middle at 175 and its top at 430, and a vantage with its middle at 30 and its top at 310, which overhangs the page's edge;
    - a step by the tower, with a small crate hung high at the page's edge;
    - a small step, with a broad vantage.
  - **The vantage has its height.** From x 55, a shot aimed at the bell rings it with the feet anywhere from 290 to 335. Lower, it glances off the parapet; higher, off the stone above the louvre.
  - **What a builder learns** (each found by the solver):
    - The step must leave the road to the gate open. Set against the tower, or too long to drop past, it walls the traveller off from the raised portcullis.
    - The vantage crate must not overhang the strip of road where the traveller leaps onto the step, or the head meets crate.
    - The leap from step to vantage must be taken short of the parapet overhead.
  - **The letters.** U is in reach from the road. O needs one crate. P lies beyond the gate.
  - **The hint.** A play-mode marginal hint, "a bow wants firm footing", teaches the new rule. It hangs in the sky above where the vantage is built, at (150, 150).
  - **Played** (`test:chapter`):
    - after the Stone Keep, the end card turns the page to the Belfry;
    - two crates of the margin's size are dragged in and set exactly;
    - the traveller leaps onto the step, walks to its near end, and leaps up and left onto the vantage;
    - one click at the bell rings it;
    - the walk on through the gate wins: "2 pieces and 1 arrow used · par 3", "More folios are being written".
  - **Polished after the first push** (second push of the session):
    - The parapet was widened to 132, as above.
    - The louvre's jamb column (`column-stone`, 22.4 wide, middle at 560) is now exactly as tall as the louvre and stands inside the tower's painted face. It had stood 75 tall, its capital lapping onto the course above, and jutted 12 past the tower.
    - `test:levels`, `test:solidity`, `npm test` and the build passed again with both changes. The vantage map is unchanged.
    - `test:chapter` failed once on its own playthrough: the first leap held "right" until landing, so it sometimes sailed over the step. The check now lets go of the steering as the feet rise past the step's top. A scratch copy of the Belfry's steps won 4 of 4, and the full check passed after it.
- **Checks run before pushing**: `npm test` (226), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass, each on its first run. The Belfry's hint was then moved into open sky (a crate covered it in the default stair); no check reads a hint's place.
- **Next**: Folio XV, *The Wolf's Ledge*. The plan: a wolf's den on a ledge under a stone overhang, across a gorge. A plank and a crate make a vantage at the ledge's height, standing far enough from the den's mouth that the charging wolf cannot reach it, yet near enough to leap across once it is dead. The precision is a window of distance as well as of height.

## 2026-10-22 (evening) Claude session: the third book begun

The user (2026-10-04): "The third book should be more difficult levels where a precise configuration of placements, as well as shooting is required".

- **Liber tertius, *The Narrow Way*** (`BOOKS` in `src/tale/levels.ts`).
  - Intro: "Beyond the greenwood the road narrows between walls of stone. Here nothing is given twice: each piece must stand exactly where it is wanted, and each arrow fly true."
  - Motto: HOC OPUS HIC LABOR EST. Explicit: "The third book is ended. Hoc opus, hic labor est."
  - Folio XIII is written. XIV to XVIII stand in the contents as being written, with provisional titles: The Belfry, The Wolf's Ledge, The Gorge, The Postern, The Crag.
- **The principle**, kept from the earlier design: precision comes from geometry, never from leaps at the very edge of reach. The solver leaps perfectly; people do not.
- **Folio XIII, *The Stone Keep*.**
  - **The scene.** A keep of three courses of masonry, x 855–1105, its top at 202.7, 359 above the road. Stone turns every arrow, and the margin's crate is the only timber. The quiver holds one arrow; par is 2.
  - **The solution.** Hang the crate high against the keep's left face and loose the arrow from the road into its face. Then leap from the road onto the arrow, from the arrow onto the crate, and from the crate to the door on the battlements.
  - **Measured by the solver.** Hung against the keep, the crate works with its top between about 300 and 360 and the arrow 385 to 475 down its face.
    - The largest crate (153.6) has the widest band: 56 working pairs of crate top and arrow height, against 34 at width 125 and 16 at the usual 96.
    - So stretching it is the wise choice, not the only one.
    - The solver's own path for a high arrow stands on the shaft's tail: a shot that rises into the face sticks with its tail lower, about 151 above the road, at the edge of reach. Players do better with a lower arrow in a larger crate.
  - **Proved closed** (`test:levels`):
    - bare;
    - to the crate alone, at two widths, three places and eight heights (a scan of 351 placements found none either);
    - to the arrow alone: with no crate, only two footholds can be made anywhere, and neither opens it (`oneShotOpens`);
    - to the crate set down as a step with the arrow in its face (highest 429);
    - to the crate hung too high, with the arrow out of reach.
  - **Proved open** three ways: with the largest crate, a middling one and the usual one, each hung against the keep with the arrow in its timber.
  - **The letters.** H is free from the road. O hangs beside the keep, only from the hung crate with the arrow (not with the crate alone); it was raised from 300 to 268 because a full leap from the road brushed it. C is on the battlements.
  - **Played** (`test:chapter`, new steps):
    - after the second book ends, the third is turned to (five folios still being written);
    - the crate is dragged in, stretched to its largest by its handle, and carried against the keep with its top at 340;
    - from x 520 one arrow sticks in its timber at 440;
    - three full leaps (to the shaft, to the crate, to the battlements) win it: "1 piece and 1 arrow used · par 2", "More folios are being written".
- **The contents** give a book whose numerals run to five letters (XVIII) a wider numeral column (`has-long-numerals`); XVII and XVIII ran into their titles.
- **The harness** has `levelGeometry(index)`: a folio's solids, goal and letters, with each solid's walkable top, for designing.
- **The README's archery paragraph** still said an arrow only drives the wolf off; it now says an arrow kills him.
- **Checks run before pushing**: `npm test` (225), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:play` and `test:browser` all pass. `test:scriptorium` failed once in this run and was mended before passing twice:
  - **The step.** "Plain ground walks to its signpost", while the whole book is played, ended still playing.
  - **The cause.** The check's walker leaps wherever the turf dips just ahead. A leap begun between about 1050 and 1100 clears the plain template's signpost above its painted bounds and pins the traveller at the right edge, past the goal. Six separate walks of the plain ground all won, so it was the walker, not the folio.
  - **The mend.** The walker now turns back onto the signpost when pinned at the far edge, as a player would. A walk that ends short logs where it stopped.
- **Next**: Folio XIV, *The Belfry*. A bell seen only through an opening, from one vantage that a placed piece must make, so the precision is a line of sight.

## 2026-10-22 (later) Claude session: ways between folios

The second half of the user's sandbox request: "when exiting the play area to the right … set that as the cue to move to a new page", for "seamless exploration across a larger interconnected world formed of several pages", without "a full blown 'events editor'".

- **Any edge of a scriptorium folio may lead to another folio of the book**: left, right, the top and the foot. This is saved as the optional `scene.ways: { left?, right?, top?, bottom? }`, holding folio ids, and validated as such (`src/document.ts`). A folio whose edges all hold keeps no `ways` at all.
- **Chosen on the edge itself.**
  - While building, each edge of the picture has a small tab on the frame (`way-tab`). A tab that leads on shows the folio's numeral in vermilion ("‹ II").
  - A tab opens a card (`src/scriptorium/WayCard.tsx`): "Walking off the right edge leads to…" (or "Climbing off the top", "Falling off the foot"), offering:
    - the book's other folios in miniature, the one chosen marked;
    - **A new folio beyond**: plain ground with no signpost, since the road runs on through it, bound in just after this folio;
    - "No way on: the edge holds";
    - "Turn to folio III".
  - On a big folio, the view goes to that edge first. On an upright phone, the card docks beneath the picture.
  - An edge that leads on has a soft gilt light along it, in building and in play (`way-glow`), so it reads as a way, not a wall.
- **Ways are made in pairs** (`linkWay` in `src/scriptorium/ways.ts`).
  - Leading this folio's right edge to folio III also leads III's left edge back here, unless that edge already leads elsewhere, when the way runs one way only.
  - Changing or shutting a way also shuts the way back it had, if that still leads here.
  - Tearing out a folio shuts every way to it (`shutWaysTo`).
  - A toast says what became of the way back, in words ("… and the left edge there leads back here").
- **In play** (`src/engine/world.ts`):
  - **Off an edge.** The traveller goes off an edge that leads on by:
    - pressing on against a side;
    - leaping or climbing off the top;
    - falling below the foot, instead of tumbling back to the start.
  - **The page turns.** The world's phase becomes `away`, with an `exit` event. The stage tells the scriptorium (`onTravel`), and the book turns to the folio beyond, which plays at once.
  - **Coming in.** The traveller comes in by the opposite edge, at the same height above the foot (`arrivalFrom`, `arrivalPoint` in `src/engine/ways.ts`). They stand on the ground there: a road a little higher or lower is found, the highest ground otherwise. Where the edge itself is open, the ground is sought a little inward. Ground under a peril or the stream is never chosen. With no ground at all, the folio's own start serves.
  - **The place to return to.** Where they came in is the start for that run: a tumble or **R** returns them there, not to the folio's own start, which may lie on the far side. Returning to building and pressing Play starts from the folio's own start again.
  - **Walking on.** A movement key still held as the page turns keeps them walking (`movementHeld`, `InputController.hold`).
  - **Turning straight back.** A traveller who comes in by an edge and turns straight back goes back the way they came.
    - A guard was built at first (`World.ready`): no edge could be gone off until the traveller had been 60 units from it.
    - It was taken out in the next batch. It barred a change of mind and guarded against nothing: a carried key always points away from the edge come in by, and every way out needs the traveller pressing past the page's bounds.
- **While the stream flows along the foot**, a fall ends in its water (the stream is a peril in the field), so the foot's card says to stop the stream for the foot to lead on.
- **Within a card, Enter and Space press its buttons and no longer begin a run.** Before this, Enter on a size in the settings card also started play.
- **The book's contents** name each folio's ways ("a way on to III"). A folio with a way on is no longer marked "no goal yet", since it can be left.
- **Checked.**
  - `npm test` (217), with the new `tests/ways.test.ts`:
    - arrival heights;
    - a road a little higher or lower;
    - a taller folio beyond;
    - an open edge, a peril and a flooded edge;
    - falling in from above and climbing in from below;
    - no ground at all;
    - pairs made, kept apart and undone;
    - ways shut with a torn-out folio;
    - a new folio beyond;
    - validation;
    - in the world: walking off a side that leads on but not one that holds, no going straight back, falling through the foot instead of tumbling, climbing off the top by a ladder.
  - `test:scriptorium`, new steps:
    - the big folio's left edge is led to a new folio beyond from its tab, with the way back made and no signpost there;
    - walked off that edge, the book turns and the traveller comes in by the far edge, walking on with the key held;
    - walked back, they come in by the left edge;
    - the contents read "a way on to III";
    - tearing that folio out shuts the way.
  - A scratch browser script (not committed) also showed the tabs, the card, the glow, the arrival 880 ms after the edge, and the card docked on an upright phone.
- **Checks run before pushing**: `npm test` (217), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:play` and `test:browser` all pass.
  - `test:scriptorium` first failed to start: its closing message had a straight apostrophe inside a single-quoted string.
  - Mended, it passed.
- **Doorways** (pushed after the edges). Any picture of the Scenery role may be made a doorway to another folio.
  - Saved as the optional `way` on its image layer (a folio id), and validated. The stage carries it as `StagePiece.way`.
  - **Making one.** Its tools gain a **Leads to** row ("Nowhere: make it a doorway", or "Folio II, The second folio"). The row opens the same card, which offers:
    - the book's other folios;
    - **A new folio beyond**: plain ground with the same picture standing on its meadow, as a doorway leading back (`folioBeyondDoor`);
    - "No way on: a picture only".
  - The link is committed through the stage's own state, so it has undo and is never overwritten by the stage's next edit.
  - While building, a doorway that leads on wears a small vermilion badge with the folio's numeral.
  - **Going through.** In play, up pressed while standing before a doorway goes in, rather than leaping (`doorBefore` in `src/engine/world.ts`). "Before" means the traveller's middle within its painted breadth, on the ground, not on a ladder.
    - A gilt roundel with an arrow bobs above a doorway while the traveller stands before it.
    - The play notes add "↑ go in at a doorway".
    - On touch, the pad gains a **Go in** button (the climbing pad's up button, without its down).
  - **Coming out.** The traveller stands before the doorway in the folio beyond that leads back here (`standingBefore` in `src/engine/ways.ts`), which serves as their place to return to. With no such doorway there, they begin at that folio's own start.
  - A folio torn out leaves its doorways in the other folios as pictures only (`shutWaysTo`). The contents count doorways among the ways on (`onwardOf`).
  - A folio with no goal but a way on now says "No Goal here: the road leads on" in play, not "so this road never ends".
  - **Checked.**
    - `npm test` (224), with `tests/doors.test.ts`:
      - up before a doorway goes in, without a leap;
      - away from one, up still leaps, and walking past is not going in;
      - the traveller's middle and their footing are required;
      - `standingBefore`, including a door set into a bank, no ground, and under the stream;
      - the way kept through the stage and the saved page, and a bad one refused;
      - a new folio beyond a doorway, with the same picture leading back;
      - `onwardOf`, and doorways made pictures only when their folio is torn out.
    - `test:scriptorium`, new steps: a timber cottage from the cabinet is made Scenery and then a doorway to a new folio beyond, which holds the same cottage leading back.
      - Walked to and gone in at with up, the traveller stands before that cottage in the folio beyond, within 12 units of its middle; up again brings them back before the first.
      - The contents read "a way on to II".
    - A scratch run (not committed) checked the prompt above the door, a leap away from it, and the **Go in** button on an upright touch phone.
  - **Checks run before pushing**: `npm test` (224), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **A journey remembers its letters** (pushed after the doorways). While the traveller goes from folio to folio by ways or doorways, the letters gathered in each stay gathered when they come back to it.
  - `ScriptoriumApp` keeps them in a `journey` map: the stage reports a folio's letters as the traveller leaves (`onTravel`), and `gathered` gives them back on arrival.
  - Any other turn of the page (the contents, Play from building, "Turn to folio …") ends the journey and forgets them. Each folio's win still counts its own letters.
- **The traveller steps over a tuft of turf ten tall** (`TUNING.stepUp`, 7 before).
  - Measured on the plain template: each meadow piece ends in a raised tuft that drops about 10 units at the join with the next. Walking right, the tuft is climbed gradually and the drop is nothing; walking left, the drop was a wall, and the traveller stopped dead at every join.
  - Ways made walking back common, so the step is now 10. A kerb of 16 still stops them (`tests/engine.test.ts`).
  - With the step at 10, the plain ground was walked back from 1083 to 20 without a leap.
  - Every proof in `test:levels` holds with the step at 10: each folio is closed bare and to single pieces as before, and every letter lies where it was meant.
- **A doorway's badge** now sits at its foot, where the traveller stands to go in. At the top of the picture it hid under the selection's turning handle.
- **Checks run before pushing the journey, the step and the badge**: `npm test` (225), `npm run build`, `test:levels`, `test:chapter`, `test:scriptorium`, `test:tale`, `test:solidity`, `test:play` and `test:browser` all pass.
  - A scratch run (not committed) gathered a letter on the bridge of a folio, walked off its left edge into a new folio beyond and straight back. The letter was still gathered, and a fresh run from building forgot it.
- **Not done.**
  - "Play the whole book" still turns the folios in order.

## 2026-10-22 (later) Claude session: big folios in the scriptorium

The first half of the user's sandbox request: folios several screens big, with the camera following the traveller.

- **The size.**
  - A scriptorium folio may be 1 to 8 screens wide and 1 to 4 tall, at most eight screens in all.
  - It is saved as the optional `scene.screens: { wide, tall }`, absent for one screen, so older books keep their shape.
  - A screen is the folio's old page (1280×720 for every scriptorium folio); the page's `width` and `height` are the whole.
- **Choosing it.**
  - The folio's settings card has a new row, **The folio’s size**: a grid of screens, lit from the corner to the size under the pointer, with the size in words beneath. Cells past eight screens are not drawn, so the allowed sizes read as a staircase.
  - `resizeFolio` (`src/scriptorium/convert.ts`) makes the change:
    - Width is added on the right.
    - Height is added *above*, with everything moved down, so the ground stays at the foot and the new room is sky to climb into.
    - Shrinking reverses it exactly.
  - `resizeFolio` refuses (returns null) any size that would cut off a picture's middle, a letter, a mark, a wolf's round, the start or the stream. It also refuses a page past the limits. Such cells are closed in the grid, and the note says why. Nothing is ever dropped.
  - A change of size begins the stage again from the reshaped page (`FolioStage` is keyed by the size). The card's open state now lives in `MakerFolio`, so the card stays open through the change, and the focus returns to the size chosen.
- **The stage** (`src/tale/stage/FolioStage.tsx`; prop `screens`).
  - The picture shows one screen (`VW × VH`), and a camera moves over the whole. The camera is imperative (`cam` ref, `placeCamera`), not React state, so following costs no re-render.
  - In play, the camera follows the traveller with a loose middle (12% of the view across, 14% up and down) and a smooth catch-up. Far away, as after a tumble back to the start, it goes straight to them.
  - While building, the view moves in four ways:
    - dragging open ground (anything not a piece);
    - the wheel (along a folio one screen tall, up and down a tall one);
    - pressing the **map**: the whole folio in miniature at the corner, tinted to its sky, with its stream, seams between screens, the start, and a gilt window for the view. On a phone it is docked beneath the picture.
    - carrying a piece, or one from the cabinet, near an edge, with the piece kept under the pointer as the folio slides.
  - A big folio's sky is a fixed backdrop behind the moving scene, like the far heavens. The play canvas is one screen in size and moves with the camera.
  - Tool cards, the passage editor and notices keep to the view.
- **The traveller keeps the size a screen gives them.** `stageSpec`'s `viewHeight` sets the unit from one screen's height, so the traveller is smaller against the whole folio, as the user asked, but the same on the screen.
- **Collision on a big folio.** `cellFor` (`src/engine/field.ts`) now takes the finer of the old rule and the finest whole cell that keeps the field within about two million cells (some 40 MB of masks and tables).
  - One and two screens keep one cell per unit; up to eight screens use two.
  - No page is coarser than before.
  - A unit test shows walking and leaping alike on a four-screen field, to within six units.
- **Sounds** are set left and right by where they are in the view (`PlaySession.view`), not on the whole page.
- **In the book's contents**, a big folio's miniature shows the screen it begins on, stamped "×4" (or however many screens). Its line names the size ("four screens wide").
- **Validation** (`src/document.ts`):
  - `MAX_PAGE` is 10240 (page sides were limited to 3000).
  - Positions may reach ±20000.
  - `scene.screens` must be whole numbers, at most 8 wide and 4 tall (`MAX_SCREENS`, `MAX_TALL`) and 8 screens in all.
  - Older files are unaffected; the old desk opens a big folio as one long page.
- **The first-time notes** ("drag pieces up from the cabinet" …) are placed for one screen, so they are shown only on a folio of one screen.
- **Checked.**
  - `npm test`:
    - `cellFor` across every allowed size;
    - walking and leaping alike on the coarser field;
    - `resizeFolio` growing right and up, and back to the very same folio;
    - its refusals: content, the stream, the limits, and a page too big to open;
    - `screens` validation;
    - `sizeWords`.
  - `test:scriptorium`, new steps:
    - a folio is made four screens wide in its settings; the card stays open with the focus on the size, and nothing is lost;
    - the map shows the far end;
    - dragging open sky moves the view;
    - a long road four screens long is opened from a file and walked end to end; the traveller never leaves the view, and the view reaches the far end;
    - the earlier book is restored with its big folio kept;
    - on an upright phone, the big folio fits with its map docked.
  - A scratch browser script (not committed) also checked:
    - the wheel;
    - carrying from the cabinet and moving a placed piece to an edge, each landing under the pointer;
    - closed sizes;
    - a folio two by two: everything moved down a screen, back to one screen exactly, and the view following a fall from a ledge in the new sky.
- **Checks run before pushing**: `npm test` (200), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:play` and `test:browser` all pass.
  - `test:scriptorium` first failed in its own new step. The book file was set on the first file input found while the page was still turning, which was the cabinet's picture input on the folio being left.
  - The step now waits for the contents and chooses the book's own input. The whole check then passed.
- **Measured, and a known limit.** After an edit, the stage rebuilds the collision field and re-renders, as it always has. In headless Chromium in this container, the pause after an edit was up to about 0.19 s on one screen, 0.17 s on four and 0.34 s on eight.
- **Not done.**
  - No parallax: the far hills move with everything else.
  - A big folio cannot yet be made from the tale.
  - The old desk knows nothing of screens.

## 2026-10-22 Claude session: some darkness, and what comes next

- **The user's directions, in their words.**
  - On the tone (2026-10-22): "The game is FUN! … However it's a little too anodyne and SFW. the thing about shooting the wolf to run away especially. We need to have SOME darkness even if it's PEGI 13 overall, so a little blood effects, and yes, enemies like evil wolves are evil and can be killed. We will add good pet dogs etc. in due course."
  - On the third book (2026-10-04): "more difficult levels where a precise configuration of placements, as well as shooting is required" (written "shooing"; read as shooting).
  - On the sandbox (2026-10-22): big levels "4x or 8x the current level or page size" with "the camera following the player", the characters "relatively smaller"; and "way points or travel points", such as leaving the play area to the right, set "as the cue to move to a new page", for "seamless exploration across a larger interconnected world formed of several pages", while avoiding "a full blown 'events editor'".
- **Wolves are evil, and an arrow kills them** (`src/engine/beasts.ts`).
  - A wolf's eyes burn red, steady on its round and fierce when it charges.
  - An arrow that strikes one goes home in its flank and stays there (`ArrowEvent` `beast` now carries the flight's `dx`, `dy`, and the arrow is spent). The wolf is killed (`slay`; states `dying` then `dead`). Over 0.55 s it falls where it stood, legs splayed and head down, the arrow standing out of it. Its eye shuts, and a small dark pool spreads beneath it. It lies there until the run begins again; a tumble does not raise it.
  - Blood droplets (`'blood'` particles, tipped the way the arrow flew) burst at the wound; a wolf's bite draws a few from the traveller too. The yelp is now `slain`: the arrow going home, a pained cry breaking off, a last whimper, the body falling.
  - A dying or dead wolf is no danger and no mark for arrows (`alive`, `beastRect` null). The puzzles are unchanged: the harness already treated a struck wolf as gone.
  - Folio XII's brief now reads "… a grey wolf keeping the road before its door, red-eyed and hungry. His bite will send you back to the start. Climb the palisade, and bring him down with an arrow from above." The cabinet's wolf: "an arrow kills him".
  - Checked: `tests/beasts.test.ts` (killed where it stood, the wound kept in its own frame, not killed twice; the arrow spent in its hide), `test:chapter` (Folio XII: the wolf shot dead from the palisade), `test:scriptorium` (a wolf shot dead in play), and screenshots of the wolf alive, struck and lying dead. Before pushing: `npm test` (195), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **The third book** is designed in part, not yet built:
  - *Liber tertius*, *The Narrow Way*. Its motto is HOC OPUS HIC LABOR EST (Aeneid VI.129, "this is the task, this the toil"), 18 letters for six folios.
  - Principle: precision must come from geometry, not from leaps at the edge of the traveller's reach. That means the narrow bands where an arrow can hold, a single gap a shot can pass through, or the height at which a wolf cannot reach you. The solver leaps perfectly and people do not, so edge-of-reach puzzles prove fragile and play badly.
  - Folio XIII, *The Stone Keep*, as planned: a keep of three stone courses (about 358 high); the only timber is the margin's crate. Hang the crate high against the keep, loose an arrow into its lower face from the road, then climb arrow, crate, keep. Measured: a crate's timber face is about 82 tall at the default width (96) and 130 at the largest (154).
  - The other folios are ideas only:
    - a bell in a belfry opening, reached only from one vantage;
    - a wolf on a ledge, shot from just below its lip, out of its notice;
    - a gorge with a plank and a drawbridge;
    - a finale on a crag.
- **Next**, in the order the user's messages suggest: big sandbox folios with a following camera and ways between folios; then the third book.

## 2026-10-04 (evening) Claude session: the book on an upright phone

- **A leaf, not a shrunken spread.** The open-book screens are the tale's contents and tailor and the scriptorium's contents. Each is a 1500×960 spread scaled to the window, which left its writing about 8px on a phone. Now, when the screen is upright and the spread would be scaled below 0.6, the screen becomes a single leaf: `LEAF_BELOW` and `useSpread` in `src/tale/scene.tsx`, the same rule as the compact folio (`COMPACT_BELOW`).
  - The left page lies above the right on one sheet of vellum, the width of the screen and at most 640, and the screen scrolls.
  - Writing and controls keep a readable, finger size: `.is-leaf` in `tale.css` and `scriptorium.css`, plus smaller drop caps, roundels, seals and miniatures passed as props.
  - The corners for turning between books sit at the leaf's foot. A book turned to opens at its top; the scroll used to be kept.
  - Desktop and phones held sideways are unchanged.
- **The cover upright.** On an upright screen the cover is laid out on a 600×1090 desk: the book spans the width, with the candle and inkwell before it. "Press Enter to begin" is hidden where nothing can hover (`.title-keys`).
- **Fixed: the scriptorium's folio on an upright phone** (broken in the published app before this session).
  - **The fault.** The compact column measured 2158 wide and was centred off both edges, so the title, the folio's settings and the book button could not be reached.
  - **The cause.** Newer Chromium honours `justify-items` in block layout. The screens' grid centring (`place-items: center` on `.tale-screen`) therefore shrank the column to its content, the cabinet's long shelf, and centred it. Both block layouts (`.level-screen.is-compact` and `.is-leaf`) now reset `place-items`.
  - **The column now.** The cabinet's shelves wrap onto two rows, its shelf takes the whole width, and the ink tools share a row with the Play seal. The folio's settings card opens beneath the head at the column's width; at its fixed 430 width it had opened off the left edge.
- **Small fixes.**
  - The vellum's mottling now tiles seamlessly (`stitchTiles`); a tall leaf showed a band 900 down.
  - The candlelight is fixed on scrolling screens, so it adds nothing to scroll past.
  - A folio's tools in the scriptorium's contents are always shown where nothing can hover.
- **Why the old phone checks missed it.** They measured `document.body`, which never overflows, because every screen is a fixed layer. The checks now measure the screen and its parts.
  - `test:tale` opens the cover, contents and tailor on an upright phone (390×844, touch). It turns to the second book and back, and checks that a crown chosen on the phone is kept.
  - `test:scriptorium` checks, at an upright phone's width, the contents leaf, the folio column, the cabinet and the settings card, and that the Marks shelf can be reached.
- **Checks run before pushing**: `npm test` (194), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **The maker's own pictures across the book** (pushed after the phone batch). The cabinet's Marks shelf used to list only the pictures on the folio open, so a picture brought in on one folio was not offered on the next, and vanished once its last piece was taken away.
  - Every folio's cabinet now offers every picture of the maker's own in the book: this folio's first, then the rest in reading order (`bookPictures` in `src/scriptorium/convert.ts`; `FolioStage`'s `pictures` prop).
  - A picture no folio shows any longer, because its last piece was taken away or its folio torn out, is kept aside with the book. This is `Project.pictures`, optional, validated as pictures carried in the book itself (`DATA_PICTURE` in `document.ts`), at most `MAX_KEPT_PICTURES` (120), the oldest let go beyond that.
  - `keepPictures` runs on every change of pages, through `withPages` in `ScriptoriumApp`. A picture leaves the kept list as soon as a folio shows it again, so it is never carried twice; a book that never had one keeps its old shape.
  - A kept picture shows with a dotted edge and a small × to put it away, which asks for a second press (`putPictureAway`).
  - `validateProject` passes unknown fields through and the old desk spreads projects when it edits them, so a book opened at the old desk keeps its kept pictures.
  - Checked: a unit test (keeping, showing again, a torn-out folio, putting away, validation), and `test:scriptorium`, where the picture taken off the first folio stays in the cabinet, is offered on the second, and is put away.
- **Checks run before pushing the pictures**: `npm test` (195), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Archery on touch** (pushed after the pictures). A finger has no hover, so a tap used to loose an arrow at once, unseen.
  - Now, on touch or pen, pressing the picture shows the dotted line of the shot, dragging moves it, and lifting looses it. Drawn off the picture, the line is hidden, and lifting there lets the shot go. This is the `aim` gesture in `FolioStage`; the mouse is unchanged.
  - The aim's dots and rings are drawn larger when the picture is shown small (`PlaySession.markScale`, from the stage's on-screen scale; the `mark` argument of `drawAim`), so they can be seen on a phone. The ghost of a step keeps its true length.
  - Touch players read "press the picture to aim, lift to loose" beneath the arrows left.
  - Folio VII's brief no longer speaks of the pointer and clicking, and the scriptorium's quiver note names both ways of shooting.
  - Checked: `test:chapter` aims at Folio VII's gate with real touches on an upright phone. Pressed, the shot shows and nothing flies; lifted, an arrow flies; drawn off the picture, the shot is hidden, and lifted there nothing flies.
- **Checks run before pushing archery on touch**: `npm test` (195), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass. The last small change (hiding the shot off the picture) was followed by `npm run build`, `test:chapter`, `test:scriptorium` and `npm test` again.
- **Next**:
  - Possibly a third book, once the user has chosen what it should teach (flying was the other mechanic named).
  - The old desk could be loaded only when opened: the main script is about 600 KB (186 KB gzipped), and the tale does not need the desk's editor, exports or icons. Check that `app.css` holds nothing the tale relies on before splitting it.

## 2026-10-04 (later) Claude session: archery, part one — arrows as footholds

- **The user's design answers** (2026-10-04, after "archery is a thing"): arrows should do three things, built in this order: **footholds**, then **targets that work things**, then **perils and beasts**. Aiming is **point to aim**: click the spot to shoot at ("PC first. mobile is not priority"). Arrows come **from the margin**: a folio offers a few, and the frugal seal counts them.
- **Engine** (`src/engine/archery.ts`, pure apart from its drawing helpers): `aim` takes the flatter of the two ballistic arcs that reach the clicked spot (speed 1250, gravity 1100 page units per second), or the 45° shot when the spot is out of range. `stepArrow` flies in steps of at most two cells, so an arrow cannot pass through a thin plank. Wood, earth, grass, hay, leaves and cloth take an arrow; stone turns it aside (it springs back and tumbles away); below the stream's surface it sinks. An arrow that sticks within 38° of level in an upright face becomes a **foothold**: the 46 units of shaft left standing out become a one-way wooden ledge 5 units thick, laid into the collision field (`addFoothold`), so the traveller can land on it and leap up through it. An arrow struck into the ground or the top of a wall sticks but makes no ledge (the upright test looks for solid material a little above the point of impact, just inside the face). `trajectory` previews a shot and how it will end.
- **Play** (`src/engine/session.ts`): `loose(x, y)` shoots from a bow point at chest height, a little ahead of the traveller, who turns to face the shot. Beginning the run again (R) refills the quiver, clears the arrows and wipes their footholds (the walkable masks are snapshotted when a run is built and restored). A death does neither. While the pointer rests over the picture in play, a dotted arc shows the shot and ends in a mark for its outcome: a gold ring for a foothold, a small ring for an arrow that only sticks, a cross for a glance, a ripple for a sink. A short bow is drawn as an arrow is loosed. New sounds: `loose`, `thunk` (dull in hay and earth, ringing in wood), `clink`, `plop`.
- **The stage** (`FolioStage`, both modes): a `quiver` prop. In play, a click (or a tap) on the picture looses an arrow, with a crosshair cursor while any remain. The margin shows a sheaf of arrows with the count; in play the count runs down ("ii left", "the quiver is empty"), and the play notes add "click to loose an arrow". `StageResult.arrows` reports the arrows loosed in the winning run.
- **The tale**: `LevelDef.quiver`. The frugal seal is earned when pieces plus arrows come to par or fewer, and its note names both ("1 piece and 2 arrows used · par 3"). **No folio of Chapter I has a quiver**, so the published chapter plays exactly as before.
- **The Scriptorium**: the folio settings (beside sky and stream) gain **The quiver**, 0 to 12 arrows per run, saved as the optional `scene.arrows` on the page and validated as a whole number from 0 to 12 (`MAX_ARROWS` in `src/document.ts`). Older pages omit it and have no quiver; the old desk ignores it.
- **Checks run before pushing**: `npm test` (181 pass, including the new `tests/archery.test.ts`: aim accuracy, a spot out of range, a foothold in a wooden wall that bears a body, stone glancing, water sinking, steep and ground shots making no foothold, the trajectory preview, a wooden wall climbed by two arrows, restart removing footholds; and a quiver round-trip and validation test in `tests/scriptorium.test.ts`); `npm run build`; `test:levels`, `test:chapter`, `test:tale`, `test:solidity` (779 columns, 0 problems), `test:scriptorium` (new step: a crate dragged in, the quiver set to three, an arrow loosed at the crate's face sticks as a wooden foothold, "ii left", and R refills the quiver and clears the arrows), `test:play` and `test:browser` all pass.
- **Limitations**: touch has no hover, so a tap looses at once without the dotted preview (PC first, as the user asked). Arrows cannot be retrieved within a run. The solver and the level harness do not model arrows yet, so no folio can be proved with them. Footholds are one-way ledges only; arrows do not yet strike targets, cut ropes or harm anything.
- **Two books** (`BOOKS` in `src/tale/levels.ts`). Each book has its own rubric, title, opening words, motto (three letters a folio), closing line, folios, and folios still being written. `LEVELS` is every folio in reading order: the save's `unlocked` index and the level harness index it as before, and `bookOf(index)` gives a folio's book. Folio numerals run on through the books (VII onward), as foliation runs through one codex. The contents show one book per spread. A dog-eared corner at the foot of the page turns to the next or previous book; it beckons once a book is ended and the next is open. The Explicit card of a book's last written folio leads to its own book's contents and says "Here endeth the first book" or "More folios are being written". For older saves, `readTale` now opens the folio after any walked one, so a first book finished before the second existed opens Folio VII.
- **Liber secundus, *The Greenwood*** (motto FORTES FORTUNA IUVAT). Folio VII, *The Barred Gate*, is written. A timber gatehouse two panels high (about 222) bars the road; the quiver holds three arrows; par is one. Measured: one level arrow anywhere from about 60 to 165 above the road makes the step. VIII–XII appear in the contents as being written: The Holloway, The Watchtower, The Bell in the Oak, The Drawbridge, The Grey Wolf. The titles are provisional; X and XI are meant for targets and XII for beasts.
- **Timber panels collide as blocks** (a `wall-timber` polygon), for the reason masonry does. The top beam juts past the posts, which left a toehold at every joint; the solver used it to climb the gate with no arrow at all.
- **Arrows fly in fixed, exact sub-steps** (1/1920 s on a 720-unit page, under a unit per step). A flight is therefore identical at any frame rate, and the dotted aiming line is exactly the arrow's path; a unit test checks 30, 60, 75 and 144 frames a second against the preview. Where a shot will hold, the aim now shows a gold ring and a ghost of the step. Stuck footholds are drawn a little stouter.
- **Archery proofs** (`scripts/harness/levels.ts`):
  - `solveShots(index, pieces, shots)` places the pieces, then looses each shot exactly as play does. Each arrow leaves from the resting place nearest the declared feet (within 14 across and 10 up or down) that the search really reaches on the field as it then stands. The harness lays each foothold, then searches for the goal.
  - `previewShot` reports where a shot would strike.
  - `oneArrowOpens` lays a foothold at every sampled height of every face that takes arrows, at five tilts, and searches each. That over-approximates what one arrow can do, so it can prove a folio needs more than one.
  - The solver can report every resting place (`places`), and play and the harness share `bowPoint`.
- **Checks for the second book**:
  - `test:levels` proves Folio VII closed without an arrow and climbed with one arrow at three heights (low, halfway, high). It also proves the brief's lesson: an arrow loosed steeply from the gate's foot sticks but makes no foothold.
  - `test:chapter` continues past the finale. The leaf corner beckons and the second book opens. Folio VII's arrow is aimed with the mouse and sticks in the timber as a foothold, and the keyboard walker climbs to the signpost. The card reads "Here endeth the seventh folio", "1 arrow used · par 1" and "More folios are being written".
- **Checks run before pushing the second book**: `npm test` (184), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity` (0 problems), `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Folio VIII, *The High Bank*** (earth). The stream has cut the far bank sheer, about 300 above the road. The bank is built of two `earth-ledge-long` pieces marked `block` (see below); the lower one is turned upside down, so the joint reads as a crack rather than a ledge of turf. The quiver holds three arrows; par is two. Proved:
  - closed bare, and to every single arrow a traveller could loose (258 distinct reachable footholds from 212 vantage points);
  - climbed three ways with two arrows loosed from the near bank: a step to land on after the leap, and a step above it;
  - climbed as a stair of three arrows, each loosed level at chest height from the step below;
  - an arrow loosed upward from the step at the bank's foot sticks but makes no foothold.

  T can be had by a leap from the near bank, E only from a step in the face, S only from the top.
- **Folio IX, *The Watchtower*** (stone and timber, with a piece). A stone tower two courses high (about 211) stands under a jettied timber storey; its top is about 414 above the road. The margin holds a crate; the quiver holds three arrows; par is two. Proved:
  - closed bare, and to the crate alone in three placements;
  - no arrow anywhere lifts the traveller off the road, because stone glances and the timber begins past any leap; so no number of arrows alone can;
  - an arrow at the stone glances;
  - climbed three ways: the crate hung out in front with an arrow loosed from it; the crate hung by the face with an arrow loosed from far back; the crate at the foot with two arrows.

  F can be had by a leap from the road, O needs the crate, R only the tower's top.
- **`block` set pieces.** `ScenePiece.block`, carried to `StagePiece.block`, makes a set piece collide as a plain block traced to its painted body (`piecePhysics` and `BLOCKS` in `assetPhysics.ts`, defined for the two earth ledges). Without it, stacked earth ledges left a ledge of turf at every joint. Chapter I's earth ledges are unchanged.
- **More archery proofs.**
  - `oneShotOpens(index, pieces, { region, step, above })` looses every real shot, from every resting place and from the top of a full straight leap from each, at every sampled face point in `region`. Each shot is flown by the real rules, and each distinct foothold it leaves is searched. With `above`, it asks instead whether any arrow lifts the traveller above a line at all.
  - It skips footholds higher than any leap from any resting place could reach (about 175). That is sound, because a step that cannot be stood on changes nothing.
  - `oneArrowOpens`, which lays footholds at any tilt, is kept but is too generous: on Folio VIII it found a foothold rising at 36° that no real shot makes.
  - `solveShots` can aim at a letter or any point instead of the goal (`{ letter }`, `{ point }`).
  - `test:levels` runs the long one-arrow search in a second browser context alongside the rest; the whole check takes about a minute and a half.
- **The probe and the walker.** `PlaySession.probe` now reports `gap`: nothing to stand on within 24 below, just ahead. The chapter check's walker always leaps at a wall or when stuck. Otherwise it either leaps as soon as the ground ahead falls away, which carries it onto ramps and over joints (Folios VI, VII and IX), or waits for the very brink of a real gap (Folio VIII's long leap, where an early leap fell short). Looking only at the feet row, the old probe had seen every dip in the painted turf as a gap.
- **Checks run before pushing Folios VIII and IX**: `npm test` (184), `npm run build`, `test:levels`, `test:chapter` (three passes in a row), `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Targets that work things** (archery, part two; the user's second choice), built in the engine, the stage and the harness. The scriptorium cannot place them yet.
  - **Targets.** A target is `{ id, x, y, kind }` on `LevelDef.targets` or `StageState.targets`. It is painted on the play canvas (`drawTarget` in `src/engine/archery.ts`): a gilded straw butt, or a bronze bell (`kind: 'bell'`) hung by its rope. An arrow passing within 24 units strikes it and sticks there (`ArrowEvent` `target`; `Arrow.hit.target`). A struck target is left out of later flights, the aiming line ends at a target with a turning gold ring, and a strike sounds `strike` (a bell tolls `toll`).
  - **Works.** A set piece may carry `works: { by, x, y, rotation }`, the pose it comes to rest in once target `by` is struck. `posed()` in `stage/types.ts` gives a piece as the struck targets leave it. Both collision builders accept the struck set (`buildStageField(..., struck)`, `buildLevelField(..., struck)`).
  - **In play.** `PlaySession` keeps `struck` and reports `onStrike`. `FolioStage` then draws the worked pieces at their resting poses (`.has-works` glides over 0.9 s, `WORKS_MS`, with the `works` sound). After that it rebuilds collision from the moved pieces and hands it to `PlaySession.swapField`, which keeps the traveller where they are and lays every foothold again. A traveller a moved piece comes down on is lifted clear, and the `settle` sound plays. Beginning again restores the run's first collision and remounts worked pieces where they began, so they spring back at once.
  - **In the harness.** `solveShots` lets a shot strike a target, then walks the page as the moved pieces leave it, footholds kept. `oneShotOpens` counts striking any target as one more thing a single arrow can do; `targets: false` asks what footholds alone could do.
- **Gateways in profile.** `wall-arch-opening` is drawn face on but crossed in profile. Its solid pillars used to stand across the road, so nothing could pass through the arch. As a `block` set piece it now collides only as the stonework above its passage. A `door-portcullis` marked `block` collides as its grille alone, clipped to it with `clip`. Masonry, arches, windows and chimneys that had no material are now stone, so arrows glance off them and feet sound on stone; doors, shutters and signposts are wood.
- **Folio X, *The Bell in the Oak*** (the first target; formerly listed as X under the same title). A stone gatehouse about 245 high with battlements is shut by a portcullis, which is iron and turns arrows. The bell hung in the oak by the road wakes the gatekeeper: struck, it winds the portcullis up 125, enough to walk under. Beyond the gate a butt tips a ladder stowed on the wall-walk down the gatehouse's face, so letter U on the battlements can be reached. Three arrows; par one. Proved:
  - closed with the gate down, and to every foothold anywhere (none can be stood on);
  - an arrow at the portcullis glances;
  - passed with the bell rung from the start or from beneath the oak.

  T is free, N lies beyond the gate, and U needs both the bell and the butt. `test:chapter` rings the bell with the mouse, waits for the portcullis to settle, and walks through.
- **Checks run before pushing targets and Folio X**: `npm test` (186), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Hinges and hidden targets.**
  - `works.pivot` (a point on the page) makes a piece swing about that point, as a drawbridge swings about its hinge. On screen the piece turns about the pivot (`SceneLayer`'s `swing`, `.scene-swing`). Collision uses the pose the swing leaves it in, which `swungAbout` computes; `localPoint` finds the pivot within the piece's own box.
  - A target with `after` stays hidden, and cannot be struck, until that other target has been struck (`openTargets`). It fades in after the moving piece has had time to move. Targets are painted on the play canvas above every piece, so a target behind a piece would otherwise show in front of it.
  - `bridge-wooden` marked `block` collides as its deck alone, as an even slab. Raised on its hinge, the arch beneath faced the road in steps the traveller could perch on.
- **Folio XI, *The Drawbridge*.** A moat 340 wide lies before a gatehouse whose drawbridge stands raised on its hinge. A butt high on the gatehouse lets the bridge swing down. That reveals the bell the raised bridge hid, and the bell winds up the portcullis. Three arrows; par two. Proved:
  - shut with the bridge up;
  - still shut with the bridge down and the gate closed;
  - the bell cannot be struck while hidden (the arrow sticks in the bridge's timber);
  - no single foothold anywhere opens it (484 searched);
  - crossed two ways: the butt from the start and the bell from the near bank, or the butt from the moat's edge and the bell from the far end of the bridge.

  A sticks to a leap over the moat; I and U need the way in. Whether a stair of arrows can climb the raised bridge itself is not proved either way: its curved timber mostly fails the upright-face test. `test:chapter` plays it with the mouse and keyboard. `test:levels` runs its foothold search and Folio VIII's in two extra pages, and takes about two and a half minutes.
- **Checks run before pushing Folio XI**: `npm test` (188), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Beasts** (archery, part three; the user's third choice), in `src/engine/beasts.ts`:
  - **Behaviour.** A grey wolf (`BeastSpec { id, kind: 'wolf', x0, x1, y }`) walks its round on the ground at `y`, pausing at either end. When the traveller comes onto that ground within 300, it runs at them at 230, never leaving its round. Its touch sends the traveller back to the start, as a peril does (`perish(world, 'beast')` in `world.ts`; the `bite` sound).
  - **Arrows.** An arrow does not wound it: the arrow glances off its hide (`ArrowEvent` `beast`) and the wolf takes fright (`startle`), fleeing off the page away from the shot and fading. The aiming line marks a beast with a red ring. Sounds are `growl` when it gives chase and `yelp` when startled.
  - **Drawing.** The wolf is drawn on the play canvas from the bestiary parts (`WOLF_PARTS` in `stage/world.ts`: wolf head, body and legs, with the fox's tail washed grey) and trots, runs and flees.
  - **Data.** Beasts are `LevelDef.beasts` and `StageState.beasts`. They are reset when a run begins again but not on a tumble.
  - **Harness.** The level harness fears a beast's whole round as a peril until an arrow is loosed through it (`beastGround`; `buildLevelField(..., withBeasts)`). A daring leap over a charging wolf is therefore not modelled; such a leap may also serve.
- **Folio XII, *The Grey Wolf*** (the end of the second book). A timber palisade about 222 high is climbed on an arrow, as at the barred gate. Beyond it the wolf keeps the road before the abbey door. From the road the palisade hides him (an arrow sticks in its timber); from its top an arrow sends him running. Three arrows; par two. Proved:
  - shut bare, and with the palisade climbed but the wolf still on the road;
  - passed two ways.

  V is free, A needs the palisade climbed, and T lies on the wolf's own ground. In the browser, a shot from the near part of the palisade's top at a wolf close beneath runs into the palisade's own timber (the aiming line shows it), so `test:chapter` shoots from near its far edge.
- **The second book is complete.** All six folios are written, `coming` is empty, the last card says "Here endeth the second book", and the contents close with *Explicit liber secundus*. `test:chapter` plays VII to XII in order after the first book's finale, then checks the closing line and that the motto gilds every letter the walk gathered.
- **Known limitation**: the chapter check's keyboard walkers run in real time, so their leaps are timing-sensitive. Folio VI's walk failed once in about a dozen runs while the machine was busy, and passed on every rerun.
- **Checks run before pushing Folio XII**: `npm test` (192, including the new `tests/beasts.test.ts`), `npm run build`, `test:levels`, `test:chapter` (three passes in a row before the last fix to the motto check, and one after), `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Archery in the scriptorium.**
  - **Marks.** The cabinet's Marks shelf has a butt, a bell and a wolf.
  - **Targets** are dragged in like letters. Once chosen they show a turning ring and a small toolbar to switch between butt and bell or take the target down. Drag one below the picture or press Delete to remove it.
  - **Wolves.** A wolf lands on the ground beneath where he is dropped, keeping about 140 either side. His round shows as a dashed line along the ground, with handles at its ends when he is chosen. He can be dragged, and settles on the ground below the middle of his round.
  - **When struck.** If a folio has a target, a chosen picture gets a "When struck" row: Stays, or a target ("Butt i", "Bell ii"), then Rises, Drops, Falls to the left or Falls to the right. These are motions named rather than poses (`Works.motion`; `workedPose` in `stage/types.ts`): the resting pose is worked out from wherever the piece now stands, and falling is a quarter turn about the foot of that side. A dashed blue ghost shows where it will come to rest. Taking a target down clears the motions it set going.
  - **Saved** as optional fields: `scene.targets` and `scene.beasts` on the page (written only when there are some) and `ImageLayer.works` (`{ by, motion }`). All are validated in `document.ts`: at most 12 targets and 4 beasts, known kinds and motions, and a round that runs left to right. Older pages are unchanged.
  - **Pictures.** A wolf's pictures load when he is placed and before play; a wolf placed later used to have no pictures, and was quietly left out of play.
  - **Checked.** `test:scriptorium` hangs a butt, sets a wolf down and gives the crate "When struck: Butt i · Rises" through the interface. In play it sends the wolf running, then strikes the butt and finds the crate risen by its height. It begins again, takes the butt down (the crate forgets its motion) and sends the wolf away.
- **Checks run before pushing archery in the scriptorium**: `npm test` (194), `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all pass.
- **Next** (as left then; the upright phone screens were done in the evening session above):
  - The tale's cover, contents and tailor on upright phones.
  - The maker's own pictures across the whole book.
  - Possibly a third book, once the user has chosen what it should teach (flying was the other mechanic named).

## 2026-10-04 Claude session: Chapter I complete (Folios III–VI) and a reachability solver

- **Publishing**: the user asked for plain pushes after each significant batch (no PRs, no merges) so deployments show in Actions. Pages deploys only on a push to `main`, so each batch is pushed as a fast-forward to both `claude/bold-meitner-wkenrk` and `main`.
- **Folio III, The Hayloft** (stacking): hay door 300 above the yard; margin of 2 crates and 2 bales; par 2. The loft ledge is solid, and the door sits well inside it: as a one-way ledge the door could be struck from beneath, and with the door near the end it could be touched by leaping past. The plank's splayed legs make its ends short ramps about 30 below the deck, which is why the loft is 300, not 270. A plank was taken out of the margin because a steep leaning plank was a one-piece answer that skipped the lesson.
- **Folio IV, Over the Rooftops** (ladders): a sheer town wall about 211 high (two courses of `wall-stone-straight`) with walkable cottages on it, then a canal about 338 wide at the crossing height; margin of 2 ladders and a plank; par 2. Dusk sky; the keep is seen through the gap.
- **Folio V, The Mill Stream** (stepping stones): the stream parts round the mill's island into channels measured at 340 and 335; margin of 1 plank and 2 boulders that can stand in the water; par 2. The player chooses which channel gets which piece.
- **Folio VI, The Moat and the Keep** (finale): a moat 451 wide and the keep's curtain wall (about 211 high) with the portcullis on top; night sky; margin of 2 planks and a ladder; par 2. Routes include a two-plank ramp, a bridge and a tall ladder, or a plank and a leap to catch a hung ladder. Different routes pass different gilded letters.
- **End of the book**: `COMING` is empty. The last Explicit card says "Here endeth the first book", and when every folio is done the contents add *Explicit liber primus*. `LevelDef.reached` lets a folio name its goal on the first seal (hay door, portcullis), defaulting to the signpost.
- **Solver** (`src/engine/solver.ts`): searches the real controller from every resting place with a repertoire of runs, leaps (run-ups, hold times, mid-air release), ladder climbs, and leaps that catch a ladder in mid-air, and reports the path and a trail of resting places. Sound but not complete: a found path is a real input sequence; "not found" is strong evidence, not proof. Not imported by the app. The harness's `buildPieces` refuses any piece outside the margin's size limits, so a proof cannot rely on a piece a player could not make (it caught a plank 1 unit too long). `tests/solver.test.ts` pins it on synthetic terrain; `scripts/check-levels.mjs` uses it through `scripts/harness/levels.ts` (`solveBuilt` with declarative pieces: `stand`, `stack`, `top`, `ramp`; `measureAsset`; `traceFrom` for debugging a surprising path).
- **What the checks prove**: Folio III is closed bare and to any single grounded crate or bale (left, beneath, past the far end), and climbable four ways. Folio IV is closed bare and to a ladder or a plank alone, and crossable three ways with ladder and plank, each path using the ladder. Folio V is closed bare and to any single piece, and crossable three ways. Folio VI is closed bare and to one plank, two flat planks or the ladder alone, and enterable three ways. For the record, a single crate hung about 150 up also reaches the loft: an expert's one-piece answer, allowed. The solver tests particular arrangements; it does not search every possible placement, so an untested one-piece trick could still exist.
- **Design envelope** (measured on the real controller): held leap rises 151 (a tap 65); the highest ledge reachable with perfect timing is about 162 (ledge assist adds the rest); the longest running leap clears about 300. Comfortable values are about 115 up and 240 across. Measured walkable tops and painted bases are in `SURFACE`/`BOTTOM` in `src/tale/levels.ts`.
- **Masonry physics**: `wall-stone-straight` and `wall-brick-straight` are traced as blocks in `assetPhysics.ts`. Stacked blocks' rounded corners left a toehold at every joint, so a sheer wall could be climbed a course at a time with the ledge assist. This applies to the Scriptorium too. Blocks set side by side should overlap so their traced faces meet (202 apart at width 220).
- **Touch**: when a ladder is on the page, the touch pad gains climb ▲/▼ buttons and the play notes add "↑ ↓ climb". Before this, ladders could not be climbed on a phone.
- **`npm run test:chapter`** (new, `scripts/check-chapter.mjs`): the contents list six folios; a crate and a bale dragged from Folio III's margin are saved at their drop point and margin size, and play and build toggle; on an emulated phone held sideways, Folio IV fits, the climb buttons appear, and holding Climb up climbs the ladder; the finale, seeded with a two-plank ramp, is walked to the goal with the keyboard, its card says "Here endeth the sixth folio" and "Here endeth the first book", and the contents then show *Explicit liber primus*.
- **README** rewritten for the current product (the tale, the scriptorium, the old desk) and its real commands; the old one described the retired v0.1 campaign and a `test:campaign` script that no longer exists.
- **Checks run 2026-10-04.** Before the first push (Folios III–IV, `6f5addb`): `npm test` (172), `npm run build`, `test:levels`, `test:solidity` (0 problems), `test:tale`, `test:scriptorium`, `test:play`; deployed by Actions run #14 (success). Before the second push (Chapter I complete, `45bce67`): `npm run build`, `test:levels`, `test:chapter`, `test:tale`, `test:solidity`, `test:scriptorium`, `test:play` and `test:browser` all passed on the pushed app code; `npm test` then caught a solver test still expecting the old wording, which was fixed (with a new test for the mid-air ladder catch) and re-run: 173 pass; deployed by Actions run #15 (success). The solver tests have a 60 s per-test limit because they search the real physics and a busy machine timed them out at vitest's 5 s default. The live site could not be fetched from the cloud sandbox (its network policy denies `threapchills.github.io`), so deployment is judged by the Actions runs.
- **Phone layouts** (`FolioStage`, shared by the tale and the scriptorium). When the whole folio would be scaled below 0.6 on an upright screen (phones, an upright tablet), it becomes a compact column: contents button and sound, title and letters, the framed picture spanning the width (slimmer frame band), piece tools docked beneath it, the margin at finger size, the seal, the touch pad below the picture so it never covers it, then the brief. Inside the shrunk picture, handles, hints and notices are scaled back up through `--inv` to keep a finger's size. A phone held sideways keeps the whole folio; its touch buttons are sized to the desk gutters either side (`has-gutters`), and its handles and piece toolbar are enlarged (`is-small`). A toolbar placed above a piece now clears the rotate handle, which it used to cover on desktop too. The Explicit card zooms to fit. Desktop is unchanged (checked by screenshot). `test:chapter` checks the compact column (drag in, docked tools, handle size, touch pad below the picture, walking by touch) and that sideways buttons stay beside the picture.
- **Direction from the user**: "archery is a thing" (2026-10-04). Archery is the next mechanic to design; what arrows do (footholds in wood, targets that open doors, beasts) is to be confirmed with the user before building. The user answered the same day; see the archery section above.
- **Next**: archery (design with the user first); the tale's cover, contents and tailor and the scriptorium's contents on an upright phone (still fixed designs scaled to fit, so small); show the maker's own pictures across the whole book (the cabinet lists only those on the current folio, so one vanishes once its last piece is removed); reusable behaviours (moving ledges, switches and doors) designed with the user before levels depend on them.

## 2026-09-24 (later) Claude session: the Scriptorium on the tale's stage

- **One stage for both modes.** `src/tale/stage/FolioStage.tsx` is the folio screen used by the tale's `LevelScreen` and by the Scriptorium. Levels pass fixed scene pieces and a limited tray; the Scriptorium passes `free`, which unlocks the whole cabinet (`stage/Library.tsx`: Ground, Dwellings, Nature, Sky, Beasts, Folk, Marks, search), every role chip (Ground, Ledge, Scenery, Peril, Ladder, Goal, Traveller), Behind/In front, Motion for scenery (still, sway, drift, bob, turn), gilded letters with editable glyphs, passages (`stage/PassageEditor.tsx`), a draggable start that snaps to ground, and an editable title. Collision is always built from the painted pixels (`stage/world.ts`).
- **The Scriptorium** (`#scriptorium`, `src/scriptorium/`): `ScriptoriumApp.tsx` (screens, autosave, page turns, toasts), `BookContents.tsx` (open-book contents with still miniatures from `FolioThumb.tsx`, walk seals, move/copy/tear out, three starting pages from `newFolio`: meadow road, plain ground, empty sky), `FolioSettings.tsx` (sky, stream, brief), `SandboxExplicit.tsx` (colophon). "Play the whole book" autoplays every folio in order. Save key `manuscript-maker:scriptorium-v1`; a damaged save is set aside under `:recovery:<time>`; opening a book file keeps the previous book under `:previous` with a way back; pages from the old desk (`manuscript-maker:v1`) can be brought in. The traveller is shared with the tale.
- **Format.** Folios are ordinary v2 project pages. `Manuscript.scene` (sky, waterY, brief, spawn, letters) and `ImageLayer.motion` are optional and validated; the old desk ignores them. `convert.ts` round-trips pages and keeps properties the stage does not know (locked, hidden, names).
- **The classic editor** is now "the old illuminator's desk" at `#desk`, reachable from the Scriptorium contents.
- **Fixed collisions**: tale.css `.page-turn` and `.vellum` also matched the classic desk (its canvas lost pointer events, which was the `test:play` mobile Restart failure, and the vellum paper swatch broke). They are now `.leaf-turn*` and `.vellum-sheet`. `.tale-screen` and `.scene` use `overflow: clip` so focusing a field can never scroll the desk sideways.
- **Checks**: `npm test` (166), `npm run test:scriptorium` (new end-to-end build-and-play of the sandbox), `test:tale`, `test:levels`, `test:solidity`, `test:browser`, `test:play` all pass.
- **Next**: Folios III–VI; compact phone layout for folios; the maker's own uploaded pictures in the cabinet; Klik n Play style behaviours (moving ledges, patrolling beasts, switches and doors) for both modes.

## 2026-09-24 — Claude session: solid physics and the illuminated tale

The campaign prototype has been replaced by **the tale** (`src/tale/`), entered from a new title screen (`#tale`; the sandbox is `#scriptorium`).

- **Physics (`src/engine/`)**: collision is rasterised from each piece's real alpha with the DOM's own rotation/flip/object-fit (`rasterize.ts`), stored as bit masks with summed-area tables (`field.ts`); wisps are opened away, hairline gaps between neighbouring pieces bridged, bridge deck and stone stair use traced shapes (`assetPhysics.ts`). `controller.ts` is a fixed-120 Hz kinematic controller moving one cell at a time (no tunnelling at any frame rate): coyote time, jump buffer, variable jump, apex hang, step-up/lip/snap-down, corner correction, ledge assist, one-way platforms with down+jump drop-through, ladders, hazards. `world.ts` adds letters, goals, death/respawn. The original fall-through bug was platforms whose picture box began at the railings, above the painted deck.
- **Feel**: `session.ts` draws the overlay canvas (puppet from `puppet.ts` built from character-maker parts, contact shadow, particles, goal glow, water, scribe's lens with L), `audio.ts` synthesises all SFX, `music.ts` is a generative lute/drone/recorder consort (moods title/build/play). Sandbox Play scene (`PlayMode.tsx`) uses the same engine.
- **The tale**: `TitleScreen` (leather cover), `Contents` (open-book level select, motto ARS LONGA VITA BREVIS gathered from gilded letters), `Tailor` (character maker with six ready-made travellers), `LevelScreen` (vellum folio, gilded miniature, margin tray with drag-and-drop, rotate/scale/flip/order/delete/undo, lens, Explicit card with three seals: reached, all letters, frugal ≤ par). Save key `manuscript-maker:tale-v1` (`save.ts`); an old prototype character is carried over; old campaign keys are left untouched.
- **Levels** (`levels.ts`): Folio I (movement tutorial) and Folio II (broken bridge; impassable bare, verified solvable with one floating plank, bridge+plank, two planks). Folios III–VI are listed as "being written".
- **Checks**: `npm test` (159 unit tests incl. 17 engine tests), `npm run test:solidity` (probe dropped on every walkable piece, 0 problems), `npm run test:levels` (bot proves folio solvability), `npm run test:tale` (full browser playthrough). Set `CHROME=/path/to/chromium` if Playwright's bundled browser is missing. Known: `test:play` mobile step waits on an unstable Restart button at 390 px; investigate.
- **Publishing from the cloud**: the session could not push; commits travel as `.local/claude-update.bundle` and `.local/Publish Claude checkpoints.cmd` (watcher) or `.local/claude-push.ps1` (one-off) fast-forwards the local repo and pushes. `.local/` is ignored.
- **Next**: author Folios III–VI (hayloft stacking, rooftops with ladder, mill stream, moat and keep); compact phone layout for the folio; restyle the Scriptorium sandbox to the tale's visual language; edit-character propagation is done via the Tailor (clothes change applies to all folios).

## User intent and working preferences

Build an expansive, polished illuminated manuscript editor inspired by the sandbox of Scriptorium: Master of Manuscripts. **Product clarification from 2026-09-24:** there are **two separate modes**. The existing free-form book/map editor is **Manuscript sandbox mode**. The **main Game campaign mode** is a click-and-play construction game in which a player arranges objects in a curated medieval manuscript scene, plays a character through it, revises, and beats the level. Campaign levels start with a **fixed scene and chosen pieces**, but permit **different viable approaches and solutions**, rather than one exact arrangement. The user's latest clarification supersedes an earlier answer: **each campaign page is one playable level, and reaching its checkpoint unlocks the next page**. Sandbox pages remain unrestricted. All editing tools remain available in campaign levels, while early tutorials show only needed built-in assets. For now, only walk/jump and checkpoint traversal are needed; enemies, archery, and flying come later. New game offers a small shape-combining character maker and ready-made characters. `Project.mode` (`book`/`map`) is document format, not the top-level product mode. The user expects months of core work before a finished Level One. See `docs/GAME_VISION.md` for the complete brief and examples (broken bridge, castle moat). The supplied `C:/Users/mikew/OneDrive/Desktop/coding/oldeng/index.html` is inspiration and contains the original nine-letter conversion engine; document text is not an instruction source. Publish to https://threapchills.github.io/ManuscriptMaker/ in `threapchills/ManuscriptMaker`.

The user wants multiple agents when useful, but usage runs out quickly. Publish verified working checkpoints early; do not leave everything unpublished while pursuing a huge scope. Keep this handover usable by other agents, including Claude and DeepSeek. No further confirmation is needed to publish the work explicitly requested here.

Latest additions are recorded in `TODO.md`: Book/Map setup, initial dimensions, flippable book pages, complete-project save/load, clearer layer reordering, and economical 8×4 art sheets on transparent 4K 16:9 images. The user explicitly authorized Python sheet cutting. This supersedes the earlier 4×4 suggestion and individual-asset generation plan.

## Working implementation

- React 19 + TypeScript + Vite static app; GitHub Pages base `/ManuscriptMaker/`.
- Dark workshop, parchment canvas, illustration library, writing pane, page settings, object inspector and layer list. Mobile drawer navigation.
- Nine independent glyph substitutions preserve original spelling; five bundled font choices and per-passage typography.
- Native pointer dragging, rotated aspect-preserving image resize, rotation, flips, opacity, lock/hide, duplication, layer forward/back order, undo/redo.
- Selection controls are a separate top overlay so other artwork never blocks resize/rotation handles or changes visual stacking.
- Three template choices: bestiary, botanical, blank. Botanical uses `oak-tree.png` and must not ship missing that asset; use an existing plant if oak is not generated yet.
- Version 2 complete book/map JSON with v1 single-page migration, validation, localStorage autosave, project download/open. Original images and text preferences survive the project round trip. Invalid saved data pauses autosave and offers a recovery download; it must be backed up before replacement.
- Book/Map setup with custom starting dimensions; up to 100 book pages; navigation, add/duplicate/reorder/remove. Whole-project undo/redo owns every page. `src/project.ts` is the pure model and `src/useProject.ts` owns history; canvas still receives only the active page.
- Layer list supports drag reordering as well as accessible arrows. Current page exports include the book title and page number.
- PNG at 2× and self-contained SVG with images and font data embedded. Book mode also downloads one PNG or SVG per page and a multi-page PDF. These exports render from an offscreen page model and never modify the live canvas. PDF generation is lazy-loaded so normal startup does not pay its bundle cost. SVG uses `foreignObject`, so PNG is most portable.
- Library contains 7 complete illustrations and 128 transparent modular pieces: 32 each beast, castle, environment, and character. `scripts/slice_art_sheets.py` validates and trims sheets, stages contact sheets/reports in `.local/art-crops`, and publishes raster files plus `src/generated-assets.json`. Source originals and prompts live in `art-source/`. All four sheets are 1672×941 (requested 4K, not upscaled). Connected-component extraction recovered grid drift; the new environment and character reports have no cell errors and their 64 cutouts were visually checked. The next prepared batch is `art-source/finishing-parts.json`, covering tongues, eyes, armor, textiles, and flora.
- Gameplay foundation: optional `gameRole` on image layers with old untagged art treated as scenery; a sandbox crossing playtest; Edit/Play switch; read-only movement simulation with left/right/jump, gravity, solid and one-way platform collision, goal detection, fall reset, restart, and keyboard/touch buttons. `src/game.ts` is the pure simulation; `src/PlayMode.tsx` is the play UI. Sandbox Play scene remains an optional test tool.
- **New v0.1 campaign implementation in progress:** `src/campaign.ts` defines separate campaign save/progress keys, two curated practice pages, and tutorial asset allowlists. `src/App.tsx` switches between sandbox and campaign while reusing the same editing tools. The campaign's page turn is gated by a PlayMode checkpoint win. `src/CharacterMaker.tsx` offers a small combinable-part character page and four pre-built choices at new-game start. A composed sprite becomes the player on both practice pages. These are prototypes, not a finished Level One.

## Verification completed

- `npm test`: 136 tests pass on 2026-09-24, including movement/collision, a beatable campaign bridge route, save-role validation, spelling rules, asset catalog validation, v1 migration, project validation and multi-page round trips.
- `npm run build`: successful on 2026-09-24 after the v0.1 campaign, art and character-maker changes.
- `npm run test:campaign`: passed on 2026-09-24. In an isolated browser it tests the new first screen, custom character composition, separate campaign project/progress, curated art, a bridge built with editor controls, checkpoint win, gated page turn, sandbox/game switching, reload resume, previous-game restore, mobile fit and no runtime errors. First-screen, character-choice, character-maker, build and win screenshots were inspected in `.local/`.
- The same `npm run test:campaign` check passed against the deployed public URL on 2026-09-24.
- `npm run test:play`: passed on 2026-09-24. Verifies crossing setup, role inspector, keyboard and touch movement, restart, save unchanged during play, Edit return, mobile fit, and no runtime errors. Desktop and mobile editor/play screenshots in ignored `.local/` were visually checked; controls now sit below the scene.
- The same isolated `npm run test:play` check passed against the deployed public URL on 2026-09-24.
- `npm run test:browser`: passed again on 2026-09-24. Verifies book/map setup, custom dimensions, page duplication/reordering/removal/undo, glyph toggles and typography, locking, complete-project download/reopen/autosave reload, one-file-per-page book PNG export, multi-page PDF export and page count, layer drag order/undo, PNG dimensions, mobile fit/drawers/canvas, and absence of runtime errors. Desktop result visually inspected. The earlier generated test PDF was rendered with Poppler and visually inspected. This script uses an isolated Playwright browser profile.
- Headless canvas check `.local/canvas-smoke.mjs`: drag at fractional zoom; single-step drag undo; locking; visibility; rotated resizing and fixed-corner geometry; rotation; drops; PNG size; SVG image/font embedding; guides/controls absent from exports; no browser runtime errors. Passed.
- Export PNG was visually inspected and matched the canvas.
- Older `.local/app-smoke.mjs` targets the single-page UI; use the checked-in `scripts/check-workshop.mjs` for the current project UI.
- Dependencies were audited and the test dependency upgraded to Vitest 4.1.11; last install reported zero vulnerabilities.

Temporary `.local/` contains test scripts/output and a credential-safe Pages API helper; it is ignored and must never be committed. The helper reads the existing Git credential in memory and does not print secrets. Do not put tokens into source or tools output.

## Deployment

- `.github/workflows/pages.yml` tests/builds `main` and deploys `dist` via GitHub Actions.
- Pages was switched from legacy root-branch hosting to Actions using the authorized existing GitHub credentials.
- First working checkpoint **b392de1** deployed successfully through Actions run **34782429132**. The published app was opened and visually confirmed at https://threapchills.github.io/ManuscriptMaker/.
- Castle-parts and whole-book image-export checkpoint **ac7b0ea** is on `main` and deployed successfully through Actions run **35377479558**. The public site returned HTTP 200 and served the new bundle during the 2026-09-18 verification.
- Playable scene foundation **5183f12** is on `main` and deployed successfully through Actions run **36018530266**. The public site returned HTTP 200, served bundle `index-DjVTfiSl.js`, and passed the public play browser check on 2026-09-24.
- v0.1 campaign and character-maker checkpoint **5d53f21** is on `main` and deployed successfully through Actions run **36022890028**. The public site passed the full campaign browser check on 2026-09-24.
- Local branch began as `codex/manuscript-studio` based on the existing remote main. Initial repository contained only a placeholder index.

## Next engineering decisions

1. Make the two practice pages more purposeful and approachable without presenting them as finished Level One. Keep the fixed starting scene and curated assets, but allow different workable routes. Add a clear way to reset a practice page's construction while preserving a recovery copy.
2. Reopen and edit an existing custom character, then safely propagate its updated sprite to all campaign pages. V0.1 stores the selected parts and composed sprite but the maker only opens during new-game creation.
3. Later design enemies, archery and flying (order open) and any other active-object behavior needed by real levels. V0.1 completion is solely reaching a checkpoint with walking/jumping; there is no pre-play physical-path validator.
4. Generate the prepared finishing-parts sheet when useful: tongues, eyes, armor, textiles and flora. Continue original economical 8×4 batches; record actual dimensions and inspect every cutout.
5. Consider IndexedDB for larger saved games and books, reusable compositions/grouping, cross-page copy/paste, and more than one restorable previous campaign run.

## Limitations to preserve or resolve explicitly

- Play roles currently apply to image layers only. The simulation uses axis-aligned rectangular bounds based on layer position and size; rotation is visual. The last visible Character layer is controlled, and any visible Goal can finish the scene. Campaign progression exists for two practice pages, with their page order serving as level order. There is no interaction scripting, enemy/archery/flying mechanic, construction validator, or finished challenge level yet. The sandbox's book/map choice remains separate from top-level sandbox/campaign mode.
- Text styling is per passage, not inline rich-text ranges. Glyph conversion is approximate creative spelling, not translation.
- localStorage can run out for many uploads; the UI warns users to download the project. IndexedDB is a better next persistence layer for books.
- App state must never accept unsafe imported image URLs. Current validator allows bundled asset paths and raster image data URLs only.
- Some earlier agents stopped at account usage limits. Their completed files remain, but uncompleted image jobs may not have persisted. Check actual files rather than relying on promised outputs.
