# Virtual threads: three ways to break a reservation service

Each demo breaks a small seat-reservation service in a different way and then fixes it.
JDK 25, no dependencies. Every file runs on its own:

    java src/main/java/ca/bazlur/queues/OverloadUnbounded.java

`./run.sh overload` is the short form.

## Run order

| | Command | What to look at |
|---|---|---|
| Warm-up | `./run.sh intro` | 1,000 requests take about 2 s on 50 platform threads and about 0.1 s on virtual threads |
| 1. The database slows down | `./run.sh overload` | Queries go from 20 ms to 80 ms for three seconds. `in flight` keeps climbing, and the service is still catching up two seconds after the database is back |
| | `./run.sh bounded` | At most 32 requests in flight. The rest are turned away at once and nobody waits past the 500 ms deadline |
| 2. Requests run one at a time | `./run.sh wide` | The card is charged while holding the lock, so 40 reservations take over 3 s |
| | `./run.sh narrow` | The lock only covers the seat count. Same result in under 0.1 s |
| | `./run.sh pinning` | 20 tasks on two carrier threads, each sleeping inside its own `synchronized` block: about 0.1 s. JDK 21 pinned the carrier here and needed about 1 s |
| 3. Work continues after a timeout | `./run.sh leak` | The customer is told to try again at 200 ms. The card is charged at 1,800 ms |
| | `./run.sh cancel` | `cancel(true)` interrupts the payment |
| | `./run.sh structured` | The deadline belongs to the scope, and the payment is already cancelled when the timeout is reported. Preview API, so it needs `--enable-preview` |

## Three checks for your own service

1. For every pool, quota or downstream call: what limits how many requests can wait for it? If the answer used to be "the thread pool", that limit is gone.
2. Is any lock held across a database or network call?
3. When a timeout fires, does anything stop the work, and does the work respond to interruption?

## Slides

The deck is at https://rokon12.github.io/vfun/ and in `index.html`: one self-contained page, no network needed. Press `?` for the keys.

It is set in fonts that ship with macOS (DIN Condensed, DIN Alternate, Bradley Hand), so it looks best on a Mac. Other systems fall back to similar fonts.
