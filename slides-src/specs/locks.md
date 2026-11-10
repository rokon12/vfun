# Scene `locks`: requests run one at a time, then they don't

40 seats, 50 customers arriving at the same moment, a card charge that takes 80 ms. One scene,
two modes, on two slides.

Files you own: `scenes/locks.js`, `scenes/locks.css`, `slides/21-demo2-wide.html`,
`slides/24-demo2-narrow.html`.

## The picture
- A seat map with exactly 40 seats that fill as reservations are confirmed. This is the service's
  shared state, the thing the lock protects.
- A timeline: one row per customer (50 rows, compact), time on the horizontal axis. A row shows
  what that customer's virtual thread is doing: waiting for the lock, holding the lock, charging
  the card, done, or turned away (sold out).
- A clock in milliseconds.

## Mode `wide` (slide `demo2-wide`, steps 0..1)
`reserve()` is `synchronized` and charges the card inside the lock.
- Step 0: play IN REAL TIME, about 3.4 seconds. The charges form a staircase: one 80 ms block
  after another, 40 of them. While one thread charges, every other thread is parked waiting for
  the lock; draw that waiting, because it is the story. Seats fill one every 80 ms. The last 10
  customers reach the lock after the 40th seat has gone and are turned away. The clock stops on
  3,356 ms. Result line: confirmed 40, turned away 10.
- Step 1: hold the finished picture and emphasise the waiting: 49 threads parked behind one lock.
  The host slide reveals "Virtual threads make waiting cheap. They don't make a lock hold two
  people."

## Mode `narrow` (slide `demo2-narrow`, steps 0..1)
The lock now only covers the seat count: take the seat under the lock, charge the card with no
lock held, give the seat back if the charge fails.
- Step 0: play IN REAL TIME on the SAME time axis as the wide run (0 to about 3.4 s), with the
  wide staircase kept as a faint ghost for comparison. All 40 seats are taken at once, 10
  customers are turned away at once, 40 charges overlap, and everything is done at 92 ms: a
  sliver at the left edge of an axis the wide run filled. Clock stops on 92 ms. Show
  "3,356 ms" and "92 ms" together.
- Step 1: zoom the time axis to 0..100 ms and replay slowly (about 3 s of wall time) so the room
  can see the structure: 40 tiny lock holds in sequence at the very start, then 40 overlapping
  80 ms charges with no lock held.

## Notes
- The lock-held state must be unmistakable (it is the villain of this demo) and must look the
  same in both modes.
- Real time means real time: the wide run should feel long. Replay must work for both steps.
- In still mode every step shows its finished state (step 1 of `narrow` shows the zoomed axis).
- 50 rows in the height available means thin rows. Do not put text in the rows; label the
  states once, in a legend.
